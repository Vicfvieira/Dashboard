/**
 * Análises da Lírio sobre números já agregados (módulo puro, testado). As definições das taxas
 * vêm de src/lib/metrics.ts; aqui ficam funil, crescimento, ranking e picos.
 */
import { razao, taxaContato, taxaVisualizacao, variacao } from "./metrics";

export interface TotaisFunil {
  buscas: number;
  visualizacoes: number;
  cliques: number;
}

export interface EtapaFunil {
  etapa: "buscas" | "visualizacoes" | "cliques";
  rotulo: string;
  valor: number;
  /** Etapa ÷ etapa anterior (taxa de visualização ou de contato). */
  taxaDaAnterior: number | null;
  /** Perda em relação à etapa anterior (só quando há queda). */
  queda: number | null;
  /** Etapa ÷ buscas. */
  taxaDoInicio: number | null;
}

export function etapasFunil(t: TotaisFunil): EtapaFunil[] {
  const tv = taxaVisualizacao(t.visualizacoes, t.buscas);
  const tc = taxaContato(t.cliques, t.visualizacoes);
  const queda = (taxa: number | null) => (taxa !== null && taxa < 1 ? 1 - taxa : null);
  return [
    { etapa: "buscas", rotulo: "Buscas", valor: t.buscas, taxaDaAnterior: null, queda: null, taxaDoInicio: t.buscas > 0 ? 1 : null },
    { etapa: "visualizacoes", rotulo: "Visualizações de perfil", valor: t.visualizacoes, taxaDaAnterior: tv, queda: queda(tv), taxaDoInicio: razao(t.visualizacoes, t.buscas) },
    { etapa: "cliques", rotulo: "Cliques no WhatsApp", valor: t.cliques, taxaDaAnterior: tc, queda: queda(tc), taxaDoInicio: razao(t.cliques, t.buscas) },
  ];
}

export interface Crescimento {
  chave: string;
  atual: number;
  anterior: number;
  variacao: number | null;
  /** Base anterior pequena demais para a variação significar algo. */
  baseInsuficiente: boolean;
}

/** Crescimento contra o período anterior, do maior para o menor; bases pequenas vão para o fim. */
export function crescimentoPorChave(atual: ReadonlyMap<string, number>, anterior: ReadonlyMap<string, number>, baseMinima: number): Crescimento[] {
  const chaves = new Set([...atual.keys(), ...anterior.keys()]);
  return [...chaves]
    .map((chave) => {
      const a = atual.get(chave) ?? 0;
      const b = anterior.get(chave) ?? 0;
      return { chave, atual: a, anterior: b, variacao: variacao(a, b), baseInsuficiente: b < baseMinima };
    })
    .sort((x, y) => Number(x.baseInsuficiente) - Number(y.baseInsuficiente) || (y.variacao ?? -Infinity) - (x.variacao ?? -Infinity) || y.atual - x.atual);
}

export interface DistritoConversao extends TotaisFunil {
  slug: string;
}

export interface PosicaoRanking extends DistritoConversao {
  posicao: number;
  taxaContato: number;
  taxaVisualizacao: number | null;
  /** Cliques ÷ buscas: conversão da ponta à ponta. */
  conversaoTotal: number | null;
}

/**
 * Ranking por taxa de contato (cliques no WhatsApp ÷ visualizações). Só entram distritos com
 * visualizações suficientes: 2 cliques em 3 visualizações não é "o melhor distrito da cidade".
 * Empate: mais cliques primeiro.
 */
export function rankingConversao(distritos: readonly DistritoConversao[], minimoVisualizacoes: number): { ranking: PosicaoRanking[]; foraDoRanking: number } {
  const elegiveis = distritos.filter((d) => d.visualizacoes >= minimoVisualizacoes);
  const ranking = elegiveis
    .map((d) => ({ ...d, taxaContato: taxaContato(d.cliques, d.visualizacoes) ?? 0, taxaVisualizacao: taxaVisualizacao(d.visualizacoes, d.buscas), conversaoTotal: razao(d.cliques, d.buscas) }))
    .sort((a, b) => b.taxaContato - a.taxaContato || b.cliques - a.cliques || a.slug.localeCompare(b.slug))
    .map((d, i) => ({ ...d, posicao: i + 1 }));
  return { ranking, foraDoRanking: distritos.length - elegiveis.length };
}

export interface CelulaHora {
  /** 1 = segunda … 7 = domingo (ISO). */
  diaSemana: number;
  hora: number;
  valor: number;
}

export interface Picos {
  diaMaisForte: { diaSemana: number; valor: number } | null;
  horaMaisForte: { hora: number; valor: number } | null;
  /** Janela de 3 horas seguidas com mais buscas (na semana toda). */
  janela: { inicio: number; fim: number; valor: number; fracao: number } | null;
  celulaMaisForte: CelulaHora | null;
}

export function picosDeBusca(celulas: readonly CelulaHora[]): Picos {
  const total = celulas.reduce((t, c) => t + c.valor, 0);
  if (total === 0) return { diaMaisForte: null, horaMaisForte: null, janela: null, celulaMaisForte: null };
  const porDia = new Map<number, number>();
  const porHora = new Map<number, number>();
  for (const c of celulas) {
    porDia.set(c.diaSemana, (porDia.get(c.diaSemana) ?? 0) + c.valor);
    porHora.set(c.hora, (porHora.get(c.hora) ?? 0) + c.valor);
  }
  const maior = <K>(m: Map<K, number>) => [...m.entries()].reduce((a, b) => (b[1] > a[1] ? b : a));
  const [dia, vDia] = maior(porDia);
  const [hora, vHora] = maior(porHora);
  let janela: Picos["janela"] = null;
  for (let h = 0; h <= 21; h++) {
    const v = (porHora.get(h) ?? 0) + (porHora.get(h + 1) ?? 0) + (porHora.get(h + 2) ?? 0);
    if (!janela || v > janela.valor) janela = { inicio: h, fim: h + 3, valor: v, fracao: v / total };
  }
  const celulaMaisForte = celulas.reduce<CelulaHora | null>((a, c) => (!a || c.valor > a.valor ? c : a), null);
  return { diaMaisForte: { diaSemana: dia, valor: vDia }, horaMaisForte: { hora, valor: vHora }, janela, celulaMaisForte };
}
