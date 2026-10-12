"use server";

import { AuthError } from "next-auth";
import { z } from "zod";
import { signIn } from "@/auth";
import { BLOQUEIO_MINUTOS } from "@/lib/auth/login";
import { credenciaisDemo } from "@/lib/demo";

export interface EstadoLogin {
  erro: string | null;
  email: string;
}

const formulario = z.object({
  email: z.string().trim().email("Informe um e-mail válido.").max(254),
  senha: z.string().min(1, "Informe a senha.").max(200),
  destino: z.string().optional(),
});

/** Aceita apenas caminhos internos ("/pelagem"), nunca URLs externas ou "//host". */
function destinoSeguro(destino: string | undefined): string {
  if (!destino || !destino.startsWith("/") || destino.startsWith("//") || destino.startsWith("/\\")) return "/";
  return destino;
}

export async function entrar(_anterior: EstadoLogin, dados: FormData): Promise<EstadoLogin> {
  const entrada = formulario.safeParse({
    email: dados.get("email"),
    senha: dados.get("senha"),
    destino: dados.get("destino") ?? undefined,
  });
  const email = typeof dados.get("email") === "string" ? String(dados.get("email")) : "";
  if (!entrada.success) {
    return { erro: entrada.error.issues[0]?.message ?? "Dados inválidos.", email };
  }

  try {
    await signIn("credentials", {
      email: entrada.data.email,
      senha: entrada.data.senha,
      redirectTo: destinoSeguro(entrada.data.destino),
    });
    return { erro: null, email };
  } catch (erro) {
    if (erro instanceof AuthError) {
      const codigo = "code" in erro ? erro.code : undefined;
      if (codigo === "bloqueada") {
        return {
          erro: `Acesso bloqueado por ${BLOQUEIO_MINUTOS} minutos após tentativas seguidas sem sucesso. Tente novamente mais tarde.`,
          email,
        };
      }
      return { erro: "E-mail ou senha incorretos.", email };
    }
    // Redirecionamento de sucesso do signIn (NEXT_REDIRECT) e erros inesperados seguem adiante.
    throw erro;
  }
}

/** Um clique para recrutadores: entra na conta de demonstração (somente leitura). */
export async function entrarComoDemo(_anterior: EstadoLogin, dados: FormData): Promise<EstadoLogin> {
  const demo = credenciaisDemo();
  if (!demo) return { erro: "O acesso de demonstração não está configurado neste ambiente.", email: "" };
  const destino = dados.get("destino");
  try {
    await signIn("credentials", { email: demo.email, senha: demo.senha, redirectTo: destinoSeguro(typeof destino === "string" ? destino : undefined) });
    return { erro: null, email: "" };
  } catch (erro) {
    if (erro instanceof AuthError) return { erro: "Não foi possível abrir a demonstração agora. Tente as credenciais abaixo.", email: "" };
    throw erro;
  }
}
