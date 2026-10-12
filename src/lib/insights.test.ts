import { describe, expect, it } from "vitest";
import {
  gerarInsights,
  LIMITES,
  regraCancelamentos,
  regraCategorias,
  regraConversao,
  regraDemandaReprimida,
  regraExcessoOferta,
  regraFaturamento,
  regraInativos,
  regraPicoDeBusca,
  regraRetorno,
  regraSemOferta,
  regraServicos,
  type ContextoInsights,
  type ContextoLirio,
  type ContextoPelagem,
} from "./insights";
import type { CelulaMercado } from "./mercado";

const cel = (distrito: string, categoria: string, buscas: number, ativas: number): CelulaMercado => ({ distrito, categoria, buscas, ativas, visualizacoes: buscas, cliques: Math.round(buscas * 0.15) });

// Cidade com Lash designer: 600 buscas para 40 profissionais (15 por profissional).
const celulas: CelulaMercado[] = [
  cel("vila-sonia", "lash-designer", 63, 2), // 31,5 por profissional → 2,1× a média
  cel("pinheiros", "lash-designer", 30, 8), // 3,75 → 0,25×
  cel("moema", "lash-designer", 507, 30),
  cel("bom-retiro", "maquiagem", 46, 0),
  cel("se", "maquiagem", 100, 10),
];

const lirioBase: ContextoLirio = {
  celulas,
  categorias: new Map(),
  categoriasAnterior: new Map(),
  totais: { buscas: 1000, visualizacoes: 1000, cliques: 150 },
  totaisAnterior: { buscas: 900, visualizacoes: 900, cliques: 135 },
  horas: [],
};

const pelagemBase: ContextoPelagem = {
  financeiro: true,
  atual: { faturamento: 1_000_000, concluidos: 100, taxaRetorno: 0.3 },
  anterior: { faturamento: 1_000_000, concluidos: 100, taxaRetorno: 0.3 },
  cancelamentoPorDia: [],
  servicos: [],
  inativos: { quantidade: 0, receitaPorVisita: null },
};

const ctx = (extra: Partial<ContextoInsights> = {}): ContextoInsights => ({ query: "?periodo=90d", periodo: "15 jul – 12 out 2026", anterior: "16 abr – 14 jul 2026", ...extra });

describe("Lírio: oferta e demanda", () => {
  it("aponta demanda reprimida com o fator da frase do produto", () => {
    const [i] = regraDemandaReprimida(ctx({ lirio: lirioBase }));
    expect(i?.frase).toBe("Vila Sônia teve 2,1× mais buscas por Lash designer por profissional do que a média da cidade");
    expect(i?.prioridade).toBe("media");
    // O link leva ao mapa já filtrado e mantém o período.
    expect(i?.href).toBe("/mercado?periodo=90d&cat=lash-designer&distrito=vila-sonia");
  });

  it("ignora demanda reprimida com poucas buscas", () => {
    const poucas = { ...lirioBase, celulas: [cel("vila-sonia", "lash-designer", LIMITES.demandaMinBuscas - 1, 1), cel("moema", "lash-designer", 600, 40)] };
    expect(regraDemandaReprimida(ctx({ lirio: poucas }))).toEqual([]);
  });

  it("aponta busca sem nenhuma profissional ativa", () => {
    const [i] = regraSemOferta(ctx({ lirio: lirioBase }));
    expect(i?.frase).toBe("Ninguém atende Maquiagem em Bom Retiro: 46 buscas e nenhuma profissional ativa");
    expect(i?.prioridade).toBe("alta");
  });

  it("aponta excesso de oferta só com várias profissionais", () => {
    const [i] = regraExcessoOferta(ctx({ lirio: lirioBase }));
    expect(i?.id).toBe("excesso-oferta:pinheiros:lash-designer");
    expect(i?.prioridade).toBe("baixa");
  });
});

describe("Lírio: tendências e funil", () => {
  it("detecta categoria em alta e em queda, respeitando a base mínima", () => {
    const l = {
      ...lirioBase,
      categorias: new Map([
        ["estetica-corporal", { buscas: 141, visualizacoes: 0, cliques: 0 }],
        ["maquiagem", { buscas: 80, visualizacoes: 0, cliques: 0 }],
        ["micropigmentacao", { buscas: 40, visualizacoes: 0, cliques: 0 }],
      ]),
      categoriasAnterior: new Map([
        ["estetica-corporal", { buscas: 100, visualizacoes: 0, cliques: 0 }],
        ["maquiagem", { buscas: 100, visualizacoes: 0, cliques: 0 }],
        ["micropigmentacao", { buscas: 10, visualizacoes: 0, cliques: 0 }],
      ]),
    };
    const r = regraCategorias(ctx({ lirio: l }));
    expect(r.map((i) => i.frase)).toEqual(["Buscas por Estética corporal subiram 41% na Lírio", "Buscas por Maquiagem caíram 20% na Lírio"]);
    expect(r[0]?.href).toBe("/lirio?periodo=90d#lirio-categorias-em-alta");
  });

  it("aponta mudança da taxa de contato e categoria que converte abaixo da média", () => {
    const l = {
      ...lirioBase,
      totaisAnterior: { buscas: 900, visualizacoes: 1000, cliques: 120 },
      categorias: new Map([["depilacao", { buscas: 200, visualizacoes: 200, cliques: 16 }]]),
    };
    const r = regraConversao(ctx({ lirio: l }));
    expect(r[0]?.frase).toBe("A taxa de contato da Lírio subiu 3 p.p.: 12% → 15%");
    expect(r[1]?.frase).toBe("Depilação converte 46,7% menos que a média da Lírio");
  });

  it("descreve a janela de pico só quando ela concentra as buscas", () => {
    const horas = [
      { diaSemana: 5, hora: 19, valor: 30 },
      { diaSemana: 5, hora: 20, valor: 40 },
      { diaSemana: 5, hora: 21, valor: 30 },
      { diaSemana: 2, hora: 9, valor: 60 },
    ];
    const [i] = regraPicoDeBusca(ctx({ lirio: { ...lirioBase, horas } }));
    expect(i?.frase).toBe("62,5% das buscas acontecem entre 19h e 22h");
    expect(regraPicoDeBusca(ctx({ lirio: { ...lirioBase, horas: Array.from({ length: 24 }, (_, h) => ({ diaSemana: 1, hora: h, valor: 10 })) } }))).toEqual([]);
  });
});

describe("Pelagem", () => {
  it("escreve 'cancelamentos de sábado subiram 18%' com base mínima", () => {
    const p = {
      ...pelagemBase,
      cancelamentoPorDia: [
        { diaSemana: 6, agendamentos: 120, cancelados: 13, agendamentosAnterior: 110, canceladosAnterior: 11 },
        { diaSemana: 3, agendamentos: 40, cancelados: 4, agendamentosAnterior: 40, canceladosAnterior: 2 }, // base pequena
      ],
    };
    const r = regraCancelamentos(ctx({ pelagem: p }));
    expect(r).toHaveLength(1);
    expect(r[0]?.frase).toBe("Cancelamentos de sábado subiram 18,2% no Pelagem");
    expect(r[0]?.href).toBe("/pelagem?periodo=90d#pelagem-cancelamento-dia");
  });

  it("usa atendimentos no lugar do faturamento para quem não vê valores", () => {
    const p = { ...pelagemBase, financeiro: false, atual: { ...pelagemBase.atual, faturamento: 2_000_000, concluidos: 80 } };
    const [i] = regraFaturamento(ctx({ pelagem: p }));
    expect(i?.frase).toBe("Atendimentos concluídos do Pelagem caíram 20%");
    expect(i?.detalhe).not.toContain("R$");
  });

  it("aponta queda da taxa de retorno em pontos percentuais", () => {
    const p = { ...pelagemBase, atual: { ...pelagemBase.atual, taxaRetorno: 0.18 } };
    const [i] = regraRetorno(ctx({ pelagem: p }));
    expect(i?.frase).toBe("A taxa de retorno do Pelagem caiu 12 p.p.");
    expect(i?.prioridade).toBe("alta");
  });

  it("aponta serviços com variação forte e ignora bases pequenas", () => {
    const p = {
      ...pelagemBase,
      servicos: [
        { servico: "Hidratação", porte: "G", atendimentos: 13, atendimentosAnterior: 8 },
        { servico: "Banho", porte: "P", atendimentos: 6, atendimentosAnterior: 2 },
      ],
    };
    expect(regraServicos(ctx({ pelagem: p })).map((i) => i.id)).toEqual(["servico:Hidratação:G"]);
  });

  it("mostra a receita de reativação só com permissão financeira", () => {
    const comValor = regraInativos(ctx({ pelagem: { ...pelagemBase, inativos: { quantidade: 34, receitaPorVisita: 290_000 } } }));
    expect(comValor[0]?.frase).toBe("34 clientes do Pelagem estão há mais de 30 dias sem voltar");
    expect(comValor[0]?.detalhe).toMatch(/R\$\s2\.900/);
    const semValor = regraInativos(ctx({ pelagem: { ...pelagemBase, financeiro: false, inativos: { quantidade: 34, receitaPorVisita: 290_000 } } }));
    expect(semValor[0]?.detalhe).not.toContain("R$");
  });
});

describe("ordenação", () => {
  it("ordena por prioridade e não gera nada sem dados", () => {
    expect(gerarInsights(ctx())).toEqual([]);
    const r = gerarInsights(ctx({ lirio: lirioBase }));
    const ordem = { alta: 0, media: 1, baixa: 2 };
    for (let i = 1; i < r.length; i++) expect(ordem[r[i - 1]?.prioridade ?? "alta"]).toBeLessThanOrEqual(ordem[r[i]?.prioridade ?? "baixa"]);
    expect(new Set(r.map((i) => i.id)).size).toBe(r.length);
  });
});
