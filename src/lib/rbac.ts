/**
 * Controle de acesso por papel (RBAC) do Painelux.
 *
 * A matriz é a única fonte de verdade: páginas, Route Handlers, Server Actions, consultas e a
 * navegação perguntam a `can()`. Permissões de escrita são negadas a usuários somente leitura
 * (o acesso de demonstração), qualquer que seja o papel.
 *
 * Este módulo é puro na parte de matriz (testável); os helpers de servidor importam a sessão
 * sob demanda.
 */
import type { Papel } from "@prisma/client";

export const PERMISSOES = {
  "visao-geral:ver": { descricao: "Ver a visão geral consolidada", escrita: false },
  "pelagem:ver": { descricao: "Ver o dashboard do Pelagem", escrita: false },
  "pelagem:financeiro": { descricao: "Ver faturamento, ticket médio e valores", escrita: false },
  "lirio:ver": { descricao: "Ver o dashboard da Lírio", escrita: false },
  "mercado:ver": { descricao: "Ver o mapa de mercado", escrita: false },
  "clientes:ver": { descricao: "Ver clientes (hash anônimo) e retenção", escrita: false },
  "agenda:ver": { descricao: "Ver a agenda do dia do Pelagem", escrita: false },
  "insights:ver": { descricao: "Ver insights automáticos", escrita: false },
  "dados:exportar": { descricao: "Exportar gráficos e tabelas (PNG e CSV)", escrita: false },
  "configuracoes:ver": { descricao: "Ver configurações e status das integrações", escrita: false },
  "sync:executar": { descricao: "Disparar sincronização com as APIs", escrita: true },
  "usuarios:ver": { descricao: "Ver usuários", escrita: false },
  "usuarios:gerenciar": { descricao: "Criar, editar papel, desativar e redefinir senha", escrita: true },
  "logs:ver": { descricao: "Ver logs de auditoria", escrita: false },
  "logs:exportar": { descricao: "Exportar logs de auditoria", escrita: false },
  "infra:ver": { descricao: "Ver dados de infraestrutura (Neon e Vercel)", escrita: false },
} as const satisfies Record<string, { descricao: string; escrita: boolean }>;

export type Permissao = keyof typeof PERMISSOES;

export const TODAS_PERMISSOES = Object.keys(PERMISSOES) as Permissao[];

const DASHBOARDS: readonly Permissao[] = [
  "visao-geral:ver",
  "pelagem:ver",
  "pelagem:financeiro",
  "lirio:ver",
  "mercado:ver",
  "clientes:ver",
  "agenda:ver",
  "insights:ver",
];

export const MATRIZ: Readonly<Record<Papel, ReadonlySet<Permissao>>> = {
  ADMIN: new Set(TODAS_PERMISSOES),
  GESTOR: new Set<Permissao>([...DASHBOARDS, "dados:exportar", "configuracoes:ver"]),
  ATENDENTE: new Set<Permissao>(["agenda:ver"]),
};

export interface Ator {
  papel: Papel;
  somenteLeitura: boolean;
}

export function can(ator: Ator | null | undefined, permissao: Permissao): boolean {
  if (!ator) return false;
  if (!MATRIZ[ator.papel].has(permissao)) return false;
  if (ator.somenteLeitura && PERMISSOES[permissao].escrita) return false;
  return true;
}

export function permissoesDe(ator: Ator): Permissao[] {
  return TODAS_PERMISSOES.filter((p) => can(ator, p));
}

/** Rótulos dos papéis para a interface. */
export const NOME_PAPEL: Record<Papel, string> = {
  ADMIN: "Administração",
  GESTOR: "Gestão",
  ATENDENTE: "Atendimento",
};

// ─── Helpers de servidor ──────────────────────────────────────────────────────

export interface UsuarioSessao extends Ator {
  id: string;
  nome: string;
  email: string;
}

/**
 * Para páginas e Server Actions: exige sessão e permissão. Sem sessão, redireciona ao login;
 * sem permissão, registra ACESSO_NEGADO e responde 403 (forbidden).
 */
export async function requirePermission(permissao: Permissao): Promise<UsuarioSessao> {
  const { usuarioAtual, negarAcesso } = await import("./sessao");
  const usuario = await usuarioAtual();
  if (!can(usuario, permissao)) return negarAcesso(usuario, permissao);
  return usuario;
}

/**
 * Para Route Handlers: devolve o usuário ou uma Response 401/403 pronta, sem redirecionar.
 */
export async function requirePermissionApi(permissao: Permissao): Promise<{ ok: true; usuario: UsuarioSessao } | { ok: false; resposta: Response }> {
  const { usuarioDaSessao, registrarNegacao } = await import("./sessao");
  const usuario = await usuarioDaSessao();
  if (!usuario) return { ok: false, resposta: Response.json({ erro: "Não autenticado." }, { status: 401 }) };
  if (!can(usuario, permissao)) {
    await registrarNegacao(usuario, permissao);
    return { ok: false, resposta: Response.json({ erro: "Sem permissão para este recurso." }, { status: 403 }) };
  }
  return { ok: true, usuario };
}
