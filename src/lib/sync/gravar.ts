import "server-only";
import { randomUUID } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { AgendamentoApi, HoraApi } from "./esquemas";
import type { EventoNormalizado, OfertaNormalizada } from "./clientes";

/**
 * Gravação idempotente das fontes. Cada lote é um INSERT ... SELECT FROM unnest(...) com
 * ON CONFLICT DO UPDATE: um comando por lote, todos os valores como parâmetros (nada concatenado).
 * Linhas não tocadas nesta execução dentro do intervalo coberto pela API (fictícias do seed ou
 * removidas na origem) são apagadas no fim, na mesma transação: o banco espelha a fonte.
 */

const LOTE = 2_000;
type Tx = Prisma.TransactionClient;

function* lotes<T>(itens: readonly T[]): Generator<T[]> {
  for (let i = 0; i < itens.length; i += LOTE) yield itens.slice(i, i + LOTE);
}

export interface ResultadoGravacao {
  gravados: number;
  removidos: number;
}

export async function gravarAgendamentos(agendamentos: readonly AgendamentoApi[], inicioExecucao: Date, espelhar: boolean): Promise<ResultadoGravacao> {
  if (agendamentos.length === 0) return { gravados: 0, removidos: 0 };
  const menorInicio = new Date(Math.min(...agendamentos.map((a) => Date.parse(a.inicio))));

  return prisma.$transaction(
    async (tx: Tx) => {
      let gravados = 0;
      for (const lote of lotes(agendamentos)) {
        gravados += await tx.$executeRaw`
          INSERT INTO "AppointmentFact" (
            "id", "idOrigem", "clienteHash", "servicoSlug", "servicoNome", "porte", "especie", "status",
            "inicio", "fim", "duracaoMinutos", "valorServicoCentavos", "taxaTaxiCentavos", "totalCentavos",
            "zonaTaxi", "criadoEmOrigem", "canceladoEmOrigem", "origem", "sincronizadoEm"
          )
          SELECT u.id, u.id_origem, u.cliente, u.slug, u.nome, u.porte::"Porte", u.especie::"Especie", u.status::"StatusAtendimento",
                 u.inicio::timestamptz, u.fim::timestamptz, u.duracao, u.valor, u.taxa, u.total,
                 u.zona, u.criado::timestamptz, u.cancelado::timestamptz, 'API'::"OrigemDado", ${inicioExecucao}
          FROM unnest(
            ${lote.map(() => randomUUID())}::text[],
            ${lote.map((a) => a.id)}::text[],
            ${lote.map((a) => a.clienteHash)}::text[],
            ${lote.map((a) => a.servico.slug)}::text[],
            ${lote.map((a) => a.servico.nome)}::text[],
            ${lote.map((a) => a.porte)}::text[],
            ${lote.map((a) => a.especie)}::text[],
            ${lote.map((a) => a.status)}::text[],
            ${lote.map((a) => a.inicio)}::text[],
            ${lote.map((a) => a.fim)}::text[],
            ${lote.map((a) => a.duracaoMinutos)}::int[],
            ${lote.map((a) => a.valorServicoCentavos)}::int[],
            ${lote.map((a) => a.taxaTaxiCentavos)}::int[],
            ${lote.map((a) => a.totalCentavos)}::int[],
            ${lote.map((a) => a.zonaTaxi)}::text[],
            ${lote.map((a) => a.criadoEm)}::text[],
            ${lote.map((a) => a.canceladoEm)}::text[]
          ) AS u(id, id_origem, cliente, slug, nome, porte, especie, status, inicio, fim, duracao, valor, taxa, total, zona, criado, cancelado)
          ON CONFLICT ("idOrigem") DO UPDATE SET
            "clienteHash" = EXCLUDED."clienteHash",
            "servicoSlug" = EXCLUDED."servicoSlug",
            "servicoNome" = EXCLUDED."servicoNome",
            "porte" = EXCLUDED."porte",
            "especie" = EXCLUDED."especie",
            "status" = EXCLUDED."status",
            "inicio" = EXCLUDED."inicio",
            "fim" = EXCLUDED."fim",
            "duracaoMinutos" = EXCLUDED."duracaoMinutos",
            "valorServicoCentavos" = EXCLUDED."valorServicoCentavos",
            "taxaTaxiCentavos" = EXCLUDED."taxaTaxiCentavos",
            "totalCentavos" = EXCLUDED."totalCentavos",
            "zonaTaxi" = EXCLUDED."zonaTaxi",
            "criadoEmOrigem" = EXCLUDED."criadoEmOrigem",
            "canceladoEmOrigem" = EXCLUDED."canceladoEmOrigem",
            "origem" = 'API',
            "sincronizadoEm" = EXCLUDED."sincronizadoEm"`;
      }
      // Histórico completo lido: some o que a API não tem mais e os fictícios do período real.
      const removidos = espelhar
        ? await tx.$executeRaw`
            DELETE FROM "AppointmentFact"
            WHERE "sincronizadoEm" < ${inicioExecucao}
              AND ("origem" = 'API' OR "inicio" >= ${menorInicio})`
        : 0;
      return { gravados, removidos };
    },
    { timeout: 60_000, maxWait: 10_000 },
  );
}

export async function gravarEventos(eventos: readonly EventoNormalizado[], periodo: { de: string; ate: string }, inicioExecucao: Date): Promise<ResultadoGravacao> {
  return prisma.$transaction(
    async (tx: Tx) => {
      let gravados = 0;
      for (const lote of lotes(eventos)) {
        gravados += await tx.$executeRaw`
          INSERT INTO "MarketEventFact" (
            "id", "chave", "dia", "distritoSlug", "regiao", "categoria",
            "buscas", "visualizacoes", "cliquesWhatsapp", "cliquesInstagram", "origem", "sincronizadoEm"
          )
          SELECT u.id, u.chave, u.dia::date, u.distrito, u.regiao::"Regiao", u.categoria,
                 u.buscas, u.visualizacoes, u.whatsapp, u.instagram, 'API'::"OrigemDado", ${inicioExecucao}
          FROM unnest(
            ${lote.map(() => randomUUID())}::text[],
            ${lote.map((e) => e.chave)}::text[],
            ${lote.map((e) => e.dia)}::text[],
            ${lote.map((e) => e.distritoSlug)}::text[],
            ${lote.map((e) => e.regiao)}::text[],
            ${lote.map((e) => e.categoria)}::text[],
            ${lote.map((e) => e.buscas)}::int[],
            ${lote.map((e) => e.visualizacoes)}::int[],
            ${lote.map((e) => e.cliquesWhatsapp)}::int[],
            ${lote.map((e) => e.cliquesInstagram)}::int[]
          ) AS u(id, chave, dia, distrito, regiao, categoria, buscas, visualizacoes, whatsapp, instagram)
          ON CONFLICT ("chave") DO UPDATE SET
            "buscas" = EXCLUDED."buscas",
            "visualizacoes" = EXCLUDED."visualizacoes",
            "cliquesWhatsapp" = EXCLUDED."cliquesWhatsapp",
            "cliquesInstagram" = EXCLUDED."cliquesInstagram",
            "origem" = 'API',
            "sincronizadoEm" = EXCLUDED."sincronizadoEm"`;
      }
      const removidos = await tx.$executeRaw`
        DELETE FROM "MarketEventFact"
        WHERE "dia" BETWEEN ${periodo.de}::date AND ${periodo.ate}::date
          AND "sincronizadoEm" < ${inicioExecucao}`;
      return { gravados, removidos };
    },
    { timeout: 60_000, maxWait: 10_000 },
  );
}

export async function gravarHorarios(horas: readonly HoraApi[], periodo: { de: string; ate: string }, inicioExecucao: Date): Promise<ResultadoGravacao> {
  return prisma.$transaction(
    async (tx: Tx) => {
      let gravados = 0;
      for (const lote of lotes(horas)) {
        gravados += await tx.$executeRaw`
          INSERT INTO "SearchHourFact" ("id", "dia", "hora", "buscas", "origem", "sincronizadoEm")
          SELECT u.id, u.dia::date, u.hora, u.buscas, 'API'::"OrigemDado", ${inicioExecucao}
          FROM unnest(
            ${lote.map(() => randomUUID())}::text[],
            ${lote.map((h) => h.dia)}::text[],
            ${lote.map((h) => h.hora)}::int[],
            ${lote.map((h) => h.buscas)}::int[]
          ) AS u(id, dia, hora, buscas)
          ON CONFLICT ("dia", "hora") DO UPDATE SET
            "buscas" = EXCLUDED."buscas",
            "origem" = 'API',
            "sincronizadoEm" = EXCLUDED."sincronizadoEm"`;
      }
      const removidos = await tx.$executeRaw`
        DELETE FROM "SearchHourFact"
        WHERE "dia" BETWEEN ${periodo.de}::date AND ${periodo.ate}::date
          AND "sincronizadoEm" < ${inicioExecucao}`;
      return { gravados, removidos };
    },
    { timeout: 60_000, maxWait: 10_000 },
  );
}

export async function gravarOferta(oferta: readonly OfertaNormalizada[], dia: string, inicioExecucao: Date): Promise<ResultadoGravacao> {
  return prisma.$transaction(
    async (tx: Tx) => {
      let gravados = 0;
      for (const lote of lotes(oferta)) {
        gravados += await tx.$executeRaw`
          INSERT INTO "ProfessionalStat" ("id", "data", "distritoSlug", "regiao", "categoria", "ativas", "verificadas", "origem", "sincronizadoEm")
          SELECT u.id, ${dia}::date, u.distrito, u.regiao::"Regiao", u.categoria, u.ativas, u.verificadas, 'API'::"OrigemDado", ${inicioExecucao}
          FROM unnest(
            ${lote.map(() => randomUUID())}::text[],
            ${lote.map((o) => o.distritoSlug)}::text[],
            ${lote.map((o) => o.regiao)}::text[],
            ${lote.map((o) => o.categoria)}::text[],
            ${lote.map((o) => o.ativas)}::int[],
            ${lote.map((o) => o.verificadas)}::int[]
          ) AS u(id, distrito, regiao, categoria, ativas, verificadas)
          ON CONFLICT ("data", "distritoSlug", "categoria") DO UPDATE SET
            "regiao" = EXCLUDED."regiao",
            "ativas" = EXCLUDED."ativas",
            "verificadas" = EXCLUDED."verificadas",
            "origem" = 'API',
            "sincronizadoEm" = EXCLUDED."sincronizadoEm"`;
      }
      // A foto de hoje passa a ser só a da API (as fotos anteriores ficam como histórico).
      const removidos = await tx.$executeRaw`
        DELETE FROM "ProfessionalStat" WHERE "data" = ${dia}::date AND "sincronizadoEm" < ${inicioExecucao}`;
      return { gravados, removidos };
    },
    { timeout: 60_000, maxWait: 10_000 },
  );
}
