/**
 * Regras de gestão de usuários (puras e testadas). As Server Actions aplicam estas regras dentro de
 * uma transação com trava, para dois administradores não removerem o último ADMIN ao mesmo tempo.
 */
import { z } from "zod";
import type { Papel } from "@prisma/client";

export const PAPEIS = ["ADMIN", "GESTOR", "ATENDENTE"] as const satisfies readonly Papel[];

export const ROTULO_PAPEL: Record<Papel, string> = {
  ADMIN: "Administração",
  GESTOR: "Gestão",
  ATENDENTE: "Atendimento",
};

export const DESCRICAO_PAPEL: Record<Papel, string> = {
  ADMIN: "Tudo: dashboards, usuários, logs, sincronização e infraestrutura.",
  GESTOR: "Dashboards e exportação. Sem usuários, logs ou sincronização.",
  ATENDENTE: "Só a agenda do dia do Pelagem, sem valores financeiros.",
};

export const novoUsuario = z.object({
  nome: z.string().trim().min(2, "Informe o nome (mínimo 2 letras).").max(80, "Nome muito longo."),
  email: z.string().trim().toLowerCase().email("E-mail inválido.").max(254),
  papel: z.enum(PAPEIS, { message: "Escolha um papel." }),
});
export type NovoUsuario = z.infer<typeof novoUsuario>;

export const idUsuario = z.string().min(1).max(40).regex(/^[a-z0-9]+$/i);

export interface EstadoUsuario {
  id: string;
  papel: Papel;
  ativo: boolean;
}

export type Mudanca = { tipo: "papel"; papel: Papel } | { tipo: "ativo"; ativo: boolean };

/**
 * Decide se a mudança é permitida. `adminsAtivos` é a contagem atual de ADMIN ativos.
 * Nunca deixa o sistema sem ADMIN ativo e não deixa quem age tirar o próprio acesso.
 */
export function validarMudanca(ator: { id: string }, alvo: EstadoUsuario, mudanca: Mudanca, adminsAtivos: number): { ok: true } | { ok: false; erro: string } {
  const perdeAdmin = alvo.papel === "ADMIN" && alvo.ativo && ((mudanca.tipo === "papel" && mudanca.papel !== "ADMIN") || (mudanca.tipo === "ativo" && !mudanca.ativo));
  if (ator.id === alvo.id && (perdeAdmin || (mudanca.tipo === "ativo" && !mudanca.ativo))) {
    return { ok: false, erro: "Você não pode desativar nem rebaixar a própria conta. Peça a outro administrador." };
  }
  if (perdeAdmin && adminsAtivos <= 1) {
    return { ok: false, erro: "Esta é a última conta de administração ativa. Promova outra conta a ADMIN antes." };
  }
  return { ok: true };
}

const ALFABETO = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";

/**
 * Senha temporária de 16 caracteres (sem 0/O/1/l/I, para ditar sem erro), ~92 bits.
 * Mostrada uma única vez para quem redefiniu; nunca vai para logs.
 */
export function gerarSenhaTemporaria(aleatorio: (n: number) => Uint8Array = (n) => crypto.getRandomValues(new Uint8Array(n))): string {
  const saida: string[] = [];
  while (saida.length < 16) {
    for (const b of aleatorio(32)) {
      // Descarta valores que enviesariam a distribuição (rejeição).
      if (b >= 256 - (256 % ALFABETO.length)) continue;
      saida.push(ALFABETO[b % ALFABETO.length] ?? "");
      if (saida.length === 16) break;
    }
  }
  return saida.join("");
}
