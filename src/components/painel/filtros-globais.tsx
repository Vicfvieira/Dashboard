"use client";

import { useId, useState } from "react";
import { CalendarRange, ChevronDown, GitCompareArrows, Loader2 } from "lucide-react";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { MAX_DIAS_PERSONALIZADO, PRODUTOS, ROTULO_PERIODO, ROTULO_PRODUTO, descreverIntervalo, diasEntre, type Periodo, type Produto } from "@/lib/filtros";
import { cn } from "@/lib/utils";
import { useFiltros } from "./use-filtros";

const FIXOS: Periodo[] = ["7d", "30d", "90d", "12m"];
const CURTO: Record<Periodo, string> = { "7d": "7d", "30d": "30d", "90d": "90d", "12m": "12m", personalizado: "Personalizado" };

export function FiltrosGlobais({ comProduto }: { comProduto: boolean }) {
  const { filtros, intervalo, anterior, alterar, atualizando } = useFiltros();
  const idGrupo = useId();

  return (
    <div className="flex min-w-0 flex-wrap items-center gap-2">
      <div role="radiogroup" aria-label="Período" className="relative flex items-center rounded-lg border border-border bg-card p-0.5">
        {FIXOS.map((p) => {
          const ativo = filtros.periodo === p;
          return (
            <button
              key={p}
              type="button"
              role="radio"
              aria-checked={ativo}
              aria-label={ROTULO_PERIODO[p]}
              onClick={() => alterar({ periodo: p })}
              className={cn(
                "relative h-7 rounded-md px-2.5 text-xs font-medium tabular-nums transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none",
                ativo ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {ativo && (
                <motion.span
                  layoutId={`periodo-ativo-${idGrupo}`}
                  className="absolute inset-0 rounded-md bg-primary"
                  transition={{ type: "spring", stiffness: 500, damping: 38 }}
                />
              )}
              <span className="relative">{CURTO[p]}</span>
            </button>
          );
        })}
        <PeriodoPersonalizado />
      </div>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            aria-pressed={filtros.comparar}
            onClick={() => alterar({ comparar: !filtros.comparar })}
            className={cn("h-8", filtros.comparar && "border-primary/50 bg-primary/10 text-foreground")}
          >
            <GitCompareArrows aria-hidden="true" />
            <span className="hidden sm:inline">Comparar</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          {filtros.comparar ? "Comparando com " : "Comparar com "}
          {descreverIntervalo(anterior)}
        </TooltipContent>
      </Tooltip>

      {comProduto && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-8">
              <MarcaProduto produto={filtros.produto} />
              <span className="hidden md:inline">{ROTULO_PRODUTO[filtros.produto]}</span>
              <ChevronDown className="text-muted-foreground" aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuLabel>Produto</DropdownMenuLabel>
            <DropdownMenuRadioGroup value={filtros.produto} onValueChange={(v) => alterar({ produto: v as Produto })}>
              {PRODUTOS.map((p) => (
                <DropdownMenuRadioItem key={p} value={p}>
                  <MarcaProduto produto={p} />
                  {ROTULO_PRODUTO[p]}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      <p className="hidden items-center gap-1.5 text-xs text-muted-foreground tabular-nums xl:flex" aria-live="polite">
        {atualizando && <Loader2 className="size-3 animate-spin" aria-hidden="true" />}
        {descreverIntervalo(intervalo)}
      </p>
    </div>
  );
}

function MarcaProduto({ produto }: { produto: Produto }) {
  if (produto === "todos") {
    return (
      <span className="flex -space-x-1" aria-hidden="true">
        <span className="size-2.5 rounded-full bg-pelagem ring-2 ring-card" />
        <span className="size-2.5 rounded-full bg-lirio ring-2 ring-card" />
      </span>
    );
  }
  return <span className={cn("size-2.5 rounded-full", produto === "pelagem" ? "bg-pelagem" : "bg-lirio")} aria-hidden="true" />;
}

function PeriodoPersonalizado() {
  const { filtros, intervalo, alterar, hoje } = useFiltros();
  const [aberto, setAberto] = useState(false);
  const [de, setDe] = useState(intervalo.de);
  const [ate, setAte] = useState(intervalo.ate);
  const ativo = filtros.periodo === "personalizado";
  const erro =
    !de || !ate
      ? "Informe as duas datas."
      : de > ate
        ? "A data inicial precisa ser anterior à final."
        : diasEntre(de, ate) + 1 > MAX_DIAS_PERSONALIZADO
          ? `O período máximo é de ${MAX_DIAS_PERSONALIZADO} dias.`
          : null;

  return (
    <Popover
      open={aberto}
      onOpenChange={(a) => {
        setAberto(a);
        if (a) {
          setDe(intervalo.de);
          setAte(intervalo.ate);
        }
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          role="radio"
          aria-checked={ativo}
          aria-label="Período personalizado"
          className={cn(
            "flex h-7 items-center gap-1.5 rounded-md px-2 text-xs font-medium transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none",
            ativo ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
          )}
        >
          <CalendarRange className="size-3.5" aria-hidden="true" />
          <span className="hidden lg:inline">{ativo ? descreverIntervalo(intervalo) : "Personalizado"}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80">
        <form
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (erro) return;
            alterar({ periodo: "personalizado", de, ate });
            setAberto(false);
          }}
        >
          <div>
            <p className="text-sm font-medium">Período personalizado</p>
            <p className="mt-0.5 text-xs text-muted-foreground">Até {MAX_DIAS_PERSONALIZADO} dias, terminando no máximo hoje.</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="periodo-de" className="text-xs">De</Label>
              <Input id="periodo-de" type="date" value={de} max={hoje} onChange={(e) => setDe(e.target.value)} className="h-8 text-xs [color-scheme:light] dark:[color-scheme:dark]" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="periodo-ate" className="text-xs">Até</Label>
              <Input id="periodo-ate" type="date" value={ate} max={hoje} onChange={(e) => setAte(e.target.value)} className="h-8 text-xs [color-scheme:light] dark:[color-scheme:dark]" />
            </div>
          </div>
          {erro && de && ate && <p className="text-xs text-destructive" role="alert">{erro}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setAberto(false)}>
              Cancelar
            </Button>
            <Button type="submit" size="sm" disabled={Boolean(erro)}>
              Aplicar período
            </Button>
          </div>
        </form>
      </PopoverContent>
    </Popover>
  );
}
