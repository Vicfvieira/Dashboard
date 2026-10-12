"use server";

import { signOut } from "@/auth";
import { registrarAuditoria } from "@/lib/auditoria";
import { usuarioDaSessao } from "@/lib/sessao";

export async function sair(): Promise<void> {
  const usuario = await usuarioDaSessao();
  if (usuario) {
    await registrarAuditoria({ acao: "LOGOUT", usuarioId: usuario.id, email: usuario.email });
  }
  await signOut({ redirectTo: "/login" });
}
