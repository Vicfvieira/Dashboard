import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePermissionApi } from "@/lib/rbac";

const consulta = z.object({ limite: z.coerce.number().int().min(1).max(100).default(20) });

/** GET /api/auditoria/recentes?limite=20 — últimos eventos de auditoria (somente ADMIN). */
export async function GET(request: Request) {
  const acesso = await requirePermissionApi("logs:ver");
  if (!acesso.ok) return acesso.resposta;

  const parametros = consulta.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!parametros.success) return Response.json({ erro: "Parâmetros inválidos." }, { status: 400 });

  const eventos = await prisma.auditLog.findMany({
    orderBy: { criadoEm: "desc" },
    take: parametros.data.limite,
    select: { criadoEm: true, acao: true, sucesso: true, email: true, ip: true, alvo: true, detalhes: true },
  });
  return Response.json({ eventos }, { headers: { "Cache-Control": "no-store" } });
}
