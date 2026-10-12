import "server-only";
import { intervaloAnterior, type Intervalo } from "@/lib/filtros";
import { agruparPorSemana, completarDias, granularidade, type PontoSerie } from "@/lib/metrics";
import type { CelulaHora, DistritoConversao, TotaisFunil } from "@/lib/lirio-analise";
import { prisma } from "@/lib/prisma";

// Consultas agregadas da Lírio, sempre parametrizadas ($queryRaw com template).

export interface SegmentoFunil extends TotaisFunil {
  /** Slug da categoria ou id da região; null = sem categoria / sem bairro. */
  chave: string | null;
}

interface LinhaSegmento {
  categoria: string | null;
  regiao: string | null;
  buscas: bigint;
  visualizacoes: bigint;
  cliques: bigint;
}

async function segmentos(i: Intervalo): Promise<LinhaSegmento[]> {
  return prisma.$queryRaw<LinhaSegmento[]>`
    SELECT "categoria", "regiao"::text AS regiao,
           sum("buscas")::bigint AS buscas, sum("visualizacoes")::bigint AS visualizacoes, sum("cliquesWhatsapp")::bigint AS cliques
    FROM "MarketEventFact"
    WHERE "dia" BETWEEN ${i.de}::date AND ${i.ate}::date
    GROUP BY 1, 2`;
}

function agrupar(linhas: readonly LinhaSegmento[], por: "categoria" | "regiao"): SegmentoFunil[] {
  const m = new Map<string | null, SegmentoFunil>();
  for (const l of linhas) {
    const chave = l[por];
    const s = m.get(chave) ?? { chave, buscas: 0, visualizacoes: 0, cliques: 0 };
    s.buscas += Number(l.buscas);
    s.visualizacoes += Number(l.visualizacoes);
    s.cliques += Number(l.cliques);
    m.set(chave, s);
  }
  return [...m.values()];
}

const somar = (linhas: readonly LinhaSegmento[]): TotaisFunil =>
  linhas.reduce((t, l) => ({ buscas: t.buscas + Number(l.buscas), visualizacoes: t.visualizacoes + Number(l.visualizacoes), cliques: t.cliques + Number(l.cliques) }), { buscas: 0, visualizacoes: 0, cliques: 0 });

async function serieDiaria(i: Intervalo) {
  const linhas = await prisma.$queryRaw<Array<{ dia: string; buscas: bigint; visualizacoes: bigint; cliques: bigint }>>`
    SELECT to_char("dia", 'YYYY-MM-DD') AS dia, sum("buscas")::bigint AS buscas,
           sum("visualizacoes")::bigint AS visualizacoes, sum("cliquesWhatsapp")::bigint AS cliques
    FROM "MarketEventFact"
    WHERE "dia" BETWEEN ${i.de}::date AND ${i.ate}::date
    GROUP BY 1`;
  const serie = (campo: "buscas" | "visualizacoes" | "cliques"): PontoSerie[] => {
    const diaria = completarDias(
      linhas.map((l) => ({ data: l.dia, valor: Number(l[campo]) })),
      i.de,
      i.ate,
    );
    return granularidade(i.dias) === "dia" ? diaria : agruparPorSemana(diaria);
  };
  return { buscas: serie("buscas"), visualizacoes: serie("visualizacoes"), cliques: serie("cliques") };
}

async function distritos(i: Intervalo): Promise<DistritoConversao[]> {
  const linhas = await prisma.$queryRaw<Array<{ slug: string; buscas: bigint; visualizacoes: bigint; cliques: bigint }>>`
    SELECT "distritoSlug" AS slug, sum("buscas")::bigint AS buscas,
           sum("visualizacoes")::bigint AS visualizacoes, sum("cliquesWhatsapp")::bigint AS cliques
    FROM "MarketEventFact"
    WHERE "dia" BETWEEN ${i.de}::date AND ${i.ate}::date AND "distritoSlug" IS NOT NULL
    GROUP BY 1`;
  return linhas.map((l) => ({ slug: l.slug, buscas: Number(l.buscas), visualizacoes: Number(l.visualizacoes), cliques: Number(l.cliques) }));
}

export interface DadosHorarios {
  celulas: CelulaHora[];
  /** Dias do período com dados por hora (a sincronização de horários pode ser mais nova que o período). */
  diasComDados: number;
  primeiroDia: string | null;
}

async function horarios(i: Intervalo): Promise<DadosHorarios> {
  const [celulas, [cobertura]] = await Promise.all([
    prisma.$queryRaw<CelulaHora[]>`
      SELECT extract(isodow FROM "dia")::int AS "diaSemana", "hora", sum("buscas")::int AS valor
      FROM "SearchHourFact"
      WHERE "dia" BETWEEN ${i.de}::date AND ${i.ate}::date
      GROUP BY 1, 2`,
    prisma.$queryRaw<Array<{ dias: number; primeiro: string | null }>>`
      SELECT count(DISTINCT "dia")::int AS dias, to_char(min("dia"), 'YYYY-MM-DD') AS primeiro
      FROM "SearchHourFact"
      WHERE "dia" BETWEEN ${i.de}::date AND ${i.ate}::date`,
  ]);
  return { celulas, diasComDados: cobertura?.dias ?? 0, primeiroDia: cobertura?.primeiro ?? null };
}

export interface FotoOferta {
  data: string;
  categoria: string;
  ativas: number;
  verificadas: number;
}

/** Fotos da oferta no período (mais a última antes dele, como ponto de partida). */
async function evolucaoOferta(i: Intervalo): Promise<FotoOferta[]> {
  const linhas = await prisma.$queryRaw<Array<{ data: string; categoria: string; ativas: bigint; verificadas: bigint }>>`
    SELECT to_char("data", 'YYYY-MM-DD') AS data, "categoria", sum("ativas")::bigint AS ativas, sum("verificadas")::bigint AS verificadas
    FROM "ProfessionalStat"
    WHERE "data" <= ${i.ate}::date
      AND "data" >= coalesce((SELECT max("data") FROM "ProfessionalStat" WHERE "data" < ${i.de}::date), ${i.de}::date)
    GROUP BY 1, 2
    ORDER BY 1, 2`;
  return linhas.map((l) => ({ data: l.data, categoria: l.categoria, ativas: Number(l.ativas), verificadas: Number(l.verificadas) }));
}

async function ofertaEm(dia: string): Promise<number | null> {
  const [l] = await prisma.$queryRaw<Array<{ ativas: bigint | null }>>`
    SELECT sum("ativas")::bigint AS ativas
    FROM "ProfessionalStat"
    WHERE "data" = (SELECT max("data") FROM "ProfessionalStat" WHERE "data" <= ${dia}::date)`;
  return l?.ativas === null || l?.ativas === undefined ? null : Number(l.ativas);
}

export interface DadosLirio {
  intervalo: Intervalo;
  anterior: Intervalo;
  totais: TotaisFunil;
  totaisAnterior: TotaisFunil;
  series: { buscas: PontoSerie[]; visualizacoes: PontoSerie[]; cliques: PontoSerie[] };
  porCategoria: SegmentoFunil[];
  porCategoriaAnterior: SegmentoFunil[];
  porRegiao: SegmentoFunil[];
  porRegiaoAnterior: SegmentoFunil[];
  distritos: DistritoConversao[];
  horarios: DadosHorarios;
  oferta: FotoOferta[];
  ativas: number | null;
  ativasAnterior: number | null;
}

export async function carregarLirio(intervalo: Intervalo): Promise<DadosLirio> {
  const anterior = intervaloAnterior(intervalo);
  const [seg, segAnt, series, dist, horas, oferta, ativas, ativasAnterior] = await Promise.all([
    segmentos(intervalo),
    segmentos(anterior),
    serieDiaria(intervalo),
    distritos(intervalo),
    horarios(intervalo),
    evolucaoOferta(intervalo),
    ofertaEm(intervalo.ate),
    ofertaEm(anterior.ate),
  ]);
  return {
    intervalo,
    anterior,
    totais: somar(seg),
    totaisAnterior: somar(segAnt),
    series,
    porCategoria: agrupar(seg, "categoria"),
    porCategoriaAnterior: agrupar(segAnt, "categoria"),
    porRegiao: agrupar(seg, "regiao"),
    porRegiaoAnterior: agrupar(segAnt, "regiao"),
    distritos: dist,
    horarios: horas,
    oferta,
    ativas,
    ativasAnterior,
  };
}

