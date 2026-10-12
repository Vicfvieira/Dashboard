import "server-only";
import { Prisma } from "@prisma/client";
import { DISTRITOS } from "@/data/sp-geo";
import type { Intervalo } from "@/lib/filtros";
import type { CelulaMercado } from "@/lib/mercado";
import { prisma } from "@/lib/prisma";

// Consultas do mapa de mercado, agregadas e parametrizadas ($queryRaw com template).

export interface DadosMercado {
  celulas: CelulaMercado[];
  /** Data da foto de oferta usada (a mais recente até o fim do período). */
  dataOferta: string | null;
}

export async function carregarMercado(i: Intervalo): Promise<DadosMercado> {
  const [eventos, [foto]] = await Promise.all([
    prisma.$queryRaw<Array<{ distrito: string; categoria: string | null; buscas: bigint; visualizacoes: bigint; cliques: bigint }>>`
      SELECT "distritoSlug" AS distrito, "categoria", sum("buscas")::bigint AS buscas,
             sum("visualizacoes")::bigint AS visualizacoes, sum("cliquesWhatsapp")::bigint AS cliques
      FROM "MarketEventFact"
      WHERE "dia" BETWEEN ${i.de}::date AND ${i.ate}::date AND "distritoSlug" IS NOT NULL
      GROUP BY 1, 2`,
    prisma.$queryRaw<Array<{ data: string | null }>>`
      SELECT to_char(max("data"), 'YYYY-MM-DD') AS data FROM "ProfessionalStat" WHERE "data" <= ${i.ate}::date`,
  ]);
  const dataOferta = foto?.data ?? null;
  const oferta = dataOferta
    ? await prisma.$queryRaw<Array<{ distrito: string; categoria: string; ativas: number }>>`
        SELECT "distritoSlug" AS distrito, "categoria", "ativas"
        FROM "ProfessionalStat" WHERE "data" = ${dataOferta}::date`
    : [];

  const celulas = new Map<string, CelulaMercado>();
  const celula = (distrito: string, categoria: string | null) => {
    const chave = `${distrito}|${categoria ?? "-"}`;
    let c = celulas.get(chave);
    if (!c) celulas.set(chave, (c = { distrito, categoria, buscas: 0, visualizacoes: 0, cliques: 0, ativas: 0 }));
    return c;
  };
  for (const e of eventos) {
    const c = celula(e.distrito, e.categoria);
    c.buscas = Number(e.buscas);
    c.visualizacoes = Number(e.visualizacoes);
    c.cliques = Number(e.cliques);
  }
  for (const o of oferta) celula(o.distrito, o.categoria).ativas = o.ativas;
  return { celulas: [...celulas.values()], dataOferta };
}

export interface MesDistrito {
  /** "AAAA-MM". */
  mes: string;
  buscas: number;
  visualizacoes: number;
  cliques: number;
  ativas: number | null;
  /** Médias por distrito da região do distrito. */
  buscasRegiao: number;
  ativasRegiao: number | null;
  /** Mês ainda em andamento (até a data final). */
  parcial: boolean;
}

/** Últimos 12 meses do distrito (até `ate`), com a média por distrito da sua região. */
export async function evolucaoDistrito(slug: string, categoria: string | null, ate: string): Promise<MesDistrito[]> {
  const distrito = DISTRITOS.find((d) => d.slug === slug);
  if (!distrito) return [];
  const daRegiao = DISTRITOS.filter((d) => d.regiao === distrito.regiao).length;
  const inicio = `${ate.slice(0, 7)}-01`;
  const filtroCategoria = categoria ? Prisma.sql`AND "categoria" = ${categoria}` : Prisma.empty;

  const [eventos, oferta] = await Promise.all([
    prisma.$queryRaw<Array<{ mes: string; buscas: bigint; visualizacoes: bigint; cliques: bigint; buscas_regiao: bigint }>>`
      SELECT to_char(date_trunc('month', "dia"), 'YYYY-MM') AS mes,
             coalesce(sum("buscas") FILTER (WHERE "distritoSlug" = ${slug}), 0)::bigint AS buscas,
             coalesce(sum("visualizacoes") FILTER (WHERE "distritoSlug" = ${slug}), 0)::bigint AS visualizacoes,
             coalesce(sum("cliquesWhatsapp") FILTER (WHERE "distritoSlug" = ${slug}), 0)::bigint AS cliques,
             coalesce(sum("buscas"), 0)::bigint AS buscas_regiao
      FROM "MarketEventFact"
      WHERE "dia" >= (${inicio}::date - interval '11 months') AND "dia" <= ${ate}::date
        AND "regiao" = ${distrito.regiao}::"Regiao" ${filtroCategoria}
      GROUP BY 1`,
    // Oferta do mês = a última foto do mês.
    prisma.$queryRaw<Array<{ mes: string; ativas: bigint; ativas_regiao: bigint }>>`
      WITH fotos AS (
        SELECT max("data") AS data FROM "ProfessionalStat"
        WHERE "data" >= (${inicio}::date - interval '11 months') AND "data" <= ${ate}::date
        GROUP BY date_trunc('month', "data")
      )
      SELECT to_char(date_trunc('month', p."data"), 'YYYY-MM') AS mes,
             coalesce(sum(p."ativas") FILTER (WHERE p."distritoSlug" = ${slug}), 0)::bigint AS ativas,
             coalesce(sum(p."ativas"), 0)::bigint AS ativas_regiao
      FROM "ProfessionalStat" p JOIN fotos f ON f.data = p."data"
      WHERE p."regiao" = ${distrito.regiao}::"Regiao" ${categoria ? Prisma.sql`AND p."categoria" = ${categoria}` : Prisma.empty}
      GROUP BY 1`,
  ]);

  const porMes = new Map(eventos.map((e) => [e.mes, e]));
  const ofertaMes = new Map(oferta.map((o) => [o.mes, o]));
  const meses: MesDistrito[] = [];
  for (let k = 11; k >= 0; k--) {
    const d = new Date(`${inicio}T00:00:00Z`);
    d.setUTCMonth(d.getUTCMonth() - k);
    const mes = d.toISOString().slice(0, 7);
    const e = porMes.get(mes);
    const o = ofertaMes.get(mes);
    meses.push({
      mes,
      buscas: Number(e?.buscas ?? 0),
      visualizacoes: Number(e?.visualizacoes ?? 0),
      cliques: Number(e?.cliques ?? 0),
      ativas: o ? Number(o.ativas) : null,
      buscasRegiao: Number(e?.buscas_regiao ?? 0) / daRegiao,
      ativasRegiao: o ? Number(o.ativas_regiao) / daRegiao : null,
      parcial: k === 0,
    });
  }
  // Meses antes do primeiro registro não entram (o histórico da fonte começa em algum ponto).
  const primeiro = meses.findIndex((m) => m.buscas > 0 || m.buscasRegiao > 0 || m.ativas !== null);
  return primeiro < 0 ? [] : meses.slice(primeiro);
}
