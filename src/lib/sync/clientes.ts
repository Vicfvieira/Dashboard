/**
 * Clientes das APIs de integração. Puros (sem banco): recebem configuração e fetch, devolvem
 * registros validados e estatísticas para o SyncRun.
 */
import { DISTRITOS, type RegiaoId } from "@/data/sp-geo";
import {
  agendamentoApi,
  contagemProfissionaisApi,
  eventoApi,
  paginaAgendamentos,
  respostaEventos,
  respostaProfissionais,
  validarItens,
  type AgendamentoApi,
} from "./esquemas";
import { ErroIntegracao, requisitarJson, type OpcoesRequisicao } from "./http";

export interface ConfigFonte {
  baseUrl: string;
  chave: string;
}

export interface Estatisticas {
  paginas: number;
  lidos: number;
  rejeitados: number;
  tentativasExtras: number;
  motivos: string[];
}

type Dependencias = Pick<OpcoesRequisicao, "fetch" | "esperar" | "esperaInicialMs">;

function url(base: string, caminho: string, parametros: Record<string, string | number>): string {
  const u = new URL(`/api/integracao/${caminho}`, base);
  for (const [k, v] of Object.entries(parametros)) u.searchParams.set(k, String(v));
  return u.toString();
}

function envelopeInvalido(caminho: string, motivo: string): ErroIntegracao {
  return new ErroIntegracao(`Resposta fora do contrato em /api/integracao/${caminho}: ${motivo}`, {
    url: caminho,
    tentativas: 1,
    repetivel: false,
  });
}

// ─── Pelagem ──────────────────────────────────────────────────────────────────

export const POR_PAGINA_PELAGEM = 100;
/** Teto de páginas por execução (60 req/min na API; 50 páginas = 5 mil agendamentos). */
export const MAX_PAGINAS_PELAGEM = 50;

export interface ResultadoPelagem extends Estatisticas {
  agendamentos: AgendamentoApi[];
  /** true quando o teto de páginas cortou a leitura (sincronização parcial). */
  truncado: boolean;
}

/** Lê todos os agendamentos (histórico completo), página a página. */
export async function buscarAgendamentos(config: ConfigFonte, deps: Dependencias = {}): Promise<ResultadoPelagem> {
  const agendamentos: AgendamentoApi[] = [];
  const motivos: string[] = [];
  let rejeitados = 0;
  let tentativasExtras = 0;
  let pagina = 1;
  let totalPaginas = 1;
  let lidos = 0;

  do {
    const { corpo, tentativas } = await requisitarJson(url(config.baseUrl, "agendamentos", { pagina, porPagina: POR_PAGINA_PELAGEM }), { chave: config.chave, ...deps });
    tentativasExtras += tentativas - 1;
    const envelope = paginaAgendamentos.safeParse(corpo);
    if (!envelope.success) throw envelopeInvalido("agendamentos", envelope.error.issues[0]?.message ?? "formato inesperado");
    const v = validarItens(envelope.data.dados, agendamentoApi);
    agendamentos.push(...v.validos);
    rejeitados += v.rejeitados;
    motivos.push(...v.motivos.slice(0, 5 - motivos.length));
    lidos += envelope.data.dados.length;
    totalPaginas = envelope.data.paginacao.totalPaginas;
    pagina++;
  } while (pagina <= totalPaginas && pagina <= MAX_PAGINAS_PELAGEM);

  // Ids únicos: a paginação por offset pode repetir um registro se a base mudar durante a leitura.
  const unicos = [...new Map(agendamentos.map((a) => [a.id, a])).values()];
  return { agendamentos: unicos, paginas: pagina - 1, lidos, rejeitados, tentativasExtras, motivos, truncado: totalPaginas > MAX_PAGINAS_PELAGEM };
}

// ─── Lírio ────────────────────────────────────────────────────────────────────

/** Período máximo por consulta de /eventos na Lírio. */
export const MAX_DIAS_EVENTOS = 92;

const DIA_MS = 86_400_000;
const somarDias = (dia: string, n: number) => new Date(Date.parse(`${dia}T00:00:00Z`) + n * DIA_MS).toISOString().slice(0, 10);

/** Divide [de, ate] (inclusivos) em janelas de no máximo `maxDias`, da mais recente para a mais antiga. */
export function dividirEmJanelas(de: string, ate: string, maxDias: number): Array<{ de: string; ate: string }> {
  const janelas: Array<{ de: string; ate: string }> = [];
  let fim = ate;
  while (fim >= de) {
    const inicio = somarDias(fim, -(maxDias - 1));
    janelas.push({ de: inicio < de ? de : inicio, ate: fim });
    fim = somarDias(inicio, -1);
  }
  return janelas;
}

const REGIAO_DO_DISTRITO = new Map<string, RegiaoId>(DISTRITOS.map((d) => [d.slug, d.regiao]));

export interface EventoNormalizado {
  chave: string;
  dia: string;
  distritoSlug: string | null;
  regiao: RegiaoId | null;
  categoria: string | null;
  buscas: number;
  visualizacoes: number;
  cliquesWhatsapp: number;
  cliquesInstagram: number;
}

export interface ResultadoEventos extends Estatisticas {
  eventos: EventoNormalizado[];
  de: string;
  ate: string;
}

export async function buscarEventos(config: ConfigFonte, periodo: { de: string; ate: string }, deps: Dependencias = {}): Promise<ResultadoEventos> {
  const eventos = new Map<string, EventoNormalizado>();
  const motivos: string[] = [];
  let rejeitados = 0;
  let tentativasExtras = 0;
  let lidos = 0;
  const janelas = dividirEmJanelas(periodo.de, periodo.ate, MAX_DIAS_EVENTOS);

  for (const janela of janelas) {
    const { corpo, tentativas } = await requisitarJson(url(config.baseUrl, "eventos", janela), { chave: config.chave, ...deps });
    tentativasExtras += tentativas - 1;
    const envelope = respostaEventos.safeParse(corpo);
    if (!envelope.success) throw envelopeInvalido("eventos", envelope.error.issues[0]?.message ?? "formato inesperado");
    lidos += envelope.data.itens.length;
    const v = validarItens(envelope.data.itens, eventoApi);
    rejeitados += v.rejeitados;
    motivos.push(...v.motivos.slice(0, 5 - motivos.length));
    for (const e of v.validos) {
      // Distrito fora da tabela de referência não entra (seria uma chave estrangeira inválida).
      if (e.distrito && !REGIAO_DO_DISTRITO.has(e.distrito)) {
        rejeitados++;
        if (motivos.length < 5) motivos.push(`distrito desconhecido: ${e.distrito}`);
        continue;
      }
      const chave = `${e.dia}|${e.distrito ?? "-"}|${e.categoria ?? "-"}`;
      eventos.set(chave, {
        chave,
        dia: e.dia,
        distritoSlug: e.distrito,
        regiao: e.distrito ? (REGIAO_DO_DISTRITO.get(e.distrito) ?? null) : null,
        categoria: e.categoria,
        buscas: e.buscas,
        visualizacoes: e.visualizacoes,
        cliquesWhatsapp: e.cliquesWhatsapp,
        cliquesInstagram: e.cliquesInstagram,
      });
    }
  }
  return { eventos: [...eventos.values()], de: periodo.de, ate: periodo.ate, paginas: janelas.length, lidos, rejeitados, tentativasExtras, motivos };
}

export interface OfertaNormalizada {
  distritoSlug: string;
  regiao: RegiaoId;
  categoria: string;
  ativas: number;
  verificadas: number;
}

export interface ResultadoOferta extends Estatisticas {
  oferta: OfertaNormalizada[];
  totalProfissionais: number;
}

/** Foto atual da oferta: profissionais aprovadas por distrito e categoria. */
export async function buscarOferta(config: ConfigFonte, deps: Dependencias = {}): Promise<ResultadoOferta> {
  const { corpo, tentativas } = await requisitarJson(url(config.baseUrl, "profissionais", {}), { chave: config.chave, ...deps });
  const envelope = respostaProfissionais.safeParse(corpo);
  if (!envelope.success) throw envelopeInvalido("profissionais", envelope.error.issues[0]?.message ?? "formato inesperado");
  const v = validarItens(envelope.data.itens, contagemProfissionaisApi);
  const oferta: OfertaNormalizada[] = [];
  let rejeitados = v.rejeitados;
  const motivos = [...v.motivos];
  for (const item of v.validos) {
    const regiao = REGIAO_DO_DISTRITO.get(item.distrito);
    if (!regiao) {
      rejeitados++;
      if (motivos.length < 5) motivos.push(`distrito desconhecido: ${item.distrito}`);
      continue;
    }
    oferta.push({ distritoSlug: item.distrito, regiao, categoria: item.categoria, ativas: item.total, verificadas: item.verificadas });
  }
  return {
    oferta,
    totalProfissionais: envelope.data.totalProfissionais,
    paginas: 1,
    lidos: envelope.data.itens.length,
    rejeitados,
    tentativasExtras: tentativas - 1,
    motivos,
  };
}
