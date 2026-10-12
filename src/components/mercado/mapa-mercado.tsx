"use client";

import dynamic from "next/dynamic";
import { useCallback, useId, useMemo, useState, useSyncExternalStore } from "react";
import { useReducedMotion } from "motion/react";
import { useTheme } from "next-themes";
import { Segmentado } from "@/components/graficos/segmentado";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { formatarInteiro, formatarPercentual } from "@/lib/formato";
import {
  classeIndice,
  classeSequencial,
  FAIXAS_INDICE,
  quebrasQuantis,
  resumirDistritos,
  TODAS,
  totaisCidade,
  valorMetrica,
  type CelulaMercado,
  type MetricaMapa,
} from "@/lib/mercado";
import { CORES_INDICE, RAMPA_SEQUENCIAL, SEM_DADOS, type Tema } from "@/lib/mercado-cores";
import { corIndice, formatarValor, ROTULO_METRICA, textoClasse, type InfoDistrito } from "./comum";
import { PainelDistrito } from "./painel-distrito";
import { TabelaMercado } from "./tabela-mercado";

const MapaLeaflet = dynamic(() => import("./mapa-leaflet"), {
  ssr: false,
  loading: () => <Skeleton className="h-full w-full rounded-none" />,
});

function Seletor({ rotulo, valor, aoMudar, children, className }: { rotulo: string; valor: string; aoMudar: (v: string) => void; children: React.ReactNode; className?: string }) {
  const id = useId();
  return (
    <span className={cn("min-w-0", className)}>
      <label htmlFor={id} className="mb-1 block text-[11px] font-medium text-muted-foreground">
        {rotulo}
      </label>
      <select
        id={id}
        value={valor}
        onChange={(e) => aoMudar(e.target.value)}
        className="h-8 w-full rounded-md border border-border bg-card px-2 text-xs text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
      >
        {children}
      </select>
    </span>
  );
}

const assinarNada = () => () => {};

/** Mantém categoria, métrica e distrito na URL sem nova renderização no servidor (link compartilhável). */
function gravarNaUrl(mudancas: Record<string, string | null>) {
  const url = new URL(window.location.href);
  for (const [k, v] of Object.entries(mudancas)) {
    if (v === null) url.searchParams.delete(k);
    else url.searchParams.set(k, v);
  }
  window.history.replaceState(null, "", url);
}

export function MapaMercado({
  celulas,
  distritos,
  categorias,
  inicial,
  intervalo,
  descricaoIntervalo,
  dataOferta,
}: {
  celulas: CelulaMercado[];
  distritos: InfoDistrito[];
  categorias: readonly { slug: string; nome: string }[];
  inicial: { categoria: string; metrica: MetricaMapa; distrito: string | null };
  intervalo: { de: string; ate: string };
  descricaoIntervalo: string;
  dataOferta: string | null;
}) {
  const [categoria, setCategoria] = useState(inicial.categoria);
  const [metrica, setMetrica] = useState<MetricaMapa>(inicial.metrica);
  const [selecionado, setSelecionado] = useState<string | null>(inicial.distrito);
  const { resolvedTheme } = useTheme();
  // O servidor não conhece o tema: a hidratação usa o padrão (escuro) e só depois o tema real.
  // Sem isso, o React manteria cores do servidor em atributos style que não batem com o cliente.
  const montado = useSyncExternalStore(assinarNada, () => true, () => false);
  const tema: Tema = montado && resolvedTheme === "light" ? "claro" : "escuro";
  const reduzido = useReducedMotion() ?? false;

  const slugs = useMemo(() => distritos.map((d) => d.slug), [distritos]);
  const porSlug = useMemo(() => new Map(distritos.map((d) => [d.slug, d])), [distritos]);
  const resumos = useMemo(() => resumirDistritos(celulas, categoria, slugs), [celulas, categoria, slugs]);
  const referencia = useMemo(() => totaisCidade(celulas, categoria), [celulas, categoria]);
  const quebras = useMemo(() => (metrica === "indice" ? [] : quebrasQuantis(slugs.map((s) => valorMetrica(resumos.get(s), metrica)))), [metrica, resumos, slugs]);

  const cores = useMemo(() => {
    const c: Record<string, string> = {};
    for (const s of slugs) {
      const r = resumos.get(s);
      const v = valorMetrica(r, metrica);
      const vazio = !r || (r.buscas === 0 && r.ativas === 0);
      if (metrica === "indice") c[s] = vazio ? SEM_DADOS[tema] : corIndice(v, tema);
      else {
        const k = classeSequencial(v, quebras);
        c[s] = k < 0 || vazio ? SEM_DADOS[tema] : (RAMPA_SEQUENCIAL[tema][k] ?? SEM_DADOS[tema]);
      }
    }
    return c;
  }, [slugs, resumos, metrica, quebras, tema]);

  const rotulo = useCallback(
    (slug: string) => {
      const d = porSlug.get(slug);
      const v = valorMetrica(resumos.get(slug), metrica);
      return `${d?.nome ?? slug} · ${d?.nomeRegiao ?? ""}\n${ROTULO_METRICA[metrica]}: ${formatarValor(metrica, v)}${metrica === "indice" ? `\n${textoClasse(v)}` : ""}`;
    },
    [porSlug, resumos, metrica],
  );

  const mudarCategoria = (v: string) => {
    setCategoria(v);
    gravarNaUrl({ cat: v === TODAS ? null : v });
  };
  const mudarMetrica = (v: MetricaMapa) => {
    setMetrica(v);
    gravarNaUrl({ metrica: v === "indice" ? null : v });
  };
  const selecionar = useCallback((slug: string | null) => {
    setSelecionado(slug);
    gravarNaUrl({ distrito: slug });
  }, []);

  const nomeCategoria = categoria === TODAS ? "todas as categorias" : (categorias.find((c) => c.slug === categoria)?.nome ?? categoria);
  const contagem = useMemo(() => {
    const n = new Map<string, number>();
    for (const s of slugs) {
      const r = resumos.get(s);
      if (!r || (r.buscas === 0 && r.ativas === 0)) continue;
      const c = classeIndice(r.indice);
      n.set(c, (n.get(c) ?? 0) + 1);
    }
    return n;
  }, [slugs, resumos]);

  const legendaSequencial = metrica !== "indice" && (
    <ul className="flex flex-wrap items-center gap-x-3 gap-y-1.5" aria-label={`Legenda: ${ROTULO_METRICA[metrica]}, do menor para o maior`}>
      {[0, ...quebras].map((inicio, k) => {
        const fim = quebras[k];
        const f = (v: number) => (metrica === "conversao" ? formatarPercentual(v) : formatarInteiro(Math.round(v)));
        return (
          <li key={k} className="flex items-center gap-1.5">
            <span className="h-3 w-5 rounded-sm" style={{ background: RAMPA_SEQUENCIAL[tema][k] }} aria-hidden="true" />
            {fim === undefined ? `${f(inicio)} ou mais` : k === 0 ? `até ${f(fim)}` : `${f(inicio)} a ${f(fim)}`}
          </li>
        );
      })}
      <li className="flex items-center gap-1.5">
        <span className="h-3 w-5 rounded-sm border border-border" style={{ background: SEM_DADOS[tema] }} aria-hidden="true" />
        sem dados
      </li>
    </ul>
  );

  const legendaIndice = metrica === "indice" && (
    <ul className="grid gap-x-4 gap-y-1.5 sm:grid-cols-2 xl:grid-cols-3" aria-label="Legenda do índice de demanda">
      {FAIXAS_INDICE.map((f) => (
        <li key={f.classe} className="flex items-center gap-2">
          <span className="h-3 w-5 shrink-0 rounded-sm" style={{ background: CORES_INDICE[tema][f.classe] }} aria-hidden="true" />
          <span>
            <span className="font-medium text-foreground">{f.descricao}</span> <span className="text-muted-foreground">({f.rotulo}; {contagem.get(f.classe) ?? 0} distritos)</span>
          </span>
        </li>
      ))}
    </ul>
  );

  const porRegiao = useMemo(() => {
    const g = new Map<string, InfoDistrito[]>();
    for (const d of distritos) g.set(d.nomeRegiao, [...(g.get(d.nomeRegiao) ?? []), d]);
    return [...g].map(([nome, lista]) => ({ nome, lista: lista.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")) }));
  }, [distritos]);

  return (
    <div className="grid grid-cols-1 gap-4">
      <section aria-labelledby="titulo-mapa" className="rounded-xl border border-border bg-card">
        <header className="flex flex-wrap items-end justify-between gap-4 px-4 pt-4">
          <div className="min-w-0">
            <h2 id="titulo-mapa" className="text-sm font-semibold">
              {ROTULO_METRICA[metrica]} por distrito
            </h2>
            <p className="mt-0.5 max-w-3xl text-xs text-muted-foreground">
              {metrica === "indice"
                ? `Buscas por profissional ativa em ${nomeCategoria}, comparadas com a média da cidade (1,00× = média), em ${descricaoIntervalo}. Acima de 1,5× é demanda reprimida; abaixo de 0,5×, excesso de oferta.`
                : metrica === "oferta"
                  ? `Profissionais aprovadas em ${nomeCategoria} na foto de ${dataOferta ? dataOferta.split("-").reverse().join("/") : "oferta mais recente"}.`
                  : metrica === "conversao"
                    ? `Cliques no WhatsApp ÷ visualizações de perfil em ${nomeCategoria}, ${descricaoIntervalo}. Distritos com menos de 10 visualizações ficam sem cor.`
                    : `Buscas em ${nomeCategoria} com o distrito escolhido, ${descricaoIntervalo}.`}{" "}
              Clique num distrito para ver os detalhes; a tabela abaixo traz os mesmos números.
            </p>
          </div>
        </header>
        <div className="grid grid-cols-1 gap-3 px-4 pt-3 sm:grid-cols-[minmax(0,14rem)_auto_minmax(0,16rem)] sm:items-end">
          <Seletor rotulo="Categoria" valor={categoria} aoMudar={mudarCategoria}>
            <option value={TODAS}>Todas as categorias</option>
            {categorias.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.nome}
              </option>
            ))}
          </Seletor>
          <div className="w-fit max-w-full">
            <span className="mb-1 block text-[11px] font-medium text-muted-foreground" aria-hidden="true">
              Métrica
            </span>
            <Segmentado
              rotulo="Métrica do mapa"
              opcoes={[
                { valor: "indice", rotulo: "Índice" },
                { valor: "buscas", rotulo: "Buscas" },
                { valor: "oferta", rotulo: "Oferta" },
                { valor: "conversao", rotulo: "Conversão" },
              ]}
              valor={metrica}
              aoMudar={mudarMetrica}
            />
          </div>
          <Seletor rotulo="Ir para o distrito" valor={selecionado ?? ""} aoMudar={(v) => selecionar(v || null)}>
            <option value="">Escolha um distrito</option>
            {porRegiao.map((g) => (
              <optgroup key={g.nome} label={g.nome}>
                {g.lista.map((d) => (
                  <option key={d.slug} value={d.slug}>
                    {d.nome}
                  </option>
                ))}
              </optgroup>
            ))}
          </Seletor>
        </div>
        <div className="grid grid-cols-1 gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="min-w-0">
            <div className="relative h-[420px] overflow-hidden rounded-lg border border-border sm:h-[540px]" role="img" aria-label={`Mapa de São Paulo com os 96 distritos coloridos por ${ROTULO_METRICA[metrica].toLowerCase()}. Para os valores, use a tabela abaixo do mapa.`}>
              <MapaLeaflet cores={cores} selecionado={selecionado} aoSelecionar={selecionar} rotulo={rotulo} tema={tema} movimentoReduzido={reduzido} />
            </div>
            <div className="mt-3 text-xs">{legendaIndice || legendaSequencial}</div>
          </div>
          <PainelDistrito
            selecionado={selecionado ? (porSlug.get(selecionado) ?? null) : null}
            aoFechar={() => selecionar(null)}
            aoSelecionar={selecionar}
            celulas={celulas}
            resumos={resumos}
            referencia={referencia}
            distritos={distritos}
            categoria={categoria}
            categorias={categorias}
            metrica={metrica}
            tema={tema}
            ate={intervalo.ate}
          />
        </div>
      </section>
      <TabelaMercado key={metrica} distritos={distritos} resumos={resumos} metrica={metrica} selecionado={selecionado} aoSelecionar={selecionar} tema={tema} nomeCategoria={nomeCategoria} />
    </div>
  );
}
