"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, CircleAlert, Info, SearchCheck, Sparkles, TrendingDown, TrendingUp } from "lucide-react";
import { Segmentado } from "@/components/graficos/segmentado";
import type { Insight, Prioridade, TipoInsight } from "@/lib/insights";
import { cn } from "@/lib/utils";

const PRIORIDADE: Record<Prioridade, { rotulo: string; classe: string; Icone: typeof CircleAlert }> = {
  alta: { rotulo: "Prioridade alta", classe: "border-destructive/40 text-destructive", Icone: CircleAlert },
  media: { rotulo: "Prioridade média", classe: "border-warning/50 text-warning", Icone: Info },
  baixa: { rotulo: "Prioridade baixa", classe: "border-border text-muted-foreground", Icone: Info },
};

const TIPO: Record<TipoInsight, { rotulo: string; Icone: typeof Sparkles }> = {
  oportunidade: { rotulo: "Oportunidade", Icone: Sparkles },
  risco: { rotulo: "Risco", Icone: TrendingDown },
  tendencia: { rotulo: "Tendência", Icone: TrendingUp },
};

type FiltroMarca = "todas" | "pelagem" | "lirio";
type FiltroPrioridade = "todas" | Prioridade;

export function ListaInsights({ insights, marcas }: { insights: Insight[]; marcas: { pelagem: boolean; lirio: boolean } }) {
  const [marca, setMarca] = useState<FiltroMarca>("todas");
  const [prioridade, setPrioridade] = useState<FiltroPrioridade>("todas");
  const visiveis = useMemo(() => insights.filter((i) => (marca === "todas" || i.marca === marca) && (prioridade === "todas" || i.prioridade === prioridade)), [insights, marca, prioridade]);
  const conta = (p: Prioridade) => insights.filter((i) => (marca === "todas" || i.marca === marca) && i.prioridade === p).length;

  return (
    <section aria-labelledby="titulo-lista" className="grid gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="titulo-lista" className="text-sm font-semibold">
          {visiveis.length} {visiveis.length === 1 ? "insight" : "insights"} no período
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          {marcas.pelagem && marcas.lirio && (
            <Segmentado
              rotulo="Filtrar por marca"
              opcoes={[
                { valor: "todas", rotulo: "Todas" },
                { valor: "pelagem", rotulo: "Pelagem" },
                { valor: "lirio", rotulo: "Lírio" },
              ]}
              valor={marca}
              aoMudar={setMarca}
            />
          )}
          <Segmentado
            rotulo="Filtrar por prioridade"
            opcoes={[
              { valor: "todas", rotulo: "Todas" },
              { valor: "alta", rotulo: `Alta (${conta("alta")})` },
              { valor: "media", rotulo: `Média (${conta("media")})` },
              { valor: "baixa", rotulo: `Baixa (${conta("baixa")})` },
            ]}
            valor={prioridade}
            aoMudar={setPrioridade}
          />
        </div>
      </div>

      {visiveis.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border px-6 py-12 text-center">
          <SearchCheck className="size-6 text-muted-foreground" aria-hidden="true" />
          <p className="text-sm font-medium">Nenhum movimento passou dos limites neste recorte</p>
          <p className="max-w-md text-xs text-muted-foreground">As regras só falam quando a variação ou o desequilíbrio é relevante e a base é grande o bastante. Amplie o período ou mude o filtro.</p>
        </div>
      ) : (
        <ol className="grid gap-3 lg:grid-cols-2">
          {visiveis.map((i) => {
            const p = PRIORIDADE[i.prioridade];
            const t = TIPO[i.tipo];
            return (
              <li key={i.id} className="group flex flex-col gap-2 rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/40">
                <div className="flex flex-wrap items-center gap-2 text-[11px]">
                  <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-medium", p.classe)}>
                    <p.Icone className="size-3" aria-hidden="true" />
                    {p.rotulo}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-muted-foreground">
                    <t.Icone className="size-3" aria-hidden="true" />
                    {t.rotulo}
                  </span>
                  <span className="ml-auto flex items-center gap-1.5 text-muted-foreground">
                    <span className={cn("size-2 rounded-full", i.marca === "pelagem" ? "bg-pelagem" : "bg-lirio")} aria-hidden="true" />
                    {i.marca === "pelagem" ? "Pelagem" : "Lírio"}
                  </span>
                </div>
                <p className="text-sm leading-snug font-medium text-balance">{i.frase}</p>
                <p className="text-xs text-muted-foreground">{i.detalhe}</p>
                <Link href={i.href} className="mt-auto inline-flex w-fit items-center gap-1 rounded pt-1 text-xs font-medium text-primary-ink underline-offset-2 hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none">
                  {i.rotuloLink}
                  <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none" aria-hidden="true" />
                </Link>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
