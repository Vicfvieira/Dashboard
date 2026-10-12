import "server-only";
import type { Fonte, GatilhoSync, StatusSync } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { configDaFonte } from "@/lib/sync/executar";

export interface CoberturaOrigem {
  origem: "API" | "SEED";
  linhas: number;
  de: Date | null;
  ate: Date | null;
}

export interface StatusFonte {
  fonte: Fonte;
  host: string | null;
  chaveConfigurada: boolean;
  ultima: { status: StatusSync; iniciadoEm: Date; duracaoMs: number | null; erro: string | null; resumo: string | null } | null;
  ultimoSucesso: Date | null;
  cobertura: CoberturaOrigem[];
  /** Lírio: foto de oferta mais recente. */
  oferta?: { data: Date; contagens: number; ativas: number; origem: "API" | "SEED" } | null;
}

export interface LinhaHistorico {
  id: string;
  fonte: Fonte;
  gatilho: GatilhoSync;
  status: StatusSync;
  iniciadoEm: Date;
  duracaoMs: number | null;
  registrosLidos: number;
  registrosGravados: number;
  tentativas: number;
  erro: string | null;
  resumo: string | null;
  disparadoPor: string | null;
}

function resumoDe(detalhes: unknown): string | null {
  if (detalhes && typeof detalhes === "object" && "resumo" in detalhes && typeof detalhes.resumo === "string") return detalhes.resumo;
  if (detalhes && typeof detalhes === "object" && "descricao" in detalhes && typeof detalhes.descricao === "string") return detalhes.descricao;
  return null;
}

async function cobertura(fonte: Fonte): Promise<CoberturaOrigem[]> {
  if (fonte === "PELAGEM") {
    const g = await prisma.appointmentFact.groupBy({ by: ["origem"], _count: { _all: true }, _min: { inicio: true }, _max: { inicio: true } });
    return g.map((x) => ({ origem: x.origem, linhas: x._count._all, de: x._min.inicio, ate: x._max.inicio }));
  }
  const g = await prisma.marketEventFact.groupBy({ by: ["origem"], _count: { _all: true }, _min: { dia: true }, _max: { dia: true } });
  return g.map((x) => ({ origem: x.origem, linhas: x._count._all, de: x._min.dia, ate: x._max.dia }));
}

async function statusDaFonte(fonte: Fonte): Promise<StatusFonte> {
  const config = configDaFonte(fonte);
  const [ultima, ultimoSucesso, cob, foto] = await Promise.all([
    prisma.syncRun.findFirst({ where: { fonte, gatilho: { not: "SEED" } }, orderBy: { iniciadoEm: "desc" } }),
    prisma.syncRun.findFirst({ where: { fonte, gatilho: { not: "SEED" }, status: { in: ["SUCESSO", "PARCIAL"] } }, orderBy: { iniciadoEm: "desc" }, select: { iniciadoEm: true } }),
    cobertura(fonte),
    fonte === "LIRIO" ? prisma.professionalStat.findFirst({ orderBy: { data: "desc" }, select: { data: true } }) : null,
  ]);

  let oferta: StatusFonte["oferta"] = null;
  if (foto) {
    const agregado = await prisma.professionalStat.groupBy({ by: ["origem"], where: { data: foto.data }, _count: { _all: true }, _sum: { ativas: true } });
    const principal = agregado.sort((a, b) => b._count._all - a._count._all)[0];
    if (principal) oferta = { data: foto.data, contagens: principal._count._all, ativas: principal._sum.ativas ?? 0, origem: principal.origem };
  }

  return {
    fonte,
    host: config ? new URL(config.baseUrl).host : null,
    chaveConfigurada: Boolean(config),
    ultima: ultima ? { status: ultima.status, iniciadoEm: ultima.iniciadoEm, duracaoMs: ultima.duracaoMs, erro: ultima.erro, resumo: resumoDe(ultima.detalhes) } : null,
    ultimoSucesso: ultimoSucesso?.iniciadoEm ?? null,
    cobertura: cob.sort((a) => (a.origem === "API" ? -1 : 1)),
    oferta,
  };
}

export async function statusDasIntegracoes(): Promise<StatusFonte[]> {
  return Promise.all([statusDaFonte("PELAGEM"), statusDaFonte("LIRIO")]);
}

export async function historicoSincronizacoes(limite = 25): Promise<LinhaHistorico[]> {
  const runs = await prisma.syncRun.findMany({
    orderBy: { iniciadoEm: "desc" },
    take: limite,
    include: { disparadoPor: { select: { nome: true } } },
  });
  return runs.map((r) => ({
    id: r.id,
    fonte: r.fonte,
    gatilho: r.gatilho,
    status: r.status,
    iniciadoEm: r.iniciadoEm,
    duracaoMs: r.duracaoMs,
    registrosLidos: r.registrosLidos,
    registrosGravados: r.registrosGravados,
    tentativas: r.tentativas,
    erro: r.erro,
    resumo: resumoDe(r.detalhes),
    disparadoPor: r.disparadoPor?.nome ?? null,
  }));
}
