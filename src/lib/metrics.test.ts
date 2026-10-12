import { describe, expect, it } from "vitest";
import {
  agruparPorSemana,
  classificarDemanda,
  completarDias,
  estaInativo,
  granularidade,
  indexar,
  indiceDemanda,
  inicioDaSemana,
  maioresMovimentos,
  taxaCancelamento,
  taxaContato,
  taxaRetorno,
  taxaVisualizacao,
  ticketMedio,
  variacao,
  variacaoPontos,
  type CandidatoMovimento,
} from "./metrics";

describe("Pelagem", () => {
  it("ticket médio = faturamento / atendimentos concluídos", () => {
    expect(ticketMedio(343_500, 42)).toBeCloseTo(8178.57, 2);
    expect(ticketMedio(0, 0)).toBeNull();
  });

  it("taxa de retorno = clientes com 2+ atendimentos / clientes atendidos", () => {
    expect(taxaRetorno(["a", "b", "a", "c", "c", "c"])).toEqual({ taxa: 2 / 3, atendidos: 3, recorrentes: 2 });
    expect(taxaRetorno([])).toEqual({ taxa: null, atendidos: 0, recorrentes: 0 });
  });

  it("inativo = mais de 30 dias sem voltar, a não ser que já tenha volta agendada", () => {
    const agora = new Date("2026-10-12T12:00:00Z");
    expect(estaInativo(new Date("2026-09-12T12:00:00Z"), agora)).toBe(false); // exatamente 30 dias
    expect(estaInativo(new Date("2026-09-12T11:59:00Z"), agora)).toBe(true);
    expect(estaInativo(new Date("2026-08-01T12:00:00Z"), agora, new Date("2026-10-20T12:00:00Z"))).toBe(false);
  });

  it("taxa de cancelamento sobre todos os agendamentos do período", () => {
    expect(taxaCancelamento(5, 48)).toBeCloseTo(0.1042, 4);
    expect(taxaCancelamento(0, 0)).toBeNull();
  });
});

describe("Lírio", () => {
  it("taxas do funil", () => {
    expect(taxaVisualizacao(6501, 5573)).toBeCloseTo(1.1665, 4);
    expect(taxaContato(942, 6501)).toBeCloseTo(0.1449, 4);
    expect(taxaContato(3, 0)).toBeNull();
  });

  it("índice de demanda = buscas / profissionais ativas, com limites 1,5 e 0,5", () => {
    expect(indiceDemanda(21, 10)).toBe(2.1);
    expect(classificarDemanda(indiceDemanda(21, 10))).toBe("reprimida");
    expect(classificarDemanda(1.5)).toBe("equilibrada");
    expect(classificarDemanda(0.5)).toBe("equilibrada");
    expect(classificarDemanda(0.49)).toBe("excesso-oferta");
    expect(classificarDemanda(indiceDemanda(4, 0))).toBe("sem-oferta");
    expect(classificarDemanda(indiceDemanda(0, 0))).toBe("sem-dados");
  });
});

describe("variações", () => {
  it("relativa e em pontos percentuais", () => {
    expect(variacao(118, 100)).toBeCloseTo(0.18);
    expect(variacao(5, 0)).toBeNull();
    expect(variacaoPontos(0.15, 0.12)).toBeCloseTo(3);
    expect(variacaoPontos(null, 0.12)).toBeNull();
  });
});

describe("séries", () => {
  it("completa dias sem registro com zero", () => {
    expect(completarDias([{ data: "2026-10-02", valor: 5 }], "2026-10-01", "2026-10-03")).toEqual([
      { data: "2026-10-01", valor: 0 },
      { data: "2026-10-02", valor: 5 },
      { data: "2026-10-03", valor: 0 },
    ]);
  });

  it("agrupa por semana começando na segunda-feira", () => {
    expect(inicioDaSemana("2026-10-12")).toBe("2026-10-12"); // segunda
    expect(inicioDaSemana("2026-10-18")).toBe("2026-10-12"); // domingo
    const serie = completarDias([{ data: "2026-10-11", valor: 1 }, { data: "2026-10-12", valor: 2 }, { data: "2026-10-18", valor: 3 }], "2026-10-11", "2026-10-19");
    expect(agruparPorSemana(serie, false)).toEqual([
      { data: "2026-10-05", valor: 1 },
      { data: "2026-10-12", valor: 5 },
      { data: "2026-10-19", valor: 0 },
    ]);
    // Por padrão, só semanas completas (as pontas com 1 dia cada saem).
    expect(agruparPorSemana(serie)).toEqual([{ data: "2026-10-12", valor: 5 }]);
  });

  it("usa granularidade diária até 31 dias e semanal acima", () => {
    expect(granularidade(31)).toBe("dia");
    expect(granularidade(90)).toBe("semana");
    expect(granularidade(365)).toBe("semana");
  });

  it("indexa pela média da série (base 100)", () => {
    expect(indexar([50, 100, 150])).toEqual([50, 100, 150]);
    expect(indexar([0, 0])).toEqual([null, null]);
  });
});

describe("destaques", () => {
  const c = (id: string, atual: number, anterior: number, marca: "pelagem" | "lirio", baseMinima = 10): CandidatoMovimento => ({
    id,
    rotulo: id,
    atual,
    anterior,
    baseMinima,
    marca,
    href: "/",
    formato: "inteiro",
  });

  it("escolhe os 3 maiores movimentos em módulo, ignorando bases pequenas", () => {
    const r = maioresMovimentos([c("a", 130, 100, "lirio"), c("b", 40, 100, "lirio"), c("c", 9, 3, "lirio"), c("d", 110, 100, "pelagem"), c("e", 100, 100, "pelagem")]);
    expect(r.map((m) => m.id)).toEqual(["b", "a", "d"]);
    expect(r[0]?.variacao).toBeCloseTo(-0.6);
  });

  it("garante ao menos um movimento de cada marca quando existem", () => {
    const r = maioresMovimentos([c("l1", 200, 100, "lirio"), c("l2", 190, 100, "lirio"), c("l3", 180, 100, "lirio"), c("p1", 105, 100, "pelagem")]);
    expect(r.map((m) => m.id)).toEqual(["l1", "l2", "p1"]);
  });

  it("devolve menos de 3 quando não há movimentos suficientes", () => {
    expect(maioresMovimentos([c("a", 10, 10, "lirio")])).toEqual([]);
  });
});
