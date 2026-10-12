/**
 * Contratos das APIs de integração, validados com Zod. A página é validada no envelope; cada item
 * é validado sozinho, para um registro ruim não derrubar a sincronização inteira (é contado como
 * rejeitado e aparece no histórico).
 */
import { z } from "zod";

const dataIso = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const instante = z.iso.datetime({ offset: true });
const inteiroNaoNegativo = z.number().int().min(0);

// ─── Pelagem ──────────────────────────────────────────────────────────────────

export const paginaAgendamentos = z.object({
  dados: z.array(z.unknown()),
  paginacao: z.object({
    pagina: z.number().int().min(1),
    porPagina: z.number().int().min(1),
    total: inteiroNaoNegativo,
    totalPaginas: inteiroNaoNegativo,
  }),
});

export const agendamentoApi = z.object({
  id: z.string().min(1).max(64),
  clienteHash: z.string().regex(/^[0-9a-f]{64}$/, "clienteHash precisa ser SHA-256 hexadecimal"),
  servico: z.object({ slug: z.string().min(1).max(80), nome: z.string().min(1).max(120) }),
  porte: z.enum(["P", "M", "G"]),
  /** Adicionada à API do Pelagem depois; ausente em respostas antigas vira null. */
  especie: z.enum(["CACHORRO", "GATO"]).nullish().transform((v) => v ?? null),
  status: z.enum(["AGENDADO", "CONCLUIDO", "CANCELADO"]),
  inicio: instante,
  fim: instante,
  duracaoMinutos: z.number().int().min(1).max(24 * 60),
  valorServicoCentavos: inteiroNaoNegativo,
  taxaTaxiCentavos: inteiroNaoNegativo,
  totalCentavos: inteiroNaoNegativo,
  zonaTaxi: z.string().max(60).nullable(),
  criadoEm: instante,
  canceladoEm: instante.nullable(),
});
export type AgendamentoApi = z.infer<typeof agendamentoApi>;

// ─── Lírio ────────────────────────────────────────────────────────────────────

const slug = z.string().regex(/^[a-z0-9-]+$/).max(80);

export const respostaProfissionais = z.object({
  totalProfissionais: inteiroNaoNegativo,
  itens: z.array(z.unknown()),
});

export const contagemProfissionaisApi = z.object({
  distrito: slug,
  categoria: slug,
  total: inteiroNaoNegativo,
  verificadas: inteiroNaoNegativo,
});
export type ContagemProfissionaisApi = z.infer<typeof contagemProfissionaisApi>;

export const respostaEventos = z.object({
  periodo: z.object({ de: dataIso, ate: dataIso }),
  itens: z.array(z.unknown()),
});

export const eventoApi = z.object({
  dia: dataIso,
  distrito: slug.nullable(),
  categoria: slug.nullable(),
  buscas: inteiroNaoNegativo,
  visualizacoes: inteiroNaoNegativo,
  cliquesWhatsapp: inteiroNaoNegativo,
  cliquesInstagram: inteiroNaoNegativo,
});
export type EventoApi = z.infer<typeof eventoApi>;

/** Valida item a item e devolve os válidos e uma amostra dos motivos de rejeição. */
export function validarItens<T>(itens: readonly unknown[], esquema: z.ZodType<T>): { validos: T[]; rejeitados: number; motivos: string[] } {
  const validos: T[] = [];
  const motivos: string[] = [];
  let rejeitados = 0;
  for (const item of itens) {
    const r = esquema.safeParse(item);
    if (r.success) validos.push(r.data);
    else {
      rejeitados++;
      if (motivos.length < 5) motivos.push(r.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "));
    }
  }
  return { validos, rejeitados, motivos };
}
