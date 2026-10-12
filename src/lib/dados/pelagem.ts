import "server-only";
import { intervaloAnterior, somarDiasIso, type Intervalo } from "@/lib/filtros";
import { DIAS_INATIVIDADE, inicioDaSemana, taxaCancelamento, ticketMedio } from "@/lib/metrics";
import { prisma } from "@/lib/prisma";
import { limitesUtc } from "./periodo";

// Consultas agregadas no banco, sempre parametrizadas ($queryRaw com template). Dia, semana,
// dia da semana e hora são calculados no fuso de São Paulo.

export interface ResumoPelagem {
  concluidos: number;
  faturamento: number;
  cancelados: number;
  agendamentos: number;
  ticket: number | null;
  taxaCancelamento: number | null;
  clientesAtendidos: number;
  clientesRecorrentes: number;
  taxaRetorno: number | null;
}

export async function resumoPelagem(i: Intervalo): Promise<ResumoPelagem> {
  const { inicio, fim } = limitesUtc(i);
  const [linha] = await prisma.$queryRaw<Array<{ concluidos: number; faturamento: bigint; cancelados: number; agendamentos: number }>>`
    SELECT count(*) FILTER (WHERE "status" = 'CONCLUIDO')::int AS concluidos,
           coalesce(sum("totalCentavos") FILTER (WHERE "status" = 'CONCLUIDO'), 0)::bigint AS faturamento,
           count(*) FILTER (WHERE "status" = 'CANCELADO')::int AS cancelados,
           count(*)::int AS agendamentos
    FROM "AppointmentFact"
    WHERE "inicio" >= ${inicio} AND "inicio" < ${fim}`;
  const [retorno] = await prisma.$queryRaw<Array<{ atendidos: number; recorrentes: number }>>`
    SELECT count(*)::int AS atendidos, count(*) FILTER (WHERE n >= 2)::int AS recorrentes
    FROM (
      SELECT "clienteHash", count(*) AS n
      FROM "AppointmentFact"
      WHERE "status" = 'CONCLUIDO' AND "inicio" >= ${inicio} AND "inicio" < ${fim}
      GROUP BY 1
    ) c`;
  const concluidos = linha?.concluidos ?? 0;
  const faturamento = Number(linha?.faturamento ?? 0);
  const atendidos = retorno?.atendidos ?? 0;
  const recorrentes = retorno?.recorrentes ?? 0;
  return {
    concluidos,
    faturamento,
    cancelados: linha?.cancelados ?? 0,
    agendamentos: linha?.agendamentos ?? 0,
    ticket: ticketMedio(faturamento, concluidos),
    taxaCancelamento: taxaCancelamento(linha?.cancelados ?? 0, linha?.agendamentos ?? 0),
    clientesAtendidos: atendidos,
    clientesRecorrentes: recorrentes,
    taxaRetorno: atendidos > 0 ? recorrentes / atendidos : null,
  };
}

export interface SemanaFaturamento {
  semana: string;
  faturamento: number;
  atendimentos: number;
  /** A semana está dentro do período selecionado (as anteriores são contexto). */
  noPeriodo: boolean;
}

/** Semanas completas: o período selecionado e, se ele for curto, até 12 semanas de contexto. */
async function faturamentoSemanal(i: Intervalo, hoje: string): Promise<SemanaFaturamento[]> {
  // Última semana completa (segunda a domingo) que termina até o fim do período e até ontem.
  const limite = i.ate < hoje ? i.ate : somarDiasIso(hoje, -1);
  const ultimaSegunda = somarDiasIso(inicioDaSemana(limite), limite === somarDiasIso(inicioDaSemana(limite), 6) ? 0 : -7);
  const primeiraSegunda = (() => {
    const doPeriodo = inicioDaSemana(i.de) === i.de ? i.de : somarDiasIso(inicioDaSemana(i.de), 7);
    const contexto = somarDiasIso(ultimaSegunda, -7 * 11);
    return doPeriodo < contexto ? doPeriodo : contexto;
  })();
  const janela = { de: primeiraSegunda, ate: somarDiasIso(ultimaSegunda, 6), dias: 0 };
  const { inicio, fim } = limitesUtc(janela);
  const linhas = await prisma.$queryRaw<Array<{ semana: string; faturamento: bigint; atendimentos: number }>>`
    SELECT to_char(date_trunc('week', "inicio" AT TIME ZONE 'America/Sao_Paulo'), 'YYYY-MM-DD') AS semana,
           coalesce(sum("totalCentavos"), 0)::bigint AS faturamento,
           count(*)::int AS atendimentos
    FROM "AppointmentFact"
    WHERE "status" = 'CONCLUIDO' AND "inicio" >= ${inicio} AND "inicio" < ${fim}
    GROUP BY 1`;
  const porSemana = new Map(linhas.map((l) => [l.semana, l]));
  const semanas: SemanaFaturamento[] = [];
  for (let s = primeiraSegunda; s <= ultimaSegunda; s = somarDiasIso(s, 7)) {
    const l = porSemana.get(s);
    semanas.push({ semana: s, faturamento: Number(l?.faturamento ?? 0), atendimentos: l?.atendimentos ?? 0, noPeriodo: s >= i.de && somarDiasIso(s, 6) <= i.ate });
  }
  return semanas;
}

export interface ServicoRanking {
  servico: string;
  porte: "P" | "M" | "G";
  atendimentos: number;
  faturamento: number;
  atendimentosAnterior: number;
}

async function topServicos(i: Intervalo, anterior: Intervalo): Promise<ServicoRanking[]> {
  const a = limitesUtc(i);
  const b = limitesUtc(anterior);
  const linhas = await prisma.$queryRaw<Array<{ servico: string; porte: "P" | "M" | "G"; atendimentos: number; faturamento: bigint; anterior: number }>>`
    SELECT "servicoNome" AS servico, "porte"::text AS porte,
           count(*) FILTER (WHERE "inicio" >= ${a.inicio})::int AS atendimentos,
           coalesce(sum("totalCentavos") FILTER (WHERE "inicio" >= ${a.inicio}), 0)::bigint AS faturamento,
           count(*) FILTER (WHERE "inicio" < ${b.fim})::int AS anterior
    FROM "AppointmentFact"
    WHERE "status" = 'CONCLUIDO' AND "inicio" >= ${b.inicio} AND "inicio" < ${a.fim}
    GROUP BY 1, 2`;
  return linhas
    .filter((l) => l.atendimentos > 0)
    .map((l) => ({ servico: l.servico, porte: l.porte, atendimentos: l.atendimentos, faturamento: Number(l.faturamento), atendimentosAnterior: l.anterior }))
    .sort((x, y) => y.faturamento - x.faturamento || y.atendimentos - x.atendimentos)
    .slice(0, 10);
}

export interface CelulaCalor {
  /** 1 = segunda … 7 = domingo (ISO). */
  diaSemana: number;
  hora: number;
  atendimentos: number;
}

/** Agendamentos não cancelados por dia da semana e hora de início (procura por horário). */
async function mapaDeCalor(i: Intervalo): Promise<CelulaCalor[]> {
  const { inicio, fim } = limitesUtc(i);
  return prisma.$queryRaw<CelulaCalor[]>`
    SELECT extract(isodow FROM "inicio" AT TIME ZONE 'America/Sao_Paulo')::int AS "diaSemana",
           extract(hour FROM "inicio" AT TIME ZONE 'America/Sao_Paulo')::int AS hora,
           count(*)::int AS atendimentos
    FROM "AppointmentFact"
    WHERE "status" <> 'CANCELADO' AND "inicio" >= ${inicio} AND "inicio" < ${fim}
    GROUP BY 1, 2`;
}

export interface MixPorte {
  porte: "P" | "M" | "G";
  cachorro: number;
  gato: number;
  naoInformada: number;
}

async function mixPorteEspecie(i: Intervalo): Promise<MixPorte[]> {
  const { inicio, fim } = limitesUtc(i);
  const linhas = await prisma.$queryRaw<Array<{ porte: "P" | "M" | "G"; especie: string | null; n: number }>>`
    SELECT "porte"::text AS porte, "especie"::text AS especie, count(*)::int AS n
    FROM "AppointmentFact"
    WHERE "status" = 'CONCLUIDO' AND "inicio" >= ${inicio} AND "inicio" < ${fim}
    GROUP BY 1, 2`;
  return (["P", "M", "G"] as const).map((porte) => {
    const do_ = linhas.filter((l) => l.porte === porte);
    const soma = (e: string | null) => do_.filter((l) => l.especie === e).reduce((s, l) => s + l.n, 0);
    return { porte, cachorro: soma("CACHORRO"), gato: soma("GATO"), naoInformada: soma(null) };
  });
}

export interface CancelamentoDia {
  diaSemana: number;
  agendamentos: number;
  cancelados: number;
  taxa: number | null;
  agendamentosAnterior: number;
  canceladosAnterior: number;
  taxaAnterior: number | null;
}

async function cancelamentoPorDia(i: Intervalo, anterior: Intervalo): Promise<CancelamentoDia[]> {
  const a = limitesUtc(i);
  const b = limitesUtc(anterior);
  const linhas = await prisma.$queryRaw<Array<{ dia: number; total: number; cancelados: number; total_ant: number; cancelados_ant: number }>>`
    SELECT extract(isodow FROM "inicio" AT TIME ZONE 'America/Sao_Paulo')::int AS dia,
           count(*) FILTER (WHERE "inicio" >= ${a.inicio})::int AS total,
           count(*) FILTER (WHERE "inicio" >= ${a.inicio} AND "status" = 'CANCELADO')::int AS cancelados,
           count(*) FILTER (WHERE "inicio" < ${b.fim})::int AS total_ant,
           count(*) FILTER (WHERE "inicio" < ${b.fim} AND "status" = 'CANCELADO')::int AS cancelados_ant
    FROM "AppointmentFact"
    WHERE "inicio" >= ${b.inicio} AND "inicio" < ${a.fim}
    GROUP BY 1`;
  // Terça a sábado: dias de funcionamento do Pelagem.
  return [2, 3, 4, 5, 6].map((d) => {
    const l = linhas.find((x) => x.dia === d);
    return {
      diaSemana: d,
      agendamentos: l?.total ?? 0,
      cancelados: l?.cancelados ?? 0,
      taxa: taxaCancelamento(l?.cancelados ?? 0, l?.total ?? 0),
      agendamentosAnterior: l?.total_ant ?? 0,
      canceladosAnterior: l?.cancelados_ant ?? 0,
      taxaAnterior: taxaCancelamento(l?.cancelados_ant ?? 0, l?.total_ant ?? 0),
    };
  });
}

export interface ClienteInativo {
  clienteHash: string;
  ultimoAtendimento: string;
  diasSemVoltar: number;
  atendimentos: number;
  gastoTotal: number;
  servicoFrequente: string;
  porte: string;
  especie: string | null;
}

/**
 * Clientes inativos (hoje): último atendimento concluído há mais de 30 dias e nada agendado
 * depois. Independe do filtro de período; é a lista para ação de reativação.
 */
export async function clientesInativos(agora: Date): Promise<ClienteInativo[]> {
  const corte = new Date(agora.getTime() - DIAS_INATIVIDADE * 86_400_000);
  const linhas = await prisma.$queryRaw<Array<{ hash: string; ultimo: Date; atendimentos: number; gasto: bigint; servico: string; porte: string; especie: string | null }>>`
    SELECT "clienteHash" AS hash,
           max("inicio") FILTER (WHERE "status" = 'CONCLUIDO') AS ultimo,
           count(*) FILTER (WHERE "status" = 'CONCLUIDO')::int AS atendimentos,
           coalesce(sum("totalCentavos") FILTER (WHERE "status" = 'CONCLUIDO'), 0)::bigint AS gasto,
           mode() WITHIN GROUP (ORDER BY "servicoNome") AS servico,
           mode() WITHIN GROUP (ORDER BY "porte"::text) AS porte,
           mode() WITHIN GROUP (ORDER BY "especie"::text) AS especie
    FROM "AppointmentFact"
    GROUP BY 1
    HAVING max("inicio") FILTER (WHERE "status" = 'CONCLUIDO') < ${corte}
       AND NOT bool_or("status" = 'AGENDADO' AND "inicio" > ${agora})`;
  return linhas
    .map((l) => ({
      clienteHash: l.hash,
      ultimoAtendimento: l.ultimo.toISOString(),
      diasSemVoltar: Math.floor((agora.getTime() - l.ultimo.getTime()) / 86_400_000),
      atendimentos: l.atendimentos,
      gastoTotal: Number(l.gasto),
      servicoFrequente: l.servico,
      porte: l.porte,
      especie: l.especie,
    }))
    .sort((a, b) => b.gastoTotal - a.gastoTotal);
}

export interface DadosPelagem {
  intervalo: Intervalo;
  anterior: Intervalo;
  atual: ResumoPelagem;
  base: ResumoPelagem;
  semanal: SemanaFaturamento[];
  servicos: ServicoRanking[];
  calor: CelulaCalor[];
  mix: MixPorte[];
  cancelamento: CancelamentoDia[];
  inativos: ClienteInativo[];
}

export async function carregarPelagem(intervalo: Intervalo, hoje: string, agora: Date): Promise<DadosPelagem> {
  const anterior = intervaloAnterior(intervalo);
  const [atual, base, semanal, servicos, calor, mix, cancelamento, inativos] = await Promise.all([
    resumoPelagem(intervalo),
    resumoPelagem(anterior),
    faturamentoSemanal(intervalo, hoje),
    topServicos(intervalo, anterior),
    mapaDeCalor(intervalo),
    mixPorteEspecie(intervalo),
    cancelamentoPorDia(intervalo, anterior),
    clientesInativos(agora),
  ]);
  return { intervalo, anterior, atual, base, semanal, servicos, calor, mix, cancelamento, inativos };
}
