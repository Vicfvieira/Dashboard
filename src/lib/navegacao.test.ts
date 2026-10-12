import { describe, expect, it } from "vitest";
import { NAVEGACAO, itemDaRota, itensVisiveis, rotaInicial } from "./navegacao";

describe("navegação por papel", () => {
  it("mostra tudo ao ADMIN, na ordem da sidebar", () => {
    expect(itensVisiveis({ papel: "ADMIN", somenteLeitura: false })).toHaveLength(NAVEGACAO.length);
  });

  it("esconde administração do GESTOR e do demo, mantendo Configurações (leitura)", () => {
    for (const somenteLeitura of [false, true]) {
      const rotas = itensVisiveis({ papel: "GESTOR", somenteLeitura }).map((i) => i.rota);
      expect(rotas).toEqual(["/", "/pelagem", "/lirio", "/mercado", "/clientes", "/insights", "/agenda", "/configuracoes"]);
    }
  });

  it("deixa o ATENDENTE só com a agenda, que vira sua página inicial", () => {
    const atendente = { papel: "ATENDENTE" as const, somenteLeitura: false };
    expect(itensVisiveis(atendente).map((i) => i.rota)).toEqual(["/agenda"]);
    expect(rotaInicial(atendente)).toBe("/agenda");
  });

  it("encontra o item da rota atual, inclusive subpáginas", () => {
    expect(itemDaRota("/")?.rotulo).toBe("Visão geral");
    expect(itemDaRota("/mercado/pinheiros")?.rotulo).toBe("Mapa de mercado");
    expect(itemDaRota("/pelagem-x")).toBeUndefined();
  });
});
