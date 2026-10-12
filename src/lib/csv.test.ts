import { describe, expect, it } from "vitest";
import { celulaTexto, montarCsv } from "./csv";

describe("CSV", () => {
  it("neutraliza fórmulas e escapa separadores", () => {
    expect(celulaTexto("=HYPERLINK(\"x\")")).toBe(`"'=HYPERLINK(""x"")"`);
    expect(celulaTexto("+5511")).toBe("'+5511");
    expect(celulaTexto("a;b")).toBe('"a;b"');
    expect(celulaTexto("ana@exemplo.dev")).toBe("ana@exemplo.dev");
  });

  it("monta com BOM, ';' e vírgula decimal", () => {
    expect(montarCsv(["a", "b"], [["x", 1.5], [null, 2]])).toBe("﻿a;b\r\nx;1,5\r\n;2");
  });
});
