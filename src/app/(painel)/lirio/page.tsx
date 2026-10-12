import { Suspense } from "react";
import Link from "next/link";
import { CalendarSearch, Clock } from "lucide-react";
import { MapaCalor } from "@/components/graficos/mapa-calor";
import { CategoriasEmAlta, EvolucaoOferta, FunilLirio, RankingDistritos, TaxasPorSegmento, type SegmentoNomeado } from "@/components/lirio/graficos";
import { CabecalhoPagina } from "@/components/painel/cabecalho-pagina";
import { EsqueletoDashboard } from "@/components/painel/esqueletos";
import { EstadoVazio } from "@/components/painel/estado-vazio";
import { Button } from "@/components/ui/button";
import { CartoesKpi } from "@/components/visao-geral/cartoes-kpi";
import { CATEGORIAS, nomeCategoria } from "@/data/categorias";
import { DISTRITOS, REGIOES } from "@/data/sp-geo";
import { carregarLirio, type DadosLirio, type SegmentoFunil } from "@/lib/dados/lirio";
import type { Kpi } from "@/lib/dados/visao-geral";
import { descreverIntervalo, hojeSP, intervaloAtual, lerFiltros, queryComFiltros } from "@/lib/filtros";
import { formatarInteiro, formatarPercentual } from "@/lib/formato";
import { crescimentoPorChave, picosDeBusca, rankingConversao } from "@/lib/lirio-analise";
import { taxaContato, taxaVisualizacao } from "@/lib/metrics";
import { requirePermission } from "@/lib/rbac";
import { DIA_SEMANA } from "@/lib/rotulos-pelagem";

export const metadata = { title: "Lírio" };

/** Base mínima para crescimento (buscas no período anterior) e para o ranking (visualizações). */
const BASE_CRESCIMENTO = 30;
const MINIMO_RANKING = 30;
const NOME_REGIAO = new Map<string, string>(REGIOES.map((r) => [r.id, r.nome]));
const DISTRITO = new Map(DISTRITOS.map((d) => [d.slug, d]));

export default function Pagina({ searchParams }: PageProps<"/lirio">) {
  return (
    <Suspense fallback={<EsqueletoDashboard />}>
      <Conteudo searchParams={searchParams} />
    </Suspense>
  );
}

const nomear = (segmentos: readonly SegmentoFunil[], nome: (chave: string) => string): SegmentoNomeado[] =>
  segmentos.filter((s): s is SegmentoFunil & { chave: string } => s.chave !== null && s.buscas + s.visualizacoes > 0).map((s) => ({ ...s, nome: nome(s.chave) }));

function kpisLirio(d: DadosLirio): Kpi[] {
  const { totais: a, totaisAnterior: b } = d;
  const tv = (t: typeof a) => taxaVisualizacao(t.visualizacoes, t.buscas);
  const tc = (t: typeof a) => taxaContato(t.cliques, t.visualizacoes);
  const ofertaSerie = [...new Map(d.oferta.map((f) => [f.data, 0])).keys()].map((data) => d.oferta.filter((f) => f.data === data).reduce((t, f) => t + f.ativas, 0));
  return [
    { chave: "buscas", rotulo: "Buscas", marca: "lirio", formato: "inteiro", valor: a.buscas, anterior: b.buscas, ajuda: "Buscas feitas na Lírio no período, com ou sem bairro escolhido.", serie: d.series.buscas.map((p) => p.valor) },
    { chave: "visualizacoes", rotulo: "Visualizações de perfil", marca: "lirio", formato: "inteiro", valor: a.visualizacoes, anterior: b.visualizacoes, ajuda: "Perfis de profissionais abertos no período.", serie: d.series.visualizacoes.map((p) => p.valor) },
    { chave: "cliques", rotulo: "Cliques no WhatsApp", marca: "lirio", formato: "inteiro", valor: a.cliques, anterior: b.cliques, ajuda: "Conversas iniciadas pelo botão de WhatsApp dos perfis.", serie: d.series.cliques.map((p) => p.valor) },
    { chave: "taxaVisualizacao", rotulo: "Taxa de visualização", marca: "lirio", formato: "percentual", valor: tv(a) ?? 0, anterior: tv(b), ajuda: "Visualizações ÷ buscas. Passa de 100% quando cada busca abre mais de um perfil.", serie: [] },
    { chave: "taxaContato", rotulo: "Taxa de contato", marca: "lirio", formato: "percentual", valor: tc(a) ?? 0, anterior: tc(b), ajuda: "Cliques no WhatsApp ÷ visualizações de perfil.", serie: [] },
    { chave: "oferta", rotulo: "Profissionais ativas", marca: "lirio", formato: "inteiro", valor: d.ativas ?? 0, anterior: d.ativasAnterior, ajuda: "Soma das profissionais aprovadas por categoria na foto mais recente do período (quem atende duas categorias conta duas vezes).", serie: ofertaSerie },
  ];
}

async function Conteudo({ searchParams }: { searchParams: PageProps<"/lirio">["searchParams"] }) {
  await requirePermission("lirio:ver");
  const hoje = hojeSP();
  const filtros = lerFiltros(await searchParams, hoje);
  const intervalo = intervaloAtual(filtros, hoje);
  const d = await carregarLirio(intervalo);

  const periodoTexto = descreverIntervalo(intervalo);
  const anteriorTexto = descreverIntervalo(d.anterior);

  if (d.totais.buscas === 0) {
    return (
      <div className="grid gap-6">
        <CabecalhoPagina titulo="Lírio" marca="lirio" descricao={`Plataforma de beleza em 96 distritos de São Paulo, de ${periodoTexto}.`} />
        <EstadoVazio
          icone={CalendarSearch}
          titulo="Nenhuma busca neste período"
          descricao="A Lírio não tem buscas registradas entre as datas escolhidas. Amplie o período ou confira em Configurações se a sincronização está em dia."
          acao={
            <Button asChild size="sm">
              <Link href={`/lirio${queryComFiltros(filtros, { periodo: "90d" })}`}>Ver últimos 90 dias</Link>
            </Button>
          }
        />
      </div>
    );
  }

  const categorias = nomear(d.porCategoria, nomeCategoria);
  const regioes = nomear(d.porRegiao, (r) => NOME_REGIAO.get(r) ?? r);
  const anteriores = Object.fromEntries([
    ...d.porCategoriaAnterior.filter((s) => s.chave !== null).map((s) => [`categoria:${s.chave}`, s] as const),
    ...d.porRegiaoAnterior.filter((s) => s.chave !== null).map((s) => [`regiao:${s.chave}`, s] as const),
  ]);

  const crescimento = crescimentoPorChave(
    new Map(categorias.map((c) => [c.chave, c.buscas])),
    new Map(d.porCategoriaAnterior.filter((c) => c.chave !== null).map((c) => [c.chave as string, c.buscas])),
    BASE_CRESCIMENTO,
  ).map((c) => ({ ...c, nome: nomeCategoria(c.chave) }));

  const { ranking, foraDoRanking } = rankingConversao(d.distritos, MINIMO_RANKING);
  const linhasRanking = ranking.map((r) => {
    const distrito = DISTRITO.get(r.slug);
    return { ...r, nome: distrito?.nome ?? r.slug, regiao: NOME_REGIAO.get(distrito?.regiao ?? "") ?? "—" };
  });

  const picos = picosDeBusca(d.horarios.celulas);
  const coberturaParcial = d.horarios.diasComDados > 0 && d.horarios.primeiroDia !== null && d.horarios.primeiroDia > intervalo.de;

  return (
    <div className="grid gap-6">
      <CabecalhoPagina
        titulo="Lírio"
        marca="lirio"
        descricao={`Plataforma de beleza em 96 distritos de São Paulo: funil de buscas até o WhatsApp, categorias em alta, horários de pico, oferta e conversão por distrito, de ${periodoTexto}${filtros.comparar ? `, comparado com ${anteriorTexto}` : ""}.`}
      />
      <CartoesKpi kpis={kpisLirio(d)} comparar={filtros.comparar} descricaoAnterior={anteriorTexto} />
      <div className="grid gap-4 lg:grid-cols-3">
        <FunilLirio cidade={d.totais} cidadeAnterior={d.totaisAnterior} categorias={categorias} regioes={regioes} anteriores={anteriores} comparar={filtros.comparar} descricaoIntervalo={periodoTexto} />
        <CategoriasEmAlta categorias={crescimento} descricaoIntervalo={periodoTexto} descricaoAnterior={anteriorTexto} baseMinima={BASE_CRESCIMENTO} />
        {d.horarios.diasComDados > 0 ? (
          <MapaCalor
            titulo="Horários e dias de pico de busca"
            descricao={`Buscas por dia da semana e hora (horário de Brasília) em ${coberturaParcial ? `${descreverIntervalo({ de: d.horarios.primeiroDia ?? intervalo.de, ate: intervalo.ate, dias: 0 })}, desde que a Lírio passou a enviar dados por hora` : periodoTexto}.`}
            recurso="lirio-horarios-pico"
            celulas={d.horarios.celulas}
            dias={[1, 2, 3, 4, 5, 6, 7]}
            horas={Array.from({ length: 24 }, (_, h) => h)}
            cor="var(--serie-lirio)"
            textoForte="var(--calor-texto-lirio)"
            unidade={{ singular: "busca", plural: "buscas" }}
            larguraCelula={38}
            className="lg:col-span-3"
            resumo={
              picos.janela && picos.diaMaisForte && picos.celulaMaisForte ? (
                <>
                  <span className="font-medium text-foreground">
                    {picos.janela.inicio}h–{picos.janela.fim}h
                  </span>{" "}
                  concentra {formatarPercentual(picos.janela.fracao)} das buscas. Dia mais forte: {DIA_SEMANA[picos.diaMaisForte.diaSemana]?.longo}; maior célula: {DIA_SEMANA[picos.celulaMaisForte.diaSemana]?.longo} às {picos.celulaMaisForte.hora}h ({formatarInteiro(picos.celulaMaisForte.valor)}).
                </>
              ) : (
                "Sem buscas no período."
              )
            }
          />
        ) : (
          <section className="rounded-xl border border-border bg-card lg:col-span-3">
            <EstadoVazio
              icone={Clock}
              titulo="Horários de pico aguardando a sincronização"
              descricao="A Lírio passou a enviar buscas por hora. Os dados aparecem aqui depois da próxima sincronização (diária, ou pelo botão em Configurações)."
            />
          </section>
        )}
        <RankingDistritos ranking={linhasRanking} foraDoRanking={foraDoRanking} minimo={MINIMO_RANKING} mediaCidade={taxaContato(d.totais.cliques, d.totais.visualizacoes)} descricaoIntervalo={periodoTexto} />
        <TaxasPorSegmento categorias={categorias} regioes={regioes} cidade={d.totais} descricaoIntervalo={periodoTexto} />
        <EvolucaoOferta fotos={d.oferta} categorias={CATEGORIAS} descricaoIntervalo={periodoTexto} />
      </div>
    </div>
  );
}
