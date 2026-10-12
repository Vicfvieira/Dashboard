import { describe, expect, it } from "vitest";
import { MATRIZ, PERMISSOES, TODAS_PERMISSOES, can, permissoesDe, type Ator, type Permissao } from "./rbac";

const admin: Ator = { papel: "ADMIN", somenteLeitura: false };
const gestor: Ator = { papel: "GESTOR", somenteLeitura: false };
const atendente: Ator = { papel: "ATENDENTE", somenteLeitura: false };
const demo: Ator = { papel: "GESTOR", somenteLeitura: true };

/** Matriz esperada, escrita à mão: se o código mudar, o teste obriga a revisar esta tabela. */
const ESPERADO: Record<Permissao, { admin: boolean; gestor: boolean; atendente: boolean; demo: boolean }> = {
  "visao-geral:ver": { admin: true, gestor: true, atendente: false, demo: true },
  "pelagem:ver": { admin: true, gestor: true, atendente: false, demo: true },
  "pelagem:financeiro": { admin: true, gestor: true, atendente: false, demo: true },
  "lirio:ver": { admin: true, gestor: true, atendente: false, demo: true },
  "mercado:ver": { admin: true, gestor: true, atendente: false, demo: true },
  "clientes:ver": { admin: true, gestor: true, atendente: false, demo: true },
  "agenda:ver": { admin: true, gestor: true, atendente: true, demo: true },
  "insights:ver": { admin: true, gestor: true, atendente: false, demo: true },
  "dados:exportar": { admin: true, gestor: true, atendente: false, demo: true },
  "configuracoes:ver": { admin: true, gestor: true, atendente: false, demo: true },
  "sync:executar": { admin: true, gestor: false, atendente: false, demo: false },
  "usuarios:ver": { admin: true, gestor: false, atendente: false, demo: false },
  "usuarios:gerenciar": { admin: true, gestor: false, atendente: false, demo: false },
  "logs:ver": { admin: true, gestor: false, atendente: false, demo: false },
  "logs:exportar": { admin: true, gestor: false, atendente: false, demo: false },
  "infra:ver": { admin: true, gestor: false, atendente: false, demo: false },
};

describe("matriz de permissões", () => {
  it.each(TODAS_PERMISSOES)("%s segue a tabela esperada para cada papel", (p) => {
    const e = ESPERADO[p];
    expect(can(admin, p)).toBe(e.admin);
    expect(can(gestor, p)).toBe(e.gestor);
    expect(can(atendente, p)).toBe(e.atendente);
    expect(can(demo, p)).toBe(e.demo);
  });

  it("cobre todas as permissões declaradas", () => {
    expect(Object.keys(ESPERADO).sort()).toEqual([...TODAS_PERMISSOES].sort());
  });

  it("dá tudo ao ADMIN", () => {
    expect(permissoesDe(admin)).toEqual(TODAS_PERMISSOES);
  });

  it("restringe o ATENDENTE à agenda do dia, sem valores financeiros", () => {
    expect(permissoesDe(atendente)).toEqual(["agenda:ver"]);
    expect(can(atendente, "pelagem:financeiro")).toBe(false);
  });

  it("não dá nenhuma permissão de escrita ao usuário somente leitura, seja qual for o papel", () => {
    const escrita = TODAS_PERMISSOES.filter((p) => PERMISSOES[p].escrita);
    expect(escrita.length).toBeGreaterThan(0);
    for (const papel of Object.keys(MATRIZ) as Array<keyof typeof MATRIZ>) {
      for (const p of escrita) expect(can({ papel, somenteLeitura: true }, p)).toBe(false);
    }
  });

  it("nega tudo sem sessão", () => {
    for (const p of TODAS_PERMISSOES) {
      expect(can(null, p)).toBe(false);
      expect(can(undefined, p)).toBe(false);
    }
  });
});
