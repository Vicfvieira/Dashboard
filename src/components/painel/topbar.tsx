"use client";

import { useTransition } from "react";
import { usePathname } from "next/navigation";
import { ChevronsUpDown, LogOut, Menu, Search } from "lucide-react";
import { sair } from "@/app/actions/sessao";
import { SeletorTema } from "@/components/tema/seletor-tema";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { itemDaRota } from "@/lib/navegacao";
import { NOME_PAPEL } from "@/lib/permissoes";
import { usePainel } from "./contexto";
import { FiltrosGlobais } from "./filtros-globais";

function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/);
  return `${partes[0]?.[0] ?? ""}${partes.length > 1 ? (partes[partes.length - 1]?.[0] ?? "") : ""}`.toUpperCase();
}

function MenuUsuario() {
  const { usuario } = usePainel();
  const [saindo, iniciar] = useTransition();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-2 rounded-md py-1 pr-1.5 pl-1 text-left transition-colors hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
          aria-label={`Conta de ${usuario.nome}`}
        >
          <span className="flex size-7 items-center justify-center rounded-full bg-primary/20 text-[11px] font-semibold text-primary" aria-hidden="true">
            {iniciais(usuario.nome)}
          </span>
          <span className="hidden min-w-0 lg:block">
            <span className="block max-w-36 truncate text-xs font-medium leading-tight">{usuario.nome}</span>
            <span className="block text-[11px] leading-tight text-muted-foreground">
              {NOME_PAPEL[usuario.papel]}
              {usuario.somenteLeitura ? " · leitura" : ""}
            </span>
          </span>
          <ChevronsUpDown className="hidden size-3.5 text-muted-foreground lg:block" aria-hidden="true" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="font-normal">
          <span className="block text-sm font-medium text-foreground">{usuario.nome}</span>
          <span className="block truncate">{usuario.email}</span>
          <span className="mt-1 block">
            {NOME_PAPEL[usuario.papel]}
            {usuario.somenteLeitura ? " · somente leitura" : ""}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled={saindo} onSelect={() => iniciar(() => sair())}>
          <LogOut />
          {saindo ? "Encerrando sessão…" : "Sair"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function Topbar() {
  const { setPaletaAberta, setMenuMovelAberto } = usePainel();
  const item = itemDaRota(usePathname());

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="flex h-14 items-center gap-3 px-4 lg:px-6">
        <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMenuMovelAberto(true)} aria-label="Abrir menu">
          <Menu />
        </Button>
        <div className="min-w-0 shrink-0">
          <p className="truncate text-sm font-semibold tracking-tight">{item?.rotulo ?? "Painelux"}</p>
        </div>
        <div className="hidden min-w-0 flex-1 justify-center md:flex">
          {item?.filtros.periodo && <FiltrosGlobais comProduto={item.filtros.produto} />}
        </div>
        <div className="ml-auto flex items-center gap-1 md:ml-0">
          <Button variant="outline" size="sm" onClick={() => setPaletaAberta(true)} className="h-8 gap-2 text-muted-foreground" aria-label="Abrir paleta de comandos (Ctrl+K)">
            <Search aria-hidden="true" />
            <span className="hidden text-xs xl:inline">Buscar</span>
            <kbd className="hidden rounded border border-border px-1 font-mono text-[10px] sm:inline">Ctrl K</kbd>
          </Button>
          <SeletorTema />
          <MenuUsuario />
        </div>
      </div>
      {item?.filtros.periodo && (
        <div className="overflow-x-auto border-t border-border px-4 py-2 md:hidden">
          <FiltrosGlobais comProduto={item.filtros.produto} />
        </div>
      )}
    </header>
  );
}
