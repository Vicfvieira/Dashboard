import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarSearch } from "lucide-react";
import { CabecalhoPagina } from "@/components/painel/cabecalho-pagina";
import { EsqueletoDashboard } from "@/components/painel/esqueletos";
import { EstadoVazio } from "@/components/painel/estado-vazio";
import { Button } from "@/components/ui/button";
import { CartoesKpi } from "@/components/visao-geral/cartoes-kpi";
import { Destaques } from "@/components/visao-geral/destaques";
import { GraficoTendencia } from "@/components/visao-geral/grafico-tendencia";
import { carregarVisaoGeral } from "@/lib/dados/visao-geral";
import { descreverIntervalo, hojeSP, intervaloAtual, lerFiltros, queryComFiltros, serializarFiltros } from "@/lib/filtros";
import { rotaInicial } from "@/lib/navegacao";
import { can } from "@/lib/rbac";
import { usuarioAtual } from "@/lib/sessao";

export default function VisaoGeral({ searchParams }: PageProps<"/">) {
  return (
    <Suspense fallback={<EsqueletoDashboard />}>
      <Conteudo searchParams={searchParams} />
    </Suspense>
  );
}

async function Conteudo({ searchParams }: { searchParams: PageProps<"/">["searchParams"] }) {
  const usuario = await usuarioAtual();
  // Quem não vê a visão geral (atendimento) vai direto para a sua página inicial.
  if (!can(usuario, "visao-geral:ver")) redirect(rotaInicial(usuario));

  const hoje = hojeSP();
  const filtros = lerFiltros(await searchParams, hoje);
  const intervalo = intervaloAtual(filtros, hoje);
  const financeiro = can(usuario, "pelagem:financeiro");
  const dados = await carregarVisaoGeral(filtros, intervalo, financeiro);
  const verPelagem = filtros.produto !== "lirio";
  const verLirio = filtros.produto !== "pelagem";
  const q = serializarFiltros(filtros).toString();
  const query = q ? `?${q}` : "";

  const semDados = dados.totais.pelagem.total === 0 && dados.totais.lirio.buscas === 0;
  const periodoTexto = descreverIntervalo(intervalo);
  const anteriorTexto = descreverIntervalo(dados.anterior);

  return (
    <div className="grid gap-6">
      <CabecalhoPagina
        titulo="Visão geral"
        descricao={`${verPelagem && verLirio ? "Pelagem Studio e Lírio" : verPelagem ? "Pelagem Studio" : "Lírio"} de ${periodoTexto}${filtros.comparar ? `, comparado com ${anteriorTexto}` : ""}.`}
      />
      {semDados ? (
        <EstadoVazio
          icone={CalendarSearch}
          titulo="Nenhum registro neste período"
          descricao="Não há atendimentos nem buscas entre as datas escolhidas. Amplie o período ou confira em Configurações se as fontes estão sincronizadas."
          acao={
            <Button asChild size="sm">
              <Link href={queryComFiltros(filtros, { periodo: "90d" }) || "/"}>Ver últimos 90 dias</Link>
            </Button>
          }
        />
      ) : (
        <>
          <CartoesKpi kpis={dados.kpis} comparar={filtros.comparar} descricaoAnterior={anteriorTexto} />
          <div className="grid gap-4 lg:grid-cols-3">
            <GraficoTendencia
              pontos={dados.tendencia}
              granularidade={dados.granularidade}
              verPelagem={verPelagem}
              verLirio={verLirio}
              podeVerFinanceiro={financeiro}
              descricaoIntervalo={dados.tendencia[0] && dados.tendencia[0].data > intervalo.de ? `${periodoTexto} (dados a partir de ${dados.tendencia[0].data.split("-").reverse().join("/")})` : periodoTexto}
            />
            <Destaques
              movimentos={dados.destaques}
              titulo={filtros.periodo === "7d" ? "Destaques da semana" : "Destaques do período"}
              descricao={`Os 3 maiores movimentos de ${periodoTexto} contra ${anteriorTexto}, entre serviços, categorias e regiões.`}
              query={query}
            />
          </div>
        </>
      )}
    </div>
  );
}
