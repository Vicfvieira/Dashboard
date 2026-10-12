/**
 * Métricas do Painelux: funções puras, sem banco nem framework, com as definições do negócio.
 * Toda tela e regra de insight calcula a partir daqui, para um mesmo número nunca divergir
 * entre páginas.
 */

// ─── Utilidades ───────────────────────────────────────────────────────────────

/** Divisão segura: null quando o denominador é 0 (a métrica não existe, não é zero). */
export function razao(numerador: number, denominador: number): number | null {
  return denominador > 0 ? numerador / denominador : null;
}

/** Variação relativa entre períodos; null sem base de comparação. */
export function variacao(atual: number, anterior: number): number | null {
  return anterior > 0 ? (atual - anterior) / anterior : null;
}

/** Variação em pontos percentuais entre duas taxas (0,12 → 0,15 = +3 p.p.). */
export function variacaoPontos(atual: number | null, anterior: number | null): number | null {
  return atual === null || anterior === null ? null : (atual - anterior) * 100;
}

// ─── Pelagem ──────────────────────────────────────────────────────────────────

/** Ticket médio = faturamento / atendimentos concluídos. */
export function ticketMedio(faturamentoCentavos: number, concluidos: number): number | null {
  return razao(faturamentoCentavos, concluidos);
}

/** Taxa de cancelamento = cancelados / agendamentos do período (todos os status). */
export function taxaCancelamento(cancelados: number, total: number): number | null {
  return razao(cancelados, total);
}

/**
 * Taxa de retorno = clientes com 2+ atendimentos concluídos no período / clientes atendidos.
 * Recebe um hash de cliente por atendimento concluído.
 */
export function taxaRetorno(clientesPorAtendimento: readonly string[]): { taxa: number | null; atendidos: number; recorrentes: number } {
  const contagem = new Map<string, number>();
  for (const c of clientesPorAtendimento) contagem.set(c, (contagem.get(c) ?? 0) + 1);
  const recorrentes = [...contagem.values()].filter((n) => n >= 2).length;
  return { taxa: razao(recorrentes, contagem.size), atendidos: contagem.size, recorrentes };
}

export const DIAS_INATIVIDADE = 30;

/** Inativo = mais de 30 dias desde o último atendimento concluído (e nada agendado depois). */
export function estaInativo(ultimoAtendimento: Date, agora: Date, proximoAgendado: Date | null = null): boolean {
  if (proximoAgendado && proximoAgendado.getTime() > agora.getTime()) return false;
  return agora.getTime() - ultimoAtendimento.getTime() > DIAS_INATIVIDADE * 86_400_000;
}

// ─── Lírio ────────────────────────────────────────────────────────────────────

/** Taxa de visualização = visualizações de perfil / buscas. */
export function taxaVisualizacao(visualizacoes: number, buscas: number): number | null {
  return razao(visualizacoes, buscas);
}

/** Taxa de contato = cliques no WhatsApp / visualizações de perfil. */
export function taxaContato(cliquesWhatsapp: number, visualizacoes: number): number | null {
  return razao(cliquesWhatsapp, visualizacoes);
}

export const LIMITE_DEMANDA_REPRIMIDA = 1.5;
export const LIMITE_EXCESSO_OFERTA = 0.5;

/**
 * Índice de demanda por distrito e categoria = buscas / profissionais ativas.
 * Sem oferta e com busca, a demanda é "sem oferta" (índice infinito, tratado à parte).
 */
export function indiceDemanda(buscas: number, ativas: number): number | null {
  if (ativas <= 0) return buscas > 0 ? Number.POSITIVE_INFINITY : null;
  return buscas / ativas;
}

export type SituacaoDemanda = "sem-oferta" | "reprimida" | "equilibrada" | "excesso-oferta" | "sem-dados";

/** Acima de 1,5 é demanda reprimida; abaixo de 0,5, excesso de oferta. */
export function classificarDemanda(indice: number | null): SituacaoDemanda {
  if (indice === null) return "sem-dados";
  if (indice === Number.POSITIVE_INFINITY) return "sem-oferta";
  if (indice > LIMITE_DEMANDA_REPRIMIDA) return "reprimida";
  if (indice < LIMITE_EXCESSO_OFERTA) return "excesso-oferta";
  return "equilibrada";
}

// ─── Séries temporais ─────────────────────────────────────────────────────────

const DIA_MS = 86_400_000;
const somarDias = (dia: string, n: number) => new Date(Date.parse(`${dia}T00:00:00Z`) + n * DIA_MS).toISOString().slice(0, 10);

export interface PontoSerie {
  /** "AAAA-MM-DD" (início do dia ou da semana). */
  data: string;
  valor: number;
}

/** Preenche com zero os dias sem registro entre `de` e `ate` (inclusivos). */
export function completarDias(pontos: readonly PontoSerie[], de: string, ate: string): PontoSerie[] {
  const porDia = new Map(pontos.map((p) => [p.data, p.valor]));
  const saida: PontoSerie[] = [];
  for (let d = de; d <= ate; d = somarDias(d, 1)) saida.push({ data: d, valor: porDia.get(d) ?? 0 });
  return saida;
}

/** Segunda-feira da semana do dia (semanas ISO). */
export function inicioDaSemana(dia: string): string {
  const semana = new Date(`${dia}T00:00:00Z`).getUTCDay(); // 0 = domingo
  return somarDias(dia, -((semana + 6) % 7));
}

/**
 * Soma uma série diária por semana (segunda a domingo). Por padrão descarta as semanas
 * incompletas das pontas do período: uma semana com 1 ou 3 dias pareceria uma queda que não houve.
 */
export function agruparPorSemana(pontos: readonly PontoSerie[], apenasCompletas = true): PontoSerie[] {
  const semanas = new Map<string, { valor: number; dias: number }>();
  for (const p of pontos) {
    const s = inicioDaSemana(p.data);
    const atual = semanas.get(s) ?? { valor: 0, dias: 0 };
    semanas.set(s, { valor: atual.valor + p.valor, dias: atual.dias + 1 });
  }
  return [...semanas.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .filter(([, s]) => !apenasCompletas || s.dias === 7)
    .map(([data, s]) => ({ data, valor: s.valor }));
}

/** Granularidade do gráfico: diária até 31 dias, semanal acima (o Pelagem fecha domingo e segunda; diário longo vira serrote). */
export function granularidade(dias: number): "dia" | "semana" {
  return dias <= 31 ? "dia" : "semana";
}

/**
 * Índice com base 100 = média da própria série. Permite comparar no mesmo eixo grandezas de
 * escalas diferentes (faturamento do Pelagem e buscas da Lírio) sem gráfico de dois eixos.
 */
export function indexar(valores: readonly number[]): Array<number | null> {
  const media = valores.reduce((s, v) => s + v, 0) / (valores.length || 1);
  return valores.map((v) => (media > 0 ? (v / media) * 100 : null));
}

// ─── Destaques ────────────────────────────────────────────────────────────────

export interface CandidatoMovimento {
  id: string;
  /** Sujeito da frase: "Buscas por Estética corporal". */
  rotulo: string;
  atual: number;
  anterior: number;
  /** Base mínima no período anterior para a variação ser levada a sério. */
  baseMinima: number;
  marca: "pelagem" | "lirio";
  href: string;
  formato: "inteiro" | "moeda";
}

export interface Movimento extends CandidatoMovimento {
  variacao: number;
}

/**
 * Os n maiores movimentos (em módulo) entre os candidatos com base suficiente. Empate: maior
 * volume primeiro. Prioriza um movimento por marca quando há candidatos das duas, para o card
 * não virar monotemático.
 */
export function maioresMovimentos(candidatos: readonly CandidatoMovimento[], n = 3): Movimento[] {
  const validos: Movimento[] = candidatos
    .filter((c) => c.anterior >= c.baseMinima && c.anterior > 0)
    .map((c) => ({ ...c, variacao: (c.atual - c.anterior) / c.anterior }))
    .filter((m) => m.variacao !== 0)
    .sort((a, b) => Math.abs(b.variacao) - Math.abs(a.variacao) || b.anterior - a.anterior);

  const escolhidos: Movimento[] = [];
  for (const marca of ["pelagem", "lirio"] as const) {
    const melhor = validos.find((m) => m.marca === marca);
    if (melhor && escolhidos.length < n) escolhidos.push(melhor);
  }
  for (const m of validos) {
    if (escolhidos.length >= n) break;
    if (!escolhidos.includes(m)) escolhidos.push(m);
  }
  return escolhidos.sort((a, b) => Math.abs(b.variacao) - Math.abs(a.variacao));
}
