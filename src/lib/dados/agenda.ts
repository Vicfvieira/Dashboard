import "server-only";
import { paraItemAgenda, type ItemAgenda } from "@/lib/agenda";
import { prisma } from "@/lib/prisma";

/**
 * Atendimentos do dia (fuso de São Paulo). Seleção explícita: valores em centavos não são lidos
 * do banco, então não há como chegarem ao navegador do atendimento.
 */
export async function agendaDoDia(dia: string): Promise<{ itens: ItemAgenda[]; sincronizadoEm: Date | null }> {
  const inicio = new Date(`${dia}T03:00:00.000Z`);
  const fim = new Date(inicio.getTime() + 86_400_000);
  const [linhas, ultima] = await Promise.all([
    prisma.appointmentFact.findMany({
      where: { inicio: { gte: inicio, lt: fim } },
      orderBy: [{ inicio: "asc" }, { servicoNome: "asc" }],
      select: { id: true, inicio: true, fim: true, duracaoMinutos: true, servicoNome: true, porte: true, especie: true, status: true, clienteHash: true, zonaTaxi: true },
    }),
    prisma.syncRun.findFirst({ where: { fonte: "PELAGEM", status: { in: ["SUCESSO", "PARCIAL"] } }, orderBy: { finalizadoEm: "desc" }, select: { finalizadoEm: true } }),
  ]);
  return { itens: linhas.map(paraItemAgenda), sincronizadoEm: ultima?.finalizadoEm ?? null };
}
