import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";
import { contextoDeHeaders } from "@/lib/auditoria";
import { dependenciasLogin } from "@/lib/auth/dependencias";
import { SESSAO_HORAS, verificarLogin } from "@/lib/auth/login";
import { prisma } from "@/lib/prisma";

/** Erro exibido quando a conta está bloqueada (o código vai para a tela de login). */
export class ContaBloqueada extends CredentialsSignin {
  code = "bloqueada";
}

const credenciais = z.object({
  email: z.string().trim().email().max(254),
  senha: z.string().min(1).max(200),
});

const SESSAO_MS = SESSAO_HORAS * 3_600_000;
/** Intervalo para reconferir no banco se o usuário continua ativo e com o mesmo papel. */
const RECONFERENCIA_MS = 60_000;

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  session: { strategy: "jwt", maxAge: SESSAO_HORAS * 3600 },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: { email: {}, senha: {} },
      async authorize(entrada, request) {
        const dados = credenciais.safeParse(entrada);
        if (!dados.success) return null;
        const resultado = await verificarLogin(
          dependenciasLogin(contextoDeHeaders(request.headers)),
          dados.data.email,
          dados.data.senha,
        );
        if (resultado.ok) {
          const u = resultado.usuario;
          return { id: u.id, name: u.nome, email: u.email, papel: u.papel, somenteLeitura: u.somenteLeitura };
        }
        if (resultado.motivo === "bloqueada") throw new ContaBloqueada();
        return null;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      const agora = Date.now();
      if (user?.id) {
        return {
          ...token,
          uid: user.id,
          nome: user.name ?? "",
          papel: user.papel,
          somenteLeitura: user.somenteLeitura,
          loginEm: agora,
          verificadoEm: agora,
        };
      }
      // Sessão absoluta de 8h desde o login, mesmo com uso contínuo.
      if (!token.uid || !token.loginEm || agora - token.loginEm > SESSAO_MS) return null;

      if (!token.verificadoEm || agora - token.verificadoEm > RECONFERENCIA_MS) {
        const atual = await prisma.user.findUnique({
          where: { id: token.uid },
          select: { ativo: true, papel: true, somenteLeitura: true, nome: true },
        });
        // Usuário desativado ou removido perde a sessão em até 1 minuto.
        if (!atual?.ativo) return null;
        return { ...token, papel: atual.papel, somenteLeitura: atual.somenteLeitura, nome: atual.nome, verificadoEm: agora };
      }
      return token;
    },
    session({ session, token }) {
      if (token.uid && token.papel) {
        session.user = {
          ...session.user,
          id: token.uid,
          nome: token.nome ?? "",
          email: token.email ?? "",
          papel: token.papel,
          somenteLeitura: token.somenteLeitura ?? false,
        };
      }
      return session;
    },
  },
});
