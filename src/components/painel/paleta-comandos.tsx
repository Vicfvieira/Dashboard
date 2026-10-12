"use client";

import { useEffect, useId, useMemo, useRef, useState, useTransition, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { CalendarDays, CornerDownLeft, GitCompareArrows, Laptop, LogOut, Moon, Search, Shapes, Sun } from "lucide-react";
import { sair } from "@/app/actions/sessao";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { PRODUTOS, ROTULO_PERIODO, ROTULO_PRODUTO, type Periodo } from "@/lib/filtros";
import { itemDaRota } from "@/lib/navegacao";
import { cn } from "@/lib/utils";
import { usePainel } from "./contexto";
import { ICONES } from "./icones";
import { useFiltros } from "./use-filtros";

interface Comando {
  id: string;
  grupo: string;
  rotulo: string;
  detalhe?: string;
  termos: string;
  icone: ReactNode;
  ativo?: boolean;
  executar: () => void;
}

/** Remove acentos e caixa: "Lírio" casa com "lirio". */
function normalizar(texto: string): string {
  return texto.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
}

export function PaletaComandos() {
  const { itens, paletaAberta, setPaletaAberta } = usePainel();
  const { filtros, alterar, query } = useFiltros();
  const { setTheme, theme } = useTheme();
  const router = useRouter();
  const caminho = usePathname();
  const [, iniciar] = useTransition();
  const [busca, setBusca] = useState("");
  const [indice, setIndice] = useState(0);
  const idLista = useId();
  const lista = useRef<HTMLDivElement>(null);
  const paginaAtual = itemDaRota(caminho);

  const comandos = useMemo<Comando[]>(() => {
    const fechar = () => setPaletaAberta(false);
    const navegacao: Comando[] = itens.map((item) => {
      const Icone = ICONES[item.icone];
      return {
        id: `ir:${item.rota}`,
        grupo: "Ir para",
        rotulo: item.rotulo,
        detalhe: item.descricao,
        termos: `${item.rotulo} ${item.descricao} ${item.termos ?? ""}`,
        icone: <Icone />,
        ativo: paginaAtual?.rota === item.rota,
        executar: () => {
          fechar();
          router.push(`${item.rota}${item.filtros.periodo ? query : ""}`);
        },
      };
    });

    const filtrosDisponiveis = paginaAtual?.filtros.periodo ?? false;
    const periodos: Comando[] = filtrosDisponiveis
      ? (["7d", "30d", "90d", "12m"] as Periodo[]).map((p) => ({
          id: `periodo:${p}`,
          grupo: "Filtros",
          rotulo: `Período: últimos ${ROTULO_PERIODO[p]}`,
          termos: `periodo ${p} ${ROTULO_PERIODO[p]} ultimos`,
          icone: <CalendarDays />,
          ativo: filtros.periodo === p,
          executar: () => {
            fechar();
            alterar({ periodo: p });
          },
        }))
      : [];
    const comparacao: Comando[] = filtrosDisponiveis
      ? [
          {
            id: "comparar",
            grupo: "Filtros",
            rotulo: filtros.comparar ? "Desligar comparação com período anterior" : "Comparar com período anterior",
            termos: "comparar comparacao periodo anterior variacao",
            icone: <GitCompareArrows />,
            executar: () => {
              fechar();
              alterar({ comparar: !filtros.comparar });
            },
          },
        ]
      : [];
    const produtos: Comando[] = paginaAtual?.filtros.produto
      ? PRODUTOS.map((p) => ({
          id: `produto:${p}`,
          grupo: "Filtros",
          rotulo: `Produto: ${ROTULO_PRODUTO[p]}`,
          termos: `produto marca ${ROTULO_PRODUTO[p]}`,
          icone: <Shapes />,
          ativo: filtros.produto === p,
          executar: () => {
            fechar();
            alterar({ produto: p });
          },
        }))
      : [];

    const temas: Comando[] = [
      { valor: "dark", rotulo: "Tema escuro", icone: <Moon /> },
      { valor: "light", rotulo: "Tema claro", icone: <Sun /> },
      { valor: "system", rotulo: "Tema do sistema", icone: <Laptop /> },
    ].map((t) => ({
      id: `tema:${t.valor}`,
      grupo: "Preferências",
      rotulo: t.rotulo,
      termos: `tema aparencia ${t.rotulo} dark light`,
      icone: t.icone,
      ativo: theme === t.valor,
      executar: () => {
        fechar();
        setTheme(t.valor);
      },
    }));

    const conta: Comando[] = [
      {
        id: "sair",
        grupo: "Conta",
        rotulo: "Sair do Painelux",
        termos: "sair logout encerrar sessao",
        icone: <LogOut />,
        executar: () => {
          fechar();
          iniciar(() => sair());
        },
      },
    ];

    return [...navegacao, ...periodos, ...comparacao, ...produtos, ...temas, ...conta];
  }, [itens, paginaAtual, filtros, query, theme, router, alterar, setTheme, setPaletaAberta]);

  const visiveis = useMemo(() => {
    const termos = normalizar(busca).split(/\s+/).filter(Boolean);
    if (termos.length === 0) return comandos;
    return comandos.filter((c) => {
      const alvo = normalizar(`${c.rotulo} ${c.termos} ${c.grupo}`);
      return termos.every((t) => alvo.includes(t));
    });
  }, [busca, comandos]);

  const selecionado = visiveis[Math.min(indice, Math.max(visiveis.length - 1, 0))];

  useEffect(() => {
    if (!selecionado) return;
    lista.current?.querySelector(`[data-id="${CSS.escape(selecionado.id)}"]`)?.scrollIntoView({ block: "nearest" });
  }, [selecionado]);

  function aoTeclar(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setIndice((i) => (visiveis.length ? (i + 1) % visiveis.length : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setIndice((i) => (visiveis.length ? (i - 1 + visiveis.length) % visiveis.length : 0));
    } else if (e.key === "Enter" && selecionado) {
      e.preventDefault();
      selecionado.executar();
    }
  }

  const grupos = visiveis.reduce<Map<string, Comando[]>>((m, c) => m.set(c.grupo, [...(m.get(c.grupo) ?? []), c]), new Map());

  return (
    <Dialog
      open={paletaAberta}
      onOpenChange={(aberta) => {
        setPaletaAberta(aberta);
        if (aberta) {
          setBusca("");
          setIndice(0);
        }
      }}
    >
      <DialogContent semFechar className="top-[18%] max-w-xl translate-y-0 gap-0 overflow-hidden p-0">
        <DialogTitle className="sr-only">Paleta de comandos</DialogTitle>
        <DialogDescription className="sr-only">Busque páginas, filtros e preferências. Use as setas e Enter.</DialogDescription>
        <div className="flex items-center gap-2.5 border-b border-border px-4">
          <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <input
            autoFocus
            value={busca}
            onChange={(e) => {
              setBusca(e.target.value);
              setIndice(0);
            }}
            onKeyDown={aoTeclar}
            placeholder="Buscar páginas, filtros e ações…"
            className="h-12 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            role="combobox"
            aria-expanded="true"
            aria-controls={idLista}
            aria-activedescendant={selecionado ? `${idLista}-${selecionado.id}` : undefined}
            aria-autocomplete="list"
          />
          <kbd className="rounded border border-border px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">Esc</kbd>
        </div>
        <div ref={lista} id={idLista} role="listbox" aria-label="Comandos" className="max-h-[min(420px,60vh)] overflow-y-auto p-2">
          {visiveis.length === 0 && (
            <p className="px-3 py-10 text-center text-sm text-muted-foreground">Nenhum comando para “{busca}”. Tente “período”, “mapa” ou “tema”.</p>
          )}
          {[...grupos.entries()].map(([grupo, cmds]) => (
            <div key={grupo} role="group" aria-label={grupo} className="mb-1">
              <p className="px-2.5 pt-2 pb-1 text-[11px] font-medium tracking-wider text-muted-foreground uppercase">{grupo}</p>
              {cmds.map((c) => {
                const ehSelecionado = c.id === selecionado?.id;
                return (
                  <div
                    key={c.id}
                    id={`${idLista}-${c.id}`}
                    data-id={c.id}
                    role="option"
                    aria-selected={ehSelecionado}
                    onMouseMove={() => setIndice(visiveis.indexOf(c))}
                    onClick={c.executar}
                    className={cn(
                      "flex cursor-pointer items-center gap-3 rounded-md px-2.5 py-2 text-sm [&_svg]:size-4 [&_svg]:shrink-0",
                      ehSelecionado ? "bg-accent text-accent-foreground [&_svg]:text-primary" : "[&_svg]:text-muted-foreground",
                    )}
                  >
                    {c.icone}
                    <span className="min-w-0 flex-1 truncate">
                      {c.rotulo}
                      {c.detalhe && <span className="ml-2 text-xs text-muted-foreground">{c.detalhe}</span>}
                    </span>
                    {c.ativo && <span className="rounded bg-primary/15 px-1.5 py-0.5 text-[10px] font-medium text-primary-ink">atual</span>}
                    {ehSelecionado && <CornerDownLeft className="!size-3.5 !text-muted-foreground" aria-hidden="true" />}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
        <div className="flex items-center gap-4 border-t border-border px-4 py-2 text-[11px] text-muted-foreground">
          <span><kbd className="font-mono">↑ ↓</kbd> navegar</span>
          <span><kbd className="font-mono">Enter</kbd> executar</span>
          <span className="ml-auto"><kbd className="font-mono">Ctrl K</kbd> abrir e fechar</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
