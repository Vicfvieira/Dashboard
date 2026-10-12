/**
 * Filtros da tela de Logs (auditoria). Puros e testados: a página e a exportação CSV usam o mesmo
 * parser e o mesmo `where`, então o arquivo traz exatamente o que a tela mostra.
 */
import { z } from "zod";
import type { AcaoAuditoria, Prisma } from "@prisma/client";

export const ACOES = [
  "LOGIN_SUCESSO",
  "LOGIN_FALHA",
  "LOGIN_BLOQUEADO",
  "LOGOUT",
  "ACESSO_NEGADO",
  "USUARIO_CRIADO",
  "USUARIO_ATUALIZADO",
  "USUARIO_DESATIVADO",
  "USUARIO_REATIVADO",
  "SENHA_REDEFINIDA",
  "SINCRONIZACAO",
  "EXPORTACAO",
] as const satisfies readonly AcaoAuditoria[];

export const ROTULO_ACAO: Record<AcaoAuditoria, string> = {
  LOGIN_SUCESSO: "Login",
  LOGIN_FALHA: "Login com falha",
  LOGIN_BLOQUEADO: "Login bloqueado",
  LOGOUT: "Saída",
  ACESSO_NEGADO: "Acesso negado",
  USUARIO_CRIADO: "Conta criada",
  USUARIO_ATUALIZADO: "Papel alterado",
  USUARIO_DESATIVADO: "Conta desativada",
  USUARIO_REATIVADO: "Conta reativada",
  SENHA_REDEFINIDA: "Senha redefinida",
  SINCRONIZACAO: "Sincronização",
  EXPORTACAO: "Exportação",
};

/** Grupos para o filtro (atalhos de segurança). */
export const GRUPOS = {
  seguranca: ["LOGIN_FALHA", "LOGIN_BLOQUEADO", "ACESSO_NEGADO"],
  contas: ["USUARIO_CRIADO", "USUARIO_ATUALIZADO", "USUARIO_DESATIVADO", "USUARIO_REATIVADO", "SENHA_REDEFINIDA"],
} as const satisfies Record<string, readonly AcaoAuditoria[]>;

export const POR_PAGINA = 50;
export const MAX_EXPORTACAO = 10_000;

const dataIso = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((d) => !Number.isNaN(Date.parse(`${d}T00:00:00Z`)));
const somarDias = (d: string, n: number) => new Date(Date.parse(`${d}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);

export interface FiltrosLogs {
  acao: AcaoAuditoria | keyof typeof GRUPOS | "todas";
  resultado: "todos" | "sucesso" | "falha";
  busca: string;
  de: string;
  ate: string;
  pagina: number;
}

/** Lê os filtros da URL; valor inválido vira o padrão (últimos 30 dias, tudo). */
export function lerFiltrosLogs(sp: Record<string, string | string[] | undefined>, hoje: string): FiltrosLogs {
  const um = (k: string) => {
    const v = sp[k];
    return Array.isArray(v) ? v[0] : v;
  };
  const ate = dataIso.catch(hoje).parse(um("ate") ?? hoje);
  let de = dataIso.catch(somarDias(ate, -29)).parse(um("de") ?? somarDias(ate, -29));
  if (de > ate) de = ate;
  return {
    acao: z.enum(["todas", "seguranca", "contas", ...ACOES]).catch("todas").parse(um("acao") ?? "todas"),
    resultado: z.enum(["todos", "sucesso", "falha"]).catch("todos").parse(um("resultado") ?? "todos"),
    busca: z.string().trim().max(100).catch("").parse(um("q") ?? ""),
    de,
    ate,
    pagina: z.coerce.number().int().min(1).max(10_000).catch(1).parse(um("pagina") ?? 1),
  };
}

/** Query string canônica (omite padrões). */
export function queryLogs(f: FiltrosLogs, hoje: string, mudanca: Partial<FiltrosLogs> = {}): string {
  const p = { ...f, ...mudanca };
  const q = new URLSearchParams();
  if (p.acao !== "todas") q.set("acao", p.acao);
  if (p.resultado !== "todos") q.set("resultado", p.resultado);
  if (p.busca) q.set("q", p.busca);
  if (p.ate !== hoje) q.set("ate", p.ate);
  if (p.de !== somarDias(p.ate, -29)) q.set("de", p.de);
  if (p.pagina > 1) q.set("pagina", String(p.pagina));
  const s = q.toString();
  return s ? `?${s}` : "";
}

/** Filtro do Prisma (parâmetros, nunca SQL concatenado). Datas no fuso de São Paulo. */
export function whereLogs(f: FiltrosLogs): Prisma.AuditLogWhereInput {
  const acoes: readonly AcaoAuditoria[] | null = f.acao === "todas" ? null : f.acao === "seguranca" || f.acao === "contas" ? GRUPOS[f.acao] : [f.acao];
  return {
    criadoEm: { gte: new Date(`${f.de}T03:00:00.000Z`), lt: new Date(Date.parse(`${f.ate}T03:00:00.000Z`) + 86_400_000) },
    ...(acoes ? { acao: { in: [...acoes] } } : {}),
    ...(f.resultado !== "todos" ? { sucesso: f.resultado === "sucesso" } : {}),
    ...(f.busca
      ? {
          OR: [
            { email: { contains: f.busca, mode: "insensitive" as const } },
            { ip: { contains: f.busca } },
            { alvo: { contains: f.busca, mode: "insensitive" as const } },
            { usuario: { nome: { contains: f.busca, mode: "insensitive" as const } } },
          ],
        }
      : {}),
  };
}
