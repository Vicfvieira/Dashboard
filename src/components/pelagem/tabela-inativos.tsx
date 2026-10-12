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
import { ArrowDown, ArrowUp, ArrowUpDown, Check, ChevronLeft, ChevronRight, Copy, Download, Loader2, Search } from "lucide-react";
import { registrarExportacao } from "@/app/actions/exportacao";
import { baixarCsv, type ColunaTabela } from "@/components/graficos/exportar";
import { Segmentado } from "@/components/graficos/segmentado";
import { usePainel } from "@/components/painel/contexto";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ClienteInativo } from "@/lib/dados/pelagem";
import { formatarInteiro, formatarMoeda } from "@/lib/formato";
import { FAIXAS_INATIVIDADE, faixaDeInatividade, nomeEspecie, type FaixaInatividade } from "@/lib/rotulos-pelagem";
import { cn } from "@/lib/utils";

/** Linha da tabela: o que o servidor mandou + campos de busca já em texto. */
interface Linha extends ClienteInativo {
  especieNome: string;
}

// Features, colunas e helper no escopo do módulo: referências estáveis (exigência do TanStack v9).
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

const dataCurta = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "short", year: "numeric" });

function HashCliente({ hash }: { hash: string }) {
  const [copiado, setCopiado] = useState(false);
  async function copiar() {
    try {
      await navigator.clipboard.writeText(hash);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1500);
    } catch {
      setCopiado(false);
    }
  }
  return (
    <span className="inline-flex items-center gap-1.5">
      <code className="font-mono text-xs" title={hash}>
        {hash.slice(0, 10)}…
      </code>
      <button
        type="button"
        onClick={copiar}
        className="rounded p-0.5 text-muted-foreground hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
        aria-label={copiado ? "Hash copiado" : `Copiar hash completo ${hash.slice(0, 10)}`}
      >
        {copiado ? <Check className="size-3.5 text-success" aria-hidden="true" /> : <Copy className="size-3.5" aria-hidden="true" />}
      </button>
    </span>
  );
}

const CLASSE_FAIXA: Record<Exclude<FaixaInatividade, "todos">, string> = {
  "ate-60": "border-border text-muted-foreground",
  "61-90": "border-warning/50 text-warning",
  "90+": "border-destructive/50 text-destructive",
};

const colunaHash = helper.accessor("clienteHash", {
  header: "Cliente (hash anônimo)",
  cell: (c) => <HashCliente hash={c.getValue()} />,
  enableSorting: false,
});
const colunasInicio = [
  helper.accessor("diasSemVoltar", {
    header: "Sem voltar",
    cell: (c) => {
      const d = c.getValue();
      return (
        <span className={cn("inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium tabular-nums", CLASSE_FAIXA[faixaDeInatividade(d)])}>
          {formatarInteiro(d)} dias
        </span>
      );
    },
    enableGlobalFilter: false,
  }),
  helper.accessor("ultimoAtendimento", {
    header: "Último atendimento",
    cell: (c) => dataCurta.format(new Date(c.getValue())).replace(" de ", " ").replace(".", ""),
    enableGlobalFilter: false,
  }),
  helper.accessor("atendimentos", { header: "Atendimentos", cell: (c) => formatarInteiro(c.getValue()), enableGlobalFilter: false }),
];
const colunaGasto = helper.accessor("gastoTotal", { header: "Gasto acumulado", cell: (c) => formatarMoeda(c.getValue()), enableGlobalFilter: false });
const colunasFim = [
  helper.accessor("servicoFrequente", { header: "Serviço mais frequente", sortFn: "text" }),
  helper.accessor("porte", { header: "Porte", sortFn: "text" }),
  helper.accessor("especieNome", { header: "Espécie", sortFn: "text" }),
];
const colunasBase = helper.columns([colunaHash, ...colunasInicio, colunaGasto, ...colunasFim]);
const colunasSemFinanceiro = helper.columns([colunaHash, ...colunasInicio, ...colunasFim]);

const NUMERICAS = new Set(["diasSemVoltar", "atendimentos", "gastoTotal"]);

/**
 * Clientes sem voltar há mais de 30 dias, identificados só pelo hash anônimo que a API do Pelagem
 * envia. Busca, ordenação e paginação no navegador (TanStack Table v9); a exportação do CSV com os
 * hashes passa pela auditoria antes do download.
 */
export function TabelaInativos({ clientes, podeVerFinanceiro, recurso }: { clientes: ClienteInativo[]; podeVerFinanceiro: boolean; recurso: string }) {
  const { usuario } = usePainel();
  const [faixa, setFaixa] = useState<FaixaInatividade>("todos");
  const [exportando, iniciar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  const contagem = useMemo(() => {
    const c: Record<FaixaInatividade, number> = { todos: clientes.length, "ate-60": 0, "61-90": 0, "90+": 0 };
    for (const x of clientes) c[faixaDeInatividade(x.diasSemVoltar)]++;
    return c;
  }, [clientes]);

  const dados = useMemo<Linha[]>(
    () => clientes.filter((c) => faixa === "todos" || faixaDeInatividade(c.diasSemVoltar) === faixa).map((c) => ({ ...c, especieNome: nomeEspecie(c.especie), gastoTotal: podeVerFinanceiro ? c.gastoTotal : 0 })),
    [clientes, faixa, podeVerFinanceiro],
  );

  const table = useTable({
    features,
    columns: podeVerFinanceiro ? colunasBase : colunasSemFinanceiro,
    data: dados,
    globalFilterFn: "includesString",
    initialState: { sorting: [{ id: podeVerFinanceiro ? "gastoTotal" : "diasSemVoltar", desc: true }], pagination: { pageIndex: 0, pageSize: 10 } },
    autoResetPageIndex: true,
  });

  const busca = String(table.state.globalFilter ?? "");
  const filtradas = table.getFilteredRowModel().rows.length;
  const { pageIndex, pageSize } = table.state.pagination;
  const paginas = Math.max(1, table.getPageCount());

  function exportar() {
    setErro(null);
    // Exporta o recorte atual (faixa + busca), na ordem da tela, sem paginação.
    const linhas = table.getSortedRowModel().rows.map((r) => ({
      clienteHash: r.original.clienteHash,
      diasSemVoltar: r.original.diasSemVoltar,
      ultimoAtendimento: r.original.ultimoAtendimento.slice(0, 10),
      atendimentos: r.original.atendimentos,
      gastoTotal: r.original.gastoTotal,
      servicoFrequente: r.original.servicoFrequente,
      porte: r.original.porte,
      especie: r.original.especieNome,
    }));
    const colunas: ColunaTabela[] = [
      { chave: "clienteHash", rotulo: "clienteHash", formato: "texto" },
      { chave: "diasSemVoltar", rotulo: "Dias sem voltar", formato: "inteiro" },
      { chave: "ultimoAtendimento", rotulo: "Último atendimento", formato: "texto" },
      { chave: "atendimentos", rotulo: "Atendimentos", formato: "inteiro" },
      ...(podeVerFinanceiro ? [{ chave: "gastoTotal", rotulo: "Gasto acumulado (R$)", formato: "moeda" as const }] : []),
      { chave: "servicoFrequente", rotulo: "Serviço mais frequente", formato: "texto" },
      { chave: "porte", rotulo: "Porte", formato: "texto" },
      { chave: "especie", rotulo: "Espécie", formato: "texto" },
    ];
    iniciar(async () => {
      // Auditoria primeiro: sem registro (ou sem permissão), não há download.
      const r = await registrarExportacao({ recurso, formato: "csv", linhas: linhas.length, filtros: new URLSearchParams({ faixa, busca }).toString() }).catch(() => ({ ok: false }));
      if (!r.ok) {
        setErro("Não foi possível registrar a exportação na auditoria; o arquivo não foi gerado.");
        return;
      }
      baixarCsv(`painelux-${recurso}-${new Date().toISOString().slice(0, 10)}`, colunas, linhas);
    });
  }

  return (
    <section aria-labelledby="titulo-inativos" className="flex min-w-0 flex-col rounded-xl border border-border bg-card">
      <header className="flex flex-wrap items-start justify-between gap-3 px-4 pt-4">
        <div className="min-w-0">
          <h2 id="titulo-inativos" className="text-sm font-semibold">
            Clientes inativos
          </h2>
          <p className="mt-0.5 max-w-2xl text-xs text-muted-foreground">
            Último atendimento concluído há mais de 30 dias e nenhuma volta agendada, na data de hoje (independe do período). Cada cliente aparece só como o hash anônimo enviado pela API do Pelagem.
          </p>
        </div>
        {usuario.podeExportar && (
          <Button variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={exportar} disabled={exportando || filtradas === 0}>
            {exportando ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Download aria-hidden="true" />}
            Exportar hashes (CSV)
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
          <Input
            type="search"
            value={busca}
            onChange={(e) => table.setGlobalFilter(e.target.value)}
            placeholder="Buscar hash, serviço, porte ou espécie"
            aria-label="Buscar clientes inativos"
            className="h-8 pl-8 text-xs"
          />
        </div>
        <Segmentado
          rotulo="Tempo sem voltar"
          opcoes={FAIXAS_INATIVIDADE.map((f) => ({ valor: f.valor, rotulo: `${f.rotulo} (${contagem[f.valor]})` }))}
          valor={faixa}
          aoMudar={setFaixa}
        />
        <p className="ml-auto text-xs text-muted-foreground" aria-live="polite">
          {formatarInteiro(filtradas)} {filtradas === 1 ? "cliente" : "clientes"}
        </p>
      </div>
      <div className="relative mt-3 overflow-x-auto border-y border-border">
        <table className="w-full min-w-[760px] text-xs">
          <caption className="sr-only">Clientes inativos do Pelagem. Clique no título de uma coluna para ordenar.</caption>
          <thead className="bg-muted/40">
            {table.getHeaderGroups().map((g) => (
              <tr key={g.id}>
                {g.headers.map((h) => {
                  const ordem = h.column.getIsSorted();
                  const numerica = NUMERICAS.has(h.column.id);
                  return (
                    <th
                      key={h.id}
                      scope="col"
                      aria-sort={ordem === "asc" ? "ascending" : ordem === "desc" ? "descending" : undefined}
                      className={cn("px-3 py-2 font-medium whitespace-nowrap text-muted-foreground", numerica ? "text-right" : "text-left")}
                    >
                      {h.column.getCanSort() ? (
                        <button
                          type="button"
                          onClick={h.column.getToggleSortingHandler()}
                          className={cn("inline-flex items-center gap-1 rounded hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none", ordem && "text-foreground")}
                        >
                          <table.FlexRender header={h} />
                          {ordem === "asc" ? <ArrowUp className="size-3" aria-hidden="true" /> : ordem === "desc" ? <ArrowDown className="size-3" aria-hidden="true" /> : <ArrowUpDown className="size-3 opacity-50" aria-hidden="true" />}
                        </button>
                      ) : (
                        <table.FlexRender header={h} />
                      )}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((r) => (
              <tr key={r.id} className="border-t border-border/60 transition-colors hover:bg-muted/30">
                {r.getAllCells().map((c) => (
                  <td key={c.id} className={cn("px-3 py-2 whitespace-nowrap", NUMERICAS.has(c.column.id) && "text-right tabular-nums")}>
                    <table.FlexRender cell={c} />
                  </td>
                ))}
              </tr>
            ))}
            {filtradas === 0 && (
              <tr>
                <td colSpan={table.getAllLeafColumns().length} className="px-3 py-10 text-center text-muted-foreground">
                  {clientes.length === 0 ? "Nenhum cliente inativo: todos voltaram nos últimos 30 dias ou já têm volta agendada." : "Nenhum cliente corresponde à busca nesta faixa."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <footer className="flex items-center justify-between gap-3 px-4 py-2.5 text-xs text-muted-foreground">
        <span>
          {filtradas > 0 ? `${formatarInteiro(pageIndex * pageSize + 1)}–${formatarInteiro(Math.min(filtradas, (pageIndex + 1) * pageSize))} de ${formatarInteiro(filtradas)}` : "0 de 0"}
        </span>
        <div className="flex items-center gap-1">
          <span className="mr-2">
            Página {pageIndex + 1} de {paginas}
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
