"use client";

import { useMemo, useState } from "react";
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis, type TooltipContentProps, type TooltipValueType } from "recharts";
import { CartaoGrafico } from "@/components/graficos/cartao-grafico";
import type { ColunaTabela, LinhaTabela } from "@/components/graficos/exportar";
import type { PontoTendencia } from "@/lib/dados/visao-geral";
import { formatarInteiro, formatarMoeda } from "@/lib/formato";
import { indexar } from "@/lib/metrics";
import { cn } from "@/lib/utils";

type MetricaPelagem = "faturamento" | "atendimentos";
type MetricaLirio = "buscas" | "cliques";

const ROTULO: Record<MetricaPelagem | MetricaLirio, string> = {
  faturamento: "Faturamento",
  atendimentos: "Atendimentos",
  buscas: "Buscas",
  cliques: "Cliques no WhatsApp",
};

const mesCurto = new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "short", timeZone: "UTC" });
const rotuloData = (iso: string) => mesCurto.format(new Date(`${iso}T00:00:00Z`)).replace(".", "").replace(" de ", " ");

function formatar(metrica: MetricaPelagem | MetricaLirio, v: number) {
  return metrica === "faturamento" ? formatarMoeda(v) : formatarInteiro(v);
}

function Segmentado<T extends MetricaPelagem | MetricaLirio>({ rotulo, opcoes, valor, aoMudar }: { rotulo: string; opcoes: readonly T[]; valor: T; aoMudar: (v: T) => void }) {
  return (
    <div role="radiogroup" aria-label={rotulo} className="flex items-center rounded-md border border-border p-0.5">
      {opcoes.map((o) => (
        <button
          key={o}
          type="button"
          role="radio"
          aria-checked={o === valor}
          onClick={() => aoMudar(o)}
          className={cn(
            "h-6 rounded px-2 text-[11px] font-medium transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none",
            o === valor ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {ROTULO[o]}
        </button>
      ))}
    </div>
  );
}

interface Linha {
  data: string;
  pelagem: number | null;
  lirio: number | null;
  pelagemAbs: number;
  lirioAbs: number;
}

interface ConfigDica {
  granularidade: "dia" | "semana";
  indexado: boolean;
  metricas: { pelagem: MetricaPelagem; lirio: MetricaLirio };
}

function Dica({ active, payload, label, granularidade, indexado, metricas }: Pick<TooltipContentProps<TooltipValueType, string | number>, "active" | "payload" | "label"> & ConfigDica) {
  if (!active || !payload?.length) return null;
  const ponto = payload[0]?.payload as Linha | undefined;
  if (!ponto) return null;
  return (
    <div className="min-w-48 rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-lg">
      <p className="mb-1.5 font-medium">
        {granularidade === "semana" ? "Semana de " : ""}
        {rotuloData(String(label))}
      </p>
      {(["pelagem", "lirio"] as const).map((m) =>
        ponto[m] === null ? null : (
          <p key={m} className="flex items-center justify-between gap-4 py-0.5">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <span className="h-0.5 w-3 rounded" style={{ background: `var(--serie-${m})` }} aria-hidden="true" />
              {m === "pelagem" ? "Pelagem" : "Lírio"} · {ROTULO[metricas[m]]}
            </span>
            <span className="tabular-nums">
              <span className="font-medium text-foreground">{formatar(metricas[m], m === "pelagem" ? ponto.pelagemAbs : ponto.lirioAbs)}</span>
              {indexado && <span className="text-muted-foreground"> · índice {Math.round(ponto[m] ?? 0)}</span>}
            </span>
          </p>
        ),
      )}
    </div>
  );
}

/**
 * Tendência das duas marcas num eixo só. Com as duas visíveis, cada série é indexada pela própria
 * média (100 = média do período): faturamento e buscas têm escalas diferentes e um gráfico de dois
 * eixos induziria leituras erradas. Com um produto só, mostra o valor absoluto.
 */
export function GraficoTendencia({
  pontos,
  granularidade,
  verPelagem,
  verLirio,
  podeVerFinanceiro,
  descricaoIntervalo,
}: {
  pontos: PontoTendencia[];
  granularidade: "dia" | "semana";
  verPelagem: boolean;
  verLirio: boolean;
  podeVerFinanceiro: boolean;
  descricaoIntervalo: string;
}) {
  const opcoesPelagem: MetricaPelagem[] = podeVerFinanceiro ? ["faturamento", "atendimentos"] : ["atendimentos"];
  const [mp, setMp] = useState<MetricaPelagem>(opcoesPelagem[0] ?? "atendimentos");
  const [ml, setMl] = useState<MetricaLirio>("buscas");
  const indexado = verPelagem && verLirio;

  const linhas = useMemo<Linha[]>(() => {
    const p = pontos.map((x) => x[mp]);
    const l = pontos.map((x) => x[ml]);
    const ip = indexar(p);
    const il = indexar(l);
    return pontos.map((x, i) => ({
      data: x.data,
      pelagem: verPelagem ? (indexado ? (ip[i] ?? null) : (p[i] ?? 0)) : null,
      lirio: verLirio ? (indexado ? (il[i] ?? null) : (l[i] ?? 0)) : null,
      pelagemAbs: p[i] ?? 0,
      lirioAbs: l[i] ?? 0,
    }));
  }, [pontos, mp, ml, indexado, verPelagem, verLirio]);

  const colunas: ColunaTabela[] = [
    { chave: "data", rotulo: granularidade === "dia" ? "Dia" : "Semana (início)", formato: "texto" },
    ...(verPelagem ? [{ chave: "pelagem", rotulo: `Pelagem · ${ROTULO[mp]}`, formato: mp === "faturamento" ? ("moeda" as const) : ("inteiro" as const) }] : []),
    ...(verLirio ? [{ chave: "lirio", rotulo: `Lírio · ${ROTULO[ml]}`, formato: "inteiro" as const }] : []),
  ];
  const tabela: LinhaTabela[] = linhas.map((l) => ({ data: l.data, pelagem: l.pelagemAbs, lirio: l.lirioAbs }));

  const ultima = linhas.at(-1);
  const descricao = indexado
    ? `${ROTULO[mp]} do Pelagem e ${ROTULO[ml].toLowerCase()} da Lírio por ${granularidade === "dia" ? "dia" : "semana completa"}, em índice (100 = média de cada série em ${descricaoIntervalo}).`
    : `${verPelagem ? `${ROTULO[mp]} do Pelagem` : `${ROTULO[ml]} da Lírio`} por ${granularidade === "dia" ? "dia" : "semana completa"} em ${descricaoIntervalo}.`;

  return (
    <CartaoGrafico
      titulo={indexado ? "Tendência das duas marcas" : verPelagem ? "Tendência do Pelagem" : "Tendência da Lírio"}
      descricao={descricao}
      recurso="visao-geral-tendencia"
      colunas={colunas}
      linhas={tabela}
      className="lg:col-span-2"
      acoes={
        <>
          {verPelagem && opcoesPelagem.length > 1 && <Segmentado rotulo="Métrica do Pelagem" opcoes={opcoesPelagem} valor={mp} aoMudar={setMp} />}
          {verLirio && <Segmentado rotulo="Métrica da Lírio" opcoes={["buscas", "cliques"] as const} valor={ml} aoMudar={setMl} />}
        </>
      }
    >
      <ul className="mb-2 flex flex-wrap gap-x-5 gap-y-1 text-xs" aria-label="Legenda">
        {verPelagem && (
          <li className="flex items-center gap-2">
            <span className="h-0.5 w-4 rounded bg-serie-pelagem" aria-hidden="true" />
            Pelagem · {ROTULO[mp]}
            {ultima && <span className="text-muted-foreground tabular-nums">{granularidade === "dia" ? "último dia" : "última semana"}: {formatar(mp, ultima.pelagemAbs)}</span>}
          </li>
        )}
        {verLirio && (
          <li className="flex items-center gap-2">
            <span className="h-0.5 w-4 rounded bg-serie-lirio" aria-hidden="true" />
            Lírio · {ROTULO[ml]}
            {ultima && <span className="text-muted-foreground tabular-nums">{granularidade === "dia" ? "último dia" : "última semana"}: {formatar(ml, ultima.lirioAbs)}</span>}
          </li>
        )}
        {indexado && <li className="text-muted-foreground">Linha tracejada = média do período (100)</li>}
      </ul>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={linhas} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--border)" strokeOpacity={0.7} />
            <XAxis
              dataKey="data"
              tickFormatter={rotuloData}
              tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: "var(--border)" }}
              minTickGap={28}
            />
            <YAxis
              width={indexado ? 36 : 64}
              tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v: number) => (indexado ? String(Math.round(v)) : formatar(verPelagem ? mp : ml, v))}
            />
            {indexado && <ReferenceLine y={100} stroke="var(--muted-foreground)" strokeDasharray="4 4" strokeOpacity={0.6} />}
            <Tooltip content={(p) => <Dica active={p.active} payload={p.payload} label={p.label} granularidade={granularidade} indexado={indexado} metricas={{ pelagem: mp, lirio: ml }} />} cursor={{ stroke: "var(--muted-foreground)", strokeOpacity: 0.4 }} />
            {verPelagem && (
              <Line type="monotone" dataKey="pelagem" name="Pelagem" stroke="var(--serie-pelagem)" strokeWidth={2} dot={false} activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--card)" }} connectNulls isAnimationActive={false} />
            )}
            {verLirio && (
              <Line type="monotone" dataKey="lirio" name="Lírio" stroke="var(--serie-lirio)" strokeWidth={2} dot={false} activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--card)" }} connectNulls isAnimationActive={false} />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </CartaoGrafico>
  );
}
