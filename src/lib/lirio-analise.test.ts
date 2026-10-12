import { describe, expect, it } from "vitest";
import { crescimentoPorChave, etapasFunil, picosDeBusca, rankingConversao } from "./lirio-analise";

describe("funil da Lírio", () => {
  it("calcula taxa e queda entre etapas, sem 'queda' quando a etapa cresce", () => {
    const [b, v, c] = etapasFunil({ buscas: 1000, visualizacoes: 1200, cliques: 180 });
    expect(b?.taxaDoInicio).toBe(1);
    expect(v?.taxaDaAnterior).toBeCloseTo(1.2);
    expect(v?.queda).toBeNull(); // cada busca abre mais de um perfil
    expect(c?.taxaDaAnterior).toBeCloseTo(0.15);
    expect(c?.queda).toBeCloseTo(0.85);
    expect(c?.taxaDoInicio).toBeCloseTo(0.18);
  });

  it("não divide por zero", () => {
    const etapas = etapasFunil({ buscas: 0, visualizacoes: 0, cliques: 0 });
    expect(etapas.every((e) => e.taxaDaAnterior === null && e.queda === null)).toBe(true);
  });
});

describe("categorias em alta", () => {
  it("ordena pelo crescimento e deixa bases pequenas no fim", () => {
    const r = crescimentoPorChave(
      new Map([["lash", 150], ["nail", 200], ["maquiagem", 12], ["facial", 90]]),
      new Map([["lash", 100], ["nail", 210], ["maquiagem", 3], ["facial", 100]]),
      30,
    );
    expect(r.map((x) => x.chave)).toEqual(["lash", "nail", "facial", "maquiagem"]);
    expect(r[0]?.variacao).toBeCloseTo(0.5);
    expect(r.at(-1)?.baseInsuficiente).toBe(true);
  });
});

describe("ranking de distritos por conversão", () => {
  it("ordena pela taxa de contato e exclui volumes pequenos", () => {
    const { ranking, foraDoRanking } = rankingConversao(
      [
        { slug: "pinheiros", buscas: 400, visualizacoes: 500, cliques: 90 },
        { slug: "moema", buscas: 300, visualizacoes: 300, cliques: 30 },
        { slug: "marsilac", buscas: 4, visualizacoes: 3, cliques: 2 },
      ],
      30,
    );
    expect(ranking.map((r) => [r.slug, r.posicao])).toEqual([
      ["pinheiros", 1],
      ["moema", 2],
    ]);
    expect(ranking[0]?.taxaContato).toBeCloseTo(0.18);
    expect(ranking[0]?.conversaoTotal).toBeCloseTo(0.225);
    expect(foraDoRanking).toBe(1);
  });
});

describe("picos de busca", () => {
  it("acha dia, hora e a janela de 3 horas mais fortes", () => {
    const p = picosDeBusca([
      { diaSemana: 6, hora: 19, valor: 30 },
      { diaSemana: 6, hora: 20, valor: 40 },
      { diaSemana: 6, hora: 21, valor: 35 },
      { diaSemana: 1, hora: 12, valor: 50 },
      { diaSemana: 1, hora: 3, valor: 1 },
    ]);
    expect(p.diaMaisForte).toEqual({ diaSemana: 6, valor: 105 });
    expect(p.horaMaisForte).toEqual({ hora: 12, valor: 50 });
    expect(p.janela).toMatchObject({ inicio: 19, fim: 22, valor: 105 });
    expect(p.celulaMaisForte?.hora).toBe(12);
  });

  it("devolve vazio sem buscas", () => {
    expect(picosDeBusca([]).janela).toBeNull();
  });
});
