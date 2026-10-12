import { describe, expect, it } from "vitest";
import { FILTROS_PADRAO, descreverIntervalo, hojeSP, intervaloAnterior, intervaloAtual, lerFiltros, queryComFiltros, serializarFiltros } from "./filtros";

const HOJE = "2026-10-12";

describe("lerFiltros", () => {
  it("usa o padrão (30 dias, comparando, todos os produtos) sem parâmetros", () => {
    expect(lerFiltros({}, HOJE)).toEqual(FILTROS_PADRAO);
  });

  it("lê de objeto de searchParams e de URLSearchParams", () => {
    const esperado = { periodo: "7d", de: null, ate: null, comparar: false, produto: "lirio" };
    expect(lerFiltros({ periodo: "7d", comparar: "0", produto: "lirio" }, HOJE)).toEqual(esperado);
    expect(lerFiltros(new URLSearchParams("periodo=7d&comparar=0&produto=lirio"), HOJE)).toEqual(esperado);
  });

  it("ignora valores inválidos em vez de quebrar a página", () => {
    expect(lerFiltros({ periodo: "1ano", produto: "outro" }, HOJE)).toEqual(FILTROS_PADRAO);
  });

  it("aceita período personalizado válido e limita o fim a hoje", () => {
    expect(lerFiltros({ periodo: "personalizado", de: "2026-09-01", ate: "2026-12-31" }, HOJE)).toMatchObject({ periodo: "personalizado", de: "2026-09-01", ate: HOJE });
  });

  it("rejeita personalizado com datas invertidas, inexistentes ou longo demais", () => {
    for (const p of [
      { de: "2026-10-10", ate: "2026-10-01" },
      { de: "2026-02-30", ate: "2026-03-10" },
      { de: "2020-01-01", ate: "2026-10-01" },
      { de: "ontem", ate: "hoje" },
    ]) {
      expect(lerFiltros({ periodo: "personalizado", ...p }, HOJE).periodo).toBe("30d");
    }
  });
});

describe("serialização na URL", () => {
  it("omite valores padrão", () => {
    expect(serializarFiltros(FILTROS_PADRAO).toString()).toBe("");
  });

  it("faz ida e volta sem perder informação", () => {
    const f = { periodo: "personalizado" as const, de: "2026-08-01", ate: "2026-08-31", comparar: false, produto: "pelagem" as const };
    expect(lerFiltros(serializarFiltros(f), HOJE)).toEqual(f);
  });

  it("descarta datas ao sair do personalizado", () => {
    const f = { periodo: "personalizado" as const, de: "2026-08-01", ate: "2026-08-31", comparar: true, produto: "todos" as const };
    expect(queryComFiltros(f, { periodo: "90d" })).toBe("?periodo=90d");
    expect(queryComFiltros(FILTROS_PADRAO, {})).toBe("");
  });
});

describe("intervalos", () => {
  it("calcula os períodos fixos terminando hoje, inclusive", () => {
    expect(intervaloAtual({ ...FILTROS_PADRAO, periodo: "7d" }, HOJE)).toEqual({ de: "2026-10-06", ate: HOJE, dias: 7 });
    expect(intervaloAtual(FILTROS_PADRAO, HOJE)).toEqual({ de: "2026-09-13", ate: HOJE, dias: 30 });
    expect(intervaloAtual({ ...FILTROS_PADRAO, periodo: "12m" }, HOJE)).toEqual({ de: "2025-10-13", ate: HOJE, dias: 365 });
    expect(intervaloAtual({ ...FILTROS_PADRAO, periodo: "12m" }, "2024-02-29")).toMatchObject({ de: "2023-03-01" });
  });

  it("compara com o período anterior de mesma duração, sem sobreposição", () => {
    const atual = intervaloAtual(FILTROS_PADRAO, HOJE);
    expect(intervaloAnterior(atual)).toEqual({ de: "2026-08-14", ate: "2026-09-12", dias: 30 });
  });

  it("usa o dia civil de São Paulo", () => {
    expect(hojeSP(new Date("2026-10-13T02:30:00Z"))).toBe("2026-10-12");
    expect(hojeSP(new Date("2026-10-13T03:00:00Z"))).toBe("2026-10-13");
  });

  it("descreve o intervalo em português", () => {
    expect(descreverIntervalo({ de: "2026-09-13", ate: "2026-10-12", dias: 30 })).toBe("13 set – 12 out 2026");
    expect(descreverIntervalo({ de: "2025-10-13", ate: "2026-10-12", dias: 365 })).toBe("13 out 2025 – 12 out 2026");
  });
});
