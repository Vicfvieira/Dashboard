/** Rótulos do Pelagem usados em gráficos e tabelas (módulo puro, vai ao navegador). */

/** Dia da semana ISO (1 = segunda … 7 = domingo). */
export const DIA_SEMANA: Record<number, { curto: string; longo: string }> = {
  1: { curto: "Seg", longo: "segunda-feira" },
  2: { curto: "Ter", longo: "terça-feira" },
  3: { curto: "Qua", longo: "quarta-feira" },
  4: { curto: "Qui", longo: "quinta-feira" },
  5: { curto: "Sex", longo: "sexta-feira" },
  6: { curto: "Sáb", longo: "sábado" },
  7: { curto: "Dom", longo: "domingo" },
};

/** Terça a sábado: dias de funcionamento do pet spa. */
export const DIAS_FUNCIONAMENTO = [2, 3, 4, 5, 6] as const;
/** Horas de início possíveis (9h às 17h30; fecha às 18h). */
export const HORAS_FUNCIONAMENTO = [9, 10, 11, 12, 13, 14, 15, 16, 17] as const;

export const PORTE: Record<string, { curto: string; longo: string }> = {
  P: { curto: "Porte P", longo: "Porte P (até 10 kg)" },
  M: { curto: "Porte M", longo: "Porte M (10 a 25 kg)" },
  G: { curto: "Porte G", longo: "Porte G (acima de 25 kg)" },
};

export function nomeEspecie(especie: string | null): string {
  return especie === "CACHORRO" ? "Cachorro" : especie === "GATO" ? "Gato" : "Não informada";
}

/** Faixas de inatividade para priorizar a reativação. */
export const FAIXAS_INATIVIDADE = [
  { valor: "todos", rotulo: "Todos", min: 0, max: Infinity },
  { valor: "ate-60", rotulo: "Até 60 dias", min: 0, max: 60 },
  { valor: "61-90", rotulo: "61–90 dias", min: 61, max: 90 },
  { valor: "90+", rotulo: "Mais de 90", min: 91, max: Infinity },
] as const;
export type FaixaInatividade = (typeof FAIXAS_INATIVIDADE)[number]["valor"];

export function faixaDeInatividade(dias: number): Exclude<FaixaInatividade, "todos"> {
  return dias > 90 ? "90+" : dias > 60 ? "61-90" : "ate-60";
}
