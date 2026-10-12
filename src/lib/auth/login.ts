/**
 * Regra de login do Painelux, sem dependência de framework (testável com dublês).
 *
 * - 5 senhas erradas seguidas bloqueiam a conta por 15 minutos;
 * - durante o bloqueio a senha nem é verificada;
 * - e-mail inexistente e conta inativa recebem a mesma resposta de "credenciais inválidas"
 *   e o mesmo custo de bcrypt (sem enumeração de usuários por tempo de resposta);
 * - toda tentativa vira um evento de auditoria.
 */
import type { Papel } from "@prisma/client";

export const MAX_TENTATIVAS = 5;
export const BLOQUEIO_MINUTOS = 15;
export const SESSAO_HORAS = 8;

/** Hash bcrypt (custo 12) de um texto público, usado só para gastar o mesmo tempo quando não há usuário. */
export const HASH_EQUALIZACAO = "$2b$12$3FfWApJWHny/2oT8SBRU1uTzyGV10p17ardQeAeWPd9wA2/X4596q";

export interface UsuarioLogin {
  id: string;
  nome: string;
  email: string;
  senhaHash: string;
  papel: Papel;
  ativo: boolean;
  somenteLeitura: boolean;
  tentativasFalhas: number;
  bloqueadoAte: Date | null;
}

export type EventoLogin =
  | { acao: "LOGIN_SUCESSO"; usuarioId: string; email: string }
  | { acao: "LOGIN_FALHA"; usuarioId: string | null; email: string; motivo: "usuario_inexistente" | "conta_inativa" | "senha_incorreta"; tentativas?: number }
  | { acao: "LOGIN_BLOQUEADO"; usuarioId: string; email: string; motivo: "conta_bloqueada" | "limite_atingido"; bloqueadoAte: Date };

export interface DependenciasLogin {
  buscarPorEmail(email: string): Promise<UsuarioLogin | null>;
  /** Soma 1 às falhas e devolve o novo total. */
  incrementarFalhas(usuarioId: string): Promise<number>;
  bloquear(usuarioId: string, ate: Date): Promise<void>;
  registrarSucesso(usuarioId: string, quando: Date): Promise<void>;
  compararSenha(senha: string, hash: string): Promise<boolean>;
  auditar(evento: EventoLogin): Promise<void>;
  agora(): Date;
}

export type ResultadoLogin =
  | { ok: true; usuario: Pick<UsuarioLogin, "id" | "nome" | "email" | "papel" | "somenteLeitura"> }
  | { ok: false; motivo: "credenciais_invalidas" }
  | { ok: false; motivo: "bloqueada"; bloqueadoAte: Date };

export function normalizarEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function verificarLogin(deps: DependenciasLogin, emailInformado: string, senha: string): Promise<ResultadoLogin> {
  const email = normalizarEmail(emailInformado);
  const agora = deps.agora();
  const usuario = await deps.buscarPorEmail(email);

  if (!usuario) {
    await deps.compararSenha(senha, HASH_EQUALIZACAO);
    await deps.auditar({ acao: "LOGIN_FALHA", usuarioId: null, email, motivo: "usuario_inexistente" });
    return { ok: false, motivo: "credenciais_invalidas" };
  }

  // A conta de demonstração tem senha pública e só lê: bloqueá-la não protege nada e deixaria
  // qualquer pessoa tirar o acesso de recrutadores errando a senha 5 vezes. As falhas seguem auditadas.
  const contaPublica = usuario.somenteLeitura;

  if (!contaPublica && usuario.bloqueadoAte && usuario.bloqueadoAte.getTime() > agora.getTime()) {
    await deps.auditar({ acao: "LOGIN_BLOQUEADO", usuarioId: usuario.id, email, motivo: "conta_bloqueada", bloqueadoAte: usuario.bloqueadoAte });
    return { ok: false, motivo: "bloqueada", bloqueadoAte: usuario.bloqueadoAte };
  }

  const senhaConfere = await deps.compararSenha(senha, usuario.senhaHash);

  if (!usuario.ativo) {
    await deps.auditar({ acao: "LOGIN_FALHA", usuarioId: usuario.id, email, motivo: "conta_inativa" });
    return { ok: false, motivo: "credenciais_invalidas" };
  }

  if (!senhaConfere && contaPublica) {
    await deps.auditar({ acao: "LOGIN_FALHA", usuarioId: usuario.id, email, motivo: "senha_incorreta" });
    return { ok: false, motivo: "credenciais_invalidas" };
  }

  if (!senhaConfere) {
    const tentativas = await deps.incrementarFalhas(usuario.id);
    if (tentativas >= MAX_TENTATIVAS) {
      const ate = new Date(agora.getTime() + BLOQUEIO_MINUTOS * 60_000);
      await deps.bloquear(usuario.id, ate);
      await deps.auditar({ acao: "LOGIN_BLOQUEADO", usuarioId: usuario.id, email, motivo: "limite_atingido", bloqueadoAte: ate });
      return { ok: false, motivo: "bloqueada", bloqueadoAte: ate };
    }
    await deps.auditar({ acao: "LOGIN_FALHA", usuarioId: usuario.id, email, motivo: "senha_incorreta", tentativas });
    return { ok: false, motivo: "credenciais_invalidas" };
  }

  await deps.registrarSucesso(usuario.id, agora);
  await deps.auditar({ acao: "LOGIN_SUCESSO", usuarioId: usuario.id, email });
  return {
    ok: true,
    usuario: { id: usuario.id, nome: usuario.nome, email: usuario.email, papel: usuario.papel, somenteLeitura: usuario.somenteLeitura },
  };
}
