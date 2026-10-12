import { Suspense } from "react";
import Link from "next/link";
import { CalendarSearch } from "lucide-react";
import { CabecalhoPagina } from "@/components/painel/cabecalho-pagina";
import { EsqueletoDashboard } from "@/components/painel/esqueletos";
import { EstadoVazio } from "@/components/painel/estado-vazio";
import { CancelamentoPorDia, FaturamentoSemanal, MixPorteEspecie, TopServicos } from "@/components/pelagem/graficos";
import { MapaCalor } from "@/components/pelagem/mapa-calor";
import { TabelaInativos } from "@/components/pelagem/tabela-inativos";
import { Button } from "@/components/ui/button";
import { CartoesKpi } from "@/components/visao-geral/cartoes-kpi";
import { carregarPelagem, type DadosPelagem } from "@/lib/dados/pelagem";
import type { Kpi } from "@/lib/dados/visao-geral";
import { descreverIntervalo, hojeSP, intervaloAtual, lerFiltros, queryComFiltros } from "@/lib/filtros";
import { DIAS_INATIVIDADE } from "@/lib/metrics";
import { can, requirePermission } from "@/lib/rbac";

export const metadata = { title: "Pelagem" };

export default function Pagina({ searchParams }: PageProps<"/pelagem">) {
  return (
    <Suspense fallback={<EsqueletoDashboard />}>
      <Conteudo searchParams={searchParams} />
    </Suspense>
  );
}

/** Quem não pode ver valores recebe os dados já sem eles: nada financeiro vai ao navegador. */
function semFinanceiro(d: DadosPelagem): DadosPelagem {
  const resumo = (r: DadosPelagem["atual"]) => ({ ...r, faturamento: 0, ticket: null });
  return {
    ...d,
    atual: resumo(d.atual),
    base: resumo(d.base),
    semanal: d.semanal.map((s) => ({ ...s, faturamento: 0 })),
    servicos: d.servicos.map((s) => ({ ...s, faturamento: 0 })),
    inativos: d.inativos.map((c) => ({ ...c, gastoTotal: 0 })),
  };
}

function kpisPelagem(d: DadosPelagem, financeiro: boolean): Kpi[] {
  const { atual: a, base: b } = d;
  const serieFat = d.semanal.filter((s) => s.noPeriodo || d.semanal.every((x) => !x.noPeriodo));
  const kpis: Kpi[] = [];
  if (financeiro) {
    kpis.push(
      { chave: "faturamento", rotulo: "Faturamento", marca: "pelagem", formato: "moeda", valor: a.faturamento, anterior: b.faturamento, ajuda: "Soma dos atendimentos concluídos no período (serviço + táxi dog).", serie: serieFat.map((s) => s.faturamento) },
      { chave: "ticket", rotulo: "Ticket médio", marca: "pelagem", formato: "moeda", valor: a.ticket ?? 0, anterior: b.ticket, ajuda: "Faturamento ÷ atendimentos concluídos.", serie: serieFat.map((s) => (s.atendimentos ? s.faturamento / s.atendimentos : 0)) },
    );
  }
  kpis.push(
    { chave: "atendimentos", rotulo: "Atendimentos concluídos", marca: "pelagem", formato: "inteiro", valor: a.concluidos, anterior: b.concluidos, ajuda: "Agendamentos com status concluído no período.", serie: serieFat.map((s) => s.atendimentos) },
    { chave: "cancelamento", rotulo: "Taxa de cancelamento", marca: "pelagem", formato: "percentual", valor: a.taxaCancelamento ?? 0, anterior: b.taxaCancelamento, menorMelhor: true, ajuda: `Cancelados ÷ todos os agendamentos do período (${a.cancelados} de ${a.agendamentos}).`, serie: [] },
    { chave: "retorno", rotulo: "Taxa de retorno", marca: "pelagem", formato: "percentual", valor: a.taxaRetorno ?? 0, anterior: b.taxaRetorno, ajuda: `Clientes com 2 ou mais atendimentos no período ÷ clientes atendidos (${a.clientesRecorrentes} de ${a.clientesAtendidos}).`, serie: [] },
    { chave: "inativos", rotulo: "Clientes inativos", marca: "pelagem", formato: "inteiro", valor: d.inativos.length, anterior: null, menorMelhor: true, notaComparacao: "posição de hoje", ajuda: `Clientes com o último atendimento concluído há mais de ${DIAS_INATIVIDADE} dias e nenhuma volta agendada.`, serie: [] },
  );
  return kpis;
}

async function Conteudo({ searchParams }: { searchParams: PageProps<"/pelagem">["searchParams"] }) {
  const usuario = await requirePermission("pelagem:ver");
  const financeiro = can(usuario, "pelagem:financeiro");
  const hoje = hojeSP();
  const filtros = lerFiltros(await searchParams, hoje);
  const intervalo = intervaloAtual(filtros, hoje);
  const completos = await carregarPelagem(intervalo, hoje, new Date());
  const dados = financeiro ? completos : semFinanceiro(completos);

  const periodoTexto = descreverIntervalo(intervalo);
  const anteriorTexto = descreverIntervalo(dados.anterior);
  const semDados = dados.atual.agendamentos === 0;

  return (
    <div className="grid gap-6">
      <CabecalhoPagina
        titulo="Pelagem Studio"
        marca="pelagem"
        descricao={`Pet spa de banho e tosa: ${financeiro ? "faturamento, " : ""}serviços, horários de pico, cancelamentos e clientes a reativar, de ${periodoTexto}${filtros.comparar ? `, comparado com ${anteriorTexto}` : ""}.`}
      />
      {semDados ? (
        <EstadoVazio
          icone={CalendarSearch}
          titulo="Nenhum agendamento neste período"
          descricao="O Pelagem não tem agendamentos entre as datas escolhidas. Amplie o período ou confira em Configurações se a sincronização está em dia."
          acao={
            <Button asChild size="sm">
              <Link href={`/pelagem${queryComFiltros(filtros, { periodo: "90d" })}`}>Ver últimos 90 dias</Link>
            </Button>
          }
        />
      ) : (
        <>
          <CartoesKpi kpis={kpisPelagem(dados, financeiro)} comparar={filtros.comparar} descricaoAnterior={anteriorTexto} />
          <div className="grid gap-4 lg:grid-cols-3">
            <FaturamentoSemanal semanas={dados.semanal} podeVerFinanceiro={financeiro} descricaoIntervalo={periodoTexto} />
            <MixPorteEspecie mix={dados.mix} descricaoIntervalo={periodoTexto} />
            <MapaCalor celulas={dados.calor} descricaoIntervalo={periodoTexto} />
            <CancelamentoPorDia dias={dados.cancelamento} taxaGeral={dados.atual.taxaCancelamento} comparar={filtros.comparar} descricaoIntervalo={periodoTexto} />
            <div className="lg:col-span-3">
              <TopServicos servicos={dados.servicos} podeVerFinanceiro={financeiro} comparar={filtros.comparar} descricaoIntervalo={periodoTexto} />
            </div>
          </div>
        </>
      )}
      <TabelaInativos clientes={dados.inativos} podeVerFinanceiro={financeiro} recurso="pelagem-clientes-inativos" />
    </div>
  );
}
