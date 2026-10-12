import { describe, expect, it } from "vitest";
import { lerFiltrosLogs, queryLogs, whereLogs } from "./logs";

const HOJE = "2026-10-12";

describe("filtros de logs", () => {
  it("usa os últimos 30 dias por padrão e ignora valores inválidos", () => {
    const f = lerFiltrosLogs({ acao: "DROP TABLE", resultado: "talvez", pagina: "-3", de: "ontem" }, HOJE);
    expect(f).toEqual({ acao: "todas", resultado: "todos", busca: "", de: "2026-09-13", ate: HOJE, pagina: 1 });
    expect(queryLogs(f, HOJE)).toBe("");
  });

  it("monta o where com grupo de ações, resultado, busca e dia de São Paulo", () => {
    const f = lerFiltrosLogs({ acao: "seguranca", resultado: "falha", q: " 189.1 ", de: "2026-10-01", ate: "2026-10-12" }, HOJE);
    const w = whereLogs(f);
    expect(w.acao).toEqual({ in: ["LOGIN_FALHA", "LOGIN_BLOQUEADO", "ACESSO_NEGADO"] });
    expect(w.sucesso).toBe(false);
    expect(w.criadoEm).toEqual({ gte: new Date("2026-10-01T03:00:00.000Z"), lt: new Date("2026-10-13T03:00:00.000Z") });
    expect(w.OR).toHaveLength(4);
    expect(queryLogs(f, HOJE, { pagina: 2 })).toBe("?acao=seguranca&resultado=falha&q=189.1&de=2026-10-01&pagina=2");
  });

  it("corrige intervalo invertido", () => {
    const f = lerFiltrosLogs({ de: "2026-10-20", ate: "2026-10-10" }, HOJE);
    expect(f.de).toBe("2026-10-10");
  });
});
