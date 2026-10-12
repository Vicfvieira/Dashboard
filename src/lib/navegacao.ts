/**
 * Mapa de navegação do painel: rótulo, rota, ícone (nome lucide), permissão exigida e quais
 * filtros globais fazem sentido em cada página. A sidebar e a paleta de comandos mostram só o que
 * `can()` permite para o usuário.
 */
import { can, type Ator, type Permissao } from "./permissoes";

export type GrupoNavegacao = "analise" | "operacao" | "administracao";

export type IconeNavegacao =
  | "LayoutDashboard"
  | "PawPrint"
  | "Flower2"
  | "Map"
  | "Users"
  | "CalendarClock"
  | "Lightbulb"
  | "UserCog"
  | "ScrollText"
  | "Settings";

export interface ItemNavegacao {
  rota: string;
  rotulo: string;
  descricao: string;
  grupo: GrupoNavegacao;
  icone: IconeNavegacao;
  permissao: Permissao;
  /** Cor de marca (indicador ao lado do rótulo). */
  marca?: "pelagem" | "lirio";
  filtros: { periodo: boolean; produto: boolean };
  /** Palavras extras para a busca da paleta de comandos. */
  termos?: string;
}

export const NOME_GRUPO: Record<GrupoNavegacao, string> = {
  analise: "Análise",
  operacao: "Operação",
  administracao: "Administração",
};

export const NAVEGACAO: readonly ItemNavegacao[] = [
  { rota: "/", rotulo: "Visão geral", descricao: "KPIs consolidados das duas marcas", grupo: "analise", icone: "LayoutDashboard", permissao: "visao-geral:ver", filtros: { periodo: true, produto: true }, termos: "inicio dashboard kpi" },
  { rota: "/pelagem", rotulo: "Pelagem", descricao: "Faturamento, serviços e cancelamentos do pet spa", grupo: "analise", icone: "PawPrint", permissao: "pelagem:ver", marca: "pelagem", filtros: { periodo: true, produto: false }, termos: "pet spa banho tosa faturamento" },
  { rota: "/lirio", rotulo: "Lírio", descricao: "Funil de buscas, categorias e conversão", grupo: "analise", icone: "Flower2", permissao: "lirio:ver", marca: "lirio", filtros: { periodo: true, produto: false }, termos: "beleza funil buscas whatsapp" },
  { rota: "/mercado", rotulo: "Mapa de mercado", descricao: "Oferta e demanda nos 96 distritos", grupo: "analise", icone: "Map", permissao: "mercado:ver", marca: "lirio", filtros: { periodo: true, produto: false }, termos: "distritos sao paulo demanda oferta indice" },
  { rota: "/clientes", rotulo: "Clientes", descricao: "Retenção, recorrência e clientes inativos", grupo: "analise", icone: "Users", permissao: "clientes:ver", marca: "pelagem", filtros: { periodo: true, produto: false }, termos: "retencao inativos retorno" },
  { rota: "/insights", rotulo: "Insights", descricao: "Movimentos relevantes detectados por regras", grupo: "analise", icone: "Lightbulb", permissao: "insights:ver", filtros: { periodo: true, produto: true }, termos: "alertas destaques" },
  { rota: "/agenda", rotulo: "Agenda do dia", descricao: "Atendimentos de hoje no Pelagem", grupo: "operacao", icone: "CalendarClock", permissao: "agenda:ver", marca: "pelagem", filtros: { periodo: false, produto: false }, termos: "hoje atendimentos horarios" },
  { rota: "/usuarios", rotulo: "Usuários", descricao: "Contas, papéis e acesso", grupo: "administracao", icone: "UserCog", permissao: "usuarios:ver", filtros: { periodo: false, produto: false }, termos: "contas papeis senha" },
  { rota: "/logs", rotulo: "Logs", descricao: "Auditoria de acessos e ações", grupo: "administracao", icone: "ScrollText", permissao: "logs:ver", filtros: { periodo: false, produto: false }, termos: "auditoria seguranca login" },
  { rota: "/configuracoes", rotulo: "Configurações", descricao: "Integrações e sincronização", grupo: "administracao", icone: "Settings", permissao: "configuracoes:ver", filtros: { periodo: false, produto: false }, termos: "sincronizar integracoes api" },
];

export function itensVisiveis(ator: Ator): ItemNavegacao[] {
  return NAVEGACAO.filter((i) => can(ator, i.permissao));
}

/** Item da rota atual (a mais específica que casa com o caminho). */
export function itemDaRota(caminho: string): ItemNavegacao | undefined {
  return [...NAVEGACAO]
    .sort((a, b) => b.rota.length - a.rota.length)
    .find((i) => (i.rota === "/" ? caminho === "/" : caminho === i.rota || caminho.startsWith(`${i.rota}/`)));
}

/** Página inicial de cada usuário: a primeira que ele pode ver. */
export function rotaInicial(ator: Ator): string {
  return itensVisiveis(ator)[0]?.rota ?? "/login";
}
