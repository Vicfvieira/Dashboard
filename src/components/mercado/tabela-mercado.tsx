"use client";

import { useMemo, useState, useTransition } from "react";
import {
  columnFilteringFeature,
  createColumnHelper,
  createFilteredRowModel,
  createPaginatedRowModel,
  createSortedRowModel,
  filterFn_includesString,
  globalFilteringFeature,
  rowPaginationFeature,
  rowSortingFeature,
  sortFn_alphanumeric,
  sortFn_text,
  tableFeatures,
  useTable,
} from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight, Download, Loader2, Search } from "lucide-react";
import { registrarExportacao } from "@/app/actions/exportacao";
import { baixarCsv, type ColunaTabela } from "@/components/graficos/exportar";
import { usePainel } from "@/components/painel/contexto";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatarInteiro, formatarPercentual } from "@/lib/formato";
import { BASE_PEQUENA_BUSCAS, type MetricaMapa, type ResumoDistrito } from "@/lib/mercado";
import type { Tema } from "@/lib/mercado-cores";
import { cn } from "@/lib/utils";
import { corIndice, formatarIndice, textoClasse, type InfoDistrito } from "./comum";

interface Linha {
  slug: string;
  nome: string;
  nomeRegiao: string;
  buscas: number;
  ativas: number;
  /** Infinity (sem oferta) vira um número grande para ordenar no topo. */
  indiceOrdem: number;
  indice: number | null;
  conversao: number;
  conversaoReal: number | null;
  situacao: string;
}

const features = tableFeatures({
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
  sortFns: { alphanumeric: sortFn_alphanumeric, text: sortFn_text },
  columnFilteringFeature,
  globalFilteringFeature,
  filteredRowModel: createFilteredRowModel(),
  filterFns: { includesString: filterFn_includesString },
  rowPaginationFeature,
  paginatedRowModel: createPaginatedRowModel(),
});
const helper = createColumnHelper<typeof features, Linha>();

const NUMERICAS = new Set(["buscas", "ativas", "indiceOrdem", "conversao"]);
const ID_METRICA: Record<MetricaMapa, string> = { indice: "indiceOrdem", buscas: "buscas", oferta: "ativas", conversao: "conversao" };

/** Tabela alternativa ao mapa: os 96 distritos com as quatro métricas; clicar seleciona no mapa. */
export function TabelaMercado({
  distritos,
  resumos,
  metrica,
  selecionado,
  aoSelecionar,
  tema,
  nomeCategoria,
}: {
  distritos: InfoDistrito[];
  resumos: ReadonlyMap<string, ResumoDistrito>;
  metrica: MetricaMapa;
  selecionado: string | null;
  aoSelecionar: (slug: string) => void;
  tema: Tema;
  nomeCategoria: string;
}) {
  const { usuario } = usePainel();
  const [exportando, iniciar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  const colunas = useMemo(
    () =>
      helper.columns([
        helper.accessor("nome", {
          header: "Distrito",
          sortFn: "text",
          cell: (c) => (
            <button
              type="button"
              onClick={() => aoSelecionar(c.row.original.slug)}
              className="rounded font-medium underline-offset-2 hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
            >
              {c.getValue()}
            </button>
          ),
        }),
        helper.accessor("nomeRegiao", { header: "Região", sortFn: "text" }),
        helper.accessor("buscas", { header: "Buscas", cell: (c) => formatarInteiro(c.getValue()), enableGlobalFilter: false }),
        helper.accessor("ativas", { header: "Profissionais ativas", cell: (c) => formatarInteiro(c.getValue()), enableGlobalFilter: false }),
        helper.accessor("indiceOrdem", {
          header: "Índice de demanda",
          enableGlobalFilter: false,
          cell: (c) => {
            const l = c.row.original;
            return (
              <span className="inline-flex items-center justify-end gap-1.5">
                <span className="size-2.5 rounded-sm" style={{ background: corIndice(l.indice, tema) }} aria-hidden="true" />
                {formatarIndice(l.indice)}
                {l.buscas > 0 && l.buscas < BASE_PEQUENA_BUSCAS && <span className="text-[10px] text-muted-foreground">(base pequena)</span>}
              </span>
            );
          },
        }),
        helper.accessor("situacao", { header: "Situação", sortFn: "text" }),
        helper.accessor("conversao", { header: "Taxa de contato", cell: (c) => (c.row.original.conversaoReal === null ? "—" : formatarPercentual(c.row.original.conversaoReal)), enableGlobalFilter: false }),
      ]),
    [aoSelecionar, tema],
  );

  const dados = useMemo<Linha[]>(
    () =>
      distritos.map((d) => {
        const r = resumos.get(d.slug);
        const indice = r?.indice ?? null;
        return {
          slug: d.slug,
          nome: d.nome,
          nomeRegiao: d.nomeRegiao,
          buscas: r?.buscas ?? 0,
          ativas: r?.ativas ?? 0,
          indice,
          indiceOrdem: indice === null ? -1 : Number.isFinite(indice) ? indice : 1e9,
          conversao: r?.conversao ?? -1,
          conversaoReal: r?.conversao ?? null,
          situacao: textoClasse(indice),
        };
      }),
    [distritos, resumos],
  );

  const table = useTable({
    features,
    columns: colunas,
    data: dados,
    globalFilterFn: "includesString",
    initialState: { sorting: [{ id: ID_METRICA[metrica], desc: true }], pagination: { pageIndex: 0, pageSize: 12 } },
  });

  const busca = String(table.state.globalFilter ?? "");
  const filtradas = table.getFilteredRowModel().rows.length;
  const { pageIndex, pageSize } = table.state.pagination;

  function exportar() {
    setErro(null);
    const linhas = table.getSortedRowModel().rows.map((r) => ({
      distrito: r.original.nome,
      regiao: r.original.nomeRegiao,
      buscas: r.original.buscas,
      ativas: r.original.ativas,
      indice: r.original.indice !== null && Number.isFinite(r.original.indice) ? r.original.indice : null,
      situacao: r.original.situacao,
      conversao: r.original.conversaoReal,
    }));
    const colunasCsv: ColunaTabela[] = [
      { chave: "distrito", rotulo: "Distrito", formato: "texto" },
      { chave: "regiao", rotulo: "Região", formato: "texto" },
      { chave: "buscas", rotulo: "Buscas", formato: "inteiro" },
      { chave: "ativas", rotulo: "Profissionais ativas", formato: "inteiro" },
      { chave: "indice", rotulo: "Índice de demanda (1 = média da cidade)", formato: "decimal" },
      { chave: "situacao", rotulo: "Situação", formato: "texto" },
      { chave: "conversao", rotulo: "Taxa de contato", formato: "percentual" },
    ];
    iniciar(async () => {
      const r = await registrarExportacao({ recurso: "mercado-distritos", formato: "csv", linhas: linhas.length, filtros: new URLSearchParams(window.location.search).toString().slice(0, 300) }).catch(() => ({ ok: false }));
      if (!r.ok) {
        setErro("Não foi possível registrar a exportação na auditoria; o arquivo não foi gerado.");
        return;
      }
      baixarCsv(`painelux-mercado-distritos-${new Date().toISOString().slice(0, 10)}`, colunasCsv, linhas);
    });
  }

  return (
    <section aria-labelledby="titulo-tabela-mercado" className="rounded-xl border border-border bg-card">
      <header className="flex flex-wrap items-start justify-between gap-3 px-4 pt-4">
        <div>
          <h2 id="titulo-tabela-mercado" className="text-sm font-semibold">
            Distritos em tabela
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">Os mesmos números do mapa ({nomeCategoria}), para leitura, ordenação e navegação por teclado. Clique no nome para abrir o distrito no painel.</p>
        </div>
        {usuario.podeExportar && (
          <Button variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={exportar} disabled={exportando}>
            {exportando ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Download aria-hidden="true" />}
            Exportar CSV
          </Button>
        )}
      </header>
      {erro && (
        <p role="alert" className="px-4 pt-2 text-xs text-destructive">
          {erro}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-2 px-4 pt-3">
        <div className="relative w-full sm:w-64">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input type="search" value={busca} onChange={(e) => table.setGlobalFilter(e.target.value)} placeholder="Buscar distrito, região ou situação" aria-label="Buscar distritos" className="h-8 pl-8 text-xs" />
        </div>
        <p className="ml-auto text-xs text-muted-foreground" aria-live="polite">
          {formatarInteiro(filtradas)} distritos
        </p>
      </div>
      <div className="relative mt-3 overflow-x-auto border-y border-border">
        <table className="w-full min-w-[760px] text-xs">
          <caption className="sr-only">Distritos de São Paulo com buscas, oferta, índice de demanda e taxa de contato. Clique no título de uma coluna para ordenar.</caption>
          <thead className="bg-muted/40">
            {table.getHeaderGroups().map((g) => (
              <tr key={g.id}>
                {g.headers.map((h) => {
                  const ordem = h.column.getIsSorted();
                  return (
                    <th key={h.id} scope="col" aria-sort={ordem === "asc" ? "ascending" : ordem === "desc" ? "descending" : undefined} className={cn("px-3 py-2 font-medium whitespace-nowrap text-muted-foreground", NUMERICAS.has(h.column.id) ? "text-right" : "text-left")}>
                      <button type="button" onClick={h.column.getToggleSortingHandler()} className={cn("inline-flex items-center gap-1 rounded hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none", ordem && "text-foreground")}>
                        <table.FlexRender header={h} />
                        {ordem === "asc" ? <ArrowUp className="size-3" aria-hidden="true" /> : ordem === "desc" ? <ArrowDown className="size-3" aria-hidden="true" /> : <ArrowUpDown className="size-3 opacity-50" aria-hidden="true" />}
                      </button>
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((r) => (
              <tr key={r.id} aria-selected={r.original.slug === selecionado} className={cn("border-t border-border/60 transition-colors hover:bg-muted/30", r.original.slug === selecionado && "bg-primary/10")}>
                {r.getAllCells().map((c) => (
                  <td key={c.id} className={cn("px-3 py-2 whitespace-nowrap", NUMERICAS.has(c.column.id) && "text-right tabular-nums")}>
                    <table.FlexRender cell={c} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <footer className="flex items-center justify-between gap-3 px-4 py-2.5 text-xs text-muted-foreground">
        <span>{filtradas > 0 ? `${pageIndex * pageSize + 1}–${Math.min(filtradas, (pageIndex + 1) * pageSize)} de ${filtradas}` : "0 de 0"}</span>
        <div className="flex items-center gap-1">
          <span className="mr-2">
            Página {pageIndex + 1} de {Math.max(1, table.getPageCount())}
          </span>
          <Button variant="ghost" size="icon" className="size-7" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()} aria-label="Página anterior">
            <ChevronLeft aria-hidden="true" />
          </Button>
          <Button variant="ghost" size="icon" className="size-7" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()} aria-label="Próxima página">
            <ChevronRight aria-hidden="true" />
          </Button>
        </div>
      </footer>
    </section>
  );
}
