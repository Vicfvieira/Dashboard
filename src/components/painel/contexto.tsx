"use client";

import { createContext, use, useCallback, useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from "react";
import type { Papel } from "@prisma/client";
import type { ItemNavegacao } from "@/lib/navegacao";

export interface UsuarioPainel {
  nome: string;
  email: string;
  papel: Papel;
  somenteLeitura: boolean;
  podeExportar: boolean;
}

interface ValorPainel {
  usuario: UsuarioPainel;
  itens: readonly ItemNavegacao[];
  recolhida: boolean;
  alternarSidebar: () => void;
  paletaAberta: boolean;
  setPaletaAberta: (aberta: boolean) => void;
  menuMovelAberto: boolean;
  setMenuMovelAberto: (aberto: boolean) => void;
}

const ContextoPainel = createContext<ValorPainel | null>(null);
const CHAVE_SIDEBAR = "painelux:sidebar-recolhida";

// Preferência da sidebar por navegador (conveniência local; nada crítico depende disso).
const ouvintesSidebar = new Set<() => void>();
let recolhidaEmMemoria = false;
function lerRecolhida(): boolean {
  try {
    const salvo = localStorage.getItem(CHAVE_SIDEBAR);
    return salvo === null ? recolhidaEmMemoria : salvo === "1";
  } catch {
    return recolhidaEmMemoria;
  }
}
function gravarRecolhida(valor: boolean) {
  recolhidaEmMemoria = valor;
  try {
    localStorage.setItem(CHAVE_SIDEBAR, valor ? "1" : "0");
  } catch {
    /* armazenamento indisponível: vale só nesta visita */
  }
  ouvintesSidebar.forEach((f) => f());
}
function assinarSidebar(f: () => void) {
  ouvintesSidebar.add(f);
  return () => ouvintesSidebar.delete(f);
}

export function ProvedorPainel({ usuario, itens, children }: { usuario: UsuarioPainel; itens: readonly ItemNavegacao[]; children: ReactNode }) {
  const recolhida = useSyncExternalStore(assinarSidebar, lerRecolhida, () => false);
  const [paletaAberta, setPaletaAberta] = useState(false);
  const [menuMovelAberto, setMenuMovelAberto] = useState(false);

  const alternarSidebar = useCallback(() => gravarRecolhida(!lerRecolhida()), []);

  useEffect(() => {
    function aoTeclar(e: KeyboardEvent) {
      if (!(e.ctrlKey || e.metaKey)) return;
      const tecla = e.key.toLowerCase();
      if (tecla === "k") {
        e.preventDefault();
        setPaletaAberta((a) => !a);
      } else if (tecla === "b") {
        e.preventDefault();
        alternarSidebar();
      }
    }
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, [alternarSidebar]);

  const valor = useMemo(
    () => ({ usuario, itens, recolhida, alternarSidebar, paletaAberta, setPaletaAberta, menuMovelAberto, setMenuMovelAberto }),
    [usuario, itens, recolhida, alternarSidebar, paletaAberta, menuMovelAberto],
  );
  return <ContextoPainel value={valor}>{children}</ContextoPainel>;
}

export function usePainel(): ValorPainel {
  const valor = use(ContextoPainel);
  if (!valor) throw new Error("usePainel precisa estar dentro de <ProvedorPainel>");
  return valor;
}
