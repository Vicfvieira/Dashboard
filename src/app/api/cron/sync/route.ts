import { createHash, timingSafeEqual } from "node:crypto";
import { sincronizar } from "@/lib/sync/executar";

// A Vercel Cron chama esta rota diariamente (vercel.json) com Authorization: Bearer CRON_SECRET.
export const maxDuration = 60;

/** Compara em tempo constante (hash de tamanho fixo, sem vazar o comprimento do segredo). */
function autorizado(header: string | null): boolean {
  const segredo = process.env.CRON_SECRET;
  if (!segredo || segredo.length < 16 || !header) return false;
  const esperado = createHash("sha256").update(`Bearer ${segredo}`).digest();
  const recebido = createHash("sha256").update(header).digest();
  return timingSafeEqual(esperado, recebido);
}

export async function GET(request: Request) {
  if (!autorizado(request.headers.get("authorization"))) {
    return Response.json({ erro: "Não autorizado." }, { status: 401 });
  }
  const resultados = await sincronizar("CRON", null);
  const ok = resultados.every((r) => r.status === "SUCESSO" || r.status === "PARCIAL" || r.status === "IGNORADA");
  return Response.json({ resultados }, { status: ok ? 200 : 502, headers: { "Cache-Control": "no-store" } });
}
