/**
 * Insights automáticos por regras explicáveis (sem IA). Cada regra recebe números já agregados,
 * decide se há algo relevante, escreve a frase com os números e aponta o gráfico de origem.
 * Módulo puro e testado: nada de banco aqui.
 */
import { nomeCategoria } from "@/data/categorias";
import { DISTRITOS } from "@/data/sp-geo";
import { formatarInteiro, formatarMoeda, formatarPercentual, formatarPontos, formatarVariacao } from "./formato";
import { picosDeBusca, type CelulaHora, type TotaisFunil } from "./lirio-analise";
import { totaisCidade, type CelulaMercado } from "./mercado";
import { indiceDemandaRelativo, LIMITE_DEMANDA_REPRIMIDA, LIMITE_EXCESSO_OFERTA, taxaCancelamento, taxaContato, variacao, variacaoPontos } from "./metrics";
import { DIA_SEMANA } from "./rotulos-pelagem";

export type Prioridade = "alta" | "media" | "baixa";
export type TipoInsight = "oportunidade" | "risco" | "tendencia";

export interface Insight {
  /** Estável entre execuções (regra + chave), para listas e testes. */
  id: string;
  regra: string;
  marca: "pelagem" | "lirio";
  tipo: TipoInsight;
  prioridade: Prioridade;
  /** Força do sinal dentro da prioridade (ordena a lista). */
  peso: number;
  frase: string;
  detalhe: string;
  /** Página e âncora do gráfico de origem (o id do cartão é o recurso do gráfico). */
  href: string;
  rotuloLink: string;
}

/** Limites das regras: a página de Insights mostra esta mesma tabela (transparência). */
export const LIMITES = {
  demandaMinBuscas: 15,
  semOfertaMinBuscas: 10,
  excessoMinAtivas: 3,
  categoriaMinBase: 30,
  categoriaAlta: 0.2,
  categoriaQueda: -0.15,
  contatoMinVisualizacoes: 50,
  contatoAbaixoDaMedia: 0.75,
  pontosFunil: 2,
  picoFracao: 0.3,
  cancelMinBase: 5,
  cancelAlta: 0.15,
  faturamentoVariacao: 0.1,
  retornoPontos: 5,
  servicoMinBase: 5,
  servicoVariacao: 0.3,
  inativosMin: 5,
} as const;

const NOME_DISTRITO = new Map(DISTRITOS.map((d) => [d.slug, d.nome]));
const nomeDistrito = (slug: string) => NOME_DISTRITO.get(slug) ?? slug;
const vezes = (x: number) => `${x.toLocaleString("pt-BR", { maximumFractionDigits: 1, minimumFractionDigits: 1 })}×`;

export interface ContextoLirio {
  celulas: CelulaMercado[];
  categorias: ReadonlyMap<string, TotaisFunil>;
  categoriasAnterior: ReadonlyMap<string, TotaisFunil>;
  totais: TotaisFunil;
  totaisAnterior: TotaisFunil;
  horas: CelulaHora[];
}

export interface ContextoPelagem {
  financeiro: boolean;
  atual: { faturamento: number; concluidos: number; taxaRetorno: number | null };
  anterior: { faturamento: number; concluidos: number; taxaRetorno: number | null };
  cancelamentoPorDia: { diaSemana: number; agendamentos: number; cancelados: number; agendamentosAnterior: number; canceladosAnterior: number }[];
  servicos: { servico: string; porte: string; atendimentos: number; atendimentosAnterior: number }[];
  inativos: { quantidade: number; receitaPorVisita: number | null };
}

export interface ContextoInsights {
  /** Query string dos filtros globais ("?periodo=90d" ou ""), mantida nos links. */
  query: string;
  periodo: string;
  anterior: string;
  lirio?: ContextoLirio;
  pelagem?: ContextoPelagem;
}

const link = (ctx: ContextoInsights, caminho: string, ancora: string, extra?: Record<string, string>) => {
  const q = new URLSearchParams(ctx.query.replace(/^\?/, ""));
  for (const [k, v] of Object.entries(extra ?? {})) q.set(k, v);
  const s = q.toString();
  return `${caminho}${s ? `?${s}` : ""}${ancora ? `#${ancora}` : ""}`;
};

// ─── Lírio ────────────────────────────────────────────────────────────────────

/** Distrito × categoria com mais buscas por profissional do que a média da cidade (> 1,5×). */
export function regraDemandaReprimida(ctx: ContextoInsights): Insight[] {
  const l = ctx.lirio;
  if (!l) return [];
  const achados: Insight[] = [];
  const categorias = [...new Set(l.celulas.map((c) => c.categoria).filter((c): c is string => c !== null))];
  for (const cat of categorias) {
    const ref = totaisCidade(l.celulas, cat);
    for (const c of l.celulas) {
      if (c.categoria !== cat || c.ativas === 0 || c.buscas < LIMITES.demandaMinBuscas) continue;
      const indice = indiceDemandaRelativo(c.buscas, c.ativas, ref.buscas, ref.ativas);
      if (indice === null || indice <= LIMITE_DEMANDA_REPRIMIDA) continue;
      achados.push({
        id: `demanda-reprimida:${c.distrito}:${cat}`,
        regra: "demanda-reprimida",
        marca: "lirio",
        tipo: "oportunidade",
        prioridade: indice >= 2.5 ? "alta" : "media",
        peso: indice * Math.log10(c.buscas),
        frase: `${nomeDistrito(c.distrito)} teve ${vezes(indice)} mais buscas por ${nomeCategoria(cat)} por profissional do que a média da cidade`,
        detalhe: `${formatarInteiro(c.buscas)} buscas em ${ctx.periodo} para ${formatarInteiro(c.ativas)} ${c.ativas === 1 ? "profissional ativa" : "profissionais ativas"}. Acima de ${vezes(LIMITE_DEMANDA_REPRIMIDA)} é demanda reprimida: espaço para captar profissionais na região.`,
        href: link(ctx, "/mercado", "", { cat, distrito: c.distrito }),
        rotuloLink: "Ver no mapa de mercado",
      });
    }
  }
  return achados.sort((a, b) => b.peso - a.peso).slice(0, 5);
}

/** Buscas por uma categoria num distrito sem nenhuma profissional ativa. */
export function regraSemOferta(ctx: ContextoInsights): Insight[] {
  const l = ctx.lirio;
  if (!l) return [];
  return l.celulas
    .filter((c) => c.categoria !== null && c.ativas === 0 && c.buscas >= LIMITES.semOfertaMinBuscas)
    .sort((a, b) => b.buscas - a.buscas)
    .slice(0, 3)
    .map((c) => ({
      id: `sem-oferta:${c.distrito}:${c.categoria}`,
      regra: "sem-oferta",
      marca: "lirio" as const,
      tipo: "oportunidade" as const,
      prioridade: c.buscas >= 30 ? ("alta" as const) : ("media" as const),
      peso: c.buscas,
      frase: `Ninguém atende ${nomeCategoria(c.categoria ?? "")} em ${nomeDistrito(c.distrito)}: ${formatarInteiro(c.buscas)} buscas e nenhuma profissional ativa`,
      detalhe: `Procura sem oferta em ${ctx.periodo}. Quem busca ali só encontra profissionais de distritos vizinhos.`,
      href: link(ctx, "/mercado", "", { cat: c.categoria ?? "", distrito: c.distrito }),
      rotuloLink: "Ver no mapa de mercado",
    }));
}

/** Oferta muito acima da procura (índice < 0,5) com várias profissionais. */
export function regraExcessoOferta(ctx: ContextoInsights): Insight[] {
  const l = ctx.lirio;
  if (!l) return [];
  const achados: Insight[] = [];
  for (const c of l.celulas) {
    if (c.categoria === null || c.ativas < LIMITES.excessoMinAtivas) continue;
    const ref = totaisCidade(l.celulas, c.categoria);
    const indice = indiceDemandaRelativo(c.buscas, c.ativas, ref.buscas, ref.ativas);
    if (indice === null || indice >= LIMITE_EXCESSO_OFERTA) continue;
    achados.push({
      id: `excesso-oferta:${c.distrito}:${c.categoria}`,
      regra: "excesso-oferta",
      marca: "lirio",
      tipo: "risco",
      prioridade: "baixa",
      peso: c.ativas * (LIMITE_EXCESSO_OFERTA - indice),
      frase: `${nomeDistrito(c.distrito)} tem ${formatarInteiro(c.ativas)} profissionais de ${nomeCategoria(c.categoria)} para pouca procura (${vezes(indice)} a média)`,
      detalhe: `Só ${formatarInteiro(c.buscas)} buscas em ${ctx.periodo}. Profissionais dali tendem a receber menos contatos; vale divulgar o distrito ou sugerir vizinhos com demanda.`,
      href: link(ctx, "/mercado", "", { cat: c.categoria, distrito: c.distrito }),
      rotuloLink: "Ver no mapa de mercado",
    });
  }
  return achados.sort((a, b) => b.peso - a.peso).slice(0, 2);
}

/** Categorias que mais cresceram ou caíram em buscas contra o período anterior. */
export function regraCategorias(ctx: ContextoInsights): Insight[] {
  const l = ctx.lirio;
  if (!l) return [];
  const achados: Insight[] = [];
  for (const [cat, t] of l.categorias) {
    const antes = l.categoriasAnterior.get(cat)?.buscas ?? 0;
    if (antes < LIMITES.categoriaMinBase) continue;
    const v = variacao(t.buscas, antes);
    if (v === null) continue;
    const alta = v >= LIMITES.categoriaAlta;
    if (!alta && v > LIMITES.categoriaQueda) continue;
    achados.push({
      id: `categoria-${alta ? "alta" : "queda"}:${cat}`,
      regra: alta ? "categoria-em-alta" : "categoria-em-queda",
      marca: "lirio",
      tipo: alta ? "tendencia" : "risco",
      prioridade: Math.abs(v) >= 0.4 ? "alta" : "media",
      peso: Math.abs(v) * Math.log10(t.buscas + antes),
      frase: `Buscas por ${nomeCategoria(cat)} ${alta ? "subiram" : "caíram"} ${formatarPercentual(Math.abs(v))} na Lírio`,
      detalhe: `${formatarInteiro(antes)} → ${formatarInteiro(t.buscas)} buscas (${ctx.anterior} contra ${ctx.periodo}).${alta ? " Confira se a oferta acompanha nos distritos com mais procura." : ""}`,
      href: link(ctx, "/lirio", "lirio-categorias-em-alta"),
      rotuloLink: "Ver categorias em alta",
    });
  }
  return achados.sort((a, b) => b.peso - a.peso).slice(0, 4);
}

/** Taxa de contato da cidade mudou ≥ 2 p.p. ou categoria converte bem abaixo da média. */
export function regraConversao(ctx: ContextoInsights): Insight[] {
  const l = ctx.lirio;
  if (!l) return [];
  const achados: Insight[] = [];
  const atual = taxaContato(l.totais.cliques, l.totais.visualizacoes);
  const antes = taxaContato(l.totaisAnterior.cliques, l.totaisAnterior.visualizacoes);
  const p = variacaoPontos(atual, antes);
  if (p !== null && atual !== null && antes !== null && Math.abs(p) >= LIMITES.pontosFunil) {
    achados.push({
      id: "contato-cidade",
      regra: "taxa-de-contato",
      marca: "lirio",
      tipo: p > 0 ? "tendencia" : "risco",
      prioridade: Math.abs(p) >= 4 ? "alta" : "media",
      peso: Math.abs(p),
      frase: `A taxa de contato da Lírio ${p > 0 ? "subiu" : "caiu"} ${formatarPontos(Math.abs(p)).replace("+", "")}: ${formatarPercentual(antes)} → ${formatarPercentual(atual)}`,
      detalhe: `Cliques no WhatsApp ÷ visualizações de perfil, ${ctx.anterior} contra ${ctx.periodo}.`,
      href: link(ctx, "/lirio", "lirio-funil"),
      rotuloLink: "Ver o funil",
    });
  }
  if (atual !== null) {
    for (const [cat, t] of l.categorias) {
      const tc = taxaContato(t.cliques, t.visualizacoes);
      if (tc === null || t.visualizacoes < LIMITES.contatoMinVisualizacoes || tc >= atual * LIMITES.contatoAbaixoDaMedia) continue;
      achados.push({
        id: `contato-baixo:${cat}`,
        regra: "conversao-abaixo",
        marca: "lirio",
        tipo: "risco",
        prioridade: "media",
        peso: (atual - tc) * 100,
        frase: `${nomeCategoria(cat)} converte ${formatarPercentual(1 - tc / atual)} menos que a média da Lírio`,
        detalhe: `Taxa de contato de ${formatarPercentual(tc)} contra ${formatarPercentual(atual)} na plataforma (${formatarInteiro(t.visualizacoes)} visualizações em ${ctx.periodo}). Perfis com preço e portfólio completos costumam converter mais.`,
        href: link(ctx, "/lirio", "lirio-conversao-categoria"),
        rotuloLink: "Ver conversão por categoria",
      });
    }
  }
  return achados;
}

/** Concentração de buscas numa janela de 3 horas. */
export function regraPicoDeBusca(ctx: ContextoInsights): Insight[] {
  const l = ctx.lirio;
  if (!l) return [];
  const p = picosDeBusca(l.horas);
  if (!p.janela || p.janela.fracao < LIMITES.picoFracao || !p.diaMaisForte) return [];
  return [
    {
      id: "pico-busca",
      regra: "pico-de-busca",
      marca: "lirio",
      tipo: "tendencia",
      prioridade: "baixa",
      peso: p.janela.fracao,
      frase: `${formatarPercentual(p.janela.fracao)} das buscas acontecem entre ${p.janela.inicio}h e ${p.janela.fim}h`,
      detalhe: `Dia mais forte: ${DIA_SEMANA[p.diaMaisForte.diaSemana]?.longo}. Bom horário para campanhas e para lembrar as profissionais de responder rápido no WhatsApp.`,
      href: link(ctx, "/lirio", "lirio-horarios-pico"),
      rotuloLink: "Ver horários de pico",
    },
  ];
}

// ─── Pelagem ──────────────────────────────────────────────────────────────────

/** Cancelamentos de um dia da semana subiram ≥ 15% contra o período anterior. */
export function regraCancelamentos(ctx: ContextoInsights): Insight[] {
  const p = ctx.pelagem;
  if (!p) return [];
  const achados: Insight[] = [];
  for (const d of p.cancelamentoPorDia) {
    if (d.canceladosAnterior < LIMITES.cancelMinBase) continue;
    const v = variacao(d.cancelados, d.canceladosAnterior);
    if (v === null || v < LIMITES.cancelAlta) continue;
    const taxa = taxaCancelamento(d.cancelados, d.agendamentos);
    const taxaAntes = taxaCancelamento(d.canceladosAnterior, d.agendamentosAnterior);
    const dia = DIA_SEMANA[d.diaSemana]?.longo ?? "";
    achados.push({
      id: `cancelamentos:${d.diaSemana}`,
      regra: "cancelamentos-por-dia",
      marca: "pelagem",
      tipo: "risco",
      prioridade: v >= 0.4 ? "alta" : "media",
      peso: v * Math.log10(d.cancelados + 1),
      frase: `Cancelamentos de ${dia} subiram ${formatarPercentual(v)} no Pelagem`,
      detalhe: `${formatarInteiro(d.canceladosAnterior)} → ${formatarInteiro(d.cancelados)} cancelamentos${taxa !== null && taxaAntes !== null ? `; a taxa do dia foi de ${formatarPercentual(taxaAntes)} para ${formatarPercentual(taxa)}` : ""} (${ctx.anterior} contra ${ctx.periodo}). Lembrete na véspera reduz faltas.`,
      href: link(ctx, "/pelagem", "pelagem-cancelamento-dia"),
      rotuloLink: "Ver cancelamento por dia",
    });
  }
  return achados.sort((a, b) => b.peso - a.peso).slice(0, 2);
}

/** Faturamento (ou atendimentos, sem permissão financeira) variou ≥ 10%. */
export function regraFaturamento(ctx: ContextoInsights): Insight[] {
  const p = ctx.pelagem;
  if (!p) return [];
  const [atual, antes] = p.financeiro ? [p.atual.faturamento, p.anterior.faturamento] : [p.atual.concluidos, p.anterior.concluidos];
  const v = variacao(atual, antes);
  if (v === null || Math.abs(v) < LIMITES.faturamentoVariacao) return [];
  const nome = p.financeiro ? "Faturamento" : "Atendimentos concluídos";
  const f = (x: number) => (p.financeiro ? formatarMoeda(x) : formatarInteiro(x));
  return [
    {
      id: "pelagem-volume",
      regra: "faturamento",
      marca: "pelagem",
      tipo: v > 0 ? "tendencia" : "risco",
      prioridade: Math.abs(v) >= 0.2 ? "alta" : "media",
      peso: Math.abs(v),
      frase: `${nome} do Pelagem ${p.financeiro ? (v > 0 ? "cresceu" : "caiu") : v > 0 ? "cresceram" : "caíram"} ${formatarPercentual(Math.abs(v))}`,
      detalhe: `${f(antes)} → ${f(atual)} (${ctx.anterior} contra ${ctx.periodo}).`,
      href: link(ctx, "/pelagem", "pelagem-faturamento-semanal"),
      rotuloLink: "Ver faturamento semanal",
    },
  ];
}

/** Taxa de retorno mudou ≥ 5 p.p. */
export function regraRetorno(ctx: ContextoInsights): Insight[] {
  const p = ctx.pelagem;
  if (!p) return [];
  const pts = variacaoPontos(p.atual.taxaRetorno, p.anterior.taxaRetorno);
  if (pts === null || Math.abs(pts) < LIMITES.retornoPontos || p.atual.taxaRetorno === null || p.anterior.taxaRetorno === null) return [];
  return [
    {
      id: "pelagem-retorno",
      regra: "taxa-de-retorno",
      marca: "pelagem",
      tipo: pts > 0 ? "tendencia" : "risco",
      prioridade: pts <= -10 ? "alta" : "media",
      peso: Math.abs(pts),
      frase: `A taxa de retorno do Pelagem ${pts > 0 ? "subiu" : "caiu"} ${formatarPontos(Math.abs(pts)).replace("+", "")}`,
      detalhe: `${formatarPercentual(p.anterior.taxaRetorno)} → ${formatarPercentual(p.atual.taxaRetorno)} dos clientes atendidos voltaram 2+ vezes no período.`,
      href: link(ctx, "/clientes", "clientes-inativos"),
      rotuloLink: "Ver clientes",
    },
  ];
}

/** Serviço × porte com variação forte de atendimentos. */
export function regraServicos(ctx: ContextoInsights): Insight[] {
  const p = ctx.pelagem;
  if (!p) return [];
  return p.servicos
    .filter((s) => s.atendimentosAnterior >= LIMITES.servicoMinBase)
    .map((s) => ({ s, v: variacao(s.atendimentos, s.atendimentosAnterior) }))
    .filter((x): x is { s: (typeof p.servicos)[number]; v: number } => x.v !== null && Math.abs(x.v) >= LIMITES.servicoVariacao)
    .sort((a, b) => Math.abs(b.v) - Math.abs(a.v))
    .slice(0, 2)
    .map(({ s, v }) => ({
      id: `servico:${s.servico}:${s.porte}`,
      regra: "servico",
      marca: "pelagem" as const,
      tipo: v > 0 ? ("tendencia" as const) : ("risco" as const),
      prioridade: "baixa" as const,
      peso: Math.abs(v),
      frase: `${s.servico} (porte ${s.porte}) ${v > 0 ? "cresceu" : "caiu"} ${formatarPercentual(Math.abs(v))} em atendimentos`,
      detalhe: `${formatarInteiro(s.atendimentosAnterior)} → ${formatarInteiro(s.atendimentos)} atendimentos concluídos (${formatarVariacao(v)}).`,
      href: link(ctx, "/pelagem", "pelagem-top-servicos"),
      rotuloLink: "Ver top 10 serviços",
    }));
}

/** Clientes sem voltar há mais de 30 dias, com a receita de uma visita de cada. */
export function regraInativos(ctx: ContextoInsights): Insight[] {
  const p = ctx.pelagem;
  if (!p || p.inativos.quantidade < LIMITES.inativosMin) return [];
  const receita = p.financeiro && p.inativos.receitaPorVisita !== null ? p.inativos.receitaPorVisita : null;
  return [
    {
      id: "pelagem-inativos",
      regra: "clientes-inativos",
      marca: "pelagem",
      tipo: "oportunidade",
      prioridade: p.inativos.quantidade >= 20 ? "alta" : "media",
      peso: p.inativos.quantidade,
      frase: `${formatarInteiro(p.inativos.quantidade)} clientes do Pelagem estão há mais de 30 dias sem voltar`,
      detalhe: receita !== null ? `Uma visita de cada um rende cerca de ${formatarMoeda(receita)} (ticket médio histórico de cada cliente). A lista para reativação sai com o hash anônimo.` : "A lista para reativação está em Clientes, identificada só pelo hash anônimo.",
      href: link(ctx, "/clientes", "clientes-inativos"),
      rotuloLink: "Ver clientes inativos",
    },
  ];
}

export const REGRAS = [
  regraDemandaReprimida,
  regraSemOferta,
  regraExcessoOferta,
  regraCategorias,
  regraConversao,
  regraPicoDeBusca,
  regraCancelamentos,
  regraFaturamento,
  regraRetorno,
  regraServicos,
  regraInativos,
] as const;

const ORDEM: Record<Prioridade, number> = { alta: 0, media: 1, baixa: 2 };

/** Roda todas as regras e ordena por prioridade e força do sinal. */
export function gerarInsights(ctx: ContextoInsights): Insight[] {
  return REGRAS.flatMap((r) => r(ctx)).sort((a, b) => ORDEM[a.prioridade] - ORDEM[b.prioridade] || b.peso - a.peso);
}
