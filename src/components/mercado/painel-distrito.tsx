"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowDownRight, ArrowUpRight, MapPin, TriangleAlert, X } from "lucide-react";
import { Bar, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CartaoGrafico } from "@/components/graficos/cartao-grafico";
import { CaixaDica, EIXO, GRADE, Legenda, type PropsDica } from "@/components/graficos/dica";
import type { ColunaTabela, LinhaTabela } from "@/components/graficos/exportar";
import { Segmentado } from "@/components/graficos/segmentado";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { MesDistrito } from "@/lib/dados/mercado";
import { formatarInteiro, formatarPercentual } from "@/lib/formato";
import { BASE_PEQUENA_BUSCAS, categoriasDoDistrito, mediaDaRegiao, TODAS, valorMetrica, type CelulaMercado, type MetricaMapa, type ResumoDistrito } from "@/lib/mercado";
import type { Tema } from "@/lib/mercado-cores";
import { cn } from "@/lib/utils";
import { corIndice, formatarIndice, formatarValor, textoClasse, type InfoDistrito } from "./comum";

const mesCurto = new Intl.DateTimeFormat("pt-BR", { month: "short", year: "2-digit", timeZone: "UTC" });
const rotuloMes = (m: string) => mesCurto.format(new Date(`${m}-01T00:00:00Z`)).replace(".", "").replace(" de ", "/");

type Carga = { chave: string; meses: MesDistrito[] | null; erro: boolean };

function useEvolucao(slug: string | null, categoria: string, ate: string) {
  const chave = slug ? `${slug}|${categoria}|${ate}` : "";
  const [carga, setCarga] = useState<Carga>({ chave: "", meses: null, erro: false });
  useEffect(() => {
    if (!slug) return;
    const controle = new AbortController();
    const params = new URLSearchParams({ categoria, ate });
    fetch(`/api/mercado/distrito/${slug}?${params}`, { signal: controle.signal })
      .then((r) => (r.ok ? (r.json() as Promise<{ meses: MesDistrito[] }>) : Promise.reject(new Error(String(r.status)))))
      .then((d) => setCarga({ chave, meses: d.meses, erro: false }))
      .catch((e: unknown) => {
        if (!(e instanceof DOMException && e.name === "AbortError")) setCarga({ chave, meses: null, erro: true });
      });
    return () => controle.abort();
  }, [slug, categoria, ate, chave]);
  return carga.chave === chave ? carga : { chave, meses: null, erro: false };
}

function DicaMes({ active, payload, metrica }: PropsDica & { metrica: "buscas" | "oferta" }) {
  const m = payload?.[0]?.payload as MesDistrito | undefined;
  if (!active || !m) return null;
  const v = metrica === "buscas" ? m.buscas : m.ativas;
  const r = metrica === "buscas" ? m.buscasRegiao : m.ativasRegiao;
  return (
    <CaixaDica
      titulo={`${rotuloMes(m.mes)}${m.parcial ? " (mês em andamento)" : ""}`}
      linhas={[
        { rotulo: metrica === "buscas" ? "Buscas no distrito" : "Profissionais ativas", valor: v === null ? "—" : formatarInteiro(v), cor: "var(--serie-lirio)" },
        { rotulo: "Média dos distritos da região", valor: r === null ? "—" : formatarInteiro(Math.round(r)), cor: "var(--muted-foreground)" },
        ...(metrica === "buscas" && m.visualizacoes > 0 ? [{ rotulo: "Taxa de contato", valor: formatarPercentual(m.cliques / m.visualizacoes) }] : []),
      ]}
    />
  );
}

function Comparacao({ rotulo, valor, media, formato, menorMelhor = false }: { rotulo: string; valor: number | null; media: number | null; formato: (v: number | null) => string; menorMelhor?: boolean }) {
  const diferenca = valor !== null && media !== null && Number.isFinite(valor) && Number.isFinite(media) && media > 0 ? valor / media - 1 : null;
  const acima = diferenca !== null && diferenca > 0.005;
  const abaixo = diferenca !== null && diferenca < -0.005;
  return (
    <div className="rounded-lg border border-border p-2.5">
      <p className="text-[11px] text-muted-foreground">{rotulo}</p>
      <p className="mt-0.5 text-base font-semibold tabular-nums">{formato(valor)}</p>
      <p className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
        {acima && <ArrowUpRight className={cn("size-3", menorMelhor ? "text-destructive" : "text-success")} aria-hidden="true" />}
        {abaixo && <ArrowDownRight className={cn("size-3", menorMelhor ? "text-success" : "text-destructive")} aria-hidden="true" />}
        <span>
          região: {formato(media)}
          {diferenca !== null && (acima || abaixo) && ` (${acima ? "+" : "−"}${formatarPercentual(Math.abs(diferenca))})`}
        </span>
      </p>
    </div>
  );
}

function ListaExtremos({ itens, metrica, tema, aoSelecionar }: { itens: { d: InfoDistrito; v: number }[]; metrica: MetricaMapa; tema: Tema; aoSelecionar: (slug: string) => void }) {
  return (
    <ol className="grid gap-1">
      {itens.map(({ d, v }) => (
        <li key={d.slug}>
          <button
            type="button"
            onClick={() => aoSelecionar(d.slug)}
            className="flex w-full items-center justify-between gap-3 rounded-md px-2 py-1.5 text-left text-xs hover:bg-muted focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
          >
            <span className="flex min-w-0 items-center gap-2">
              {metrica === "indice" && <span className="size-2.5 shrink-0 rounded-sm" style={{ background: corIndice(v, tema) }} aria-hidden="true" />}
              <span className="truncate">{d.nome}</span>
              <span className="shrink-0 text-muted-foreground">{d.nomeRegiao}</span>
            </span>
            <span className="font-medium tabular-nums">{formatarValor(metrica, v)}</span>
          </button>
        </li>
      ))}
    </ol>
  );
}

/** Painel lateral: detalhe do distrito selecionado ou, sem seleção, os extremos da métrica. */
export function PainelDistrito({
  selecionado,
  aoFechar,
  aoSelecionar,
  celulas,
  resumos,
  referencia,
  distritos,
  categoria,
  categorias,
  metrica,
  tema,
  ate,
}: {
  selecionado: InfoDistrito | null;
  aoFechar: () => void;
  aoSelecionar: (slug: string) => void;
  celulas: CelulaMercado[];
  resumos: ReadonlyMap<string, ResumoDistrito>;
  referencia: { buscas: number; visualizacoes: number; cliques: number; ativas: number };
  distritos: InfoDistrito[];
  categoria: string;
  categorias: readonly { slug: string; nome: string }[];
  metrica: MetricaMapa;
  tema: Tema;
  ate: string;
}) {
  const [serie, setSerie] = useState<"buscas" | "oferta">("buscas");
  const evolucao = useEvolucao(selecionado?.slug ?? null, categoria, ate);
  const nomeCat = (slug: string) => categorias.find((c) => c.slug === slug)?.nome ?? slug;

  const extremos = useMemo(() => {
    const lista = distritos
      .map((d) => ({ d, v: valorMetrica(resumos.get(d.slug), metrica) }))
      .filter((x): x is { d: InfoDistrito; v: number } => x.v !== null && (resumos.get(x.d.slug)?.buscas ?? 0) + (resumos.get(x.d.slug)?.ativas ?? 0) > 0);
    const ordenada = [...lista].sort((a, b) => b.v - a.v);
    return { topo: ordenada.slice(0, 5), base: ordenada.slice(-5).reverse() };
  }, [distritos, resumos, metrica]);

  if (!selecionado) {
    const titulo = metrica === "indice" ? ["Maior pressão de demanda", "Mais oferta para a procura"] : metrica === "oferta" ? ["Mais profissionais", "Menos profissionais"] : metrica === "conversao" ? ["Maior conversão", "Menor conversão"] : ["Mais buscas", "Menos buscas"];
    return (
      <aside aria-label="Destaques do mapa" className="flex flex-col gap-4 rounded-lg border border-border p-4">
        <div className="flex items-start gap-2 text-xs text-muted-foreground">
          <MapPin className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <p>Clique num distrito do mapa, escolha na lista acima ou numa linha da tabela para ver evolução mensal, categorias mais buscadas e comparação com a região.</p>
        </div>
        <section>
          <h3 className="mb-1.5 text-xs font-semibold">{titulo[0]}</h3>
          <ListaExtremos itens={extremos.topo} metrica={metrica} tema={tema} aoSelecionar={aoSelecionar} />
        </section>
        <section>
          <h3 className="mb-1.5 text-xs font-semibold">{titulo[1]}</h3>
          <ListaExtremos itens={extremos.base} metrica={metrica} tema={tema} aoSelecionar={aoSelecionar} />
        </section>
      </aside>
    );
  }

  const r = resumos.get(selecionado.slug);
  const daRegiao = distritos.filter((d) => d.regiao === selecionado.regiao).map((d) => d.slug);
  const regiao = mediaDaRegiao(resumos, daRegiao, referencia);
  const cats = categoriasDoDistrito(celulas, selecionado.slug).slice(0, 8);
  const maxCat = Math.max(1, ...cats.map((c) => c.buscas));
  const meses = evolucao.meses ?? [];
  const colunas: ColunaTabela[] = [
    { chave: "mes", rotulo: "Mês", formato: "texto" },
    { chave: "valor", rotulo: serie === "buscas" ? "Buscas" : "Profissionais ativas", formato: "inteiro" },
    { chave: "regiao", rotulo: "Média dos distritos da região", formato: "inteiro" },
  ];
  const linhas: LinhaTabela[] = meses.map((m) => ({ mes: `${m.mes}${m.parcial ? " (parcial)" : ""}`, valor: serie === "buscas" ? m.buscas : m.ativas, regiao: serie === "buscas" ? Math.round(m.buscasRegiao) : m.ativasRegiao === null ? null : Math.round(m.ativasRegiao) }));
  const nomeCategoria = categoria === TODAS ? "todas as categorias" : nomeCat(categoria);

  return (
    <aside aria-label={`Detalhes de ${selecionado.nome}`} className="flex min-w-0 flex-col gap-4 rounded-lg border border-border p-4">
      <header className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-base font-semibold">{selecionado.nome}</h3>
          <p className="text-xs text-muted-foreground">
            {selecionado.subprefeitura} · {selecionado.nomeRegiao} · {nomeCategoria}
          </p>
        </div>
        <Button variant="ghost" size="icon" className="size-7" onClick={aoFechar} aria-label="Fechar detalhes do distrito">
          <X aria-hidden="true" />
        </Button>
      </header>

      <p className="flex items-center gap-2 rounded-md bg-muted/60 px-2.5 py-2 text-xs">
        <span className="size-3 shrink-0 rounded-sm" style={{ background: corIndice(r?.indice ?? null, tema) }} aria-hidden="true" />
        <span>
          <span className="font-medium">{textoClasse(r?.indice ?? null)}</span>
          {r?.indice !== null && r?.indice !== undefined && Number.isFinite(r.indice) && <span className="text-muted-foreground"> · índice {formatarIndice(r.indice)} a média da cidade</span>}
        </span>
      </p>
      {r && r.buscas < BASE_PEQUENA_BUSCAS && (
        <p className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
          <TriangleAlert className="mt-px size-3.5 shrink-0 text-warning" aria-hidden="true" />
          Base pequena ({r.buscas} buscas): use o índice como indicação, não como conclusão.
        </p>
      )}

      <div className="grid grid-cols-2 gap-2">
        <Comparacao rotulo="Buscas" valor={r?.buscas ?? 0} media={regiao.buscas} formato={(v) => (v === null ? "—" : formatarInteiro(Math.round(v)))} />
        <Comparacao rotulo="Profissionais ativas" valor={r?.ativas ?? 0} media={regiao.ativas} formato={(v) => (v === null ? "—" : formatarInteiro(Math.round(v)))} />
        <Comparacao rotulo="Índice de demanda" valor={r?.indice ?? null} media={regiao.indice} formato={formatarIndice} menorMelhor />
        <Comparacao rotulo="Taxa de contato" valor={r?.conversao ?? null} media={regiao.conversao} formato={(v) => (v === null ? "—" : formatarPercentual(v))} />
      </div>
      <p className="-mt-2 text-[11px] text-muted-foreground">Região: média dos {regiao.distritos} distritos da {selecionado.nomeRegiao} (taxas e índice com os totais da região).</p>

      <CartaoGrafico
        titulo="Evolução mensal"
        descricao={`${serie === "buscas" ? "Buscas" : "Profissionais ativas"} por mês em ${selecionado.nome}, com a média dos distritos da região.`}
        recurso="mercado-distrito-evolucao"
        colunas={colunas}
        linhas={linhas}
        className="border-border/70"
        acoes={
          <Segmentado
            rotulo="Série da evolução"
            opcoes={[
              { valor: "buscas", rotulo: "Buscas" },
              { valor: "oferta", rotulo: "Oferta" },
            ]}
            valor={serie}
            aoMudar={setSerie}
          />
        }
      >
        {evolucao.erro ? (
          <p className="py-8 text-center text-xs text-destructive">Não foi possível carregar a evolução agora.</p>
        ) : !evolucao.meses ? (
          <Skeleton className="h-44 w-full" />
        ) : meses.length === 0 ? (
          <p className="py-8 text-center text-xs text-muted-foreground">Sem histórico para este recorte.</p>
        ) : (
          <>
            <Legenda
              itens={[
                { rotulo: selecionado.nome, cor: "var(--serie-lirio)" },
                { rotulo: "Média da região", cor: "var(--muted-foreground)", tracejado: true },
              ]}
            />
            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={meses} margin={{ top: 6, right: 4, bottom: 0, left: 0 }}>
                  {GRADE}
                  <XAxis dataKey="mes" tickFormatter={rotuloMes} tick={EIXO} tickLine={false} axisLine={{ stroke: "var(--border)" }} minTickGap={8} />
                  <YAxis width={34} tick={EIXO} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip content={(p) => <DicaMes active={p.active} payload={p.payload} metrica={serie} />} cursor={{ fill: "var(--muted)", fillOpacity: 0.5 }} />
                  <Bar dataKey={serie === "buscas" ? "buscas" : "ativas"} fill="var(--serie-lirio)" radius={[3, 3, 0, 0]} maxBarSize={18} isAnimationActive={false} />
                  <Line dataKey={serie === "buscas" ? "buscasRegiao" : "ativasRegiao"} stroke="var(--muted-foreground)" strokeWidth={1.5} strokeDasharray="4 3" dot={false} isAnimationActive={false} connectNulls />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            {meses.at(-1)?.parcial && <p className="mt-1 text-[11px] text-muted-foreground">O último mês está em andamento.</p>}
          </>
        )}
      </CartaoGrafico>

      <section aria-labelledby="titulo-cats">
        <h4 id="titulo-cats" className="mb-2 text-xs font-semibold">
          Categorias mais buscadas
        </h4>
        {cats.length === 0 ? (
          <p className="text-xs text-muted-foreground">Nenhuma busca com categoria no período.</p>
        ) : (
          <ul className="grid gap-1.5">
            {cats.map((c) => (
              <li key={c.categoria} className="grid grid-cols-[minmax(0,8.5rem)_1fr_auto] items-center gap-2 text-xs">
                <span className="truncate">{nomeCat(c.categoria)}</span>
                <span className="h-2 rounded-full bg-muted" aria-hidden="true">
                  <span className="block h-2 rounded-full bg-serie-lirio" style={{ width: `${(c.buscas / maxCat) * 100}%` }} />
                </span>
                <span className="flex items-center gap-1.5 tabular-nums">
                  {formatarInteiro(c.buscas)}
                  <span className="inline-flex items-center gap-1 rounded border border-border px-1 text-[10px] text-muted-foreground" title={`${textoClasse(c.indice)}; ${c.ativas} profissionais`}>
                    <span className="size-2 rounded-sm" style={{ background: corIndice(c.indice, tema) }} aria-hidden="true" />
                    {formatarIndice(c.indice)}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-2 text-[11px] text-muted-foreground">Ao lado de cada categoria: buscas e índice de demanda dela no distrito, contra a cidade na mesma categoria.</p>
      </section>
    </aside>
  );
}
