/**
 * Controle de acesso por papel (RBAC) do Painelux.
 *
 * A matriz (src/lib/permissoes.ts) é a única fonte de verdade: páginas, Route Handlers, Server
 * Actions, consultas e a navegação perguntam a `can()`. Os helpers abaixo aplicam a matriz no
 * servidor e auditam negações.
 */
import { can, type Ator, type Permissao } from "./permissoes";

export * from "./permissoes";

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
