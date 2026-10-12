"use client";

import { useMemo, useState, useSyncExternalStore, type ReactNode } from "react";
import { Bar, BarChart, CartesianGrid, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis, type TooltipContentProps, type TooltipValueType } from "recharts";
import { CartaoGrafico } from "@/components/graficos/cartao-grafico";
import type { ColunaTabela, LinhaTabela } from "@/components/graficos/exportar";
import { Segmentado } from "@/components/graficos/segmentado";
import type { CancelamentoDia, MixPorte, SemanaFaturamento, ServicoRanking } from "@/lib/dados/pelagem";
import { formatarInteiro, formatarMoeda, formatarPercentual, formatarPontos, formatarVariacao } from "@/lib/formato";
import { razao, variacao, variacaoPontos } from "@/lib/metrics";
import { DIA_SEMANA, PORTE } from "@/lib/rotulos-pelagem";

const EIXO = { fill: "var(--muted-foreground)", fontSize: 11 } as const;
const GRADE = <CartesianGrid vertical={false} stroke="var(--border)" strokeOpacity={0.7} />;

const diaMes = new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "short", timeZone: "UTC" });
const rotuloSemana = (iso: string) => diaMes.format(new Date(`${iso}T00:00:00Z`)).replace(".", "").replace(" de ", " ");

type PropsDica = Pick<TooltipContentProps<TooltipValueType, string | number>, "active" | "payload">;

/** Caixa de dica comum aos gráficos da página. */
function CaixaDica({ titulo, linhas }: { titulo: ReactNode; linhas: { rotulo: ReactNode; valor: ReactNode; cor?: string }[] }) {
  return (
    <div className="min-w-48 rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-lg">
      <p className="mb-1.5 font-medium">{titulo}</p>
      {linhas.map((l, i) => (
        <p key={i} className="flex items-center justify-between gap-4 py-0.5">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            {l.cor && <span className="size-2 rounded-sm" style={{ background: l.cor }} aria-hidden="true" />}
            {l.rotulo}
          </span>
          <span className="font-medium tabular-nums">{l.valor}</span>
        </p>
      ))}
    </div>
  );
}

function Legenda({ itens }: { itens: { rotulo: ReactNode; cor: string; opacidade?: number; tracejado?: boolean }[] }) {
  return (
    <ul className="mb-2 flex flex-wrap gap-x-5 gap-y-1 text-xs" aria-label="Legenda">
      {itens.map((i, n) => (
        <li key={n} className="flex items-center gap-2">
          {i.tracejado ? (
            <span className="w-4 border-t border-dashed" style={{ borderColor: i.cor }} aria-hidden="true" />
          ) : (
            <span className="size-2.5 rounded-sm" style={{ background: i.cor, opacity: i.opacidade ?? 1 }} aria-hidden="true" />
          )}
          {i.rotulo}
        </li>
      ))}
    </ul>
  );
}

// ─── Faturamento semanal ──────────────────────────────────────────────────────

type MetricaSemana = "faturamento" | "atendimentos";

function DicaSemana({ active, payload, metrica }: PropsDica & { metrica: MetricaSemana }) {
  const s = payload?.[0]?.payload as SemanaFaturamento | undefined;
  if (!active || !s) return null;
  return (
    <CaixaDica
      titulo={`Semana de ${rotuloSemana(s.semana)}${s.noPeriodo ? "" : " (antes do período)"}`}
      linhas={[
        ...(metrica === "faturamento" ? [{ rotulo: "Faturamento", valor: formatarMoeda(s.faturamento), cor: "var(--serie-pelagem)" }] : []),
        { rotulo: "Atendimentos concluídos", valor: formatarInteiro(s.atendimentos) },
        ...(metrica === "faturamento" && s.atendimentos > 0 ? [{ rotulo: "Ticket médio", valor: formatarMoeda(s.faturamento / s.atendimentos) }] : []),
      ]}
    />
  );
}

export function FaturamentoSemanal({ semanas, podeVerFinanceiro, descricaoIntervalo }: { semanas: SemanaFaturamento[]; podeVerFinanceiro: boolean; descricaoIntervalo: string }) {
  const [metrica, setMetrica] = useState<MetricaSemana>(podeVerFinanceiro ? "faturamento" : "atendimentos");
  const doPeriodo = semanas.filter((s) => s.noPeriodo);
  const contexto = semanas.length - doPeriodo.length;
  const media = doPeriodo.length ? doPeriodo.reduce((t, s) => t + s[metrica], 0) / doPeriodo.length : null;
  const formatar = (v: number) => (metrica === "faturamento" ? formatarMoeda(v) : formatarInteiro(Math.round(v)));
  const melhor = doPeriodo.reduce<SemanaFaturamento | null>((m, s) => (!m || s[metrica] > m[metrica] ? s : m), null);

  const colunas: ColunaTabela[] = [
    { chave: "semana", rotulo: "Semana (segunda-feira)", formato: "texto" },
    ...(podeVerFinanceiro ? [{ chave: "faturamento", rotulo: "Faturamento", formato: "moeda" as const }] : []),
    { chave: "atendimentos", rotulo: "Atendimentos concluídos", formato: "inteiro" },
    { chave: "periodo", rotulo: "No período", formato: "texto" },
  ];
  const linhas: LinhaTabela[] = semanas.map((s) => ({ semana: s.semana, faturamento: s.faturamento, atendimentos: s.atendimentos, periodo: s.noPeriodo ? "Sim" : "Não (contexto)" }));

  const descricao = doPeriodo.length
    ? `${metrica === "faturamento" ? "Faturamento" : "Atendimentos concluídos"} por semana completa (segunda a domingo) em ${descricaoIntervalo}${contexto ? `, com ${contexto} semanas anteriores esmaecidas para contexto` : ""}.`
    : `O período não tem semana completa; as barras mostram as ${semanas.length} semanas completas anteriores.`;

  return (
    <CartaoGrafico
      titulo={podeVerFinanceiro ? "Faturamento semanal" : "Atendimentos por semana"}
      descricao={descricao}
      recurso="pelagem-faturamento-semanal"
      colunas={colunas}
      linhas={linhas}
      className="lg:col-span-2"
      acoes={
        podeVerFinanceiro && (
          <Segmentado
            rotulo="Métrica"
            opcoes={[
              { valor: "faturamento", rotulo: "Faturamento" },
              { valor: "atendimentos", rotulo: "Atendimentos" },
            ]}
            valor={metrica}
            aoMudar={setMetrica}
          />
        )
      }
    >
      <Legenda
        itens={[
          ...(doPeriodo.length ? [{ rotulo: "Semanas do período", cor: "var(--serie-pelagem)" }] : []),
          ...(contexto ? [{ rotulo: "Semanas anteriores", cor: "var(--serie-pelagem)", opacidade: 0.4 }] : []),
          ...(media !== null ? [{ rotulo: `Média do período: ${formatar(media)}`, cor: "var(--muted-foreground)", tracejado: true }] : []),
        ]}
      />
      {melhor && melhor[metrica] > 0 && (
        <p className="mb-2 text-xs text-muted-foreground">
          Melhor semana: <span className="font-medium text-foreground">{rotuloSemana(melhor.semana)}</span>, com {formatar(melhor[metrica])}.
        </p>
      )}
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={semanas} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            {GRADE}
            <XAxis dataKey="semana" tickFormatter={rotuloSemana} tick={EIXO} tickLine={false} axisLine={{ stroke: "var(--border)" }} minTickGap={16} />
            <YAxis width={metrica === "faturamento" ? 64 : 32} tick={EIXO} tickLine={false} axisLine={false} tickFormatter={formatar} allowDecimals={false} />
            <Tooltip content={(p) => <DicaSemana active={p.active} payload={p.payload} metrica={metrica} />} cursor={{ fill: "var(--muted)", fillOpacity: 0.5 }} />
            {media !== null && <ReferenceLine y={media} stroke="var(--muted-foreground)" strokeDasharray="4 4" strokeOpacity={0.8} />}
            <Bar dataKey={metrica} radius={[3, 3, 0, 0]} maxBarSize={36} isAnimationActive={false}>
              {semanas.map((s) => (
                <Cell key={s.semana} fill="var(--serie-pelagem)" fillOpacity={s.noPeriodo ? 1 : 0.4} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </CartaoGrafico>
  );
}

// Tela estreita: rótulos do eixo mais curtos para sobrar espaço às barras.
const CONSULTA_ESTREITA = "(max-width: 640px)";
function assinarLargura(aviso: () => void) {
  const m = window.matchMedia(CONSULTA_ESTREITA);
  m.addEventListener("change", aviso);
  return () => m.removeEventListener("change", aviso);
}
const useTelaEstreita = () => useSyncExternalStore(assinarLargura, () => window.matchMedia(CONSULTA_ESTREITA).matches, () => false);

// ─── Top 10 serviços ──────────────────────────────────────────────────────────

interface LinhaServico extends ServicoRanking {
  rotulo: string;
}

function DicaServico({ active, payload, comparar }: PropsDica & { comparar: boolean; podeVerFinanceiro: boolean }) {
  const s = payload?.[0]?.payload as LinhaServico | undefined;
  if (!active || !s) return null;
  const v = variacao(s.atendimentos, s.atendimentosAnterior);
  return (
    <CaixaDica
      titulo={`${s.servico} · ${PORTE[s.porte]?.longo ?? s.porte}`}
      linhas={[
        { rotulo: "Atendimentos", valor: formatarInteiro(s.atendimentos) },
        ...(s.faturamento > 0 ? [{ rotulo: "Faturamento", valor: formatarMoeda(s.faturamento) }] : []),
        ...(comparar ? [{ rotulo: "Período anterior", valor: `${formatarInteiro(s.atendimentosAnterior)}${v === null ? "" : ` (${formatarVariacao(v)})`}` }] : []),
      ]}
    />
  );
}

export function TopServicos({ servicos, podeVerFinanceiro, comparar, descricaoIntervalo }: { servicos: ServicoRanking[]; podeVerFinanceiro: boolean; comparar: boolean; descricaoIntervalo: string }) {
  const [metrica, setMetrica] = useState<"faturamento" | "atendimentos">(podeVerFinanceiro ? "faturamento" : "atendimentos");
  const dados = useMemo<LinhaServico[]>(
    () =>
      servicos
        .map((s) => ({ ...s, rotulo: `${s.servico} · ${s.porte}`, faturamento: podeVerFinanceiro ? s.faturamento : 0 }))
        .sort((a, b) => b[metrica] - a[metrica] || b.atendimentos - a.atendimentos),
    [servicos, metrica, podeVerFinanceiro],
  );
  const total = dados.reduce((t, s) => t + s[metrica], 0);
  const lider = dados[0];
  const estreita = useTelaEstreita();

  const colunas: ColunaTabela[] = [
    { chave: "servico", rotulo: "Serviço", formato: "texto" },
    { chave: "porte", rotulo: "Porte", formato: "texto" },
    { chave: "atendimentos", rotulo: "Atendimentos", formato: "inteiro" },
    ...(podeVerFinanceiro ? [{ chave: "faturamento", rotulo: "Faturamento", formato: "moeda" as const }] : []),
    ...(comparar ? [{ chave: "anterior", rotulo: "Atendimentos no período anterior", formato: "inteiro" as const }] : []),
  ];
  const linhas: LinhaTabela[] = dados.map((s) => ({ servico: s.servico, porte: s.porte, atendimentos: s.atendimentos, faturamento: s.faturamento, anterior: s.atendimentosAnterior }));

  return (
    <CartaoGrafico
      titulo="Top 10 serviços"
      descricao={`Combinações de serviço e porte com mais ${metrica === "faturamento" ? "faturamento" : "atendimentos"} concluídos em ${descricaoIntervalo}.`}
      recurso="pelagem-top-servicos"
      colunas={colunas}
      linhas={linhas}
      acoes={
        podeVerFinanceiro && (
          <Segmentado
            rotulo="Ordenar por"
            opcoes={[
              { valor: "faturamento", rotulo: "Faturamento" },
              { valor: "atendimentos", rotulo: "Atendimentos" },
            ]}
            valor={metrica}
            aoMudar={setMetrica}
          />
        )
      }
    >
      {lider && total > 0 && (
        <p className="mb-2 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">{lider.rotulo}</span> responde por {formatarPercentual(lider[metrica] / total)} do top 10.
        </p>
      )}
      <div style={{ height: Math.max(120, dados.length * 30 + 16) }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={dados} layout="vertical" margin={{ top: 0, right: 12, bottom: 0, left: 0 }}>
            <CartesianGrid horizontal={false} stroke="var(--border)" strokeOpacity={0.7} />
            <XAxis type="number" tick={EIXO} tickLine={false} axisLine={false} tickFormatter={(v: number) => (metrica === "faturamento" ? formatarMoeda(v) : formatarInteiro(v))} allowDecimals={false} />
            <YAxis type="category" dataKey="rotulo" width={estreita ? 120 : 228} tick={{ ...EIXO, fill: "var(--foreground)" }} tickLine={false} axisLine={false} interval={0} />
            <Tooltip content={(p) => <DicaServico active={p.active} payload={p.payload} comparar={comparar} podeVerFinanceiro={podeVerFinanceiro} />} cursor={{ fill: "var(--muted)", fillOpacity: 0.5 }} />
            <Bar dataKey={metrica} fill="var(--serie-pelagem)" radius={[0, 3, 3, 0]} maxBarSize={18} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </CartaoGrafico>
  );
}

// ─── Mix por porte e espécie ──────────────────────────────────────────────────

const ESPECIES = [
  { chave: "cachorro", rotulo: "Cachorro", cor: "var(--serie-pelagem)" },
  { chave: "gato", rotulo: "Gato", cor: "var(--serie-gato)" },
  { chave: "naoInformada", rotulo: "Espécie não informada", cor: "var(--muted-foreground)" },
] as const;

interface LinhaMix extends MixPorte {
  rotulo: string;
  total: number;
}

function DicaMix({ active, payload, proporcao }: PropsDica & { proporcao: boolean }) {
  const m = payload?.[0]?.payload as LinhaMix | undefined;
  if (!active || !m) return null;
  return (
    <CaixaDica
      titulo={`${PORTE[m.porte]?.longo ?? m.porte} · ${formatarInteiro(m.total)} atendimentos`}
      linhas={ESPECIES.filter((e) => m[e.chave] > 0).map((e) => ({
        rotulo: e.rotulo,
        cor: e.cor,
        valor: proporcao ? formatarPercentual(m[e.chave] / m.total) : `${formatarInteiro(m[e.chave])} (${formatarPercentual(m[e.chave] / m.total)})`,
      }))}
    />
  );
}

export function MixPorteEspecie({ mix, descricaoIntervalo }: { mix: MixPorte[]; descricaoIntervalo: string }) {
  const [proporcao, setProporcao] = useState(false);
  const dados: LinhaMix[] = mix.map((m) => ({ ...m, rotulo: PORTE[m.porte]?.curto ?? m.porte, total: m.cachorro + m.gato + m.naoInformada }));
  const total = dados.reduce((t, m) => t + m.total, 0);
  const visiveis = ESPECIES.filter((e) => dados.some((m) => m[e.chave] > 0));
  const gatos = dados.reduce((t, m) => t + m.gato, 0);
  const principal = dados.reduce<LinhaMix | null>((a, m) => (!a || m.total > a.total ? m : a), null);

  const colunas: ColunaTabela[] = [
    { chave: "porte", rotulo: "Porte", formato: "texto" },
    { chave: "cachorro", rotulo: "Cachorro", formato: "inteiro" },
    { chave: "gato", rotulo: "Gato", formato: "inteiro" },
    { chave: "naoInformada", rotulo: "Não informada", formato: "inteiro" },
    { chave: "total", rotulo: "Total", formato: "inteiro" },
    { chave: "participacao", rotulo: "Participação no total", formato: "percentual" },
  ];
  const linhas: LinhaTabela[] = dados.map((m) => ({ porte: PORTE[m.porte]?.longo ?? m.porte, cachorro: m.cachorro, gato: m.gato, naoInformada: m.naoInformada, total: m.total, participacao: razao(m.total, total) }));

  return (
    <CartaoGrafico
      titulo="Mix por porte e espécie"
      descricao={`Atendimentos concluídos por porte, divididos por espécie, em ${descricaoIntervalo}.`}
      recurso="pelagem-mix-porte-especie"
      colunas={colunas}
      linhas={linhas}
      acoes={
        <Segmentado
          rotulo="Escala"
          opcoes={[
            { valor: "qtd", rotulo: "Quantidade" },
            { valor: "pct", rotulo: "% do porte" },
          ]}
          valor={proporcao ? "pct" : "qtd"}
          aoMudar={(v) => setProporcao(v === "pct")}
        />
      }
    >
      <Legenda itens={visiveis.map((e) => ({ rotulo: e.rotulo, cor: e.cor }))} />
      {total > 0 && principal && (
        <p className="mb-2 text-xs text-muted-foreground">
          {PORTE[principal.porte]?.curto} concentra {formatarPercentual(principal.total / total)} dos atendimentos; gatos são {formatarPercentual(gatos / total)}.
        </p>
      )}
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={dados} margin={{ top: 8, right: 8, bottom: 0, left: 0 }} stackOffset={proporcao ? "expand" : "none"}>
            {GRADE}
            <XAxis dataKey="rotulo" tick={EIXO} tickLine={false} axisLine={{ stroke: "var(--border)" }} />
            <YAxis width={40} tick={EIXO} tickLine={false} axisLine={false} allowDecimals={false} tickFormatter={(v: number) => (proporcao ? formatarPercentual(v) : formatarInteiro(v))} />
            <Tooltip content={(p) => <DicaMix active={p.active} payload={p.payload} proporcao={proporcao} />} cursor={{ fill: "var(--muted)", fillOpacity: 0.5 }} />
            {visiveis.map((e, i) => (
              <Bar
                key={e.chave}
                dataKey={e.chave}
                stackId="especie"
                fill={e.cor}
                stroke="var(--card)"
                strokeWidth={1}
                maxBarSize={64}
                radius={i === visiveis.length - 1 ? [3, 3, 0, 0] : 0}
                isAnimationActive={false}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </CartaoGrafico>
  );
}

// ─── Cancelamento por dia da semana ───────────────────────────────────────────

interface LinhaCancel extends CancelamentoDia {
  rotulo: string;
}

function DicaCancel({ active, payload, comparar }: PropsDica & { comparar: boolean }) {
  const c = payload?.[0]?.payload as LinhaCancel | undefined;
  if (!active || !c) return null;
  const pontos = variacaoPontos(c.taxa, c.taxaAnterior);
  return (
    <CaixaDica
      titulo={DIA_SEMANA[c.diaSemana]?.longo ?? ""}
      linhas={[
        { rotulo: "Taxa de cancelamento", cor: "var(--serie-pelagem)", valor: c.taxa === null ? "—" : formatarPercentual(c.taxa) },
        { rotulo: "Cancelados / agendados", valor: `${formatarInteiro(c.cancelados)} / ${formatarInteiro(c.agendamentos)}` },
        ...(comparar
          ? [
              { rotulo: "Período anterior", cor: "var(--muted-foreground)", valor: c.taxaAnterior === null ? "—" : formatarPercentual(c.taxaAnterior) },
              ...(pontos !== null ? [{ rotulo: "Diferença", valor: formatarPontos(pontos) }] : []),
            ]
          : []),
      ]}
    />
  );
}

export function CancelamentoPorDia({ dias, taxaGeral, comparar, descricaoIntervalo }: { dias: CancelamentoDia[]; taxaGeral: number | null; comparar: boolean; descricaoIntervalo: string }) {
  const dados: LinhaCancel[] = dias.map((d) => ({ ...d, rotulo: DIA_SEMANA[d.diaSemana]?.curto ?? "" }));
  const pior = dados.reduce<LinhaCancel | null>((a, d) => (d.taxa !== null && d.agendamentos >= 5 && (!a || (a.taxa ?? 0) < d.taxa) ? d : a), null);
  const maiorAlta = comparar
    ? dados.reduce<{ d: LinhaCancel; p: number } | null>((a, d) => {
        const p = d.agendamentosAnterior >= 5 && d.agendamentos >= 5 ? variacaoPontos(d.taxa, d.taxaAnterior) : null;
        return p !== null && p > 0 && (!a || p > a.p) ? { d, p } : a;
      }, null)
    : null;

  const colunas: ColunaTabela[] = [
    { chave: "dia", rotulo: "Dia da semana", formato: "texto" },
    { chave: "agendamentos", rotulo: "Agendamentos", formato: "inteiro" },
    { chave: "cancelados", rotulo: "Cancelados", formato: "inteiro" },
    { chave: "taxa", rotulo: "Taxa de cancelamento", formato: "percentual" },
    ...(comparar ? [{ chave: "taxaAnterior", rotulo: "Taxa no período anterior", formato: "percentual" as const }] : []),
  ];
  const linhas: LinhaTabela[] = dados.map((d) => ({ dia: DIA_SEMANA[d.diaSemana]?.longo ?? "", agendamentos: d.agendamentos, cancelados: d.cancelados, taxa: d.taxa, taxaAnterior: d.taxaAnterior }));

  return (
    <CartaoGrafico
      titulo="Taxa de cancelamento por dia"
      descricao={`Cancelados sobre todos os agendamentos de cada dia de funcionamento em ${descricaoIntervalo}${comparar ? ", comparado com o período anterior" : ""}.`}
      recurso="pelagem-cancelamento-dia"
      colunas={colunas}
      linhas={linhas}
    >
      <Legenda
        itens={[
          { rotulo: "Período atual", cor: "var(--serie-pelagem)" },
          ...(comparar ? [{ rotulo: "Período anterior", cor: "var(--muted-foreground)" }] : []),
          ...(taxaGeral !== null ? [{ rotulo: `Média geral: ${formatarPercentual(taxaGeral)}`, cor: "var(--muted-foreground)", tracejado: true }] : []),
        ]}
      />
      <p className="mb-2 text-xs text-muted-foreground">
        {pior ? (
          <>
            Maior taxa na <span className="font-medium text-foreground">{DIA_SEMANA[pior.diaSemana]?.longo}</span> ({formatarPercentual(pior.taxa ?? 0)}).
          </>
        ) : (
          "Poucos agendamentos por dia para apontar um destaque."
        )}
        {maiorAlta && (
          <>
            {" "}
            Maior alta: {DIA_SEMANA[maiorAlta.d.diaSemana]?.longo}, {formatarPontos(maiorAlta.p)}.
          </>
        )}
      </p>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={dados} margin={{ top: 8, right: 8, bottom: 0, left: 0 }} barGap={2}>
            {GRADE}
            <XAxis dataKey="rotulo" tick={EIXO} tickLine={false} axisLine={{ stroke: "var(--border)" }} />
            <YAxis width={44} tick={EIXO} tickLine={false} axisLine={false} tickFormatter={(v: number) => formatarPercentual(v)} />
            <Tooltip content={(p) => <DicaCancel active={p.active} payload={p.payload} comparar={comparar} />} cursor={{ fill: "var(--muted)", fillOpacity: 0.5 }} />
            {taxaGeral !== null && <ReferenceLine y={taxaGeral} stroke="var(--muted-foreground)" strokeDasharray="4 4" strokeOpacity={0.8} />}
            <Bar dataKey="taxa" fill="var(--serie-pelagem)" radius={[3, 3, 0, 0]} maxBarSize={28} isAnimationActive={false} />
            {comparar && <Bar dataKey="taxaAnterior" fill="var(--muted-foreground)" radius={[3, 3, 0, 0]} maxBarSize={28} isAnimationActive={false} />}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </CartaoGrafico>
  );
}
