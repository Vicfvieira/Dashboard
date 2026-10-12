const inteiro = new Intl.NumberFormat("pt-BR");
const moeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const percentual = new Intl.NumberFormat("pt-BR", { style: "percent", maximumFractionDigits: 1 });

/** Formatos de número dos KPIs (moeda em centavos; percentual como fração). */
export type FormatoNumero = "inteiro" | "moeda" | "percentual";

export const formatarInteiro = (n: number) => inteiro.format(n);
export const formatarMoeda = (centavos: number) => moeda.format(centavos / 100);
export const formatarPercentual = (fracao: number) => percentual.format(fracao);

/** "+12,4%" / "−3,1%" (sinal de menos tipográfico). */
export function formatarVariacao(v: number): string {
  const texto = percentual.format(Math.abs(v));
  return `${v > 0 ? "+" : v < 0 ? "−" : ""}${texto}`;
}

/** Diferença em pontos percentuais: "+2,1 p.p." / "−0,4 p.p.". */
export function formatarPontos(p: number): string {
  const texto = Math.abs(p).toLocaleString("pt-BR", { maximumFractionDigits: 1 });
  return `${p > 0 ? "+" : p < 0 ? "−" : ""}${texto} p.p.`;
}

const dataHoraSP = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
const dataSP = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "short", year: "numeric" });
const dataUTC = new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC", day: "2-digit", month: "short", year: "numeric" });

/** "12/10, 14:32" no horário de Brasília. */
export const formatarDataHora = (d: Date) => dataHoraSP.format(d);
/** Instante → "12 de out. de 2026" no horário de Brasília. */
export const formatarData = (d: Date) => dataSP.format(d);
/** Coluna @db.Date (meia-noite UTC) → data civil, sem deslocar o dia. */
export const formatarDia = (d: Date) => dataUTC.format(d);

/** "850 ms", "2,4 s", "1 min 12 s". */
export function formatarDuracao(ms: number): string {
  if (ms < 1000) return `${ms} ms`;
  if (ms < 60_000) return `${(ms / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} s`;
  const min = Math.floor(ms / 60_000);
  return `${min} min ${Math.round((ms % 60_000) / 1000)} s`;
}

/** "agora há pouco", "há 5 min", "há 3 h", "há 2 dias". */
export function tempoRelativo(d: Date, agora: Date): string {
  const s = Math.max(0, Math.round((agora.getTime() - d.getTime()) / 1000));
  if (s < 60) return "agora há pouco";
  if (s < 3600) return `há ${Math.floor(s / 60)} min`;
  if (s < 86_400) return `há ${Math.floor(s / 3600)} h`;
  const dias = Math.floor(s / 86_400);
  return `há ${dias} ${dias === 1 ? "dia" : "dias"}`;
}
