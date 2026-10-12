/**
 * Mapa de mercado da Lírio: agregação por distrito, classes de cor e comparação com a região.
 * Módulo puro (vai ao navegador e é testado). As definições das taxas vêm de metrics.ts.
 */
import { classificarDemanda, indiceDemandaRelativo, LIMITE_DEMANDA_REPRIMIDA, LIMITE_EXCESSO_OFERTA, razao, taxaContato } from "./metrics";

/** Uma linha por distrito × categoria (categoria null = buscas sem categoria escolhida). */
export interface CelulaMercado {
  distrito: string;
  categoria: string | null;
  buscas: number;
  visualizacoes: number;
  cliques: number;
  ativas: number;
}

export type MetricaMapa = "indice" | "buscas" | "oferta" | "conversao";
export const TODAS = "todas";

/** Com menos visualizações que isso, a taxa de contato do distrito não é exibida. */
export const MIN_VISUALIZACOES_CONVERSAO = 10;
/** Abaixo disso, o índice vale como indicação, não como conclusão (aviso no painel e na tabela). */
export const BASE_PEQUENA_BUSCAS = 10;

export interface ResumoDistrito {
  slug: string;
  buscas: number;
  visualizacoes: number;
  cliques: number;
  ativas: number;
  /** Índice relativo à cidade (1 = média); Infinity = há busca e nenhuma profissional. */
  indice: number | null;
  conversao: number | null;
}

interface Totais {
  buscas: number;
  visualizacoes: number;
  cliques: number;
  ativas: number;
}

const vazio = (): Totais => ({ buscas: 0, visualizacoes: 0, cliques: 0, ativas: 0 });

function somar(t: Totais, c: CelulaMercado) {
  t.buscas += c.buscas;
  t.visualizacoes += c.visualizacoes;
  t.cliques += c.cliques;
  t.ativas += c.ativas;
}

const naCategoria = (c: CelulaMercado, categoria: string) => categoria === TODAS || c.categoria === categoria;

/** Totais da cidade no recorte de categoria (a referência do índice). */
export function totaisCidade(celulas: readonly CelulaMercado[], categoria: string): Totais {
  const t = vazio();
  for (const c of celulas) if (naCategoria(c, categoria)) somar(t, c);
  return t;
}

export function resumirDistritos(celulas: readonly CelulaMercado[], categoria: string, slugs: readonly string[]): Map<string, ResumoDistrito> {
  const porDistrito = new Map<string, Totais>(slugs.map((s) => [s, vazio()]));
  for (const c of celulas) {
    if (!naCategoria(c, categoria)) continue;
    const t = porDistrito.get(c.distrito);
    if (t) somar(t, c);
  }
  const ref = totaisCidade(celulas, categoria);
  return new Map(
    [...porDistrito].map(([slug, t]) => [
      slug,
      {
        slug,
        ...t,
        indice: indiceDemandaRelativo(t.buscas, t.ativas, ref.buscas, ref.ativas),
        conversao: t.visualizacoes >= MIN_VISUALIZACOES_CONVERSAO ? taxaContato(t.cliques, t.visualizacoes) : null,
      },
    ]),
  );
}

export function valorMetrica(r: ResumoDistrito | undefined, metrica: MetricaMapa): number | null {
  if (!r) return null;
  switch (metrica) {
    case "buscas":
      return r.buscas;
    case "oferta":
      return r.ativas;
    case "conversao":
      return r.conversao;
    default:
      return r.indice;
  }
}

// ─── Classes de cor ───────────────────────────────────────────────────────────

export type ClasseIndice = "sem-dados" | "excesso" | "sobra" | "equilibrio" | "atencao" | "reprimida" | "sem-oferta";

/** Faixa intermediária só para leitura do mapa; os limites de negócio continuam 0,5 e 1,5. */
const SOBRA_ATE = 0.8;
const EQUILIBRIO_ATE = 1.25;

export function classeIndice(indice: number | null): ClasseIndice {
  const situacao = classificarDemanda(indice);
  if (situacao === "sem-dados") return "sem-dados";
  if (situacao === "sem-oferta") return "sem-oferta";
  if (situacao === "reprimida") return "reprimida";
  if (situacao === "excesso-oferta") return "excesso";
  const i = indice ?? 1;
  if (i < SOBRA_ATE) return "sobra";
  if (i <= EQUILIBRIO_ATE) return "equilibrio";
  return "atencao";
}

export const FAIXAS_INDICE: readonly { classe: Exclude<ClasseIndice, "sem-dados">; rotulo: string; descricao: string }[] = [
  { classe: "excesso", rotulo: `abaixo de ${LIMITE_EXCESSO_OFERTA.toLocaleString("pt-BR")}`, descricao: "Excesso de oferta" },
  { classe: "sobra", rotulo: `${LIMITE_EXCESSO_OFERTA.toLocaleString("pt-BR")} a ${SOBRA_ATE.toLocaleString("pt-BR")}`, descricao: "Oferta folgada" },
  { classe: "equilibrio", rotulo: `${SOBRA_ATE.toLocaleString("pt-BR")} a ${EQUILIBRIO_ATE.toLocaleString("pt-BR")}`, descricao: "Equilíbrio" },
  { classe: "atencao", rotulo: `${EQUILIBRIO_ATE.toLocaleString("pt-BR")} a ${LIMITE_DEMANDA_REPRIMIDA.toLocaleString("pt-BR")}`, descricao: "Pressão acima da média" },
  { classe: "reprimida", rotulo: `acima de ${LIMITE_DEMANDA_REPRIMIDA.toLocaleString("pt-BR")}`, descricao: "Demanda reprimida" },
  { classe: "sem-oferta", rotulo: "busca sem oferta", descricao: "Nenhuma profissional ativa" },
];

/**
 * Quebras por quantis (5 classes) sobre os valores positivos. Quantis mantêm o mapa legível com
 * distribuições assimétricas (o Centro e a zona Oeste concentram buscas).
 */
export function quebrasQuantis(valores: readonly (number | null)[], classes = 5): number[] {
  const positivos = valores.filter((v): v is number => v !== null && Number.isFinite(v) && v > 0).sort((a, b) => a - b);
  if (positivos.length === 0) return [];
  const quebras: number[] = [];
  for (let k = 1; k < classes; k++) {
    const q = positivos[Math.min(positivos.length - 1, Math.floor((k * positivos.length) / classes))] ?? 0;
    if (!quebras.length || q > (quebras.at(-1) ?? 0)) quebras.push(q);
  }
  return quebras;
}

/** Classe 0..n (n = número de quebras); -1 para sem dado. Zero cai na primeira classe. */
export function classeSequencial(valor: number | null, quebras: readonly number[]): number {
  if (valor === null || !Number.isFinite(valor)) return -1;
  let classe = 0;
  for (const q of quebras) if (valor >= q) classe++;
  return classe;
}

// ─── Região e categorias ──────────────────────────────────────────────────────

export interface ComparacaoRegiao {
  distritos: number;
  /** Médias por distrito da região. */
  buscas: number;
  ativas: number;
  /** Taxas da região como um todo (somas), não média de taxas. */
  conversao: number | null;
  indice: number | null;
}

export function mediaDaRegiao(resumos: ReadonlyMap<string, ResumoDistrito>, distritosDaRegiao: readonly string[], referencia: Totais): ComparacaoRegiao {
  const t = vazio();
  let n = 0;
  for (const slug of distritosDaRegiao) {
    const r = resumos.get(slug);
    if (!r) continue;
    n++;
    t.buscas += r.buscas;
    t.visualizacoes += r.visualizacoes;
    t.cliques += r.cliques;
    t.ativas += r.ativas;
  }
  return {
    distritos: n,
    buscas: n ? t.buscas / n : 0,
    ativas: n ? t.ativas / n : 0,
    conversao: taxaContato(t.cliques, t.visualizacoes),
    indice: indiceDemandaRelativo(t.buscas, t.ativas, referencia.buscas, referencia.ativas),
  };
}

export interface CategoriaDistrito {
  categoria: string;
  buscas: number;
  ativas: number;
  /** Fração das buscas do distrito (com categoria). */
  participacao: number | null;
  indice: number | null;
}

/** Categorias mais buscadas no distrito, com o índice de cada uma contra a cidade na mesma categoria. */
export function categoriasDoDistrito(celulas: readonly CelulaMercado[], slug: string): CategoriaDistrito[] {
  const doDistrito = celulas.filter((c) => c.distrito === slug && c.categoria !== null);
  const total = doDistrito.reduce((t, c) => t + c.buscas, 0);
  return doDistrito
    .map((c) => {
      const ref = totaisCidade(celulas, c.categoria as string);
      return { categoria: c.categoria as string, buscas: c.buscas, ativas: c.ativas, participacao: razao(c.buscas, total), indice: indiceDemandaRelativo(c.buscas, c.ativas, ref.buscas, ref.ativas) };
    })
    .sort((a, b) => b.buscas - a.buscas || a.categoria.localeCompare(b.categoria));
}
