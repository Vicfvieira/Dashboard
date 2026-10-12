import { Suspense } from "react";
import { EsqueletoTabela } from "@/components/painel/esqueletos";
import { CabecalhoPagina } from "@/components/painel/cabecalho-pagina";
import { TabelaInativos } from "@/components/pelagem/tabela-inativos";
import { CartoesKpi } from "@/components/visao-geral/cartoes-kpi";
import { clientesInativos, resumoPelagem } from "@/lib/dados/pelagem";
import type { Kpi } from "@/lib/dados/visao-geral";
import { descreverIntervalo, hojeSP, intervaloAnterior, intervaloAtual, lerFiltros } from "@/lib/filtros";
import { DIAS_INATIVIDADE } from "@/lib/metrics";
import { can, requirePermission } from "@/lib/rbac";

export const metadata = { title: "Clientes" };

export default function Pagina({ searchParams }: PageProps<"/clientes">) {
  return (
    <Suspense fallback={<EsqueletoTabela />}>
      <Conteudo searchParams={searchParams} />
    </Suspense>
  );
}

async function Conteudo({ searchParams }: { searchParams: PageProps<"/clientes">["searchParams"] }) {
  const usuario = await requirePermission("clientes:ver");
  const financeiro = can(usuario, "pelagem:financeiro");
  const hoje = hojeSP();
  const filtros = lerFiltros(await searchParams, hoje);
  const intervalo = intervaloAtual(filtros, hoje);
  const anterior = intervaloAnterior(intervalo);
  const [atual, base, inativosCompletos] = await Promise.all([resumoPelagem(intervalo), resumoPelagem(anterior), clientesInativos(new Date())]);
  const inativos = financeiro ? inativosCompletos : inativosCompletos.map((c) => ({ ...c, gastoTotal: 0 }));
  const emRisco = financeiro ? inativos.reduce((t, c) => t + c.gastoTotal / Math.max(1, c.atendimentos), 0) : 0;

  const kpis: Kpi[] = [
    { chave: "retorno", rotulo: "Taxa de retorno", marca: "pelagem", formato: "percentual", valor: atual.taxaRetorno ?? 0, anterior: base.taxaRetorno, ajuda: "Clientes com 2 ou mais atendimentos concluídos no período ÷ clientes atendidos.", serie: [] },
    { chave: "atendidos", rotulo: "Clientes atendidos", marca: "pelagem", formato: "inteiro", valor: atual.clientesAtendidos, anterior: base.clientesAtendidos, ajuda: "Hashes distintos com ao menos um atendimento concluído no período.", serie: [] },
    { chave: "recorrentes", rotulo: "Clientes recorrentes", marca: "pelagem", formato: "inteiro", valor: atual.clientesRecorrentes, anterior: base.clientesRecorrentes, ajuda: "Clientes com 2 ou mais atendimentos concluídos no período.", serie: [] },
    { chave: "inativos", rotulo: "Clientes inativos", marca: "pelagem", formato: "inteiro", valor: inativos.length, anterior: null, menorMelhor: true, notaComparacao: "posição de hoje", ajuda: `Último atendimento concluído há mais de ${DIAS_INATIVIDADE} dias e nenhuma volta agendada.`, serie: [] },
    ...(financeiro
      ? [{ chave: "recuperavel" as const, rotulo: "Receita por visita a recuperar", marca: "pelagem" as const, formato: "moeda" as const, valor: emRisco, anterior: null, notaComparacao: "uma visita de cada inativo", ajuda: "Soma do ticket médio histórico de cada cliente inativo: quanto entra se cada um voltar uma vez.", serie: [] }]
      : []),
  ];

  return (
    <div className="grid gap-6">
      <CabecalhoPagina
        titulo="Clientes"
        marca="pelagem"
        descricao={`Retenção dos clientes do Pelagem de ${descreverIntervalo(intervalo)} e lista de reativação. Ninguém é identificado: cada cliente é um hash anônimo gerado pela API do Pelagem.`}
      />
      <CartoesKpi kpis={kpis} comparar={filtros.comparar} descricaoAnterior={descreverIntervalo(anterior)} />
      <TabelaInativos clientes={inativos} podeVerFinanceiro={financeiro} recurso="clientes-inativos" />
    </div>
  );
}
