"use server";

import { z } from "zod";
import { registrarAuditoria } from "@/lib/auditoria";
import { requirePermission } from "@/lib/rbac";

const entrada = z.object({
  recurso: z.string().regex(/^[a-z0-9-]+$/).max(80),
  formato: z.enum(["csv", "png"]),
  linhas: z.number().int().min(0).max(1_000_000).optional(),
  /** Query string dos filtros da tela, para saber o recorte exportado. */
  filtros: z.string().max(300).optional(),
});

/**
 * Registra a exportação na auditoria ANTES de o navegador gerar o arquivo. Sem permissão,
 * o download não acontece (e a negação também é auditada por requirePermission).
 */
export async function registrarExportacao(dados: z.input<typeof entrada>): Promise<{ ok: boolean }> {
  const usuario = await requirePermission("dados:exportar");
  const e = entrada.safeParse(dados);
  if (!e.success) return { ok: false };
  await registrarAuditoria({
    acao: "EXPORTACAO",
    usuarioId: usuario.id,
    email: usuario.email,
    alvo: `export:${e.data.recurso}.${e.data.formato}`,
    detalhes: { formato: e.data.formato, linhas: e.data.linhas ?? null, filtros: e.data.filtros ?? "" },
  });
  return { ok: true };
}
