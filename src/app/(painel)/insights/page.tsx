import { Suspense } from "react";
import { ChevronDown } from "lucide-react";
import { ListaInsights } from "@/components/insights/lista-insights";
import { CabecalhoPagina } from "@/components/painel/cabecalho-pagina";
import { EsqueletoDashboard } from "@/components/painel/esqueletos";
import { contextoInsights } from "@/lib/dados/insights";
import { descreverIntervalo, hojeSP, intervaloAtual, lerFiltros, serializarFiltros } from "@/lib/filtros";
import { gerarInsights, LIMITES } from "@/lib/insights";
import { LIMITE_DEMANDA_REPRIMIDA, LIMITE_EXCESSO_OFERTA } from "@/lib/metrics";
import { can, requirePermission } from "@/lib/rbac";

export const metadata = { title: "Insights" };

const pct = (x: number) => `${Math.round(x * 100)}%`;
const num = (x: number) => x.toLocaleString("pt-BR");

/** As regras em linguagem de negócio, com os mesmos limites do código (LIMITES). */
const REGRAS: { marca: string; nome: string; quando: string }[] = [
  { marca: "Lírio", nome: "Demanda reprimida", quando: `Distrito × categoria com índice acima de ${num(LIMITE_DEMANDA_REPRIMIDA)}× a média da cidade e ao menos ${LIMITES.demandaMinBuscas} buscas. Alta a partir de 2,5×.` },
  { marca: "Lírio", nome: "Busca sem oferta", quando: `${LIMITES.semOfertaMinBuscas}+ buscas por uma categoria num distrito sem nenhuma profissional ativa. Alta a partir de 30 buscas.` },
  { marca: "Lírio", nome: "Excesso de oferta", quando: `Índice abaixo de ${num(LIMITE_EXCESSO_OFERTA)}× com ${LIMITES.excessoMinAtivas}+ profissionais ativas. Sempre prioridade baixa.` },
  { marca: "Lírio", nome: "Categoria em alta ou em queda", quando: `Buscas variaram +${pct(LIMITES.categoriaAlta)} ou ${pct(LIMITES.categoriaQueda)} contra o período anterior, com ${LIMITES.categoriaMinBase}+ buscas antes. Alta a partir de ±40%.` },
  { marca: "Lírio", nome: "Taxa de contato", quando: `Variação de ${LIMITES.pontosFunil}+ p.p. na cidade, ou categoria com ${LIMITES.contatoMinVisualizacoes}+ visualizações convertendo abaixo de ${pct(LIMITES.contatoAbaixoDaMedia)} da média.` },
  { marca: "Lírio", nome: "Pico de busca", quando: `Uma janela de 3 horas concentra ${pct(LIMITES.picoFracao)}+ das buscas. Informativo.` },
  { marca: "Pelagem", nome: "Cancelamentos por dia", quando: `Cancelamentos de um dia da semana subiram ${pct(LIMITES.cancelAlta)}+ com ${LIMITES.cancelMinBase}+ cancelamentos no período anterior. Alta a partir de 40%.` },
  { marca: "Pelagem", nome: "Faturamento", quando: `Variação de ±${pct(LIMITES.faturamentoVariacao)} (atendimentos para quem não vê valores). Alta a partir de ±20%.` },
  { marca: "Pelagem", nome: "Taxa de retorno", quando: `Variação de ${LIMITES.retornoPontos}+ p.p. Alta quando cai 10+ p.p.` },
  { marca: "Pelagem", nome: "Serviço em alta ou em queda", quando: `Serviço × porte com ±${pct(LIMITES.servicoVariacao)} em atendimentos e ${LIMITES.servicoMinBase}+ antes. Prioridade baixa.` },
  { marca: "Pelagem", nome: "Clientes inativos", quando: `${LIMITES.inativosMin}+ clientes há mais de 30 dias sem voltar e sem volta agendada. Alta a partir de 20.` },
];

export default function Pagina({ searchParams }: PageProps<"/insights">) {
  return (
    <Suspense fallback={<EsqueletoDashboard />}>
      <Conteudo searchParams={searchParams} />
    </Suspense>
  );
}

async function Conteudo({ searchParams }: { searchParams: PageProps<"/insights">["searchParams"] }) {
  const usuario = await requirePermission("insights:ver");
  const hoje = hojeSP();
  const filtros = lerFiltros(await searchParams, hoje);
  const intervalo = intervaloAtual(filtros, hoje);
  const verPelagem = can(usuario, "pelagem:ver") && filtros.produto !== "lirio";
  const verLirio = can(usuario, "lirio:ver") && filtros.produto !== "pelagem";
  // Links mantêm só o período (cada página de origem tem os próprios filtros).
  const q = serializarFiltros({ ...filtros, produto: "todos", comparar: true }).toString();
  const ctx = await contextoInsights(intervalo, hoje, { query: q ? `?${q}` : "", verPelagem, verLirio, financeiro: can(usuario, "pelagem:financeiro") });
  const insights = gerarInsights(ctx);

  return (
    <div className="grid grid-cols-1 gap-6">
      <CabecalhoPagina
        titulo="Insights"
        descricao={`Movimentos relevantes de ${descreverIntervalo(intervalo)}, encontrados por regras fixas e explicáveis (sem IA), contra ${ctx.anterior}. Cada um aponta o gráfico de onde saiu.`}
      />
      <ListaInsights insights={insights} marcas={{ pelagem: verPelagem, lirio: verLirio }} />
      <details className="group rounded-xl border border-border bg-card">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-semibold focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none">
          Como as regras funcionam
          <ChevronDown className="size-4 text-muted-foreground transition-transform group-open:rotate-180 motion-reduce:transition-none" aria-hidden="true" />
        </summary>
        <div className="border-t border-border px-4 py-3 text-xs">
          <p className="mb-3 max-w-3xl text-muted-foreground">
            Cada regra compara o período escolhido com o anterior de mesmo tamanho e só gera uma frase quando passa do limite e a base é grande o bastante para não apontar ruído. A ordem segue a prioridade e, dentro dela, a força do sinal. Testes automatizados conferem cada regra.
          </p>
          <div className="relative overflow-x-auto">
            <table className="w-full min-w-[560px]">
              <caption className="sr-only">Regras dos insights e seus limites</caption>
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th scope="col" className="py-2 pr-3 font-medium">Marca</th>
                  <th scope="col" className="py-2 pr-3 font-medium">Regra</th>
                  <th scope="col" className="py-2 font-medium">Quando aparece</th>
                </tr>
              </thead>
              <tbody>
                {REGRAS.map((r) => (
                  <tr key={r.nome} className="border-b border-border/50 last:border-0">
                    <td className="py-2 pr-3 whitespace-nowrap text-muted-foreground">{r.marca}</td>
                    <th scope="row" className="py-2 pr-3 text-left font-medium whitespace-nowrap">{r.nome}</th>
                    <td className="py-2">{r.quando}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </details>
    </div>
  );
}
