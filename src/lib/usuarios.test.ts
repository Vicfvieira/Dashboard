import { describe, expect, it } from "vitest";
import { gerarSenhaTemporaria, novoUsuario, validarMudanca } from "./usuarios";

const admin = { id: "a1", papel: "ADMIN" as const, ativo: true };
const gestor = { id: "g1", papel: "GESTOR" as const, ativo: true };

describe("último ADMIN", () => {
  it("não deixa desativar nem rebaixar o último ADMIN ativo", () => {
    expect(validarMudanca({ id: "x" }, admin, { tipo: "ativo", ativo: false }, 1).ok).toBe(false);
    expect(validarMudanca({ id: "x" }, admin, { tipo: "papel", papel: "GESTOR" }, 1).ok).toBe(false);
  });

  it("permite quando há outro ADMIN ativo", () => {
    expect(validarMudanca({ id: "x" }, admin, { tipo: "ativo", ativo: false }, 2).ok).toBe(true);
    expect(validarMudanca({ id: "x" }, admin, { tipo: "papel", papel: "ATENDENTE" }, 2).ok).toBe(true);
  });

  it("não deixa ninguém tirar o próprio acesso", () => {
    expect(validarMudanca({ id: "a1" }, admin, { tipo: "papel", papel: "GESTOR" }, 3)).toEqual({ ok: false, erro: expect.stringContaining("própria conta") });
    expect(validarMudanca({ id: "a1" }, admin, { tipo: "ativo", ativo: false }, 3).ok).toBe(false);
  });

  it("não interfere em mudanças comuns", () => {
    expect(validarMudanca({ id: "a1" }, gestor, { tipo: "papel", papel: "ADMIN" }, 1).ok).toBe(true);
    expect(validarMudanca({ id: "a1" }, gestor, { tipo: "ativo", ativo: false }, 1).ok).toBe(true);
    expect(validarMudanca({ id: "a1" }, { ...admin, id: "a2", ativo: false }, { tipo: "ativo", ativo: true }, 1).ok).toBe(true);
  });
});

describe("cadastro", () => {
  it("normaliza e valida o formulário", () => {
    expect(novoUsuario.parse({ nome: " Ana Lima ", email: " Ana@Exemplo.dev ", papel: "GESTOR" })).toEqual({ nome: "Ana Lima", email: "ana@exemplo.dev", papel: "GESTOR" });
    expect(novoUsuario.safeParse({ nome: "A", email: "x", papel: "ROOT" }).success).toBe(false);
  });

  it("gera senha temporária de 16 caracteres sem símbolos ambíguos", () => {
    const s = gerarSenhaTemporaria();
    expect(s).toMatch(/^[A-HJ-NP-Za-km-z2-9]{16}$/);
    expect(gerarSenhaTemporaria()).not.toBe(s);
  });
});
