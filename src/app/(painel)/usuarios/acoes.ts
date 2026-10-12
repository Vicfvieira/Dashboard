"use server";

import bcrypt from "bcryptjs";
import { refresh } from "next/cache";
import type { Papel, Prisma } from "@prisma/client";
import { registrarAuditoria } from "@/lib/auditoria";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/rbac";
import { gerarSenhaTemporaria, idUsuario, novoUsuario, PAPEIS, validarMudanca, type Mudanca } from "@/lib/usuarios";
import { z } from "zod";

export type ResultadoAcao = { ok: true; mensagem: string; senhaTemporaria?: string } | { ok: false; erro: string };

/** Trava transacional única para mudanças de papel/ativo: serializa a checagem do último ADMIN. */
const TRAVA_USUARIOS = 742_001;
const CUSTO_BCRYPT = 12;

async function travar(tx: Prisma.TransactionClient) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(${TRAVA_USUARIOS})`;
}

export async function criarUsuario(entrada: { nome: string; email: string; papel: string }): Promise<ResultadoAcao> {
  const ator = await requirePermission("usuarios:gerenciar");
  const dados = novoUsuario.safeParse(entrada);
  if (!dados.success) return { ok: false, erro: dados.error.issues[0]?.message ?? "Dados inválidos." };
  const senha = gerarSenhaTemporaria();
  const senhaHash = await bcrypt.hash(senha, CUSTO_BCRYPT);
  try {
    const criado = await prisma.user.create({ data: { ...dados.data, senhaHash }, select: { id: true } });
    await registrarAuditoria({ acao: "USUARIO_CRIADO", usuarioId: ator.id, email: ator.email, alvo: `user:${criado.id}`, detalhes: { email: dados.data.email, papel: dados.data.papel } });
    refresh();
    return { ok: true, mensagem: `Conta criada para ${dados.data.email}.`, senhaTemporaria: senha };
  } catch (e) {
    if (typeof e === "object" && e !== null && "code" in e && e.code === "P2002") return { ok: false, erro: "Já existe uma conta com este e-mail." };
    throw e;
  }
}

async function aplicarMudanca(alvoId: string, mudanca: Mudanca): Promise<ResultadoAcao> {
  const ator = await requirePermission("usuarios:gerenciar");
  if (!idUsuario.safeParse(alvoId).success) return { ok: false, erro: "Usuário inválido." };

  const resultado = await prisma.$transaction(async (tx) => {
    await travar(tx);
    const alvo = await tx.user.findUnique({ where: { id: alvoId }, select: { id: true, email: true, papel: true, ativo: true } });
    if (!alvo) return { ok: false as const, erro: "Usuário não encontrado." };
    const adminsAtivos = await tx.user.count({ where: { papel: "ADMIN", ativo: true } });
    const v = validarMudanca(ator, alvo, mudanca, adminsAtivos);
    if (!v.ok) return { ok: false as const, erro: v.erro, alvo };
    await tx.user.update({
      where: { id: alvo.id },
      data: mudanca.tipo === "papel" ? { papel: mudanca.papel } : { ativo: mudanca.ativo, ...(mudanca.ativo ? { tentativasFalhas: 0, bloqueadoAte: null } : {}) },
    });
    return { ok: true as const, alvo };
  });

  const acao = mudanca.tipo === "papel" ? "USUARIO_ATUALIZADO" : mudanca.ativo ? "USUARIO_REATIVADO" : "USUARIO_DESATIVADO";
  await registrarAuditoria({
    acao,
    sucesso: resultado.ok,
    usuarioId: ator.id,
    email: ator.email,
    alvo: `user:${alvoId}`,
    detalhes: { mudanca: mudanca.tipo === "papel" ? { papel: mudanca.papel, antes: resultado.alvo?.papel ?? null } : { ativo: mudanca.ativo }, ...(resultado.ok ? {} : { motivo: resultado.erro }) },
  });
  if (!resultado.ok) return { ok: false, erro: resultado.erro };
  refresh();
  const quem = resultado.alvo.email;
  return { ok: true, mensagem: mudanca.tipo === "papel" ? `Papel de ${quem} alterado.` : mudanca.ativo ? `${quem} pode entrar de novo.` : `${quem} foi desativado e perde a sessão em até 1 minuto.` };
}

export async function alterarPapel(alvoId: string, papel: string): Promise<ResultadoAcao> {
  const p = z.enum(PAPEIS).safeParse(papel);
  if (!p.success) return { ok: false, erro: "Papel inválido." };
  return aplicarMudanca(alvoId, { tipo: "papel", papel: p.data as Papel });
}

export async function alterarAtivo(alvoId: string, ativo: boolean): Promise<ResultadoAcao> {
  if (typeof ativo !== "boolean") return { ok: false, erro: "Pedido inválido." };
  return aplicarMudanca(alvoId, { tipo: "ativo", ativo });
}

/** Gera senha temporária, desbloqueia a conta e zera as falhas. A senha só aparece na resposta. */
export async function redefinirSenha(alvoId: string): Promise<ResultadoAcao> {
  const ator = await requirePermission("usuarios:gerenciar");
  if (!idUsuario.safeParse(alvoId).success) return { ok: false, erro: "Usuário inválido." };
  const alvo = await prisma.user.findUnique({ where: { id: alvoId }, select: { id: true, email: true, somenteLeitura: true } });
  if (!alvo) return { ok: false, erro: "Usuário não encontrado." };
  if (alvo.somenteLeitura) return { ok: false, erro: "A senha do acesso de demonstração é definida no deploy (variável SEED_DEMO_PASSWORD), não por aqui." };
  const senha = gerarSenhaTemporaria();
  await prisma.user.update({ where: { id: alvo.id }, data: { senhaHash: await bcrypt.hash(senha, CUSTO_BCRYPT), tentativasFalhas: 0, bloqueadoAte: null } });
  await registrarAuditoria({ acao: "SENHA_REDEFINIDA", usuarioId: ator.id, email: ator.email, alvo: `user:${alvo.id}`, detalhes: { email: alvo.email } });
  refresh();
  return { ok: true, mensagem: `Senha de ${alvo.email} redefinida. Entregue a senha temporária por um canal seguro.`, senhaTemporaria: senha };
}
