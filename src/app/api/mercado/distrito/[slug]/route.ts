import { z } from "zod";
import { CATEGORIA_SLUGS } from "@/data/categorias";
import { DISTRITOS } from "@/data/sp-geo";
import { evolucaoDistrito } from "@/lib/dados/mercado";
import { hojeSP } from "@/lib/filtros";
import { requirePermissionApi } from "@/lib/rbac";

const SLUGS = new Set(DISTRITOS.map((d) => d.slug));

const consulta = z.object({
  categoria: z.enum(["todas", ...CATEGORIA_SLUGS] as [string, ...string[]]).default("todas"),
  ate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .refine((d) => !Number.isNaN(Date.parse(`${d}T00:00:00Z`)))
    .optional(),
});

/** GET /api/mercado/distrito/[slug]?categoria=&ate= — evolução mensal do distrito e da região. */
export async function GET(request: Request, ctx: RouteContext<"/api/mercado/distrito/[slug]">) {
  const acesso = await requirePermissionApi("mercado:ver");
  if (!acesso.ok) return acesso.resposta;

  const { slug } = await ctx.params;
  if (!SLUGS.has(slug)) return Response.json({ erro: "Distrito desconhecido." }, { status: 404 });
  const p = consulta.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!p.success) return Response.json({ erro: "Parâmetros inválidos." }, { status: 400 });

  const hoje = hojeSP();
  const ate = p.data.ate && p.data.ate < hoje ? p.data.ate : hoje;
  const meses = await evolucaoDistrito(slug, p.data.categoria === "todas" ? null : p.data.categoria, ate);
  return Response.json({ meses }, { headers: { "Cache-Control": "private, no-store" } });
}
