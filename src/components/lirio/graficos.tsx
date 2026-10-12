"use client";

import { useId, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CartaoGrafico } from "@/components/graficos/cartao-grafico";
import { CaixaDica, EIXO, GRADE, Legenda, useTelaEstreita, type PropsDica } from "@/components/graficos/dica";
import type { ColunaTabela, LinhaTabela } from "@/components/graficos/exportar";
import { Segmentado } from "@/components/graficos/segmentado";
import { formatarInteiro, formatarPercentual, formatarPontos, formatarVariacao } from "@/lib/formato";
import { etapasFunil, type TotaisFunil } from "@/lib/lirio-analise";
import { razao, taxaContato, taxaVisualizacao, variacaoPontos } from "@/lib/metrics";

const diaMes = new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "short", timeZone: "UTC" });
const rotuloData = (iso: string) => diaMes.format(new Date(`${iso}T00:00:00Z`)).replace(".", "").replace(" de ", " ");
const decimal = (n: number) => n.toLocaleString("pt-BR", { maximumFractionDigits: 2 });

/** Segmento já nomeado no servidor (categoria ou região). */
export interface SegmentoNomeado extends TotaisFunil {
  chave: string;
  nome: string;
}

function Seletor({ rotulo, valor, opcoes, aoMudar }: { rotulo: string; valor: string; opcoes: readonly { valor: string; rotulo: string }[]; aoMudar: (v: string) => void }) {
  const id = useId();
  return (
    <span className="flex items-center gap-1.5">
      <label htmlFor={id} className="sr-only">
        {rotulo}
      </label>
      <select
        id={id}
        value={valor}
        onChange={(e) => aoMudar(e.target.value)}
        className="h-7 max-w-48 rounded-md border border-border bg-card px-2 text-[11px] font-medium text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
      >
        {opcoes.map((o) => (
          <option key={o.valor} value={o.valor}>
            {o.rotulo}
          </option>
        ))}
      </select>
    </span>
  );
}

// ─── Funil ────────────────────────────────────────────────────────────────────

type Recorte = "cidade" | "categoria" | "regiao";

const LINHA_A = 40;
const CONECTOR = 30;
const ROTULO_L = 170;
const LARGURA = 680;

function textoTransicao(taxa: number | null, queda: number | null, etapa: "visualizacoes" | "cliques"): string {
  if (taxa === null) return "sem base para a taxa";
  if (etapa === "visualizacoes") {
    return queda === null
      ? `Taxa de visualização ${formatarPercentual(taxa)}: cada busca abre ${decimal(taxa)} perfis`
      : `Taxa de visualização ${formatarPercentual(taxa)} · queda de ${formatarPercentual(queda)}`;
  }
  return queda === null ? `Taxa de contato ${formatarPercentual(taxa)}` : `Taxa de contato ${formatarPercentual(taxa)} · ${formatarPercentual(queda)} não chamam no WhatsApp`;
}

export function FunilLirio({
  cidade,
  cidadeAnterior,
  categorias,
  regioes,
  anteriores,
  comparar,
  descricaoIntervalo,
}: {
  cidade: TotaisFunil;
  cidadeAnterior: TotaisFunil;
  categorias: SegmentoNomeado[];
  regioes: SegmentoNomeado[];
  /** Totais do período anterior por chave de segmento (categoria ou região). */
  anteriores: Record<string, TotaisFunil>;
  comparar: boolean;
  descricaoIntervalo: string;
}) {
  const [recorte, setRecorte] = useState<Recorte>("cidade");
  const [chaveCat, setChaveCat] = useState(categorias[0]?.chave ?? "");
  const [chaveReg, setChaveReg] = useState(regioes[0]?.chave ?? "");

  const segmento = recorte === "categoria" ? categorias.find((c) => c.chave === chaveCat) : recorte === "regiao" ? regioes.find((r) => r.chave === chaveReg) : null;
  const totais: TotaisFunil = segmento ?? cidade;
  const anterior = segmento ? (anteriores[`${recorte}:${segmento.chave}`] ?? null) : cidadeAnterior;
  const nomeRecorte = segmento ? segmento.nome : "Cidade inteira";
  const etapas = etapasFunil(totais);
  const etapasAnt = anterior ? etapasFunil(anterior) : null;
  const max = Math.max(1, ...etapas.map((e) => e.valor));
  const area = LARGURA - ROTULO_L - 70;
  const altura = etapas.length * LINHA_A + (etapas.length - 1) * CONECTOR;

  const colunas: ColunaTabela[] = [
    { chave: "etapa", rotulo: "Etapa", formato: "texto" },
    { chave: "valor", rotulo: nomeRecorte, formato: "inteiro" },
    { chave: "taxa", rotulo: "Taxa sobre a etapa anterior", formato: "percentual" },
    { chave: "queda", rotulo: "Queda", formato: "percentual" },
    { chave: "inicio", rotulo: "Sobre as buscas", formato: "percentual" },
    ...(comparar ? [{ chave: "anterior", rotulo: "Período anterior", formato: "inteiro" as const }] : []),
  ];
  const linhas: LinhaTabela[] = etapas.map((e, i) => ({ etapa: e.rotulo, valor: e.valor, taxa: e.taxaDaAnterior, queda: e.queda, inicio: e.taxaDoInicio, anterior: etapasAnt?.[i]?.valor ?? null }));

  const opcoesCat = categorias.map((c) => ({ valor: c.chave, rotulo: c.nome }));
  const opcoesReg = regioes.map((r) => ({ valor: r.chave, rotulo: r.nome }));

  return (
    <CartaoGrafico
      titulo="Funil: buscas → perfis → WhatsApp"
      descricao={`${nomeRecorte} em ${descricaoIntervalo}. Cada barra é uma etapa; entre elas, a taxa de passagem e a queda.`}
      recurso="lirio-funil"
      colunas={colunas}
      linhas={linhas}
      className="lg:col-span-2"
      acoes={
        <>
          <Segmentado
            rotulo="Recorte do funil"
            opcoes={[
              { valor: "cidade", rotulo: "Cidade" },
              { valor: "categoria", rotulo: "Categoria" },
              { valor: "regiao", rotulo: "Região" },
            ]}
            valor={recorte}
            aoMudar={setRecorte}
          />
          {recorte === "categoria" && <Seletor rotulo="Categoria do funil" valor={chaveCat} opcoes={opcoesCat} aoMudar={setChaveCat} />}
          {recorte === "regiao" && <Seletor rotulo="Região do funil" valor={chaveReg} opcoes={opcoesReg} aoMudar={setChaveReg} />}
        </>
      }
    >
      <p className="mb-3 text-xs text-muted-foreground">
        De cada 100 buscas saem <span className="font-medium text-foreground">{decimal((razao(totais.cliques, totais.buscas) ?? 0) * 100)}</span> conversas no WhatsApp
        {comparar && anterior && (
          <>
            {" "}
            (antes: {decimal((razao(anterior.cliques, anterior.buscas) ?? 0) * 100)})
          </>
        )}
        .{recorte === "regiao" && " Buscas sem bairro escolhido entram só no total da cidade."}
      </p>
      <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${LARGURA} ${altura}`} className="block w-full" style={{ minWidth: 560 }}>
        {etapas.map((e, i) => {
          const y = i * (LINHA_A + CONECTOR);
          const w = Math.max(3, (area * e.valor) / max);
          const dentro = w > 90;
          const ant = etapasAnt?.[i];
          return (
            <g key={e.etapa}>
              <text x={0} y={y + 15} fontSize={12} fontWeight={600} fill="var(--foreground)">
                {e.rotulo}
              </text>
              <text x={0} y={y + 32} fontSize={11} fill="var(--muted-foreground)">
                {e.taxaDoInicio !== null && i > 0 ? `${formatarPercentual(e.taxaDoInicio)} das buscas` : "início do funil"}
              </text>
              <rect x={ROTULO_L} y={y} width={w} height={LINHA_A} rx={5} fill="var(--serie-lirio)" />
              <text
                x={dentro ? ROTULO_L + w - 8 : ROTULO_L + w + 6}
                y={y + LINHA_A / 2}
                textAnchor={dentro ? "end" : "start"}
                dominantBaseline="central"
                fontSize={13}
                fontWeight={600}
                fill={dentro ? "#ffffff" : "var(--foreground)"}
              >
                {formatarInteiro(e.valor)}
              </text>
              {comparar && ant && (
                <line x1={ROTULO_L + Math.max(3, (area * ant.valor) / max)} x2={ROTULO_L + Math.max(3, (area * ant.valor) / max)} y1={y - 3} y2={y + LINHA_A + 3} stroke="var(--foreground)" strokeWidth={2} strokeDasharray="3 2" />
              )}
              {i < etapas.length - 1 && (
                <text x={ROTULO_L + 4} y={y + LINHA_A + CONECTOR / 2 + 1} dominantBaseline="central" fontSize={11} fill="var(--muted-foreground)">
                  ↓ {textoTransicao(etapas[i + 1]?.taxaDaAnterior ?? null, etapas[i + 1]?.queda ?? null, i === 0 ? "visualizacoes" : "cliques")}
                  {comparar && etapasAnt?.[i + 1] && (() => {
                    const p = variacaoPontos(etapas[i + 1]?.taxaDaAnterior ?? null, etapasAnt[i + 1]?.taxaDaAnterior ?? null);
                    return p === null ? "" : ` (${formatarPontos(p)} vs. anterior)`;
                  })()}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      </div>
      {comparar && <p className="mt-2 text-[11px] text-muted-foreground">Linha tracejada: volume da etapa no período anterior.</p>}
    </CartaoGrafico>
  );
}

// ─── Taxas por categoria e região ─────────────────────────────────────────────

type MetricaTaxa = "visualizacao" | "contato" | "total";
const ROTULO_TAXA: Record<MetricaTaxa, string> = { visualizacao: "Taxa de visualização", contato: "Taxa de contato", total: "Cliques por busca" };

function taxa(s: TotaisFunil, m: MetricaTaxa): number | null {
  return m === "visualizacao" ? taxaVisualizacao(s.visualizacoes, s.buscas) : m === "contato" ? taxaContato(s.cliques, s.visualizacoes) : razao(s.cliques, s.buscas);
}

interface LinhaTaxa extends SegmentoNomeado {
  valor: number;
}

function DicaTaxa({ active, payload, metrica }: PropsDica & { metrica: MetricaTaxa }) {
  const s = payload?.[0]?.payload as LinhaTaxa | undefined;
  if (!active || !s) return null;
  return (
    <CaixaDica
      titulo={s.nome}
      linhas={[
        { rotulo: ROTULO_TAXA[metrica], valor: formatarPercentual(s.valor), cor: "var(--serie-lirio)" },
        { rotulo: "Buscas", valor: formatarInteiro(s.buscas) },
        { rotulo: "Visualizações", valor: formatarInteiro(s.visualizacoes) },
        { rotulo: "Cliques no WhatsApp", valor: formatarInteiro(s.cliques) },
      ]}
    />
  );
}

export function TaxasPorSegmento({ categorias, regioes, cidade, descricaoIntervalo }: { categorias: SegmentoNomeado[]; regioes: SegmentoNomeado[]; cidade: TotaisFunil; descricaoIntervalo: string }) {
  const [por, setPor] = useState<"categoria" | "regiao">("categoria");
  const [metrica, setMetrica] = useState<MetricaTaxa>("contato");
  const estreita = useTelaEstreita();
  const base = por === "categoria" ? categorias : regioes;
  const dados = useMemo<LinhaTaxa[]>(
    () =>
      base
        .map((s) => ({ ...s, valor: taxa(s, metrica) }))
        .filter((s): s is LinhaTaxa => s.valor !== null)
        .sort((a, b) => b.valor - a.valor),
    [base, metrica],
  );
  const media = taxa(cidade, metrica);
  const melhor = dados[0];
  const pior = dados.at(-1);

  const colunas: ColunaTabela[] = [
    { chave: "nome", rotulo: por === "categoria" ? "Categoria" : "Região", formato: "texto" },
    { chave: "buscas", rotulo: "Buscas", formato: "inteiro" },
    { chave: "visualizacoes", rotulo: "Visualizações", formato: "inteiro" },
    { chave: "cliques", rotulo: "Cliques no WhatsApp", formato: "inteiro" },
    { chave: "tv", rotulo: "Taxa de visualização", formato: "percentual" },
    { chave: "tc", rotulo: "Taxa de contato", formato: "percentual" },
    { chave: "tt", rotulo: "Cliques por busca", formato: "percentual" },
  ];
  const linhas: LinhaTabela[] = base.map((s) => ({ nome: s.nome, buscas: s.buscas, visualizacoes: s.visualizacoes, cliques: s.cliques, tv: taxa(s, "visualizacao"), tc: taxa(s, "contato"), tt: taxa(s, "total") }));

  return (
    <CartaoGrafico
      titulo={`Conversão por ${por === "categoria" ? "categoria" : "região"}`}
      descricao={`${ROTULO_TAXA[metrica]} de cada ${por === "categoria" ? "categoria" : "região"} em ${descricaoIntervalo}; a linha tracejada é a média da cidade.`}
      recurso={`lirio-conversao-${por}`}
      colunas={colunas}
      linhas={linhas}
      acoes={
        <>
          <Segmentado
            rotulo="Agrupar por"
            opcoes={[
              { valor: "categoria", rotulo: "Categoria" },
              { valor: "regiao", rotulo: "Região" },
            ]}
            valor={por}
            aoMudar={setPor}
          />
          <Segmentado
            rotulo="Taxa"
            opcoes={[
              { valor: "contato", rotulo: "Contato" },
              { valor: "visualizacao", rotulo: "Visualização" },
              { valor: "total", rotulo: "Ponta a ponta" },
            ]}
            valor={metrica}
            aoMudar={setMetrica}
          />
        </>
      }
    >
      <Legenda itens={[{ rotulo: ROTULO_TAXA[metrica], cor: "var(--serie-lirio)" }, ...(media !== null ? [{ rotulo: `Média da cidade: ${formatarPercentual(media)}`, cor: "var(--muted-foreground)", tracejado: true }] : [])]} />
      {melhor && pior && melhor !== pior && (
        <p className="mb-2 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">{melhor.nome}</span> converte {decimal(melhor.valor / Math.max(pior.valor, 0.0001))}× mais que {pior.nome}.
        </p>
      )}
      <div style={{ height: Math.max(140, dados.length * 30 + 24) }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={dados} layout="vertical" margin={{ top: 0, right: 16, bottom: 0, left: 0 }}>
            <CartesianGrid horizontal={false} stroke="var(--border)" strokeOpacity={0.7} />
            <XAxis type="number" tick={EIXO} tickLine={false} axisLine={false} tickFormatter={(v: number) => formatarPercentual(v)} />
            <YAxis type="category" dataKey="nome" width={estreita ? 110 : 160} tick={{ ...EIXO, fill: "var(--foreground)" }} tickLine={false} axisLine={false} interval={0} />
            <Tooltip content={(p) => <DicaTaxa active={p.active} payload={p.payload} metrica={metrica} />} cursor={{ fill: "var(--muted)", fillOpacity: 0.5 }} />
            {media !== null && <ReferenceLine x={media} stroke="var(--muted-foreground)" strokeDasharray="4 4" />}
            <Bar dataKey="valor" fill="var(--serie-lirio)" radius={[0, 3, 3, 0]} maxBarSize={18} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </CartaoGrafico>
  );
}

// ─── Categorias em alta ───────────────────────────────────────────────────────

export interface CategoriaCrescimento {
  chave: string;
  nome: string;
  atual: number;
  anterior: number;
  variacao: number | null;
  baseInsuficiente: boolean;
}

function DicaCrescimento({ active, payload }: PropsDica) {
  const c = payload?.[0]?.payload as CategoriaCrescimento | undefined;
  if (!active || !c) return null;
  return (
    <CaixaDica
      titulo={c.nome}
      linhas={[
        { rotulo: "Variação", valor: c.variacao === null ? "—" : formatarVariacao(c.variacao) },
        { rotulo: "Buscas no período", valor: formatarInteiro(c.atual) },
        { rotulo: "Período anterior", valor: formatarInteiro(c.anterior) },
      ]}
    />
  );
}

export function CategoriasEmAlta({ categorias, descricaoIntervalo, descricaoAnterior, baseMinima }: { categorias: CategoriaCrescimento[]; descricaoIntervalo: string; descricaoAnterior: string; baseMinima: number }) {
  const estreita = useTelaEstreita();
  const validas = categorias.filter((c) => !c.baseInsuficiente && c.variacao !== null);
  const dados = validas.map((c) => ({ ...c, valor: c.variacao ?? 0 }));
  const emAlta = validas.filter((c) => (c.variacao ?? 0) > 0);
  const lider = emAlta[0];

  const colunas: ColunaTabela[] = [
    { chave: "nome", rotulo: "Categoria", formato: "texto" },
    { chave: "atual", rotulo: "Buscas no período", formato: "inteiro" },
    { chave: "anterior", rotulo: "Buscas no período anterior", formato: "inteiro" },
    { chave: "variacao", rotulo: "Variação", formato: "percentual" },
  ];
  const linhas: LinhaTabela[] = categorias.map((c) => ({ nome: c.nome, atual: c.atual, anterior: c.anterior, variacao: c.baseInsuficiente ? null : c.variacao }));

  return (
    <CartaoGrafico
      titulo="Categorias em alta"
      descricao={`Crescimento das buscas por categoria em ${descricaoIntervalo} contra ${descricaoAnterior}. Categorias com menos de ${baseMinima} buscas no período anterior ficam fora.`}
      recurso="lirio-categorias-em-alta"
      colunas={colunas}
      linhas={linhas}
    >
      <Legenda
        itens={[
          { rotulo: "Crescimento", cor: "var(--serie-lirio)" },
          { rotulo: "Queda", cor: "var(--muted-foreground)" },
        ]}
      />
      <p className="mb-2 text-xs text-muted-foreground">
        {lider ? (
          <>
            <span className="font-medium text-foreground">{lider.nome}</span> lidera com {formatarVariacao(lider.variacao ?? 0)} ({formatarInteiro(lider.anterior)} → {formatarInteiro(lider.atual)} buscas); {emAlta.length} de {validas.length} categorias cresceram.
          </>
        ) : (
          "Nenhuma categoria cresceu contra o período anterior."
        )}
      </p>
      <div style={{ height: Math.max(140, dados.length * 30 + 24) }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={dados} layout="vertical" margin={{ top: 0, right: 16, bottom: 0, left: 0 }}>
            <CartesianGrid horizontal={false} stroke="var(--border)" strokeOpacity={0.7} />
            <XAxis type="number" tick={EIXO} tickLine={false} axisLine={false} tickFormatter={(v: number) => formatarVariacao(v)} />
            <YAxis type="category" dataKey="nome" width={estreita ? 110 : 160} tick={{ ...EIXO, fill: "var(--foreground)" }} tickLine={false} axisLine={false} interval={0} />
            <Tooltip content={(p) => <DicaCrescimento active={p.active} payload={p.payload} />} cursor={{ fill: "var(--muted)", fillOpacity: 0.5 }} />
            <ReferenceLine x={0} stroke="var(--border)" />
            <Bar dataKey="valor" radius={3} maxBarSize={18} isAnimationActive={false}>
              {dados.map((d) => (
                <Cell key={d.chave} fill={d.valor >= 0 ? "var(--serie-lirio)" : "var(--muted-foreground)"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </CartaoGrafico>
  );
}

// ─── Evolução da oferta ───────────────────────────────────────────────────────

export interface PontoOferta {
  data: string;
  categoria: string;
  ativas: number;
  verificadas: number;
}

function DicaOferta({ active, payload }: PropsDica) {
  const p = payload?.[0]?.payload as { data: string; ativas: number; verificadas: number } | undefined;
  if (!active || !p) return null;
  return (
    <CaixaDica
      titulo={rotuloData(p.data)}
      linhas={[
        { rotulo: "Profissionais ativas", valor: formatarInteiro(p.ativas), cor: "var(--serie-lirio)" },
        { rotulo: "Verificadas", valor: `${formatarInteiro(p.verificadas)} (${formatarPercentual(p.ativas ? p.verificadas / p.ativas : 0)})`, cor: "var(--muted-foreground)" },
      ]}
    />
  );
}

export function EvolucaoOferta({ fotos, categorias, descricaoIntervalo }: { fotos: PontoOferta[]; categorias: readonly { slug: string; nome: string }[]; descricaoIntervalo: string }) {
  const [categoria, setCategoria] = useState("todas");
  const serie = useMemo(() => {
    const m = new Map<string, { data: string; ativas: number; verificadas: number }>();
    for (const f of fotos) {
      if (categoria !== "todas" && f.categoria !== categoria) continue;
      const p = m.get(f.data) ?? { data: f.data, ativas: 0, verificadas: 0 };
      p.ativas += f.ativas;
      p.verificadas += f.verificadas;
      m.set(f.data, p);
    }
    return [...m.values()].sort((a, b) => a.data.localeCompare(b.data));
  }, [fotos, categoria]);
  const primeira = serie[0];
  const ultima = serie.at(-1);
  const nome = categoria === "todas" ? "todas as categorias" : (categorias.find((c) => c.slug === categoria)?.nome ?? categoria);
  // Uma profissional com duas categorias conta nas duas: o total por categoria soma "vagas", não pessoas.
  const nota = (categoria === "todas" ? " A soma conta cada categoria atendida (quem atende duas conta duas vezes)." : "") + " O eixo não começa em zero, para mostrar a variação.";

  const colunas: ColunaTabela[] = [
    { chave: "data", rotulo: "Data da foto", formato: "texto" },
    { chave: "ativas", rotulo: "Profissionais ativas", formato: "inteiro" },
    { chave: "verificadas", rotulo: "Verificadas", formato: "inteiro" },
  ];

  return (
    <CartaoGrafico
      titulo="Evolução das profissionais ativas"
      descricao={`Oferta aprovada na Lírio em ${nome}, foto semanal e a mais recente, em ${descricaoIntervalo}.${nota}`}
      recurso="lirio-evolucao-oferta"
      colunas={colunas}
      linhas={serie}
      className="lg:col-span-3"
      acoes={<Seletor rotulo="Categoria da oferta" valor={categoria} opcoes={[{ valor: "todas", rotulo: "Todas as categorias" }, ...categorias.map((c) => ({ valor: c.slug, rotulo: c.nome }))]} aoMudar={setCategoria} />}
    >
      <Legenda
        itens={[
          { rotulo: "Ativas", cor: "var(--serie-lirio)" },
          { rotulo: "Verificadas", cor: "var(--muted-foreground)" },
        ]}
      />
      {primeira && ultima && primeira !== ultima && (
        <p className="mb-2 text-xs text-muted-foreground">
          De {formatarInteiro(primeira.ativas)} para <span className="font-medium text-foreground">{formatarInteiro(ultima.ativas)}</span> ({formatarVariacao(primeira.ativas ? (ultima.ativas - primeira.ativas) / primeira.ativas : 0)}) entre {rotuloData(primeira.data)} e {rotuloData(ultima.data)}.
        </p>
      )}
      <div className="h-60">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={serie} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
            {GRADE}
            <XAxis dataKey="data" tickFormatter={rotuloData} tick={EIXO} tickLine={false} axisLine={{ stroke: "var(--border)" }} minTickGap={24} />
            <YAxis width={40} tick={EIXO} tickLine={false} axisLine={false} allowDecimals={false} domain={[(min: number) => Math.max(0, Math.floor((min * 0.9) / 10) * 10), (max: number) => Math.ceil((max * 1.05) / 10) * 10]} />
            <Tooltip content={(p) => <DicaOferta active={p.active} payload={p.payload} />} cursor={{ stroke: "var(--muted-foreground)", strokeOpacity: 0.4 }} />
            <Line type="monotone" dataKey="ativas" stroke="var(--serie-lirio)" strokeWidth={2} dot={serie.length < 20 ? { r: 2.5 } : false} isAnimationActive={false} />
            <Line type="monotone" dataKey="verificadas" stroke="var(--muted-foreground)" strokeWidth={1.5} strokeDasharray="4 3" dot={false} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </CartaoGrafico>
  );
}

// ─── Ranking de distritos ─────────────────────────────────────────────────────

export interface LinhaRanking {
  posicao: number;
  slug: string;
  nome: string;
  regiao: string;
  buscas: number;
  visualizacoes: number;
  cliques: number;
  taxaContato: number;
  taxaVisualizacao: number | null;
  conversaoTotal: number | null;
}

const NO_GRAFICO = 12;

function DicaRanking({ active, payload }: PropsDica) {
  const d = payload?.[0]?.payload as LinhaRanking | undefined;
  if (!active || !d) return null;
  return (
    <CaixaDica
      titulo={`${d.posicao}º ${d.nome} · ${d.regiao}`}
      linhas={[
        { rotulo: "Taxa de contato", valor: formatarPercentual(d.taxaContato), cor: "var(--serie-lirio)" },
        { rotulo: "Cliques / visualizações", valor: `${formatarInteiro(d.cliques)} / ${formatarInteiro(d.visualizacoes)}` },
        { rotulo: "Buscas", valor: formatarInteiro(d.buscas) },
      ]}
    />
  );
}

export function RankingDistritos({ ranking, foraDoRanking, minimo, mediaCidade, descricaoIntervalo }: { ranking: LinhaRanking[]; foraDoRanking: number; minimo: number; mediaCidade: number | null; descricaoIntervalo: string }) {
  const [lado, setLado] = useState<"melhores" | "piores">("melhores");
  const estreita = useTelaEstreita();
  const dados = lado === "melhores" ? ranking.slice(0, NO_GRAFICO) : ranking.slice(-NO_GRAFICO).reverse();
  const primeiro = ranking[0];
  const ultimo = ranking.at(-1);

  const colunas: ColunaTabela[] = [
    { chave: "posicao", rotulo: "Posição", formato: "inteiro" },
    { chave: "nome", rotulo: "Distrito", formato: "texto" },
    { chave: "regiao", rotulo: "Região", formato: "texto" },
    { chave: "buscas", rotulo: "Buscas", formato: "inteiro" },
    { chave: "visualizacoes", rotulo: "Visualizações", formato: "inteiro" },
    { chave: "cliques", rotulo: "Cliques no WhatsApp", formato: "inteiro" },
    { chave: "taxaContato", rotulo: "Taxa de contato", formato: "percentual" },
    { chave: "conversaoTotal", rotulo: "Cliques por busca", formato: "percentual" },
  ];
  const linhas: LinhaTabela[] = ranking.map((r) => ({ posicao: r.posicao, nome: r.nome, regiao: r.regiao, buscas: r.buscas, visualizacoes: r.visualizacoes, cliques: r.cliques, taxaContato: r.taxaContato, conversaoTotal: r.conversaoTotal }));

  return (
    <CartaoGrafico
      titulo="Ranking de distritos por conversão"
      descricao={`Taxa de contato (cliques no WhatsApp ÷ visualizações) em ${descricaoIntervalo}. Entram ${ranking.length} distritos com ${minimo}+ visualizações${foraDoRanking ? `; ${foraDoRanking} ficaram fora por volume baixo` : ""}. A tabela traz o ranking completo.`}
      recurso="lirio-ranking-distritos"
      colunas={colunas}
      linhas={linhas}
      className="lg:col-span-2"
      acoes={
        <Segmentado
          rotulo="Lado do ranking"
          opcoes={[
            { valor: "melhores", rotulo: `${NO_GRAFICO} melhores` },
            { valor: "piores", rotulo: `${NO_GRAFICO} piores` },
          ]}
          valor={lado}
          aoMudar={setLado}
        />
      }
    >
      <Legenda itens={[{ rotulo: "Taxa de contato", cor: "var(--serie-lirio)" }, ...(mediaCidade !== null ? [{ rotulo: `Média da cidade: ${formatarPercentual(mediaCidade)}`, cor: "var(--muted-foreground)", tracejado: true }] : [])]} />
      {primeiro && ultimo && (
        <p className="mb-2 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">{primeiro.nome}</span> lidera com {formatarPercentual(primeiro.taxaContato)}; {ultimo.nome} fecha o ranking com {formatarPercentual(ultimo.taxaContato)}.
        </p>
      )}
      <div style={{ height: Math.max(160, dados.length * 28 + 24) }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={dados} layout="vertical" margin={{ top: 0, right: 16, bottom: 0, left: 0 }}>
            <CartesianGrid horizontal={false} stroke="var(--border)" strokeOpacity={0.7} />
            <XAxis type="number" tick={EIXO} tickLine={false} axisLine={false} tickFormatter={(v: number) => formatarPercentual(v)} />
            <YAxis type="category" dataKey="nome" width={estreita ? 120 : 170} tick={{ ...EIXO, fill: "var(--foreground)" }} tickLine={false} axisLine={false} interval={0} tickFormatter={(n: string) => {
              const d = dados.find((x) => x.nome === n);
              return d ? `${d.posicao}º ${n}` : n;
            }} />
            <Tooltip content={(p) => <DicaRanking active={p.active} payload={p.payload} />} cursor={{ fill: "var(--muted)", fillOpacity: 0.5 }} />
            {mediaCidade !== null && <ReferenceLine x={mediaCidade} stroke="var(--muted-foreground)" strokeDasharray="4 4" />}
            <Bar dataKey="taxaContato" fill="var(--serie-lirio)" radius={[0, 3, 3, 0]} maxBarSize={16} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </CartaoGrafico>
  );
}
