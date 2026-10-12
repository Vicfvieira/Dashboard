/**
 * Matriz de permissões do Painelux (módulo puro: pode ir para o navegador para esconder itens de
 * interface, mas a decisão que vale é sempre a do servidor, via src/lib/rbac.ts).
 *
 * Permissões de escrita são negadas a usuários somente leitura (o acesso de demonstração),
 * qualquer que seja o papel.
 */
import type { Papel } from "@prisma/client";

export const PERMISSOES = {
  "visao-geral:ver": { descricao: "Ver a visão geral consolidada", escrita: false },
  "pelagem:ver": { descricao: "Ver o dashboard do Pelagem", escrita: false },
  "pelagem:financeiro": { descricao: "Ver faturamento, ticket médio e valores", escrita: false },
  "lirio:ver": { descricao: "Ver o dashboard da Lírio", escrita: false },
  "mercado:ver": { descricao: "Ver o mapa de mercado", escrita: false },
  "clientes:ver": { descricao: "Ver clientes (hash anônimo) e retenção", escrita: false },
  "agenda:ver": { descricao: "Ver a agenda do dia do Pelagem", escrita: false },
  "insights:ver": { descricao: "Ver insights automáticos", escrita: false },
  "dados:exportar": { descricao: "Exportar gráficos e tabelas (PNG e CSV)", escrita: false },
  "configuracoes:ver": { descricao: "Ver configurações e status das integrações", escrita: false },
  "sync:executar": { descricao: "Disparar sincronização com as APIs", escrita: true },
  "usuarios:ver": { descricao: "Ver usuários", escrita: false },
  "usuarios:gerenciar": { descricao: "Criar, editar papel, desativar e redefinir senha", escrita: true },
  "logs:ver": { descricao: "Ver logs de auditoria", escrita: false },
  "logs:exportar": { descricao: "Exportar logs de auditoria", escrita: false },
  "infra:ver": { descricao: "Ver dados de infraestrutura (Neon e Vercel)", escrita: false },
} as const satisfies Record<string, { descricao: string; escrita: boolean }>;

export type Permissao = keyof typeof PERMISSOES;

export const TODAS_PERMISSOES = Object.keys(PERMISSOES) as Permissao[];

const DASHBOARDS: readonly Permissao[] = [
  "visao-geral:ver",
  "pelagem:ver",
  "pelagem:financeiro",
  "lirio:ver",
  "mercado:ver",
  "clientes:ver",
  "agenda:ver",
  "insights:ver",
];

export const MATRIZ: Readonly<Record<Papel, ReadonlySet<Permissao>>> = {
  ADMIN: new Set(TODAS_PERMISSOES),
  GESTOR: new Set<Permissao>([...DASHBOARDS, "dados:exportar", "configuracoes:ver"]),
  ATENDENTE: new Set<Permissao>(["agenda:ver"]),
};

export interface Ator {
  papel: Papel;
  somenteLeitura: boolean;
}

export function can(ator: Ator | null | undefined, permissao: Permissao): boolean {
  if (!ator) return false;
  if (!MATRIZ[ator.papel].has(permissao)) return false;
  if (ator.somenteLeitura && PERMISSOES[permissao].escrita) return false;
  return true;
}

export function permissoesDe(ator: Ator): Permissao[] {
  return TODAS_PERMISSOES.filter((p) => can(ator, p));
}

/** Rótulos dos papéis para a interface. */
export const NOME_PAPEL: Record<Papel, string> = {
  ADMIN: "Administração",
  GESTOR: "Gestão",
  ATENDENTE: "Atendimento",
};
