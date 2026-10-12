import Link from "next/link";
import { ArrowRight, TrendingDown, TrendingUp } from "lucide-react";
import type { Movimento } from "@/lib/metrics";
import { formatarInteiro, formatarMoeda, formatarVariacao } from "@/lib/formato";
import { cn } from "@/lib/utils";

const DESTINO: Record<string, string> = { "/lirio": "Lírio", "/pelagem": "Pelagem", "/mercado": "Mapa de mercado" };

export function Destaques({ movimentos, titulo, descricao, query }: { movimentos: Movimento[]; titulo: string; descricao: string; query: string }) {
  const fmt = (m: Movimento, v: number) => (m.formato === "moeda" ? formatarMoeda(v) : formatarInteiro(v));
  return (
    <section aria-labelledby="titulo-destaques" className="flex flex-col rounded-xl border border-border bg-card">
      <header className="px-4 pt-4">
        <h2 id="titulo-destaques" className="text-sm font-semibold">{titulo}</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">{descricao}</p>
      </header>
      {movimentos.length === 0 ? (
        <p className="m-4 rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
          Nenhum movimento relevante: as variações ficaram pequenas ou as bases do período anterior são baixas demais para comparar. Experimente um período maior.
        </p>
      ) : (
        <ol className="grid flex-1 content-start gap-2 p-4">
          {movimentos.map((m, i) => {
            const subiu = m.variacao > 0;
            const Icone = subiu ? TrendingUp : TrendingDown;
            return (
              <li key={m.id} className="rounded-lg border border-border/70 p-3 transition-colors hover:border-primary/40">
                <div className="flex items-start gap-3">
                  <span className={cn("mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md", subiu ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive")}>
                    <Icone className="size-4" aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm leading-snug">
                      <span className="sr-only">{i + 1}º destaque: </span>
                      <span className="font-medium">{m.rotulo}</span> {subiu ? "subiram" : "caíram"}{" "}
                      <span className={cn("font-semibold tabular-nums", subiu ? "text-success" : "text-destructive")}>{formatarVariacao(m.variacao)}</span>
                    </p>
                    <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground tabular-nums">
                      <span className={cn("size-1.5 rounded-full", m.marca === "pelagem" ? "bg-pelagem" : "bg-lirio")} aria-hidden="true" />
                      {fmt(m, m.anterior)} → {fmt(m, m.atual)}
                    </p>
                  </div>
                </div>
                <Link href={`${m.href}${query}`} className="mt-2 ml-10 inline-flex items-center gap-1 text-xs text-primary hover:underline focus-visible:underline focus-visible:outline-none">
                  Ver em {DESTINO[m.href] ?? "detalhes"} <ArrowRight className="size-3" aria-hidden="true" />
                </Link>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
