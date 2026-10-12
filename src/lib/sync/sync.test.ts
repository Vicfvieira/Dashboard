import { describe, expect, it } from "vitest";
import { buscarAgendamentos, buscarEventos, buscarOferta, dividirEmJanelas, MAX_PAGINAS_PELAGEM } from "./clientes";
import { ErroIntegracao, esperaDaTentativa, requisitarJson, type Fetch } from "./http";

const CONFIG = { baseUrl: "https://api.exemplo.dev", chave: "chave-de-teste-1234567890" };
const HASH = "a".repeat(64);

/** fetch simulado: responde em sequência e registra as chamadas. */
function fetchSimulado(respostas: Array<Response | Error | ((url: string) => Response)>) {
  const chamadas: Array<{ url: string; chave: string | null }> = [];
  let i = 0;
  const f: Fetch = async (url, init) => {
    chamadas.push({ url, chave: new Headers(init?.headers).get("x-api-key") });
    const r = respostas[Math.min(i++, respostas.length - 1)];
    if (r instanceof Error) throw r;
    if (typeof r === "function") return r(url);
    if (!r) throw new Error("sem resposta simulada");
    return r.clone();
  };
  return { f, chamadas };
}

const json = (corpo: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(corpo), { status, headers: { "content-type": "application/json", ...headers } });

function agendamento(id: string, extra: Record<string, unknown> = {}) {
  return {
    id,
    clienteHash: HASH,
    servico: { slug: "banho", nome: "Banho" },
    porte: "M",
    status: "CONCLUIDO",
    inicio: "2026-10-01T12:00:00.000Z",
    fim: "2026-10-01T13:00:00.000Z",
    duracaoMinutos: 60,
    valorServicoCentavos: 8000,
    taxaTaxiCentavos: 0,
    totalCentavos: 8000,
    zonaTaxi: null,
    criadoEm: "2026-09-28T10:00:00.000Z",
    canceladoEm: null,
    ...extra,
  };
}

const semEspera = { esperar: async () => {}, esperaInicialMs: 500 };

describe("requisitarJson: tentativas com espera crescente", () => {
  it("envia a chave no header x-api-key", async () => {
    const { f, chamadas } = fetchSimulado([json({ ok: true })]);
    await requisitarJson("https://api.exemplo.dev/x", { chave: CONFIG.chave, fetch: f });
    expect(chamadas[0]?.chave).toBe(CONFIG.chave);
  });

  it("repete 5xx e falha de rede, com esperas de 500 ms e 1,5 s", async () => {
    const esperas: number[] = [];
    const { f, chamadas } = fetchSimulado([json({}, 503), new TypeError("fetch failed"), json({ ok: 1 })]);
    const r = await requisitarJson("https://api.exemplo.dev/x", { chave: "k", fetch: f, esperar: async (ms) => void esperas.push(ms) });
    expect(r).toEqual({ corpo: { ok: 1 }, tentativas: 3 });
    expect(chamadas).toHaveLength(3);
    expect(esperas).toEqual([500, 1500]);
    expect(esperaDaTentativa(3, 500)).toBe(4500);
  });

  it("desiste após 3 tentativas", async () => {
    const { f, chamadas } = fetchSimulado([json({}, 500)]);
    await expect(requisitarJson("https://api.exemplo.dev/x?a=1", { chave: "k", fetch: f, ...semEspera })).rejects.toMatchObject({
      message: "HTTP 500 em https://api.exemplo.dev/x",
      detalhes: { tentativas: 3, repetivel: true },
    });
    expect(chamadas).toHaveLength(3);
  });

  it("não repete 401 (chave errada não melhora na segunda vez)", async () => {
    const { f, chamadas } = fetchSimulado([json({ erro: "x" }, 401)]);
    const erro = await requisitarJson("https://api.exemplo.dev/x", { chave: "k", fetch: f, ...semEspera }).catch((e: unknown) => e);
    expect(erro).toBeInstanceOf(ErroIntegracao);
    expect((erro as ErroIntegracao).message).toContain("Chave de API recusada (401)");
    expect(chamadas).toHaveLength(1);
  });

  it("respeita Retry-After no 429", async () => {
    const esperas: number[] = [];
    const { f } = fetchSimulado([json({}, 429, { "retry-after": "3" }), json({ ok: 1 })]);
    await requisitarJson("https://api.exemplo.dev/x", { chave: "k", fetch: f, esperar: async (ms) => void esperas.push(ms) });
    expect(esperas).toEqual([3000]);
  });
});

describe("cliente do Pelagem", () => {
  it("percorre todas as páginas com porPagina=100", async () => {
    const pagina = (n: number, ids: string[]) => json({ dados: ids.map((id) => agendamento(id)), paginacao: { pagina: n, porPagina: 100, total: 5, totalPaginas: 3 } });
    const { f, chamadas } = fetchSimulado([pagina(1, ["a", "b"]), pagina(2, ["c", "d"]), pagina(3, ["e"])]);
    const r = await buscarAgendamentos(CONFIG, { fetch: f, ...semEspera });
    expect(r.agendamentos.map((a) => a.id)).toEqual(["a", "b", "c", "d", "e"]);
    expect(r).toMatchObject({ paginas: 3, lidos: 5, rejeitados: 0, truncado: false });
    expect(chamadas.map((c) => new URL(c.url).search)).toEqual(["?pagina=1&porPagina=100", "?pagina=2&porPagina=100", "?pagina=3&porPagina=100"]);
  });

  it("rejeita só o item fora do contrato e conta o motivo", async () => {
    const { f } = fetchSimulado([
      json({ dados: [agendamento("ok"), agendamento("ruim", { porte: "XG" }), agendamento("pii", { clienteHash: "maria@x.com" })], paginacao: { pagina: 1, porPagina: 100, total: 3, totalPaginas: 1 } }),
    ]);
    const r = await buscarAgendamentos(CONFIG, { fetch: f, ...semEspera });
    expect(r.agendamentos.map((a) => a.id)).toEqual(["ok"]);
    expect(r.rejeitados).toBe(2);
    expect(r.motivos.join(" ")).toContain("porte");
    expect(r.motivos.join(" ")).toContain("clienteHash");
  });

  it("remove duplicatas entre páginas (paginação por offset)", async () => {
    const pagina = (n: number, ids: string[]) => json({ dados: ids.map((id) => agendamento(id)), paginacao: { pagina: n, porPagina: 2, total: 4, totalPaginas: 2 } });
    const { f } = fetchSimulado([pagina(1, ["a", "b"]), pagina(2, ["b", "c"])]);
    expect((await buscarAgendamentos(CONFIG, { fetch: f, ...semEspera })).agendamentos).toHaveLength(3);
  });

  it(`para em ${MAX_PAGINAS_PELAGEM} páginas e marca como truncado`, async () => {
    const { f, chamadas } = fetchSimulado([(u) => json({ dados: [agendamento(new URL(u).searchParams.get("pagina") ?? "x")], paginacao: { pagina: 1, porPagina: 100, total: 9999, totalPaginas: 99 } })]);
    const r = await buscarAgendamentos(CONFIG, { fetch: f, ...semEspera });
    expect(chamadas).toHaveLength(MAX_PAGINAS_PELAGEM);
    expect(r.truncado).toBe(true);
  });

  it("falha com erro claro quando o envelope muda", async () => {
    const { f } = fetchSimulado([json({ itens: [] })]);
    await expect(buscarAgendamentos(CONFIG, { fetch: f, ...semEspera })).rejects.toThrow("Resposta fora do contrato em /api/integracao/agendamentos");
  });
});

describe("cliente da Lírio", () => {
  it("divide o período em janelas de até 92 dias, sem buracos nem sobreposição", () => {
    const janelas = dividirEmJanelas("2025-10-13", "2026-10-12", 92);
    expect(janelas).toHaveLength(4);
    expect(janelas[0]).toEqual({ de: "2026-07-13", ate: "2026-10-12" });
    expect(janelas.at(-1)?.de).toBe("2025-10-13");
    for (let i = 1; i < janelas.length; i++) {
      const anterior = janelas[i - 1];
      const atual = janelas[i];
      if (!anterior || !atual) continue;
      expect(new Date(`${atual.ate}T00:00:00Z`).getTime() + 86_400_000).toBe(new Date(`${anterior.de}T00:00:00Z`).getTime());
    }
    expect(dividirEmJanelas("2026-10-12", "2026-10-12", 92)).toEqual([{ de: "2026-10-12", ate: "2026-10-12" }]);
  });

  it("normaliza eventos: chave, região pelo distrito e nulos preservados", async () => {
    const itens = [
      { dia: "2026-10-01", distrito: "vila-sonia", categoria: "lash-designer", buscas: 3, visualizacoes: 4, cliquesWhatsapp: 1, cliquesInstagram: 0 },
      { dia: "2026-10-01", distrito: null, categoria: "maquiagem", buscas: 2, visualizacoes: 0, cliquesWhatsapp: 0, cliquesInstagram: 0 },
      { dia: "2026-10-01", distrito: "atlantida", categoria: null, buscas: 1, visualizacoes: 0, cliquesWhatsapp: 0, cliquesInstagram: 0 },
      { dia: "2026-10-01", distrito: "pinheiros", categoria: null, buscas: -1, visualizacoes: 0, cliquesWhatsapp: 0, cliquesInstagram: 0 },
    ];
    const { f, chamadas } = fetchSimulado([json({ periodo: { de: "2026-09-01", ate: "2026-10-01" }, itens })]);
    const r = await buscarEventos(CONFIG, { de: "2026-09-01", ate: "2026-10-01" }, { fetch: f, ...semEspera });
    expect(new URL(chamadas[0]?.url ?? "").search).toBe("?de=2026-09-01&ate=2026-10-01");
    expect(r.eventos).toEqual([
      { chave: "2026-10-01|vila-sonia|lash-designer", dia: "2026-10-01", distritoSlug: "vila-sonia", regiao: "oeste", categoria: "lash-designer", buscas: 3, visualizacoes: 4, cliquesWhatsapp: 1, cliquesInstagram: 0 },
      { chave: "2026-10-01|-|maquiagem", dia: "2026-10-01", distritoSlug: null, regiao: null, categoria: "maquiagem", buscas: 2, visualizacoes: 0, cliquesWhatsapp: 0, cliquesInstagram: 0 },
    ]);
    expect(r.rejeitados).toBe(2);
    expect(r.motivos.join(" ")).toContain("distrito desconhecido: atlantida");
  });

  it("consulta uma janela por requisição", async () => {
    const { f, chamadas } = fetchSimulado([(u) => json({ periodo: { de: new URL(u).searchParams.get("de"), ate: new URL(u).searchParams.get("ate") }, itens: [] })]);
    const r = await buscarEventos(CONFIG, { de: "2025-10-13", ate: "2026-10-12" }, { fetch: f, ...semEspera });
    expect(chamadas).toHaveLength(4);
    expect(r.paginas).toBe(4);
  });

  it("lê a oferta atual por distrito e categoria", async () => {
    const { f } = fetchSimulado([
      json({ totalProfissionais: 3, itens: [{ distrito: "pinheiros", nomeDistrito: "Pinheiros", subprefeitura: "Pinheiros", regiao: "oeste", categoria: "nail-designer", total: 3, verificadas: 2 }] }),
    ]);
    const r = await buscarOferta(CONFIG, { fetch: f, ...semEspera });
    expect(r.oferta).toEqual([{ distritoSlug: "pinheiros", regiao: "oeste", categoria: "nail-designer", ativas: 3, verificadas: 2 }]);
    expect(r.totalProfissionais).toBe(3);
  });
});
