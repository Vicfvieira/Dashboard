"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { requirePermission } from "@/lib/rbac";
import { sincronizar, type ResultadoSync } from "@/lib/sync/executar";

const fontes = z.enum(["TODAS", "PELAGEM", "LIRIO"]);

export interface EstadoSincronizacao {
  resultados: ResultadoSync[];
  erro: string | null;
}

/** Sincronização manual: só ADMIN (demo e gestor recebem 403 e o acesso negado vai à auditoria). */
export async function sincronizarAgora(fonte: string): Promise<EstadoSincronizacao> {
  const usuario = await requirePermission("sync:executar");
  const escolha = fontes.safeParse(fonte);
  if (!escolha.success) return { resultados: [], erro: "Fonte inválida." };
  const resultados = await sincronizar("MANUAL", usuario.id, escolha.data === "TODAS" ? ["PELAGEM", "LIRIO"] : [escolha.data]);
  refresh();
  return { resultados, erro: null };
}
