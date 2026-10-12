import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowDownRight, ArrowUpRight, CalendarSearch, Minus } from "lucide-react";
import { CabecalhoPagina } from "@/components/painel/cabecalho-pagina";
import { EsqueletoDashboard } from "@/components/painel/esqueletos";
import { EstadoVazio } from "@/components/painel/estado-vazio";
import { Button } from "@/components/ui/button";
import { resumoDoPeriodo } from "@/lib/dados/resumo";
import { descreverIntervalo, hojeSP, intervaloAnterior, intervaloAtual, lerFiltros, queryComFiltros } from "@/lib/filtros";
import { formatarInteiro, formatarMoeda, formatarVariacao, variacao } from "@/lib/formato";
import { rotaInicial } from "@/lib/navegacao";
import { can } from "@/lib/rbac";
import { usuarioAtual } from "@/lib/sessao";
import { cn } from "@/lib/utils";

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
  const anterior = intervaloAnterior(intervalo);
  const [atual, base] = await Promise.all([resumoDoPeriodo(intervalo), filtros.comparar ? resumoDoPeriodo(anterior) : null]);
  const verPelagem = filtros.produto !== "lirio";
  const verLirio = filtros.produto !== "pelagem";

  const cartoes = [
    verPelagem && can(usuario, "pelagem:financeiro") && { rotulo: "Faturamento", marca: "pelagem" as const, valor: formatarMoeda(atual.faturamentoCentavos), bruto: atual.faturamentoCentavos, base: base?.faturamentoCentavos },
    verPelagem && { rotulo: "Atendimentos concluídos", marca: "pelagem" as const, valor: formatarInteiro(atual.atendimentosConcluidos), bruto: atual.atendimentosConcluidos, base: base?.atendimentosConcluidos },
    verLirio && { rotulo: "Buscas", marca: "lirio" as const, valor: formatarInteiro(atual.buscas), bruto: atual.buscas, base: base?.buscas },
    verLirio && { rotulo: "Cliques no WhatsApp", marca: "lirio" as const, valor: formatarInteiro(atual.cliquesWhatsapp), bruto: atual.cliquesWhatsapp, base: base?.cliquesWhatsapp },
  ].filter((c) => c !== false);

  const vazio = cartoes.every((c) => c.bruto === 0);

  return (
    <div className="grid gap-6">
      <CabecalhoPagina
        titulo="Visão geral"
        descricao={`Indicadores do Pelagem Studio e da Lírio de ${descreverIntervalo(intervalo)}${filtros.comparar ? `, comparados com ${descreverIntervalo(anterior)}` : ""}.`}
      />
      {vazio ? (
        <EstadoVazio
          icone={CalendarSearch}
          titulo="Nenhum registro neste período"
          descricao="Não há atendimentos nem eventos de busca entre as datas escolhidas. Amplie o período ou volte para os últimos 30 dias."
          acao={
            <Button asChild size="sm">
              <Link href={queryComFiltros(filtros, { periodo: "90d" }) || "/"}>Ver últimos 90 dias</Link>
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {cartoes.map((c) => {
            const v = c.base === undefined ? null : variacao(c.bruto, c.base);
            return (
              <section key={c.rotulo} className="rounded-xl border border-border bg-card p-4" aria-label={c.rotulo}>
                <p className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                  <span className={cn("size-2 rounded-full", c.marca === "pelagem" ? "bg-pelagem" : "bg-lirio")} aria-hidden="true" />
                  {c.rotulo}
                </p>
                <p className="mt-2 text-2xl font-semibold tracking-tight tabular-nums">{c.valor}</p>
                {filtros.comparar && (
                  <p className={cn("mt-1.5 flex items-center gap-1 text-xs tabular-nums", v === null ? "text-muted-foreground" : v >= 0 ? "text-success" : "text-destructive")}>
                    {v === null ? <Minus className="size-3.5" aria-hidden="true" /> : v >= 0 ? <ArrowUpRight className="size-3.5" aria-hidden="true" /> : <ArrowDownRight className="size-3.5" aria-hidden="true" />}
                    {v === null ? "sem base de comparação" : `${formatarVariacao(v)} vs. período anterior`}
                  </p>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
