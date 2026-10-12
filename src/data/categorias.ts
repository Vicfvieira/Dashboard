/** As 8 categorias da Lírio, com os mesmos slugs da API de integração. */
export const CATEGORIAS = [
  { slug: "nail-designer", nome: "Nail designer" },
  { slug: "lash-designer", nome: "Lash designer" },
  { slug: "design-de-sobrancelhas", nome: "Design de sobrancelhas" },
  { slug: "estetica-facial", nome: "Estética facial" },
  { slug: "estetica-corporal", nome: "Estética corporal" },
  { slug: "depilacao", nome: "Depilação" },
  { slug: "micropigmentacao", nome: "Micropigmentação" },
  { slug: "maquiagem", nome: "Maquiagem" },
] as const;

export type CategoriaSlug = (typeof CATEGORIAS)[number]["slug"];

export const CATEGORIA_SLUGS: readonly CategoriaSlug[] = CATEGORIAS.map((c) => c.slug);

export function nomeCategoria(slug: string): string {
  return CATEGORIAS.find((c) => c.slug === slug)?.nome ?? slug;
}
