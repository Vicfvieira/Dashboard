import { formatarInteiro, formatarPercentual } from "@/lib/formato";
import { classeIndice, type MetricaMapa } from "@/lib/mercado";
import { CORES_INDICE, SEM_DADOS, type Tema } from "@/lib/mercado-cores";

/** Auxiliares comuns do mapa de mercado (mapa, painel e tabela). */

export interface InfoDistrito {
  slug: string;
  nome: string;
  regiao: string;
  nomeRegiao: string;
  subprefeitura: string;
}

export const ROTULO_METRICA: Record<MetricaMapa, string> = {
  indice: "Índice de demanda",
  buscas: "Buscas",
  oferta: "Profissionais ativas",
  conversao: "Taxa de contato",
};

export function formatarIndice(i: number | null): string {
  if (i === null) return "sem dados";
  if (!Number.isFinite(i)) return "sem oferta";
  return `${i.toLocaleString("pt-BR", { maximumFractionDigits: 2, minimumFractionDigits: 2 })}×`;
}

export function formatarValor(metrica: MetricaMapa, v: number | null): string {
  if (v === null) return "sem dados";
  if (metrica === "indice") return formatarIndice(v);
  if (metrica === "conversao") return formatarPercentual(v);
  return formatarInteiro(v);
}

const TEXTO_CLASSE: Record<ReturnType<typeof classeIndice>, string> = {
  "sem-dados": "Sem buscas nem oferta no recorte",
  excesso: "Excesso de oferta",
  sobra: "Oferta folgada",
  equilibrio: "Equilíbrio",
  atencao: "Pressão acima da média",
  reprimida: "Demanda reprimida",
  "sem-oferta": "Busca sem nenhuma profissional ativa",
};
export const textoClasse = (i: number | null) => TEXTO_CLASSE[classeIndice(i)];

export function corIndice(i: number | null, tema: Tema): string {
  const c = classeIndice(i);
  return c === "sem-dados" ? SEM_DADOS[tema] : CORES_INDICE[tema][c];
}

