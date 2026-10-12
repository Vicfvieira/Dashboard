import { describe, expect, it } from "vitest";
import { abertoNoDia, ocupacaoPorSlot, paraItemAgenda, proximoAtendimento, proximoDiaAberto, SLOTS, type LinhaAgendaBanco } from "./agenda";

const linha = (id: string, ini: string, fim: string, status: LinhaAgendaBanco["status"] = "AGENDADO"): LinhaAgendaBanco => ({
  id,
  inicio: new Date(`2026-10-13T${ini}:00-03:00`),
  fim: new Date(`2026-10-13T${fim}:00-03:00`),
  duracaoMinutos: 60,
  servicoNome: "Banho",
  porte: "M",
  especie: "CACHORRO",
  status,
  clienteHash: "abcdef0123456789",
  zonaTaxi: null,
});

describe("agenda do dia", () => {
  it("abre de terça a sábado e pula domingo e segunda", () => {
    expect(abertoNoDia("2026-10-12")).toBe(false); // segunda
    expect(abertoNoDia("2026-10-13")).toBe(true);
    expect(proximoDiaAberto("2026-10-17")).toBe("2026-10-20"); // sábado → terça
    expect(proximoDiaAberto("2026-10-13", -1)).toBe("2026-10-10");
    expect(SLOTS[0]).toBe("09:00");
    expect(SLOTS.at(-1)).toBe("17:30");
  });

  it("não leva nenhum valor financeiro para o item que vai ao navegador", () => {
    const comValores = { ...linha("a", "09:00", "10:00"), totalCentavos: 9000, valorServicoCentavos: 8000, taxaTaxiCentavos: 1000 };
    const item = paraItemAgenda(comValores);
    expect(Object.keys(item).sort()).toEqual(["cliente", "duracao", "especie", "fim", "id", "inicio", "porte", "servico", "status", "taxiDog"]);
    expect(JSON.stringify(item)).not.toMatch(/9000|8000|1000|Centavos/);
    expect(item).toMatchObject({ inicio: "09:00", fim: "10:00", cliente: "abcdef01" });
  });

  it("calcula a ocupação por slot ignorando cancelados", () => {
    const itens = [linha("a", "09:00", "10:00"), linha("b", "09:30", "10:30"), linha("c", "09:00", "11:00", "CANCELADO")].map(paraItemAgenda);
    const o = ocupacaoPorSlot(itens);
    expect(o.slice(0, 4)).toEqual([
      { slot: "09:00", ocupados: 1 },
      { slot: "09:30", ocupados: 2 },
      { slot: "10:00", ocupados: 1 },
      { slot: "10:30", ocupados: 0 },
    ]);
  });

  it("acha o próximo atendimento (inclusive o em andamento)", () => {
    const itens = [linha("a", "09:00", "10:00"), linha("b", "11:00", "12:00"), linha("c", "10:00", "11:00", "CONCLUIDO")].map(paraItemAgenda);
    expect(proximoAtendimento(itens, "09:30")?.id).toBe("a");
    expect(proximoAtendimento(itens, "10:15")?.id).toBe("b");
    expect(proximoAtendimento(itens, "12:00")).toBeNull();
  });
});
