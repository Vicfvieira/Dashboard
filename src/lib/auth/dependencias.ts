import "server-only";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { registrarAuditoria, type ContextoRequisicao } from "@/lib/auditoria";
import type { DependenciasLogin } from "./login";

/** Implementação real das dependências do login (Prisma, bcrypt e AuditLog). */
export function dependenciasLogin(contexto: ContextoRequisicao): DependenciasLogin {
  return {
    buscarPorEmail: (email) =>
      prisma.user.findUnique({
        where: { email },
        select: {
          id: true,
          nome: true,
          email: true,
          senhaHash: true,
          papel: true,
          ativo: true,
          somenteLeitura: true,
          tentativasFalhas: true,
          bloqueadoAte: true,
        },
      }),
    incrementarFalhas: async (usuarioId) => {
      // Incremento atômico no banco: tentativas simultâneas não se perdem.
      const u = await prisma.user.update({
        where: { id: usuarioId },
        data: { tentativasFalhas: { increment: 1 } },
        select: { tentativasFalhas: true },
      });
      return u.tentativasFalhas;
    },
    bloquear: async (usuarioId, ate) => {
      await prisma.user.update({ where: { id: usuarioId }, data: { bloqueadoAte: ate, tentativasFalhas: 0 } });
    },
    registrarSucesso: async (usuarioId, quando) => {
      await prisma.user.update({
        where: { id: usuarioId },
        data: { tentativasFalhas: 0, bloqueadoAte: null, ultimoLoginEm: quando },
      });
    },
    compararSenha: (senha, hash) => bcrypt.compare(senha, hash),
    auditar: (evento) => {
      const { acao, usuarioId, email, ...resto } = evento;
      const detalhes = Object.fromEntries(
        Object.entries(resto).map(([k, v]) => [k, v instanceof Date ? v.toISOString() : v]),
      );
      return registrarAuditoria({
        acao,
        sucesso: acao === "LOGIN_SUCESSO",
        usuarioId,
        email,
        detalhes,
        contexto,
      });
    },
    agora: () => new Date(),
  };
}
