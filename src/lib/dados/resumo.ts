import "server-only";
import type { Intervalo } from "@/lib/filtros";
import { prisma } from "@/lib/prisma";
import { limitesDia, limitesUtc } from "./periodo";

export interface ResumoPeriodo {
  atendimentosConcluidos: number;
  faturamentoCentavos: number;
  buscas: number;
  cliquesWhatsapp: number;
}

/** Totais básicos do intervalo (a Visão geral completa chega com src/lib/metrics.ts). */
export async function resumoDoPeriodo(i: Intervalo): Promise<ResumoPeriodo> {
  const { inicio, fim } = limitesUtc(i);
  const { de, ate } = limitesDia(i);
  const [pelagem, lirio] = await Promise.all([
    prisma.appointmentFact.aggregate({
      where: { status: "CONCLUIDO", inicio: { gte: inicio, lt: fim } },
      _count: { _all: true },
      _sum: { totalCentavos: true },
    }),
    prisma.marketEventFact.aggregate({
      where: { dia: { gte: de, lte: ate } },
      _sum: { buscas: true, cliquesWhatsapp: true },
    }),
  ]);
  return {
    atendimentosConcluidos: pelagem._count._all,
    faturamentoCentavos: pelagem._sum.totalCentavos ?? 0,
    buscas: lirio._sum.buscas ?? 0,
    cliquesWhatsapp: lirio._sum.cliquesWhatsapp ?? 0,
  };
}
