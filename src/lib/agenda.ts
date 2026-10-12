/**
 * Agenda do dia do Pelagem (módulo puro e testado). O que vai ao navegador passa por
 * `paraItemAgenda`, que monta o item campo a campo: nenhum valor em centavos sai do servidor.
 */
import { HORAS_FUNCIONAMENTO } from "./rotulos-pelagem";

/** Terça (2) a sábado (6), em dia ISO da semana. */
export const DIAS_ABERTOS = new Set([2, 3, 4, 5, 6]);
export const CAPACIDADE_POR_SLOT = 2;
const SLOT_MIN = 30;

const DIA_MS = 86_400_000;
const somarDias = (d: string, n: number) => new Date(Date.parse(`${d}T00:00:00Z`) + n * DIA_MS).toISOString().slice(0, 10);
/** 1 = segunda … 7 = domingo. */
export const diaDaSemanaIso = (d: string) => ((new Date(`${d}T00:00:00Z`).getUTCDay() + 6) % 7) + 1;

export const abertoNoDia = (d: string) => DIAS_ABERTOS.has(diaDaSemanaIso(d));

export function proximoDiaAberto(d: string, sentido: 1 | -1 = 1): string {
  let x = somarDias(d, sentido);
  while (!abertoNoDia(x)) x = somarDias(x, sentido);
  return x;
}

/** Slots de 30 min do funcionamento: "09:00" … "17:30". */
export const SLOTS = HORAS_FUNCIONAMENTO.flatMap((h) => [`${String(h).padStart(2, "0")}:00`, `${String(h).padStart(2, "0")}:30`]);

/** "HH:MM" no horário de São Paulo (UTC−3 fixo, sem horário de verão). */
export function horaSP(instante: Date): string {
  return new Date(instante.getTime() - 3 * 3_600_000).toISOString().slice(11, 16);
}

export interface LinhaAgendaBanco {
  id: string;
  inicio: Date;
  fim: Date;
  duracaoMinutos: number;
  servicoNome: string;
  porte: string;
  especie: string | null;
  status: "AGENDADO" | "CONCLUIDO" | "CANCELADO";
  clienteHash: string;
  zonaTaxi: string | null;
}

export interface ItemAgenda {
  id: string;
  inicio: string;
  fim: string;
  duracao: number;
  servico: string;
  porte: string;
  especie: string | null;
  status: LinhaAgendaBanco["status"];
  /** Começo do hash anônimo, para a equipe conferir com o sistema do Pelagem. */
  cliente: string;
  taxiDog: string | null;
}

export function paraItemAgenda(l: LinhaAgendaBanco): ItemAgenda {
  return {
    id: l.id,
    inicio: horaSP(l.inicio),
    fim: horaSP(l.fim),
    duracao: l.duracaoMinutos,
    servico: l.servicoNome,
    porte: l.porte,
    especie: l.especie,
    status: l.status,
    cliente: l.clienteHash.slice(0, 8),
    taxiDog: l.zonaTaxi,
  };
}

const minutos = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
};

/** Ocupação de cada slot: atendimentos não cancelados que cobrem o slot (capacidade 2). */
export function ocupacaoPorSlot(itens: readonly ItemAgenda[]): { slot: string; ocupados: number }[] {
  const ativos = itens.filter((i) => i.status !== "CANCELADO");
  return SLOTS.map((slot) => {
    const ini = minutos(slot);
    const ocupados = ativos.filter((i) => minutos(i.inicio) < ini + SLOT_MIN && minutos(i.fim) > ini).length;
    return { slot, ocupados };
  });
}

/** Próximo atendimento a começar (ou em andamento) a partir de agora, no dia de hoje. */
export function proximoAtendimento(itens: readonly ItemAgenda[], agoraHHMM: string): ItemAgenda | null {
  const agora = minutos(agoraHHMM);
  return itens.filter((i) => i.status === "AGENDADO" && minutos(i.fim) > agora).sort((a, b) => minutos(a.inicio) - minutos(b.inicio))[0] ?? null;
}
