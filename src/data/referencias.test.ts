import { describe, expect, it } from "vitest";
import geo from "./sp-distritos.geo.json";
import { CATEGORIAS } from "./categorias";
import { DISTRITOS, REGIOES, SUBPREFEITURAS } from "./sp-geo";

describe("dados de referência", () => {
  it("tem os 96 distritos oficiais com slugs, siglas e códigos únicos", () => {
    expect(DISTRITOS).toHaveLength(96);
    expect(new Set(DISTRITOS.map((d) => d.slug)).size).toBe(96);
    expect(new Set(DISTRITOS.map((d) => d.sigla)).size).toBe(96);
    expect(new Set(DISTRITOS.map((d) => d.codigo)).size).toBe(96);
  });

  it("liga cada distrito a uma subprefeitura e a uma região existentes", () => {
    const subs = new Map(SUBPREFEITURAS.map((s) => [s.slug, s.regiao]));
    const regioes = new Set(REGIOES.map((r) => r.id));
    for (const d of DISTRITOS) {
      expect(subs.get(d.subprefeitura), d.slug).toBe(d.regiao);
      expect(regioes.has(d.regiao)).toBe(true);
    }
    expect(SUBPREFEITURAS).toHaveLength(32);
  });

  it("tem um polígono no GeoJSON para cada distrito, e só para eles", () => {
    const slugsGeo = geo.features.map((f) => f.properties.slug).sort();
    expect(slugsGeo).toEqual(DISTRITOS.map((d) => d.slug).sort());
  });

  it("tem as 8 categorias da Lírio", () => {
    expect(CATEGORIAS).toHaveLength(8);
    expect(new Set(CATEGORIAS.map((c) => c.slug)).size).toBe(8);
  });
});
