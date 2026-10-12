import { describe, expect, it } from "vitest";
import { faixaDeInatividade, nomeEspecie } from "./rotulos-pelagem";

describe("rótulos do Pelagem", () => {
  it("classifica a inatividade em faixas para priorizar a reativação", () => {
    expect(faixaDeInatividade(31)).toBe("ate-60");
    expect(faixaDeInatividade(60)).toBe("ate-60");
    expect(faixaDeInatividade(61)).toBe("61-90");
    expect(faixaDeInatividade(90)).toBe("61-90");
    expect(faixaDeInatividade(91)).toBe("90+");
  });

  it("nomeia a espécie, inclusive quando a origem não informa", () => {
    expect(nomeEspecie("GATO")).toBe("Gato");
    expect(nomeEspecie(null)).toBe("Não informada");
  });
});
