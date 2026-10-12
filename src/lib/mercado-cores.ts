/**
 * Cores do mapa de mercado, uma versão por tema (o Leaflet desenha em SVG com atributos, que não
 * leem variáveis CSS). Validadas com o validador do dataviz contra #FFFFFF e #1A1A23:
 * - sequencial (um matiz, o da Lírio): monotônica, extremo claro ≥ 2:1 nos dois temas;
 * - divergente (índice): frio = sobra de oferta, quente = demanda reprimida, cinza neutro no meio.
 *   No escuro a intensidade cresce com o brilho, então as rampas são próprias, não invertidas.
 */
import type { ClasseIndice } from "./mercado";

export type Tema = "claro" | "escuro";

export const RAMPA_SEQUENCIAL: Record<Tema, readonly string[]> = {
  claro: ["#D9A8C3", "#C487AA", "#A85C86", "#844068", "#5A2646"],
  escuro: ["#6A4560", "#8A5A7D", "#AE77A0", "#CD99BE", "#EBC4DB"],
};

export const CORES_INDICE: Record<Tema, Record<Exclude<ClasseIndice, "sem-dados">, string>> = {
  claro: { excesso: "#2E6DA4", sobra: "#7FA8D0", equilibrio: "#C9C8C4", atencao: "#E8955F", reprimida: "#C9561F", "sem-oferta": "#7E2709" },
  escuro: { excesso: "#6FA9DE", sobra: "#3A6188", equilibrio: "#4A4A52", atencao: "#97532F", reprimida: "#E07A3E", "sem-oferta": "#F8B486" },
};

/** Distrito sem nenhum dado no recorte: só o contorno. */
export const SEM_DADOS: Record<Tema, string> = { claro: "#EEEEF2", escuro: "#24242E" };
/** Contorno entre distritos e destaque do selecionado. */
export const CONTORNO: Record<Tema, { linha: string; selecao: string }> = {
  claro: { linha: "#FFFFFF", selecao: "#15151C" },
  escuro: { linha: "#0F0F14", selecao: "#FFFFFF" },
};
