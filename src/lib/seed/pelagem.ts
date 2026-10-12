import { SERVICOS_PELAGEM, ZONAS_TAXI, type PorteCodigo } from "@/data/servicos-pelagem";
import { sha256Hex, sorteio, type Sorteio } from "./aleatorio";
import { diaDaSemana, horarioSP, somarDias } from "./datas";

export type EspecieCodigo = "CACHORRO" | "GATO";
export type StatusCodigo = "AGENDADO" | "CONCLUIDO" | "CANCELADO";

export interface AtendimentoSeed {
  idOrigem: string;
  clienteHash: string;
  servicoSlug: string;
  servicoNome: string;
  porte: PorteCodigo;
  especie: EspecieCodigo;
  status: StatusCodigo;
  inicio: Date;
  fim: Date;
  duracaoMinutos: number;
  valorServicoCentavos: number;
  taxaTaxiCentavos: number;
  totalCentavos: number;
  zonaTaxi: string | null;
  criadoEmOrigem: Date;
  canceladoEmOrigem: Date | null;
}

export interface OpcoesPelagem {
  /** Instante de referência ("agora"). */
  agora: Date;
  /** Primeiro dia do histórico (dia SP, meia-noite UTC). */
  inicio: Date;
  /** Dias de agenda futura a gerar após hoje. */
  diasFuturos: number;
  totalClientes: number;
}

/** O Pelagem abre de terça a sábado, das 9h às 18h. */
export const DIAS_ABERTOS = new Set([2, 3, 4, 5, 6]);

const HORARIOS: ReadonlyArray<{ valor: number; peso: number }> = [
  { valor: 9 * 60, peso: 9 },
  { valor: 9 * 60 + 30, peso: 7 },
  { valor: 10 * 60, peso: 10 },
  { valor: 10 * 60 + 30, peso: 8 },
  { valor: 11 * 60, peso: 8 },
  { valor: 13 * 60, peso: 5 },
  { valor: 13 * 60 + 30, peso: 5 },
  { valor: 14 * 60, peso: 7 },
  { valor: 14 * 60 + 30, peso: 6 },
  { valor: 15 * 60, peso: 6 },
  { valor: 15 * 60 + 30, peso: 4 },
  { valor: 16 * 60, peso: 3 },
];

type Perfil = "frequente" | "regular" | "ocasional";

const INTERVALO: Record<Perfil, [number, number]> = {
  frequente: [12, 21],
  regular: [25, 40],
  ocasional: [50, 95],
};

function servicoPara(s: Sorteio, especie: EspecieCodigo, porte: PorteCodigo): string {
  if (especie === "GATO") {
    return s.ponderado([
      { valor: "banho", peso: 5 },
      { valor: "hidratacao", peso: 2 },
      { valor: "corte-de-unhas", peso: 3 },
      { valor: "banho-tosa-higienica", peso: 1 },
    ]);
  }
  return s.ponderado([
    { valor: "banho", peso: 6 },
    { valor: "banho-tosa-higienica", peso: 5 },
    { valor: "tosa-completa", peso: porte === "G" ? 2 : 4 },
    { valor: "hidratacao", peso: 3 },
    { valor: "corte-de-unhas", peso: 2 },
  ]);
}

/** Próximo dia em que o Pelagem abre, a partir de `dia` (inclusive). */
function proximoDiaAberto(dia: Date): Date {
  let d = dia;
  while (!DIAS_ABERTOS.has(diaDaSemana(d))) d = somarDias(d, 1);
  return d;
}

/**
 * Probabilidade de cancelamento. Base de 7%; aos sábados 9%, subindo nas últimas 6 semanas
 * para ~12% (o padrão que a regra de insight "cancelamentos de sábado subiram" deve encontrar).
 */
function probabilidadeCancelamento(dia: Date, diasAteHoje: number): number {
  const sabado = diaDaSemana(dia) === 6;
  if (!sabado) return 0.07;
  return diasAteHoje <= 42 ? 0.12 : 0.09;
}

/**
 * Gera os atendimentos dos clientes fictícios. Cada cliente tem espécie, porte, serviço preferido
 * e ritmo de retorno; parte deixa de voltar (vira "inativo") e novos clientes entram ao longo do
 * período, o que dá crescimento de faturamento e taxa de retorno coerentes.
 */
export function gerarAtendimentos(op: OpcoesPelagem): AtendimentoSeed[] {
  const hoje = op.agora;
  const diasHistorico = Math.round((hoje.getTime() - op.inicio.getTime()) / 86_400_000);
  const ultimoDia = somarDias(op.inicio, diasHistorico + op.diasFuturos);
  const linhas: AtendimentoSeed[] = [];

  for (let c = 0; c < op.totalClientes; c++) {
    const s = sorteio(`pelagem:cliente:${c}`);
    const clienteHash = sha256Hex(`painelux-seed:pelagem:cliente:${c}`);
    const especie: EspecieCodigo = s.chance(0.22) ? "GATO" : "CACHORRO";
    const porte: PorteCodigo =
      especie === "GATO"
        ? s.chance(0.85) ? "P" : "M"
        : s.ponderado<PorteCodigo>([
            { valor: "P", peso: 40 },
            { valor: "M", peso: 35 },
            { valor: "G", peso: 25 },
          ]);
    const perfil = s.ponderado<Perfil>([
      { valor: "frequente", peso: 18 },
      { valor: "regular", peso: 37 },
      { valor: "ocasional", peso: 45 },
    ]);
    const preferido = servicoPara(s, especie, porte);
    const usaTaxi = s.chance(0.2);
    const zona = s.ponderado(ZONAS_TAXI.map((z) => ({ valor: z, peso: z.nome === "Oeste" || z.nome === "Centro" ? 3 : 2 })));
    // 45% já eram clientes no início do período; os demais entram aos poucos (crescimento da base).
    const entrada = s.chance(0.45)
      ? s.inteiro(0, 40)
      : Math.floor(Math.pow(s.real(), 0.8) * (diasHistorico + op.diasFuturos * 0.5));
    // 30% dos clientes param de vir em algum momento.
    const saida = s.chance(0.3) ? entrada + s.inteiro(20, 140) : Number.POSITIVE_INFINITY;

    let dia = proximoDiaAberto(somarDias(op.inicio, entrada));
    for (let v = 0; dia <= ultimoDia; v++) {
      const offset = Math.round((dia.getTime() - op.inicio.getTime()) / 86_400_000);
      if (offset > saida) break;
      const sv = sorteio(`pelagem:atendimento:${c}:${v}`);
      const slug = sv.chance(0.8) ? preferido : servicoPara(sv, especie, porte);
      const servico = SERVICOS_PELAGEM.find((x) => x.slug === slug) ?? SERVICOS_PELAGEM[0];
      if (!servico) throw new Error("Catálogo do Pelagem vazio");
      const preco = servico.precos[porte];
      const minutoInicio = sv.ponderado(diaDaSemana(dia) === 6 ? HORARIOS.map((h) => ({ ...h, peso: h.valor < 12 * 60 ? h.peso * 1.4 : h.peso })) : HORARIOS);
      const inicio = horarioSP(dia, Math.floor(minutoInicio / 60), minutoInicio % 60);
      const fim = new Date(inicio.getTime() + preco.minutos * 60_000);
      const taxi = usaTaxi && sv.chance(0.85);
      const taxa = taxi ? zona.centavos : 0;
      const diasAteHoje = Math.round((hoje.getTime() - inicio.getTime()) / 86_400_000);
      const antecedencia = sv.inteiro(1, 14);
      const criadoEm = new Date(inicio.getTime() - antecedencia * 86_400_000 - sv.inteiro(0, 600) * 60_000);
      // Um cancelamento só existe se já aconteceu até "agora".
      const sorteouCancelamento = sv.chance(probabilidadeCancelamento(dia, diasAteHoje));
      const momentoCancelamento = new Date(
        Math.max(criadoEm.getTime() + 3_600_000, inicio.getTime() - sv.inteiro(2, 72) * 3_600_000),
      );
      const cancelado = sorteouCancelamento && momentoCancelamento.getTime() <= hoje.getTime();
      const passado = fim.getTime() <= hoje.getTime();
      const status: StatusCodigo = cancelado ? "CANCELADO" : passado ? "CONCLUIDO" : "AGENDADO";

      linhas.push({
        idOrigem: `seed-pelagem-${c}-${v}`,
        clienteHash,
        servicoSlug: servico.slug,
        servicoNome: servico.nome,
        porte,
        especie,
        status,
        inicio,
        fim,
        duracaoMinutos: preco.minutos,
        valorServicoCentavos: preco.centavos,
        taxaTaxiCentavos: taxa,
        totalCentavos: preco.centavos + taxa,
        zonaTaxi: taxi ? zona.nome : null,
        criadoEmOrigem: criadoEm,
        canceladoEmOrigem: cancelado ? momentoCancelamento : null,
      });

      const [min, max] = INTERVALO[perfil];
      // Agendamentos futuros: só o próximo de cada cliente (como numa agenda real).
      if (!passado) break;
      dia = proximoDiaAberto(somarDias(dia, sv.inteiro(min, max)));
    }
  }

  return linhas
    .filter((l) => l.criadoEmOrigem.getTime() <= hoje.getTime())
    .sort((a, b) => a.inicio.getTime() - b.inicio.getTime());
}
