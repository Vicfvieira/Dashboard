"use client";

import { useId, useRef, useState, useTransition, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { BarChart3, Download, FileImage, FileSpreadsheet, Loader2, Table2 } from "lucide-react";
import { registrarExportacao } from "@/app/actions/exportacao";
import { usePainel } from "@/components/painel/contexto";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { formatarInteiro, formatarMoeda, formatarPercentual } from "@/lib/formato";
import { cn } from "@/lib/utils";
import { baixar, baixarCsv, gerarPng, type ColunaTabela, type LinhaTabela } from "./exportar";

export function formatarCelula(valor: string | number | null, formato: ColunaTabela["formato"]): string {
  if (valor === null) return "—";
  if (typeof valor === "string") return valor;
  switch (formato) {
    case "moeda":
      return formatarMoeda(valor);
    case "percentual":
      return formatarPercentual(valor);
    case "decimal":
      return valor.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
    default:
      return formatarInteiro(valor);
  }
}

/**
 * Moldura de todo gráfico do painel: título, descrição (também usada como rótulo acessível do
 * gráfico), alternância para a tabela equivalente e exportação em PNG e CSV com auditoria.
 */
export function CartaoGrafico({
  titulo,
  descricao,
  recurso,
  colunas,
  linhas,
  acoes,
  className,
  children,
}: {
  titulo: string;
  descricao: string;
  /** Identificador do recurso exportado (ex.: "visao-geral-tendencia"). */
  recurso: string;
  colunas: readonly ColunaTabela[];
  linhas: readonly LinhaTabela[];
  /** Controles extras do gráfico (ex.: troca de métrica). */
  acoes?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  const { usuario } = usePainel();
  const parametros = useSearchParams();
  const [verTabela, setVerTabela] = useState(false);
  const [exportando, iniciar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const areaGrafico = useRef<HTMLDivElement>(null);
  const idTitulo = useId();
  const idDescricao = useId();

  // PNG preparado quando o menu abre: no clique o download é síncrono e conta como gesto do
  // usuário (o Chrome bloqueia downloads seguidos disparados depois de esperas assíncronas).
  const pngPronto = useRef<Promise<Blob> | null>(null);
  function prepararPng() {
    if (verTabela || !areaGrafico.current) {
      pngPronto.current = null;
      return;
    }
    pngPronto.current = gerarPng(areaGrafico.current, titulo);
    pngPronto.current.catch(() => {
      pngPronto.current = null;
    });
  }

  function exportar(formato: "csv" | "png") {
    setErro(null);
    const nome = `painelux-${recurso}-${new Date().toISOString().slice(0, 10)}`;
    const auditar = () => registrarExportacao({ recurso, formato, linhas: linhas.length, filtros: parametros.toString() });
    if (formato === "csv") {
      baixarCsv(nome, colunas, linhas);
      iniciar(async () => {
        await auditar().catch(() => setErro("O arquivo foi gerado, mas o registro na auditoria falhou."));
      });
      return;
    }
    iniciar(async () => {
      try {
        if (verTabela) {
          setVerTabela(false);
          await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
          prepararPng();
        }
        const blob = await (pngPronto.current ?? (areaGrafico.current ? gerarPng(areaGrafico.current, titulo) : Promise.reject(new Error())));
        baixar(blob, `${nome}.png`);
        await auditar();
      } catch {
        setErro("Não foi possível exportar a imagem agora. Tente novamente.");
      }
    });
  }

  return (
    <section aria-labelledby={idTitulo} aria-describedby={idDescricao} className={cn("flex min-w-0 flex-col rounded-xl border border-border bg-card", className)}>
      <header className="flex flex-wrap items-start justify-between gap-3 px-4 pt-4">
        <div className="min-w-0">
          <h2 id={idTitulo} className="text-sm font-semibold">{titulo}</h2>
          <p id={idDescricao} className="mt-0.5 text-xs text-muted-foreground">{descricao}</p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {acoes}
          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" aria-pressed={verTabela} onClick={() => setVerTabela((v) => !v)}>
            {verTabela ? <BarChart3 aria-hidden="true" /> : <Table2 aria-hidden="true" />}
            {verTabela ? "Ver gráfico" : "Ver como tabela"}
          </Button>
          {usuario.podeExportar && (
            <DropdownMenu onOpenChange={(aberto) => aberto && prepararPng()}>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" disabled={exportando} aria-label={`Exportar ${titulo}`}>
                  {exportando ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Download aria-hidden="true" />}
                  Exportar
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Exportar “{titulo}”</DropdownMenuLabel>
                <DropdownMenuItem onSelect={() => exportar("png")}>
                  <FileImage /> Imagem PNG
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => exportar("csv")}>
                  <FileSpreadsheet /> Planilha CSV
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </header>
      {erro && <p role="alert" className="px-4 pt-2 text-xs text-destructive">{erro}</p>}
      <div className="min-w-0 flex-1 p-4 pt-3">
        {verTabela ? (
          <TabelaDados titulo={titulo} colunas={colunas} linhas={linhas} />
        ) : (
          <div ref={areaGrafico} role="img" aria-label={`${titulo}. ${descricao} Use “Ver como tabela” para os valores.`} className="bg-card">
            {children}
          </div>
        )}
      </div>
    </section>
  );
}

export function TabelaDados({ titulo, colunas, linhas }: { titulo: string; colunas: readonly ColunaTabela[]; linhas: readonly LinhaTabela[] }) {
  return (
    <div className="max-h-80 overflow-auto rounded-md border border-border">
      <table className="w-full text-xs">
        <caption className="sr-only">{titulo}</caption>
        <thead className="sticky top-0 bg-card">
          <tr className="border-b border-border">
            {colunas.map((c, i) => (
              <th key={c.chave} scope="col" className={cn("px-3 py-2 font-medium text-muted-foreground", i === 0 ? "text-left" : "text-right")}>
                {c.rotulo}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {linhas.map((l, li) => (
            <tr key={li} className="border-b border-border/50 last:border-0">
              {colunas.map((c, i) =>
                i === 0 ? (
                  <th key={c.chave} scope="row" className="px-3 py-1.5 text-left font-normal">{formatarCelula(l[c.chave] ?? null, c.formato)}</th>
                ) : (
                  <td key={c.chave} className="px-3 py-1.5 text-right tabular-nums">{formatarCelula(l[c.chave] ?? null, c.formato)}</td>
                ),
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
