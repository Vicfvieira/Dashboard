import { CATEGORIAS, type CategoriaSlug } from "@/data/categorias";
import { DISTRITOS, type RegiaoId } from "@/data/sp-geo";
import { sorteio } from "./aleatorio";
import { diaDaSemana, diferencaDias, isoDia, somarDias } from "./datas";

export interface OfertaSeed {
  data: Date;
  distritoSlug: string;
  regiao: RegiaoId;
  categoria: CategoriaSlug;
  ativas: number;
  verificadas: number;
}

export interface EventoSeed {
  chave: string;
  dia: Date;
  distritoSlug: string | null;
  regiao: RegiaoId | null;
  categoria: CategoriaSlug | null;
  buscas: number;
  visualizacoes: number;
  cliquesWhatsapp: number;
  cliquesInstagram: number;
}

export interface OpcoesLirio {
  /** Primeiro dia do histórico. */
  inicio: Date;
  /** Hoje (dia SP). */
  hoje: Date;
}

/** Popularidade relativa de cada categoria nas buscas. */
const POPULARIDADE: Record<CategoriaSlug, number> = {
  "nail-designer": 1.5,
  "lash-designer": 1.2,
  "design-de-sobrancelhas": 1.3,
  "estetica-facial": 0.9,
  "estetica-corporal": 0.7,
  depilacao: 1.0,
  micropigmentacao: 0.5,
  maquiagem: 0.6,
};

/** Peso de demanda por região (densidade e renda média). */
const PESO_REGIAO: Record<RegiaoId, number> = { centro: 1.3, oeste: 1.45, sul: 1.0, norte: 0.8, leste: 0.85 };

/**
 * Desequilíbrios plantados para a análise ter o que encontrar: oferta / demanda.
 * < 1 = falta profissional (demanda reprimida); > 1 = sobra profissional.
 */
const DESEQUILIBRIOS: Record<string, number> = {
  "vila-sonia|lash-designer": 0.3,
  "tatuape|design-de-sobrancelhas": 0.35,
  "santana|estetica-corporal": 0.3,
  "saude|micropigmentacao": 0.35,
  "mooca|nail-designer": 0.45,
  "butanta|maquiagem": 0.4,
  "pinheiros|nail-designer": 2.6,
  "moema|estetica-facial": 2.4,
  "itaim-bibi|lash-designer": 2.2,
  "vila-mariana|depilacao": 2.3,
};

/** Categorias com tendência de alta (multiplicador ao fim do período). */
const TENDENCIA: Partial<Record<CategoriaSlug, number>> = {
  "estetica-corporal": 1.55,
  "lash-designer": 1.3,
  micropigmentacao: 1.2,
  maquiagem: 0.85,
};

/** Variação de buscas por dia da semana (domingo = 0). */
const FATOR_DIA_SEMANA = [0.78, 0.95, 1.0, 1.02, 1.08, 1.18, 1.22];

/** Buscas por dia na cidade inteira no início do período (a Lírio real tem ~185/dia). */
const BUSCAS_DIA_BASE = 160;
/** Fração das buscas feitas sem escolher distrito. */
const FRACAO_SEM_DISTRITO = 0.14;
/** Profissionais ativas (pares distrito × categoria) ao fim do período. */
const OFERTA_FINAL = 420;

interface Par {
  distritoSlug: string;
  regiao: RegiaoId;
  categoria: CategoriaSlug;
  pesoDemanda: number;
  /** Oferta relativa à demanda (1 = equilibrado). */
  equilibrio: number;
  /** Conversão relativa (visualização → WhatsApp). */
  conversao: number;
}

function montarPares(): Par[] {
  const pares: Par[] = [];
  for (const d of DISTRITOS) {
    const sd = sorteio(`lirio:distrito:${d.slug}`);
    const pesoDistrito = PESO_REGIAO[d.regiao] * (0.45 + sd.real() * 1.2);
    for (const c of CATEGORIAS) {
      const sp = sorteio(`lirio:par:${d.slug}:${c.slug}`);
      const planejado = DESEQUILIBRIOS[`${d.slug}|${c.slug}`];
      pares.push({
        distritoSlug: d.slug,
        regiao: d.regiao,
        categoria: c.slug,
        // Onde plantamos falta de oferta, a procura também é alta: o contraste fica visível.
        pesoDemanda: pesoDistrito * POPULARIDADE[c.slug] * (0.6 + sp.real() * 0.8) * (planejado !== undefined && planejado < 1 ? 2.2 : 1),
        equilibrio: planejado ?? Math.exp((sp.real() - 0.5) * 1.1),
        conversao: 0.65 + sp.real() * 0.8,
      });
    }
  }
  return pares;
}

function fatorTendencia(categoria: CategoriaSlug, progresso: number): number {
  const alvo = TENDENCIA[categoria] ?? 1.08;
  // Crescimento concentrado nos últimos 40% do período.
  const p = Math.max(0, (progresso - 0.6) / 0.4);
  return 1 + (alvo - 1) * p;
}

/**
 * Snapshots semanais (segundas-feiras) e o de hoje. A oferta cresce de ~72% até 100% do valor
 * final ao longo do período, com ritmo próprio por par.
 */
export function gerarOferta(op: OpcoesLirio): OfertaSeed[] {
  const pares = montarPares();
  const pesoTotal = pares.reduce((s, p) => s + p.pesoDemanda * p.equilibrio, 0);
  const duracao = Math.max(1, diferencaDias(op.hoje, op.inicio));

  const datas: Date[] = [];
  for (let d = op.inicio; d <= op.hoje; d = somarDias(d, 1)) {
    if (diaDaSemana(d) === 1 || d.getTime() === op.hoje.getTime()) datas.push(d);
  }

  const linhas: OfertaSeed[] = [];
  for (const par of pares) {
    const s = sorteio(`lirio:oferta:${par.distritoSlug}:${par.categoria}`);
    const final = (OFERTA_FINAL * par.pesoDemanda * par.equilibrio) / pesoTotal;
    const inicial = final * (0.55 + s.real() * 0.35);
    const fracaoVerificadas = 0.6 + s.real() * 0.3;
    for (const data of datas) {
      const progresso = diferencaDias(data, op.inicio) / duracao;
      const esperado = inicial + (final - inicial) * progresso;
      // Arredondamento estocástico estável por par: a série não "pisca" entre semanas.
      const minimo = DESEQUILIBRIOS[`${par.distritoSlug}|${par.categoria}`] !== undefined ? 1 : 0;
      const ativas = Math.max(minimo, Math.floor(esperado) + fracaoDeterministica(par, esperado));
      if (ativas <= 0) continue;
      linhas.push({
        data,
        distritoSlug: par.distritoSlug,
        regiao: par.regiao,
        categoria: par.categoria,
        ativas,
        verificadas: Math.round(ativas * fracaoVerificadas),
      });
    }
  }
  return linhas;
}

function fracaoDeterministica(par: Par, esperado: number): number {
  const limiar = sorteio(`lirio:arredonda:${par.distritoSlug}:${par.categoria}`).real();
  return esperado - Math.floor(esperado) >= limiar ? 1 : 0;
}

export function chaveEvento(dia: Date, distritoSlug: string | null, categoria: string | null): string {
  return `${isoDia(dia)}|${distritoSlug ?? "-"}|${categoria ?? "-"}`;
}

/**
 * Buscas, visualizações e cliques por dia, distrito e categoria. A oferta influencia o funil:
 * onde falta profissional, a busca vira menos visualização (há pouco perfil para abrir).
 */
export function gerarEventos(op: OpcoesLirio): EventoSeed[] {
  const pares = montarPares();
  const pesoTotal = pares.reduce((s, p) => s + p.pesoDemanda, 0);
  const pesoCategoria = new Map<CategoriaSlug, number>();
  for (const p of pares) pesoCategoria.set(p.categoria, (pesoCategoria.get(p.categoria) ?? 0) + p.pesoDemanda);
  const duracao = Math.max(1, diferencaDias(op.hoje, op.inicio));
  const linhas: EventoSeed[] = [];

  for (let dia = op.inicio; dia <= op.hoje; dia = somarDias(dia, 1)) {
    const progresso = diferencaDias(dia, op.inicio) / duracao;
    const sd = sorteio(`lirio:dia:${isoDia(dia)}`);
    const totalDia =
      BUSCAS_DIA_BASE * (1 + 0.22 * progresso) * (FATOR_DIA_SEMANA[diaDaSemana(dia)] ?? 1) * (0.92 + sd.real() * 0.16);

    for (const par of pares) {
      const lambda = (totalDia * (1 - FRACAO_SEM_DISTRITO) * par.pesoDemanda * fatorTendencia(par.categoria, progresso)) / pesoTotal;
      const s = sorteio(`lirio:evento:${isoDia(dia)}:${par.distritoSlug}:${par.categoria}`);
      const buscas = s.poisson(lambda);
      const abertura = Math.min(1.35, 0.55 + 0.6 * Math.min(par.equilibrio, 1.3));
      const visualizacoes = s.poisson(Math.max(buscas, lambda * 0.6) * abertura * (buscas > 0 ? 1 : 0.35));
      if (buscas === 0 && visualizacoes === 0) continue;
      const cliquesWhatsapp = s.poisson(visualizacoes * 0.145 * par.conversao);
      const cliquesInstagram = s.poisson(visualizacoes * 0.05);
      linhas.push({
        chave: chaveEvento(dia, par.distritoSlug, par.categoria),
        dia,
        distritoSlug: par.distritoSlug,
        regiao: par.regiao,
        categoria: par.categoria,
        buscas,
        visualizacoes,
        cliquesWhatsapp,
        cliquesInstagram,
      });
    }

    // Buscas só por categoria (sem distrito): entram no total, sem visualização associada.
    for (const c of CATEGORIAS) {
      const s = sorteio(`lirio:evento:${isoDia(dia)}:-:${c.slug}`);
      const lambda = (totalDia * FRACAO_SEM_DISTRITO * (pesoCategoria.get(c.slug) ?? 0) * fatorTendencia(c.slug, progresso)) / pesoTotal;
      const buscas = s.poisson(lambda);
      if (buscas === 0) continue;
      linhas.push({
        chave: chaveEvento(dia, null, c.slug),
        dia,
        distritoSlug: null,
        regiao: null,
        categoria: c.slug,
        buscas,
        visualizacoes: 0,
        cliquesWhatsapp: 0,
        cliquesInstagram: 0,
      });
    }
  }
  return linhas;
}

export interface HoraSeed {
  dia: Date;
  hora: number;
  buscas: number;
}

/**
 * Perfil de buscas por hora (0 a 23, horário de SP), medido nos eventos reais da Lírio: madrugada
 * quase vazia, subida de manhã, pico no almoço e o maior pico entre 19h e 21h.
 */
const PERFIL_HORA = [108, 67, 35, 33, 24, 60, 201, 464, 713, 840, 893, 996, 1136, 1150, 967, 874, 793, 793, 1026, 1226, 1348, 1262, 841, 414];

/** Fim de semana: manhã mais tarde e tarde mais cheia. */
function pesoHora(hora: number, fimDeSemana: boolean): number {
  const base = PERFIL_HORA[hora] ?? 0;
  if (!fimDeSemana) return base;
  if (hora >= 6 && hora <= 9) return base * 0.6;
  if (hora >= 14 && hora <= 17) return base * 1.25;
  return base;
}

/**
 * Distribui as buscas de cada dia (soma dos eventos) pelas 24 horas. A soma por dia bate com a
 * de MarketEventFact, para o mapa de calor e o funil contarem a mesma história.
 */
export function gerarBuscasPorHora(eventos: readonly EventoSeed[]): HoraSeed[] {
  const porDia = new Map<string, { dia: Date; buscas: number }>();
  for (const e of eventos) {
    const chave = isoDia(e.dia);
    const atual = porDia.get(chave) ?? { dia: e.dia, buscas: 0 };
    atual.buscas += e.buscas;
    porDia.set(chave, atual);
  }
  const linhas: HoraSeed[] = [];
  for (const [chave, { dia, buscas }] of porDia) {
    if (buscas === 0) continue;
    const s = sorteio(`lirio:horas:${chave}`);
    const fds = diaDaSemana(dia) === 0 || diaDaSemana(dia) === 6;
    const pesos = Array.from({ length: 24 }, (_, h) => pesoHora(h, fds) * (0.85 + s.real() * 0.3));
    const soma = pesos.reduce((t, p) => t + p, 0);
    // Maiores restos: inteiros que somam exatamente o total do dia.
    const esperado = pesos.map((p) => (buscas * p) / soma);
    const inteiros = esperado.map(Math.floor);
    let faltam = buscas - inteiros.reduce((t, v) => t + v, 0);
    const ordem = esperado.map((v, h) => ({ h, resto: v - Math.floor(v) })).sort((a, b) => b.resto - a.resto);
    for (const { h } of ordem) {
      if (faltam <= 0) break;
      inteiros[h] = (inteiros[h] ?? 0) + 1;
      faltam--;
    }
    inteiros.forEach((n, hora) => {
      if (n > 0) linhas.push({ dia, hora, buscas: n });
    });
  }
  return linhas;
}
