import "server-only";
import type { Fonte, GatilhoSync, Prisma, StatusSync } from "@prisma/client";
import { z } from "zod";
import { registrarAuditoria } from "@/lib/auditoria";
import { hojeSP, somarDiasIso } from "@/lib/filtros";
import { prisma } from "@/lib/prisma";
import { buscarAgendamentos, buscarEventos, buscarHorarios, buscarOferta, type ConfigFonte, type Estatisticas } from "./clientes";
import { gravarAgendamentos, gravarEventos, gravarHorarios, gravarOferta } from "./gravar";
import { ErroIntegracao } from "./http";

/** Execução presa em EXECUTANDO há mais que isso é considerada interrompida. */
const EXECUCAO_TRAVADA_MS = 10 * 60_000;
/** Histórico de eventos da Lírio relido a cada sincronização. */
export const DIAS_HISTORICO_LIRIO = 365;

const configuracao = z.object({
  PELAGEM_API_URL: z.url(),
  PELAGEM_API_KEY: z.string().min(16),
  LIRIO_API_URL: z.url(),
  LIRIO_API_KEY: z.string().min(16),
});

export function configDaFonte(fonte: Fonte): ConfigFonte | null {
  const env = configuracao.safeParse(process.env);
  if (!env.success) return null;
  return fonte === "PELAGEM"
    ? { baseUrl: env.data.PELAGEM_API_URL, chave: env.data.PELAGEM_API_KEY }
    : { baseUrl: env.data.LIRIO_API_URL, chave: env.data.LIRIO_API_KEY };
}

export interface ResultadoSync {
  fonte: Fonte;
  syncRunId: string | null;
  status: StatusSync | "IGNORADA";
  registrosLidos: number;
  registrosGravados: number;
  duracaoMs: number;
  mensagem: string;
}

interface Execucao {
  estatisticas: Estatisticas;
  gravados: number;
  removidos: number;
  parcial: boolean;
  resumo: string;
}

async function executarPelagem(config: ConfigFonte, inicio: Date): Promise<Execucao> {
  const r = await buscarAgendamentos(config);
  const g = await gravarAgendamentos(r.agendamentos, inicio, !r.truncado);
  return {
    estatisticas: r,
    gravados: g.gravados,
    removidos: g.removidos,
    parcial: r.truncado || r.rejeitados > 0,
    resumo: `${r.agendamentos.length} agendamentos em ${r.paginas} página(s)`,
  };
}

async function executarLirio(config: ConfigFonte, inicio: Date): Promise<Execucao> {
  const hoje = hojeSP(inicio);
  const periodo = { de: somarDiasIso(hoje, -(DIAS_HISTORICO_LIRIO - 1)), ate: hoje };
  // Sequencial: a Lírio limita 60 req/min por IP; são 4 janelas de eventos + 4 de horários + 1.
  const eventos = await buscarEventos(config, periodo);
  const horarios = await buscarHorarios(config, periodo);
  const oferta = await buscarOferta(config);
  const ge = await gravarEventos(eventos.eventos, periodo, inicio);
  // Sem /horarios na origem, os dados por hora existentes ficam como estão (nada é apagado).
  const gh = horarios.disponivel ? await gravarHorarios(horarios.horas, periodo, inicio) : { gravados: 0, removidos: 0 };
  const go = await gravarOferta(oferta.oferta, hoje, inicio);
  const rejeitados = eventos.rejeitados + horarios.rejeitados + oferta.rejeitados;
  return {
    estatisticas: {
      paginas: eventos.paginas + horarios.paginas + oferta.paginas,
      lidos: eventos.lidos + horarios.lidos + oferta.lidos,
      rejeitados,
      tentativasExtras: eventos.tentativasExtras + horarios.tentativasExtras + oferta.tentativasExtras,
      motivos: [...eventos.motivos, ...horarios.motivos, ...oferta.motivos].slice(0, 5),
    },
    gravados: ge.gravados + gh.gravados + go.gravados,
    removidos: ge.removidos + gh.removidos + go.removidos,
    parcial: rejeitados > 0 || !horarios.disponivel,
    resumo: `${eventos.eventos.length} linhas de eventos e ${horarios.horas.length} de buscas por hora (${periodo.de} a ${periodo.ate}), ${oferta.oferta.length} contagens de oferta (${oferta.totalProfissionais} profissionais)`,
  };
}

/** Marca como ERRO execuções antigas que ficaram presas (função encerrada no meio). */
async function encerrarTravadas(fonte: Fonte): Promise<void> {
  await prisma.syncRun.updateMany({
    where: { fonte, status: "EXECUTANDO", iniciadoEm: { lt: new Date(Date.now() - EXECUCAO_TRAVADA_MS) } },
    data: { status: "ERRO", finalizadoEm: new Date(), erro: "Execução interrompida antes de terminar." },
  });
}

export async function sincronizarFonte(fonte: Fonte, gatilho: GatilhoSync, usuarioId: string | null): Promise<ResultadoSync> {
  const config = configDaFonte(fonte);
  await encerrarTravadas(fonte);

  const emAndamento = await prisma.syncRun.findFirst({ where: { fonte, status: "EXECUTANDO" }, select: { id: true } });
  if (emAndamento) {
    return { fonte, syncRunId: emAndamento.id, status: "IGNORADA", registrosLidos: 0, registrosGravados: 0, duracaoMs: 0, mensagem: "Já existe uma sincronização desta fonte em andamento." };
  }

  const inicio = new Date();
  const run = await prisma.syncRun.create({ data: { fonte, gatilho, disparadoPorId: usuarioId, iniciadoEm: inicio } });

  let resultado: ResultadoSync;
  try {
    if (!config) throw new ErroIntegracao("URL ou chave da API não configurada no ambiente.", { url: "-", tentativas: 0, repetivel: false });
    const exec = fonte === "PELAGEM" ? await executarPelagem(config, inicio) : await executarLirio(config, inicio);
    const status: StatusSync = exec.parcial ? "PARCIAL" : "SUCESSO";
    const duracaoMs = Date.now() - inicio.getTime();
    const detalhes: Prisma.InputJsonValue = {
      resumo: exec.resumo,
      rejeitados: exec.estatisticas.rejeitados,
      removidos: exec.removidos,
      motivosRejeicao: exec.estatisticas.motivos,
    };
    await prisma.syncRun.update({
      where: { id: run.id },
      data: {
        status,
        finalizadoEm: new Date(),
        duracaoMs,
        paginas: exec.estatisticas.paginas,
        registrosLidos: exec.estatisticas.lidos,
        registrosGravados: exec.gravados,
        tentativas: exec.estatisticas.paginas + exec.estatisticas.tentativasExtras,
        detalhes,
      },
    });
    resultado = { fonte, syncRunId: run.id, status, registrosLidos: exec.estatisticas.lidos, registrosGravados: exec.gravados, duracaoMs, mensagem: exec.resumo };
  } catch (erro) {
    const mensagem = erro instanceof ErroIntegracao ? erro.message : "Erro interno ao gravar os dados.";
    if (!(erro instanceof ErroIntegracao)) console.error("[sync]", fonte, erro instanceof Error ? erro.message : erro);
    const duracaoMs = Date.now() - inicio.getTime();
    await prisma.syncRun.update({
      where: { id: run.id },
      data: {
        status: "ERRO",
        finalizadoEm: new Date(),
        duracaoMs,
        erro: mensagem.slice(0, 500),
        tentativas: erro instanceof ErroIntegracao ? erro.detalhes.tentativas : 0,
      },
    });
    resultado = { fonte, syncRunId: run.id, status: "ERRO", registrosLidos: 0, registrosGravados: 0, duracaoMs, mensagem };
  }

  await registrarAuditoria({
    acao: "SINCRONIZACAO",
    sucesso: resultado.status === "SUCESSO" || resultado.status === "PARCIAL",
    usuarioId,
    alvo: `fonte:${fonte}`,
    detalhes: { gatilho, status: resultado.status, lidos: resultado.registrosLidos, gravados: resultado.registrosGravados, duracaoMs: resultado.duracaoMs },
  });
  return resultado;
}

/** Sincroniza as fontes pedidas (as duas por padrão), em paralelo: uma falha não impede a outra. */
export async function sincronizar(gatilho: GatilhoSync, usuarioId: string | null, fontes: readonly Fonte[] = ["PELAGEM", "LIRIO"]): Promise<ResultadoSync[]> {
  return Promise.all(fontes.map((f) => sincronizarFonte(f, gatilho, usuarioId)));
}
