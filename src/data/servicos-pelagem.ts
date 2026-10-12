/** Catálogo do Pelagem Studio (espelha prisma/seed-data.ts do Pelagem): preço e duração por porte. */
export type PorteCodigo = "P" | "M" | "G";

export interface ServicoPelagem {
  slug: string;
  nome: string;
  precos: Record<PorteCodigo, { centavos: number; minutos: number }>;
}

export const SERVICOS_PELAGEM: readonly ServicoPelagem[] = [
  { slug: "banho", nome: "Banho", precos: { P: { centavos: 6000, minutos: 60 }, M: { centavos: 8000, minutos: 60 }, G: { centavos: 11000, minutos: 90 } } },
  { slug: "banho-tosa-higienica", nome: "Banho + Tosa higiênica", precos: { P: { centavos: 8000, minutos: 90 }, M: { centavos: 10500, minutos: 90 }, G: { centavos: 14000, minutos: 120 } } },
  { slug: "tosa-completa", nome: "Tosa completa", precos: { P: { centavos: 11000, minutos: 120 }, M: { centavos: 14000, minutos: 150 }, G: { centavos: 18000, minutos: 180 } } },
  { slug: "hidratacao", nome: "Hidratação", precos: { P: { centavos: 5000, minutos: 30 }, M: { centavos: 6500, minutos: 60 }, G: { centavos: 8500, minutos: 60 } } },
  { slug: "corte-de-unhas", nome: "Corte de unhas", precos: { P: { centavos: 2500, minutos: 30 }, M: { centavos: 3000, minutos: 30 }, G: { centavos: 3500, minutos: 30 } } },
];

/** Zonas do táxi dog e taxa por trecho. */
export const ZONAS_TAXI = [
  { nome: "Centro", centavos: 1500 },
  { nome: "Norte", centavos: 2500 },
  { nome: "Leste", centavos: 2500 },
  { nome: "Sul", centavos: 2000 },
  { nome: "Oeste", centavos: 2000 },
] as const;
