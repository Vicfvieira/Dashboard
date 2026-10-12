import { describe, expect, it } from "vitest";
import { categoriasDoDistrito, classeIndice, classeSequencial, mediaDaRegiao, quebrasQuantis, resumirDistritos, totaisCidade, TODAS, type CelulaMercado } from "./mercado";

const c = (distrito: string, categoria: string | null, buscas: number, ativas: number, visualizacoes = 0, cliques = 0): CelulaMercado => ({ distrito, categoria, buscas, visualizacoes, cliques, ativas });

// Cidade de brinquedo: 3 distritos, 2 categorias.
const celulas = [
  c("vila-sonia", "lash-designer", 60, 1, 50, 9),
  c("vila-sonia", "nail-designer", 20, 4, 30, 3),
  c("pinheiros", "lash-designer", 30, 6, 40, 4),
  c("pinheiros", "nail-designer", 40, 8, 60, 12),
  c("se", "lash-designer", 6, 0),
  c("se", null, 4, 0),
];
const SLUGS = ["vila-sonia", "pinheiros", "se", "marsilac"];

describe("resumo por distrito", () => {
  it("soma as categorias em 'todas' e calcula o índice relativo à cidade", () => {
    const r = resumirDistritos(celulas, TODAS, SLUGS);
    // Cidade: 160 buscas / 19 ativas. Vila Sônia: 80 / 5 = 16 por profissional → 1,9× a média.
    expect(r.get("vila-sonia")?.buscas).toBe(80);
    expect(r.get("vila-sonia")?.indice).toBeCloseTo(80 / 5 / (160 / 19));
    expect(r.get("se")?.indice).toBe(Number.POSITIVE_INFINITY);
    expect(r.get("marsilac")?.indice).toBeNull();
  });

  it("filtra uma categoria e usa a cidade na mesma categoria como referência", () => {
    const r = resumirDistritos(celulas, "lash-designer", SLUGS);
    expect(totaisCidade(celulas, "lash-designer")).toMatchObject({ buscas: 96, ativas: 7 });
    expect(r.get("vila-sonia")?.indice).toBeCloseTo(60 / 1 / (96 / 7));
    expect(classeIndice(r.get("vila-sonia")?.indice ?? null)).toBe("reprimida");
    expect(classeIndice(r.get("pinheiros")?.indice ?? null)).toBe("excesso");
  });

  it("só mostra conversão com visualizações suficientes", () => {
    const r = resumirDistritos(celulas, TODAS, SLUGS);
    expect(r.get("pinheiros")?.conversao).toBeCloseTo(16 / 100);
    expect(r.get("se")?.conversao).toBeNull();
  });
});

describe("classes de cor", () => {
  it("separa o índice nas faixas do negócio (0,5 e 1,5) e nas de leitura", () => {
    expect(classeIndice(0.49)).toBe("excesso");
    expect(classeIndice(0.7)).toBe("sobra");
    expect(classeIndice(1)).toBe("equilibrio");
    expect(classeIndice(1.4)).toBe("atencao");
    expect(classeIndice(1.51)).toBe("reprimida");
    expect(classeIndice(Number.POSITIVE_INFINITY)).toBe("sem-oferta");
    expect(classeIndice(null)).toBe("sem-dados");
  });

  it("quebra valores em quantis e classifica, com -1 para sem dado", () => {
    const quebras = quebrasQuantis([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, null]);
    expect(quebras).toEqual([3, 5, 7, 9]);
    expect(classeSequencial(0, quebras)).toBe(0);
    expect(classeSequencial(5, quebras)).toBe(2);
    expect(classeSequencial(10, quebras)).toBe(4);
    expect(classeSequencial(null, quebras)).toBe(-1);
    expect(quebrasQuantis([])).toEqual([]);
  });
});

describe("região e categorias", () => {
  it("compara o distrito com a média dos distritos da região", () => {
    const r = resumirDistritos(celulas, TODAS, SLUGS);
    const m = mediaDaRegiao(r, ["vila-sonia", "pinheiros"], totaisCidade(celulas, TODAS));
    expect(m).toMatchObject({ distritos: 2, buscas: 75, ativas: 9.5 });
    expect(m.conversao).toBeCloseTo(28 / 180);
  });

  it("ordena as categorias do distrito pelas buscas, ignorando buscas sem categoria", () => {
    const cats = categoriasDoDistrito(celulas, "se");
    expect(cats.map((x) => x.categoria)).toEqual(["lash-designer"]);
    expect(cats[0]?.participacao).toBe(1);
    expect(categoriasDoDistrito(celulas, "vila-sonia")[0]?.categoria).toBe("lash-designer");
  });
});
