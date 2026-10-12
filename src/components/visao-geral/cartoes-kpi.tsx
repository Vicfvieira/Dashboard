"use client";

import { ArrowDownRight, ArrowUpRight, Info, Minus } from "lucide-react";
import { Area, AreaChart, ResponsiveContainer, YAxis } from "recharts";
import { CountUp, formatarNumero } from "@/components/graficos/count-up";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { formatarVariacao } from "@/lib/formato";
import type { Kpi } from "@/lib/dados/visao-geral";
import { variacao } from "@/lib/metrics";
import { cn } from "@/lib/utils";

const COR = { pelagem: "var(--serie-pelagem)", lirio: "var(--serie-lirio)" } as const;

function Sparkline({ serie, marca, id }: { serie: number[]; marca: "pelagem" | "lirio"; id: string }) {
  if (serie.length < 2) return <div className="h-10" aria-hidden="true" />;
  const dados = serie.map((v, i) => ({ i, v }));
  return (
    <div className="h-10" aria-hidden="true">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={dados} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id={`spark-${id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={COR[marca]} stopOpacity={0.28} />
              <stop offset="100%" stopColor={COR[marca]} stopOpacity={0} />
            </linearGradient>
          </defs>
          <YAxis hide domain={["dataMin", "dataMax"]} />
          <Area type="monotone" dataKey="v" stroke={COR[marca]} strokeWidth={1.5} fill={`url(#spark-${id})`} isAnimationActive={false} dot={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function CartoesKpi({ kpis, comparar, descricaoAnterior }: { kpis: Kpi[]; comparar: boolean; descricaoAnterior: string }) {
  return (
    <div className={cn("grid gap-3 sm:grid-cols-2 lg:grid-cols-3", kpis.length >= 5 && "2xl:grid-cols-6")}>
      {kpis.map((k) => {
        const v = k.anterior === null ? null : variacao(k.valor, k.anterior);
        return (
          <section key={k.chave} aria-label={k.rotulo} className="group flex flex-col rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/40">
            <div className="flex items-center justify-between gap-2">
              <p className="flex min-w-0 items-center gap-2 text-xs font-medium text-muted-foreground">
                <span className={cn("size-2 shrink-0 rounded-full", k.marca === "pelagem" ? "bg-pelagem" : "bg-lirio")} aria-hidden="true" />
                <span className="truncate">{k.rotulo}</span>
              </p>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button type="button" className="rounded text-muted-foreground/70 hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none" aria-label={`Como é calculado: ${k.rotulo}`}>
                    <Info className="size-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent className="max-w-64">{k.ajuda}</TooltipContent>
              </Tooltip>
            </div>
            <CountUp valor={k.valor} formato={k.formato} className="mt-2 text-2xl font-semibold tracking-tight" />
            {comparar && (
              <p className={cn("mt-1 flex items-center gap-1 text-xs", v === null ? "text-muted-foreground" : v >= 0 ? "text-success" : "text-destructive")}>
                {v === null ? <Minus className="size-3.5" aria-hidden="true" /> : v >= 0 ? <ArrowUpRight className="size-3.5" aria-hidden="true" /> : <ArrowDownRight className="size-3.5" aria-hidden="true" />}
                {v === null ? (
                  <span className="text-muted-foreground">sem base de comparação</span>
                ) : (
                  <span>
                    <span className="font-medium tabular-nums">{formatarVariacao(v)}</span>
                    <span className="text-muted-foreground"> vs. {formatarNumero(k.anterior ?? 0, k.formato)}</span>
                  </span>
                )}
              </p>
            )}
            {comparar && <span className="sr-only">Período anterior: {descricaoAnterior}</span>}
            <div className="mt-auto pt-3">
              <Sparkline serie={k.serie} marca={k.marca} id={k.chave} />
            </div>
          </section>
        );
      })}
    </div>
  );
}
