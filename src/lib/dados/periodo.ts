import type { Intervalo } from "@/lib/filtros";

/** Limites UTC de um intervalo de dias de São Paulo (o dia começa às 03:00 UTC). */
export function limitesUtc(i: Intervalo): { inicio: Date; fim: Date } {
  return {
    inicio: new Date(`${i.de}T03:00:00.000Z`),
    fim: new Date(Date.parse(`${i.ate}T03:00:00.000Z`) + 86_400_000),
  };
}

/** Limites como datas (colunas @db.Date), fim inclusivo. */
export function limitesDia(i: Intervalo): { de: Date; ate: Date } {
  return { de: new Date(`${i.de}T00:00:00.000Z`), ate: new Date(`${i.ate}T00:00:00.000Z`) };
}
