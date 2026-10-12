import "server-only";
import type { AcaoAuditoria, Prisma } from "@prisma/client";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";

export interface ContextoRequisicao {
  ip: string | null;
  userAgent: string | null;
}

/** IP do cliente (primeiro da cadeia x-forwarded-for da Vercel) e user-agent, truncados. */
export function contextoDeHeaders(h: Headers): ContextoRequisicao {
  const encaminhado = h.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = encaminhado || h.get("x-real-ip") || null;
  const userAgent = h.get("user-agent");
  return { ip: ip ? ip.slice(0, 64) : null, userAgent: userAgent ? userAgent.slice(0, 512) : null };
}

export async function contextoAtual(): Promise<ContextoRequisicao> {
  return contextoDeHeaders(await headers());
}

export interface RegistroAuditoria {
  acao: AcaoAuditoria;
  sucesso?: boolean;
  usuarioId?: string | null;
  email?: string | null;
  alvo?: string | null;
  detalhes?: Prisma.InputJsonValue;
  contexto?: ContextoRequisicao;
}

/**
 * Grava um evento de auditoria. Nunca registre segredos, senhas ou tokens em `detalhes`.
 * Falha de gravação não derruba a ação principal, mas é logada no servidor.
 */
export async function registrarAuditoria(r: RegistroAuditoria): Promise<void> {
  const contexto = r.contexto ?? (await contextoAtual().catch(() => ({ ip: null, userAgent: null })));
  try {
    await prisma.auditLog.create({
      data: {
        acao: r.acao,
        sucesso: r.sucesso ?? true,
        usuarioId: r.usuarioId ?? null,
        email: r.email ?? null,
        alvo: r.alvo ?? null,
        detalhes: r.detalhes,
        ip: contexto.ip,
        userAgent: contexto.userAgent,
      },
    });
  } catch (erro) {
    console.error("[auditoria] falha ao gravar evento", r.acao, erro instanceof Error ? erro.message : erro);
  }
}
