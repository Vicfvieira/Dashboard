import { timingSafeEqual } from "node:crypto";

// Placeholder protegido: a sincronização real é implementada na Etapa 5.
function isAuthorized(header: string | null): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret || !header) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const received = Buffer.from(header);
  return expected.length === received.length && timingSafeEqual(expected, received);
}

export async function GET(request: Request) {
  if (!isAuthorized(request.headers.get("authorization"))) {
    return Response.json({ error: "Não autorizado" }, { status: 401 });
  }
  return Response.json({ status: "pendente", detalhe: "Sincronização disponível a partir da Etapa 5." }, { status: 202 });
}
