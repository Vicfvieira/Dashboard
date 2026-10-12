"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { Eye, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { Logo } from "@/components/marca/logo";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { NOME_GRUPO, itemDaRota, type GrupoNavegacao, type ItemNavegacao } from "@/lib/navegacao";
import { cn } from "@/lib/utils";
import { usePainel } from "./contexto";
import { ICONES } from "./icones";
import { reverTour } from "./tour-demo";
import { useFiltros } from "./use-filtros";

const ORDEM_GRUPOS: GrupoNavegacao[] = ["analise", "operacao", "administracao"];

function ListaNavegacao({ recolhida, aoNavegar }: { recolhida: boolean; aoNavegar?: () => void }) {
  const { itens } = usePainel();
  const caminho = usePathname();
  const { query } = useFiltros();
  const ativo = itemDaRota(caminho)?.rota;

  return (
    <nav aria-label="Navegação principal" data-tour="menu" className="flex flex-1 flex-col gap-5 overflow-y-auto px-2 py-3">
      {ORDEM_GRUPOS.map((grupo) => {
        const doGrupo = itens.filter((i) => i.grupo === grupo);
        if (doGrupo.length === 0) return null;
        return (
          <div key={grupo}>
            <p className={cn("mb-1 px-2.5 text-[11px] font-medium tracking-wider text-muted-foreground uppercase", recolhida && "sr-only")}>
              {NOME_GRUPO[grupo]}
            </p>
            <ul className="grid gap-0.5">
              {doGrupo.map((item) => (
                <li key={item.rota}>
                  <LinkNavegacao item={item} ativo={item.rota === ativo} recolhida={recolhida} query={query} aoNavegar={aoNavegar} />
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </nav>
  );
}

function LinkNavegacao({ item, ativo, recolhida, query, aoNavegar }: { item: ItemNavegacao; ativo: boolean; recolhida: boolean; query: string; aoNavegar?: () => void }) {
  const Icone = ICONES[item.icone];
  const link = (
    <Link
      href={`${item.rota}${item.filtros.periodo ? query : ""}`}
      onClick={aoNavegar}
      aria-current={ativo ? "page" : undefined}
      className={cn(
        "group relative flex h-9 items-center gap-3 rounded-md px-2.5 text-sm transition-colors focus-visible:ring-[3px] focus-visible:ring-sidebar-ring/50 focus-visible:outline-none",
        ativo ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground" : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground",
        recolhida && "justify-center px-0",
      )}
    >
      {ativo && (
        <motion.span
          layoutId="indicador-navegacao"
          className="absolute inset-y-1.5 left-0 w-[3px] rounded-full bg-primary"
          transition={{ type: "spring", stiffness: 500, damping: 40 }}
          aria-hidden="true"
        />
      )}
      <Icone className={cn("size-4 shrink-0", ativo ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} aria-hidden="true" />
      <span className={cn("truncate", recolhida && "sr-only")}>{item.rotulo}</span>
      {item.marca && !recolhida && (
        <span className={cn("ml-auto size-1.5 rounded-full", item.marca === "pelagem" ? "bg-pelagem" : "bg-lirio")} aria-hidden="true" />
      )}
    </Link>
  );

  if (!recolhida) return link;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent side="right">{item.rotulo}</TooltipContent>
    </Tooltip>
  );
}

function AvisoDemonstracao({ recolhida }: { recolhida: boolean }) {
  const { usuario } = usePainel();
  if (!usuario.somenteLeitura) return null;
  const conteudo = (
    <button
      type="button"
      onClick={reverTour}
      className={cn(
        "flex w-full items-center gap-2 rounded-md border border-primary/30 bg-primary/10 px-2.5 py-2 text-left text-xs transition-colors hover:bg-primary/15 focus-visible:ring-[3px] focus-visible:ring-sidebar-ring/50 focus-visible:outline-none",
        recolhida && "justify-center px-0",
      )}
    >
      <Eye className="size-3.5 shrink-0 text-primary-ink" aria-hidden="true" />
      <span className={cn(recolhida && "sr-only")}>
        Demonstração: somente leitura
        <span className="block text-[11px] text-muted-foreground">Ver o tour de novo</span>
      </span>
    </button>
  );
  if (!recolhida) return conteudo;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{conteudo}</TooltipTrigger>
      <TooltipContent side="right">Demonstração, somente leitura: ver o tour de novo</TooltipContent>
    </Tooltip>
  );
}

export function Sidebar() {
  const { recolhida, alternarSidebar } = usePainel();
  return (
    <aside
      className={cn(
        "sticky top-0 hidden h-dvh shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-[width] duration-200 ease-out motion-reduce:transition-none md:flex",
        recolhida ? "w-[60px]" : "w-60",
      )}
    >
      <div className={cn("flex h-14 items-center border-b border-sidebar-border px-4", recolhida && "justify-center px-0")}>
        <Link href="/" aria-label="Painelux, ir para o início" className="rounded-md focus-visible:ring-[3px] focus-visible:ring-sidebar-ring/50 focus-visible:outline-none">
          <Logo comNome={!recolhida} />
        </Link>
      </div>
      <ListaNavegacao recolhida={recolhida} />
      <div className="grid gap-2 border-t border-sidebar-border p-2">
        <AvisoDemonstracao recolhida={recolhida} />
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={alternarSidebar}
              aria-label={recolhida ? "Expandir menu lateral" : "Recolher menu lateral"}
              aria-expanded={!recolhida}
              className={cn(
                "flex h-8 items-center gap-2 rounded-md px-2.5 text-xs text-muted-foreground transition-colors hover:bg-sidebar-accent/60 hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-sidebar-ring/50 focus-visible:outline-none",
                recolhida && "justify-center px-0",
              )}
            >
              {recolhida ? <PanelLeftOpen className="size-4" aria-hidden="true" /> : <PanelLeftClose className="size-4" aria-hidden="true" />}
              <span className={cn(recolhida && "sr-only")}>Recolher menu</span>
              <kbd className={cn("ml-auto rounded border border-border px-1 font-mono text-[10px]", recolhida && "hidden")}>Ctrl B</kbd>
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">{recolhida ? "Expandir menu (Ctrl+B)" : "Recolher menu (Ctrl+B)"}</TooltipContent>
        </Tooltip>
      </div>
    </aside>
  );
}

/** Menu lateral em gaveta para telas pequenas. */
export function SidebarMovel() {
  const { menuMovelAberto, setMenuMovelAberto } = usePainel();
  return (
    <Dialog open={menuMovelAberto} onOpenChange={setMenuMovelAberto}>
      <DialogContent
        className="top-0 left-0 flex h-dvh w-72 max-w-[85vw] translate-x-0 translate-y-0 flex-col gap-0 rounded-none border-y-0 border-l-0 bg-sidebar p-0 data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left data-[state=closed]:zoom-out-100 data-[state=open]:zoom-in-100"
      >
        <DialogTitle className="sr-only">Menu</DialogTitle>
        <DialogDescription className="sr-only">Navegação entre as áreas do painel</DialogDescription>
        <div className="flex h-14 items-center border-b border-sidebar-border px-4">
          <Logo />
        </div>
        <ListaNavegacao recolhida={false} aoNavegar={() => setMenuMovelAberto(false)} />
        <div className="border-t border-sidebar-border p-2">
          <AvisoDemonstracao recolhida={false} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
