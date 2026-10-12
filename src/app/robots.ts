import type { MetadataRoute } from "next";

/** Só a tela de entrada (apresentação do projeto) é indexável; o painel exige login. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/login", disallow: ["/", "/api/"] }],
  };
}
