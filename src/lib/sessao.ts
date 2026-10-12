import "server-only";
import { forbidden, redirect } from "next/navigation";
import { auth } from "@/auth";
import { registrarAuditoria } from "@/lib/auditoria";
import type { Permissao, UsuarioSessao } from "@/lib/rbac";

/** Usuário da sessão atual, ou null. Lê cookies: use dentro de <Suspense>. */
export async function usuarioDaSessao(): Promise<UsuarioSessao | null> {
  const sessao = await auth();
  const u = sessao?.user;
  if (!u?.id || !u.papel) return null;
  return { id: u.id, nome: u.nome, email: u.email, papel: u.papel, somenteLeitura: u.somenteLeitura };
}

/** Usuário da sessão atual; sem sessão, redireciona ao login. */
export async function usuarioAtual(): Promise<UsuarioSessao> {
  const usuario = await usuarioDaSessao();
  if (!usuario) redirect("/login");
  return usuario;
}

export async function registrarNegacao(usuario: UsuarioSessao, permissao: Permissao): Promise<void> {
  await registrarAuditoria({
    acao: "ACESSO_NEGADO",
    sucesso: false,
    usuarioId: usuario.id,
    email: usuario.email,
    alvo: `permissao:${permissao}`,
  });
}

export async function negarAcesso(usuario: UsuarioSessao, permissao: Permissao): Promise<never> {
  await registrarNegacao(usuario, permissao);
  forbidden();
}
