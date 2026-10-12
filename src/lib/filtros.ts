/**
 * Filtros globais do painel, guardados na URL (compartilháveis e com voltar/avançar do navegador):
 *   ?periodo=30d|7d|90d|12m|personalizado&de=AAAA-MM-DD&ate=AAAA-MM-DD&comparar=0&produto=todos
 * Os valores padrão não aparecem na URL. Módulo puro: roda no servidor e no cliente.
 */
import { z } from "zod";

export const PERIODOS = ["7d", "30d", "90d", "12m", "personalizado"] as const;
export type Periodo = (typeof PERIODOS)[number];

export const PRODUTOS = ["todos", "pelagem", "lirio"] as const;
export type Produto = (typeof PRODUTOS)[number];

export const ROTULO_PERIODO: Record<Periodo, string> = {
  "7d": "7 dias",
  "30d": "30 dias",
  "90d": "90 dias",
  "12m": "12 meses",
  personalizado: "Personalizado",
};

export const ROTULO_PRODUTO: Record<Produto, string> = {
  todos: "Todos os produtos",
  pelagem: "Pelagem Studio",
  lirio: "Lírio",
};

export interface Filtros {
  periodo: Periodo;
  /** Só no período personalizado. */
  de: string | null;
  ate: string | null;
  comparar: boolean;
  produto: Produto;
}

export const FILTROS_PADRAO: Filtros = { periodo: "30d", de: null, ate: null, comparar: true, produto: "todos" };

/** Limite do período personalizado. */
export const MAX_DIAS_PERSONALIZADO = 730;

const dataIso = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((s) => !Number.isNaN(Date.parse(`${s}T00:00:00Z`)) && new Date(`${s}T00:00:00Z`).toISOString().startsWith(s));

type Parametros = Record<string, string | string[] | undefined> | URLSearchParams;

function ler(p: Parametros, chave: string): string | undefined {
  if (p instanceof URLSearchParams) return p.get(chave) ?? undefined;
  const v = p[chave];
  return Array.isArray(v) ? v[0] : v;
}

/**
 * Lê os filtros da URL. Valores inválidos caem no padrão (nunca quebram a página);
 * período personalizado inválido vira 30 dias.
 */
export function lerFiltros(p: Parametros, hoje: string): Filtros {
  const periodo = z.enum(PERIODOS).catch(FILTROS_PADRAO.periodo).parse(ler(p, "periodo"));
  const produto = z.enum(PRODUTOS).catch(FILTROS_PADRAO.produto).parse(ler(p, "produto"));
  const comparar = ler(p, "comparar") !== "0";

  if (periodo !== "personalizado") return { periodo, de: null, ate: null, comparar, produto };

  const de = dataIso.safeParse(ler(p, "de"));
  const ate = dataIso.safeParse(ler(p, "ate"));
  if (!de.success || !ate.success) return { ...FILTROS_PADRAO, comparar, produto };
  const ateLimitado = ate.data > hoje ? hoje : ate.data;
  if (de.data > ateLimitado || diasEntre(de.data, ateLimitado) + 1 > MAX_DIAS_PERSONALIZADO) {
    return { ...FILTROS_PADRAO, comparar, produto };
  }
  return { periodo, de: de.data, ate: ateLimitado, comparar, produto };
}

/** Parâmetros de URL dos filtros, omitindo os valores padrão. */
export function serializarFiltros(f: Filtros): URLSearchParams {
  const p = new URLSearchParams();
  if (f.periodo !== FILTROS_PADRAO.periodo) p.set("periodo", f.periodo);
  if (f.periodo === "personalizado" && f.de && f.ate) {
    p.set("de", f.de);
    p.set("ate", f.ate);
  }
  if (!f.comparar) p.set("comparar", "0");
  if (f.produto !== FILTROS_PADRAO.produto) p.set("produto", f.produto);
  return p;
}

/** Aplica uma mudança aos filtros e devolve a query string resultante (com "?" ou vazia). */
export function queryComFiltros(atual: Filtros, mudanca: Partial<Filtros>): string {
  const proximo = { ...atual, ...mudanca };
  if (proximo.periodo !== "personalizado") {
    proximo.de = null;
    proximo.ate = null;
  }
  const q = serializarFiltros(proximo).toString();
  return q ? `?${q}` : "";
}

// ─── Intervalos de datas (dias civis, "AAAA-MM-DD") ───────────────────────────

const DIA_MS = 86_400_000;

export function somarDiasIso(dia: string, dias: number): string {
  return new Date(Date.parse(`${dia}T00:00:00Z`) + dias * DIA_MS).toISOString().slice(0, 10);
}

export function diasEntre(de: string, ate: string): number {
  return Math.round((Date.parse(`${ate}T00:00:00Z`) - Date.parse(`${de}T00:00:00Z`)) / DIA_MS);
}

/** Hoje no fuso de São Paulo (UTC−3). */
export function hojeSP(agora: Date = new Date()): string {
  return new Date(agora.getTime() - 3 * 3_600_000).toISOString().slice(0, 10);
}

export interface Intervalo {
  /** Primeiro dia, inclusive. */
  de: string;
  /** Último dia, inclusive. */
  ate: string;
  dias: number;
}

/** Período selecionado, terminando hoje (inclusive). */
export function intervaloAtual(f: Filtros, hoje: string): Intervalo {
  if (f.periodo === "personalizado" && f.de && f.ate) {
    return { de: f.de, ate: f.ate, dias: diasEntre(f.de, f.ate) + 1 };
  }
  if (f.periodo === "12m") {
    const [a, m, d] = hoje.split("-").map(Number) as [number, number, number];
    // Mesmo dia do ano anterior + 1 (ex.: 13/10/2025 a 12/10/2026).
    const de = somarDiasIso(new Date(Date.UTC(a - 1, m - 1, Math.min(d, diasNoMes(a - 1, m)))).toISOString().slice(0, 10), 1);
    return { de, ate: hoje, dias: diasEntre(de, hoje) + 1 };
  }
  const dias = f.periodo === "7d" ? 7 : f.periodo === "90d" ? 90 : 30;
  return { de: somarDiasIso(hoje, -(dias - 1)), ate: hoje, dias };
}

/** Período imediatamente anterior, de mesma duração (base da comparação). */
export function intervaloAnterior(atual: Intervalo): Intervalo {
  const ate = somarDiasIso(atual.de, -1);
  return { de: somarDiasIso(ate, -(atual.dias - 1)), ate, dias: atual.dias };
}

function diasNoMes(ano: number, mes: number): number {
  return new Date(Date.UTC(ano, mes, 0)).getUTCDate();
}

const formatoCurto = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", timeZone: "UTC" });
const formatoAno = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });

/** "13 set – 12 out 2026". */
export function descreverIntervalo(i: Intervalo): string {
  const de = new Date(`${i.de}T00:00:00Z`);
  const ate = new Date(`${i.ate}T00:00:00Z`);
  const mesmoAno = i.de.slice(0, 4) === i.ate.slice(0, 4);
  const limpar = (s: string) => s.replace(/\./g, "").replace(/ de /g, " ");
  return `${limpar((mesmoAno ? formatoCurto : formatoAno).format(de))} – ${limpar(formatoAno.format(ate))}`;
}
