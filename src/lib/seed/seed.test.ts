import { describe, expect, it } from "vitest";
import { sorteio } from "./aleatorio";
import { diaDaSemana, diaSP, horarioSP, somarDias } from "./datas";
import { chaveEvento, gerarBuscasPorHora, gerarEventos, gerarOferta } from "./lirio";
import { DIAS_ABERTOS, gerarAtendimentos } from "./pelagem";

const agora = new Date("2026-10-12T15:00:00.000Z");
const hoje = diaSP(agora);
const inicio = somarDias(hoje, -182);

describe("aleatoriedade determinística", () => {
  it("gera a mesma sequência para a mesma chave e sequências diferentes para chaves diferentes", () => {
    const a = sorteio("x");
    const b = sorteio("x");
    const c = sorteio("y");
    const sa = Array.from({ length: 80 }, () => a.real());
    expect(Array.from({ length: 80 }, () => b.real())).toEqual(sa);
    expect(Array.from({ length: 80 }, () => c.real())).not.toEqual(sa);
    expect(sa.every((v) => v >= 0 && v < 1)).toBe(true);
  });
});

describe("datas em São Paulo", () => {
  it("converte instantes para o dia civil de SP (UTC−3)", () => {
    expect(diaSP(new Date("2026-10-13T02:59:00Z")).toISOString()).toBe("2026-10-12T00:00:00.000Z");
    expect(diaSP(new Date("2026-10-13T03:00:00Z")).toISOString()).toBe("2026-10-13T00:00:00.000Z");
    expect(horarioSP(new Date("2026-10-13T00:00:00Z"), 9).toISOString()).toBe("2026-10-13T12:00:00.000Z");
  });
});

describe("seed do Pelagem", () => {
  const linhas = gerarAtendimentos({ agora, inicio, diasFuturos: 14, totalClientes: 300 });

  it("é determinístico e tem ids únicos", () => {
    const de_novo = gerarAtendimentos({ agora, inicio, diasFuturos: 14, totalClientes: 300 });
    expect(de_novo).toEqual(linhas);
    expect(new Set(linhas.map((l) => l.idOrigem)).size).toBe(linhas.length);
  });

  it("respeita o funcionamento: terça a sábado, das 9h às 18h", () => {
    for (const l of linhas) {
      expect(DIAS_ABERTOS.has(diaDaSemana(diaSP(l.inicio)))).toBe(true);
      const hora = (l.inicio.getUTCHours() + 21) % 24;
      expect(hora).toBeGreaterThanOrEqual(9);
      expect(l.fim.getTime() - l.inicio.getTime()).toBe(l.duracaoMinutos * 60_000);
    }
  });

  it("tem status coerentes com o tempo e valores somados corretamente", () => {
    for (const l of linhas) {
      expect(l.totalCentavos).toBe(l.valorServicoCentavos + l.taxaTaxiCentavos);
      expect(l.criadoEmOrigem.getTime()).toBeLessThanOrEqual(agora.getTime());
      if (l.status === "CONCLUIDO") expect(l.fim.getTime()).toBeLessThanOrEqual(agora.getTime());
      if (l.status === "AGENDADO") expect(l.fim.getTime()).toBeGreaterThan(agora.getTime());
      if (l.status === "CANCELADO") expect(l.canceladoEmOrigem?.getTime()).toBeLessThanOrEqual(agora.getTime());
      else expect(l.canceladoEmOrigem).toBeNull();
      expect(/^[0-9a-f]{64}$/.test(l.clienteHash)).toBe(true);
    }
    expect(linhas.some((l) => l.status === "AGENDADO")).toBe(true);
  });

  it("gera clientes recorrentes (base para a taxa de retorno)", () => {
    const visitas = new Map<string, number>();
    for (const l of linhas) visitas.set(l.clienteHash, (visitas.get(l.clienteHash) ?? 0) + 1);
    const recorrentes = [...visitas.values()].filter((v) => v >= 2).length;
    expect(recorrentes / visitas.size).toBeGreaterThan(0.4);
  });
});

describe("seed da Lírio", () => {
  const oferta = gerarOferta({ inicio, hoje });
  const eventos = gerarEventos({ inicio, hoje });

  it("tem chaves de evento únicas e no formato esperado", () => {
    expect(new Set(eventos.map((e) => e.chave)).size).toBe(eventos.length);
    expect(chaveEvento(hoje, null, "maquiagem")).toBe("2026-10-12|-|maquiagem");
  });

  it("tem uma foto de oferta por par e data, só com valores positivos", () => {
    const chaves = oferta.map((o) => `${o.data.toISOString()}|${o.distritoSlug}|${o.categoria}`);
    expect(new Set(chaves).size).toBe(oferta.length);
    expect(oferta.every((o) => o.ativas > 0 && o.verificadas <= o.ativas)).toBe(true);
    expect(oferta.some((o) => o.data.getTime() === hoje.getTime())).toBe(true);
  });

  it("mantém o funil coerente: cliques nunca superam visualizações", () => {
    for (const e of eventos) {
      expect(e.buscas + e.visualizacoes).toBeGreaterThan(0);
      if (e.distritoSlug === null) expect(e.visualizacoes).toBe(0);
    }
    const total = eventos.reduce((t, e) => ({ v: t.v + e.visualizacoes, w: t.w + e.cliquesWhatsapp }), { v: 0, w: 0 });
    expect(total.w).toBeLessThan(total.v);
  });

  it("distribui as buscas de cada dia pelas horas sem perder nem inventar buscas", () => {
    const horas = gerarBuscasPorHora(eventos);
    const dia = (d: Date) => d.toISOString().slice(0, 10);
    const somaEventos = new Map<string, number>();
    for (const e of eventos) somaEventos.set(dia(e.dia), (somaEventos.get(dia(e.dia)) ?? 0) + e.buscas);
    const somaHoras = new Map<string, number>();
    for (const h of horas) somaHoras.set(dia(h.dia), (somaHoras.get(dia(h.dia)) ?? 0) + h.buscas);
    for (const [d, n] of somaEventos) expect(somaHoras.get(d) ?? 0).toBe(n);
    expect(horas.every((h) => h.hora >= 0 && h.hora <= 23 && h.buscas > 0)).toBe(true);
    // Pico da noite maior que a madrugada.
    const naHora = (h: number) => horas.filter((x) => x.hora === h).reduce((t, x) => t + x.buscas, 0);
    expect(naHora(20)).toBeGreaterThan(naHora(3) * 10);
  });

  it("planta demanda reprimida em Vila Sônia × Lash designer", () => {
    const recente = (d: Date) => hoje.getTime() - d.getTime() < 30 * 86_400_000;
    const buscas = eventos
      .filter((e) => e.distritoSlug === "vila-sonia" && e.categoria === "lash-designer" && recente(e.dia))
      .reduce((t, e) => t + e.buscas, 0);
    const ativas = oferta.find((o) => o.distritoSlug === "vila-sonia" && o.categoria === "lash-designer" && o.data.getTime() === hoje.getTime())?.ativas ?? 0;
    expect(ativas).toBeGreaterThan(0);
    expect(buscas / ativas).toBeGreaterThan(5);
  });
});
