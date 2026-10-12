/**
 * Datas no fuso de São Paulo (UTC−3, sem horário de verão desde 2019).
 * "Dia" é sempre representado como Date à meia-noite UTC, o formato de colunas @db.Date.
 */
export const OFFSET_SP_HORAS = -3;
const DIA_MS = 86_400_000;

/** Dia civil de São Paulo correspondente ao instante. */
export function diaSP(instante: Date): Date {
  const local = new Date(instante.getTime() + OFFSET_SP_HORAS * 3_600_000);
  return new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()));
}

export function somarDias(dia: Date, dias: number): Date {
  return new Date(dia.getTime() + dias * DIA_MS);
}

export function diferencaDias(a: Date, b: Date): number {
  return Math.round((a.getTime() - b.getTime()) / DIA_MS);
}

/** 0 = domingo … 6 = sábado. */
export function diaDaSemana(dia: Date): number {
  return dia.getUTCDay();
}

/** "AAAA-MM-DD". */
export function isoDia(dia: Date): string {
  return dia.toISOString().slice(0, 10);
}

/** Instante UTC de um horário local de São Paulo naquele dia. */
export function horarioSP(dia: Date, hora: number, minuto = 0): Date {
  return new Date(dia.getTime() + (hora - OFFSET_SP_HORAS) * 3_600_000 + minuto * 60_000);
}
