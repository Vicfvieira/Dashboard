import "server-only";
import { descreverIntervalo, type Intervalo } from "@/lib/filtros";
import type { ContextoInsights } from "@/lib/insights";
import { carregarLirio } from "./lirio";
import { carregarMercado } from "./mercado";
import { carregarPelagem } from "./pelagem";

/**
 * Monta o contexto das regras com as mesmas consultas das páginas de origem: o número citado
 * num insight é o mesmo que aparece no gráfico para onde ele aponta.
 */
export async function contextoInsights(
  intervalo: Intervalo,
  hoje: string,
  opcoes: { query: string; verPelagem: boolean; verLirio: boolean; financeiro: boolean },
): Promise<ContextoInsights> {
  const [lirio, mercado, pelagem] = await Promise.all([
    opcoes.verLirio ? carregarLirio(intervalo) : null,
    opcoes.verLirio ? carregarMercado(intervalo) : null,
    opcoes.verPelagem ? carregarPelagem(intervalo, hoje, new Date()) : null,
  ]);
  const anterior = lirio?.anterior ?? pelagem?.anterior;
  const porChave = (lista: { chave: string | null; buscas: number; visualizacoes: number; cliques: number }[]) =>
    new Map(lista.filter((s): s is typeof s & { chave: string } => s.chave !== null).map((s) => [s.chave, { buscas: s.buscas, visualizacoes: s.visualizacoes, cliques: s.cliques }]));

  return {
    query: opcoes.query,
    periodo: descreverIntervalo(intervalo),
    anterior: anterior ? descreverIntervalo(anterior) : "o período anterior",
    lirio:
      lirio && mercado
        ? {
            celulas: mercado.celulas,
            categorias: porChave(lirio.porCategoria),
            categoriasAnterior: porChave(lirio.porCategoriaAnterior),
            totais: lirio.totais,
            totaisAnterior: lirio.totaisAnterior,
            horas: lirio.horarios.celulas,
          }
        : undefined,
    pelagem: pelagem
      ? {
          financeiro: opcoes.financeiro,
          atual: { faturamento: pelagem.atual.faturamento, concluidos: pelagem.atual.concluidos, taxaRetorno: pelagem.atual.taxaRetorno },
          anterior: { faturamento: pelagem.base.faturamento, concluidos: pelagem.base.concluidos, taxaRetorno: pelagem.base.taxaRetorno },
          cancelamentoPorDia: pelagem.cancelamento.map((c) => ({ diaSemana: c.diaSemana, agendamentos: c.agendamentos, cancelados: c.cancelados, agendamentosAnterior: c.agendamentosAnterior, canceladosAnterior: c.canceladosAnterior })),
          servicos: pelagem.servicos.map((s) => ({ servico: s.servico, porte: s.porte, atendimentos: s.atendimentos, atendimentosAnterior: s.atendimentosAnterior })),
          inativos: {
            quantidade: pelagem.inativos.length,
            receitaPorVisita: opcoes.financeiro ? pelagem.inativos.reduce((t, c) => t + c.gastoTotal / Math.max(1, c.atendimentos), 0) : null,
          },
        }
      : undefined,
  };
}
