import "server-only";
import { nomeCategoria } from "@/data/categorias";
import { REGIOES } from "@/data/sp-geo";
import { intervaloAnterior, type Filtros, type Intervalo } from "@/lib/filtros";
import type { FormatoNumero } from "@/lib/formato";
import { agruparPorSemana, completarDias, granularidade, maioresMovimentos, ticketMedio, type CandidatoMovimento, type Movimento, type PontoSerie } from "@/lib/metrics";
import { prisma } from "@/lib/prisma";
import { limitesUtc } from "./periodo";

// Consultas agregadas no banco, sempre com parâmetros ($queryRaw com template). Dias contados no
// fuso de São Paulo ("inicio" AT TIME ZONE 'America/Sao_Paulo').

interface TotaisPelagem {
  concluidos: number;
  faturamento: number;
  cancelados: number;
  total: number;
}
interface TotaisLirio {
  buscas: number;
  visualizacoes: number;
  cliques: number;
}

async function diarioPelagem(i: Intervalo) {
  const { inicio, fim } = limitesUtc(i);
  return prisma.$queryRaw<Array<{ dia: string; concluidos: number; faturamento: bigint; cancelados: number; total: number }>>`
    SELECT to_char(("inicio" AT TIME ZONE 'America/Sao_Paulo')::date, 'YYYY-MM-DD') AS dia,
           count(*) FILTER (WHERE "status" = 'CONCLUIDO')::int AS concluidos,
           coalesce(sum("totalCentavos") FILTER (WHERE "status" = 'CONCLUIDO'), 0)::bigint AS faturamento,
           count(*) FILTER (WHERE "status" = 'CANCELADO')::int AS cancelados,
           count(*)::int AS total
    FROM "AppointmentFact"
    WHERE "inicio" >= ${inicio} AND "inicio" < ${fim}
    GROUP BY 1`;
}

async function diarioLirio(i: Intervalo) {
  return prisma.$queryRaw<Array<{ dia: string; buscas: bigint; visualizacoes: bigint; cliques: bigint }>>`
    SELECT to_char("dia", 'YYYY-MM-DD') AS dia,
           sum("buscas")::bigint AS buscas,
           sum("visualizacoes")::bigint AS visualizacoes,
           sum("cliquesWhatsapp")::bigint AS cliques
    FROM "MarketEventFact"
    WHERE "dia" BETWEEN ${i.de}::date AND ${i.ate}::date
    GROUP BY 1`;
}

/** Profissionais ativas somadas por categoria na foto mais recente até a data. */
async function ofertaEm(dia: string): Promise<{ data: string | null; ativas: number }> {
  const [linha] = await prisma.$queryRaw<Array<{ data: string | null; ativas: bigint | null }>>`
    SELECT to_char("data", 'YYYY-MM-DD') AS data, sum("ativas")::bigint AS ativas
    FROM "ProfessionalStat"
    WHERE "data" = (SELECT max("data") FROM "ProfessionalStat" WHERE "data" <= ${dia}::date)
    GROUP BY "data"`;
  return { data: linha?.data ?? null, ativas: Number(linha?.ativas ?? 0) };
}

async function serieOferta(i: Intervalo) {
  return prisma.$queryRaw<Array<{ data: string; ativas: bigint }>>`
    SELECT to_char("data", 'YYYY-MM-DD') AS data, sum("ativas")::bigint AS ativas
    FROM "ProfessionalStat"
    WHERE "data" BETWEEN ${i.de}::date AND ${i.ate}::date
    GROUP BY "data" ORDER BY "data"`;
}

const somarPelagem = (linhas: Awaited<ReturnType<typeof diarioPelagem>>): TotaisPelagem =>
  linhas.reduce((t, l) => ({ concluidos: t.concluidos + l.concluidos, faturamento: t.faturamento + Number(l.faturamento), cancelados: t.cancelados + l.cancelados, total: t.total + l.total }), { concluidos: 0, faturamento: 0, cancelados: 0, total: 0 });

const somarLirio = (linhas: Awaited<ReturnType<typeof diarioLirio>>): TotaisLirio =>
  linhas.reduce((t, l) => ({ buscas: t.buscas + Number(l.buscas), visualizacoes: t.visualizacoes + Number(l.visualizacoes), cliques: t.cliques + Number(l.cliques) }), { buscas: 0, visualizacoes: 0, cliques: 0 });

// ─── Candidatos a destaque ────────────────────────────────────────────────────

async function candidatosLirio(atual: Intervalo, anterior: Intervalo): Promise<CandidatoMovimento[]> {
  const [porCategoria, porRegiao] = await Promise.all([
    prisma.$queryRaw<Array<{ chave: string; atual: bigint; anterior: bigint }>>`
      SELECT "categoria" AS chave,
             coalesce(sum("buscas") FILTER (WHERE "dia" >= ${atual.de}::date), 0)::bigint AS atual,
             coalesce(sum("buscas") FILTER (WHERE "dia" <= ${anterior.ate}::date), 0)::bigint AS anterior
      FROM "MarketEventFact"
      WHERE "categoria" IS NOT NULL AND "dia" BETWEEN ${anterior.de}::date AND ${atual.ate}::date
      GROUP BY 1`,
    prisma.$queryRaw<Array<{ chave: string; atual: bigint; anterior: bigint }>>`
      SELECT "regiao"::text AS chave,
             coalesce(sum("buscas") FILTER (WHERE "dia" >= ${atual.de}::date), 0)::bigint AS atual,
             coalesce(sum("buscas") FILTER (WHERE "dia" <= ${anterior.ate}::date), 0)::bigint AS anterior
      FROM "MarketEventFact"
      WHERE "regiao" IS NOT NULL AND "dia" BETWEEN ${anterior.de}::date AND ${atual.ate}::date
      GROUP BY 1`,
  ]);
  const nomeRegiao = new Map<string, string>(REGIOES.map((r) => [r.id, r.nome]));
  return [
    ...porCategoria.map((l) => ({
      id: `lirio:categoria:${l.chave}`,
      rotulo: `Buscas por ${nomeCategoria(l.chave)}`,
      atual: Number(l.atual),
      anterior: Number(l.anterior),
      baseMinima: 30,
      marca: "lirio" as const,
      href: "/lirio",
      formato: "inteiro" as const,
    })),
    ...porRegiao.map((l) => ({
      id: `lirio:regiao:${l.chave}`,
      rotulo: `Buscas na ${nomeRegiao.get(l.chave) ?? l.chave}`,
      atual: Number(l.atual),
      anterior: Number(l.anterior),
      baseMinima: 50,
      marca: "lirio" as const,
      href: "/mercado",
      formato: "inteiro" as const,
    })),
  ];
}

async function candidatosPelagem(atual: Intervalo, anterior: Intervalo): Promise<CandidatoMovimento[]> {
  const a = limitesUtc(atual);
  const b = limitesUtc(anterior);
  const porServico = await prisma.$queryRaw<Array<{ nome: string; atual: number; anterior: number }>>`
    SELECT "servicoNome" AS nome,
           count(*) FILTER (WHERE "inicio" >= ${a.inicio})::int AS atual,
           count(*) FILTER (WHERE "inicio" < ${b.fim})::int AS anterior
    FROM "AppointmentFact"
    WHERE "status" = 'CONCLUIDO' AND "inicio" >= ${b.inicio} AND "inicio" < ${a.fim}
    GROUP BY 1`;
  return porServico.map((l) => ({
    id: `pelagem:servico:${l.nome}`,
    rotulo: `Atendimentos de ${l.nome}`,
    atual: l.atual,
    anterior: l.anterior,
    baseMinima: 6,
    marca: "pelagem" as const,
    href: "/pelagem",
    formato: "inteiro" as const,
  }));
}

// ─── Visão geral ──────────────────────────────────────────────────────────────

export type ChaveKpi = "faturamento" | "atendimentos" | "ticket" | "buscas" | "cliques" | "oferta" | "cancelamento" | "retorno" | "inativos" | "atendidos" | "recorrentes" | "recuperavel";

export interface Kpi {
  chave: ChaveKpi;
  rotulo: string;
  marca: "pelagem" | "lirio";
  formato: FormatoNumero;
  valor: number;
  anterior: number | null;
  ajuda: string;
  /** Alta é ruim (ex.: cancelamentos): a variação positiva aparece em vermelho. */
  menorMelhor?: boolean;
  /** Texto no lugar da variação quando o indicador não tem período anterior (ex.: "posição de hoje"). */
  notaComparacao?: string;
  /** Série para a sparkline (diária ou semanal). */
  serie: number[];
}

export interface PontoTendencia {
  data: string;
  faturamento: number;
  atendimentos: number;
  buscas: number;
  cliques: number;
}

export interface VisaoGeral {
  intervalo: Intervalo;
  anterior: Intervalo;
  granularidade: "dia" | "semana";
  kpis: Kpi[];
  tendencia: PontoTendencia[];
  destaques: Movimento[];
  totais: { pelagem: TotaisPelagem; lirio: TotaisLirio };
}

export async function carregarVisaoGeral(filtros: Filtros, intervalo: Intervalo, podeVerFinanceiro: boolean): Promise<VisaoGeral> {
  const anterior = intervaloAnterior(intervalo);
  const verPelagem = filtros.produto !== "lirio";
  const verLirio = filtros.produto !== "pelagem";

  const [pAtual, pAnterior, lAtual, lAnterior, ofertaAtual, ofertaAnterior, ofertaSerie, candP, candL] = await Promise.all([
    verPelagem ? diarioPelagem(intervalo) : [],
    verPelagem ? diarioPelagem(anterior) : [],
    verLirio ? diarioLirio(intervalo) : [],
    verLirio ? diarioLirio(anterior) : [],
    verLirio ? ofertaEm(intervalo.ate) : { data: null, ativas: 0 },
    verLirio ? ofertaEm(anterior.ate) : { data: null, ativas: 0 },
    verLirio ? serieOferta(intervalo) : [],
    verPelagem ? candidatosPelagem(intervalo, anterior) : [],
    verLirio ? candidatosLirio(intervalo, anterior) : [],
  ]);

  const g = granularidade(intervalo.dias);
  const montar = (pontos: PontoSerie[]) => {
    const diaria = completarDias(pontos, intervalo.de, intervalo.ate);
    return g === "dia" ? diaria : agruparPorSemana(diaria);
  };
  const faturamento = montar(pAtual.map((l) => ({ data: l.dia, valor: Number(l.faturamento) })));
  const atendimentos = montar(pAtual.map((l) => ({ data: l.dia, valor: l.concluidos })));
  const buscas = montar(lAtual.map((l) => ({ data: l.dia, valor: Number(l.buscas) })));
  const cliques = montar(lAtual.map((l) => ({ data: l.dia, valor: Number(l.cliques) })));

  const tP = somarPelagem(pAtual);
  const tPa = somarPelagem(pAnterior);
  const tL = somarLirio(lAtual);
  const tLa = somarLirio(lAnterior);

  const kpis: Kpi[] = [];
  if (verPelagem && podeVerFinanceiro) {
    kpis.push({ chave: "faturamento", rotulo: "Faturamento", marca: "pelagem", formato: "moeda", valor: tP.faturamento, anterior: tPa.faturamento, ajuda: "Soma dos atendimentos concluídos (serviço + táxi dog).", serie: faturamento.map((p) => p.valor) });
  }
  if (verPelagem) {
    kpis.push({ chave: "atendimentos", rotulo: "Atendimentos concluídos", marca: "pelagem", formato: "inteiro", valor: tP.concluidos, anterior: tPa.concluidos, ajuda: "Banhos, tosas e demais serviços finalizados no período.", serie: atendimentos.map((p) => p.valor) });
  }
  if (verPelagem && podeVerFinanceiro) {
    const t = ticketMedio(tP.faturamento, tP.concluidos);
    const ta = ticketMedio(tPa.faturamento, tPa.concluidos);
    if (t !== null) kpis.push({ chave: "ticket", rotulo: "Ticket médio", marca: "pelagem", formato: "moeda", valor: Math.round(t), anterior: ta === null ? null : Math.round(ta), ajuda: "Faturamento dividido pelos atendimentos concluídos.", serie: [] });
  }
  if (verLirio) {
    kpis.push(
      { chave: "buscas", rotulo: "Buscas", marca: "lirio", formato: "inteiro", valor: tL.buscas, anterior: tLa.buscas, ajuda: "Buscas por profissionais em São Paulo, com ou sem distrito.", serie: buscas.map((p) => p.valor) },
      { chave: "cliques", rotulo: "Cliques no WhatsApp", marca: "lirio", formato: "inteiro", valor: tL.cliques, anterior: tLa.cliques, ajuda: "Contatos iniciados a partir de um perfil.", serie: cliques.map((p) => p.valor) },
      {
        chave: "oferta",
        rotulo: "Profissionais ativas",
        marca: "lirio",
        formato: "inteiro",
        valor: ofertaAtual.ativas,
        anterior: ofertaAnterior.data ? ofertaAnterior.ativas : null,
        ajuda: `Somadas por categoria na foto de ${ofertaAtual.data ?? "—"} (quem atende em 2 categorias conta 2 vezes).`,
        serie: ofertaSerie.map((o) => Number(o.ativas)),
      },
    );
  }

  // As quatro séries cobrem os mesmos dias (completarDias), então o índice i alinha as datas.
  const completa: PontoTendencia[] = faturamento.map((p, i) => ({
    data: p.data,
    faturamento: podeVerFinanceiro ? (faturamento[i]?.valor ?? 0) : 0,
    atendimentos: atendimentos[i]?.valor ?? 0,
    buscas: buscas[i]?.valor ?? 0,
    cliques: cliques[i]?.valor ?? 0,
  }));
  // Antes do primeiro dado de qualquer fonte não há operação para medir: o trecho vazio sai do
  // gráfico (senão puxaria a média do índice para baixo).
  const primeiro = completa.findIndex((p) => p.atendimentos + p.buscas + p.cliques > 0);
  const tendencia = primeiro > 0 ? completa.slice(primeiro) : completa;

  return {
    intervalo,
    anterior,
    granularidade: g,
    kpis,
    tendencia,
    destaques: maioresMovimentos([...candP, ...candL], 3),
    totais: { pelagem: tP, lirio: tL },
  };
}
