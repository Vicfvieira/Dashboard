const inteiro = new Intl.NumberFormat("pt-BR");
const moeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const percentual = new Intl.NumberFormat("pt-BR", { style: "percent", maximumFractionDigits: 1 });

export const formatarInteiro = (n: number) => inteiro.format(n);
export const formatarMoeda = (centavos: number) => moeda.format(centavos / 100);
export const formatarPercentual = (fracao: number) => percentual.format(fracao);

/** Variação relativa entre períodos; null quando não há base de comparação. */
export function variacao(atual: number, anterior: number): number | null {
  if (anterior === 0) return null;
  return (atual - anterior) / anterior;
}

/** "+12,4%" / "−3,1%" (sinal de menos tipográfico). */
export function formatarVariacao(v: number): string {
  const texto = percentual.format(Math.abs(v));
  return `${v > 0 ? "+" : v < 0 ? "−" : ""}${texto}`;
}
