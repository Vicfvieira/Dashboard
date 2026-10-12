import { Suspense } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Download, Filter, ScrollText } from "lucide-react";
import { CabecalhoPagina } from "@/components/painel/cabecalho-pagina";
import { EsqueletoTabela } from "@/components/painel/esqueletos";
import { EstadoVazio } from "@/components/painel/estado-vazio";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { hojeSP } from "@/lib/filtros";
import { formatarInteiro } from "@/lib/formato";
import { ACOES, GRUPOS, lerFiltrosLogs, POR_PAGINA, queryLogs, ROTULO_ACAO, whereLogs } from "@/lib/logs";
import { prisma } from "@/lib/prisma";
import { can, requirePermission } from "@/lib/rbac";
import { cn } from "@/lib/utils";

export const metadata = { title: "Logs" };

const dataHora = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" });
const campo = "h-8 w-full min-w-0 rounded-md border border-border bg-card px-2 text-xs text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none";

/** Navegador e sistema em poucas palavras (o user-agent completo fica nos detalhes). */
function navegador(ua: string | null): string {
  if (!ua) return "—";
  const nav = /Edg\//.test(ua) ? "Edge" : /Firefox\//.test(ua) ? "Firefox" : /Chrome\//.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari" : /curl|node|undici/i.test(ua) ? "Script" : "Outro";
  const so = /Windows/.test(ua) ? "Windows" : /Android/.test(ua) ? "Android" : /iPhone|iPad/.test(ua) ? "iOS" : /Mac OS X/.test(ua) ? "macOS" : /Linux/.test(ua) ? "Linux" : "";
  return so ? `${nav} · ${so}` : nav;
}

export default function Pagina({ searchParams }: PageProps<"/logs">) {
  return (
    <Suspense fallback={<EsqueletoTabela />}>
      <Conteudo searchParams={searchParams} />
    </Suspense>
  );
}

async function Conteudo({ searchParams }: { searchParams: PageProps<"/logs">["searchParams"] }) {
  const usuario = await requirePermission("logs:ver");
  const hoje = hojeSP();
  const f = lerFiltrosLogs(await searchParams, hoje);
  const where = whereLogs(f);
  const semFiltroDeAcao = whereLogs({ ...f, acao: "todas", resultado: "todos" });

  const [total, eventos, porAcao] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      orderBy: { criadoEm: "desc" },
      skip: (f.pagina - 1) * POR_PAGINA,
      take: POR_PAGINA,
      select: { id: true, criadoEm: true, acao: true, sucesso: true, email: true, ip: true, userAgent: true, alvo: true, detalhes: true, usuario: { select: { nome: true } } },
    }),
    prisma.auditLog.groupBy({ by: ["acao"], where: semFiltroDeAcao, _count: { _all: true } }),
  ]);
  const conta = (acoes: readonly string[]) => porAcao.filter((g) => acoes.includes(g.acao)).reduce((t, g) => t + g._count._all, 0);
  const paginas = Math.max(1, Math.ceil(total / POR_PAGINA));
  const resumo = [
    { rotulo: "Eventos no período", valor: porAcao.reduce((t, g) => t + g._count._all, 0), href: queryLogs(f, hoje, { acao: "todas", pagina: 1 }) },
    { rotulo: "Falhas e bloqueios de login", valor: conta(["LOGIN_FALHA", "LOGIN_BLOQUEADO"]), href: queryLogs(f, hoje, { acao: "seguranca", pagina: 1 }), alerta: true },
    { rotulo: "Acessos negados", valor: conta(["ACESSO_NEGADO"]), href: queryLogs(f, hoje, { acao: "ACESSO_NEGADO", pagina: 1 }), alerta: true },
    { rotulo: "Mudanças em contas", valor: conta(GRUPOS.contas), href: queryLogs(f, hoje, { acao: "contas", pagina: 1 }) },
    { rotulo: "Exportações", valor: conta(["EXPORTACAO"]), href: queryLogs(f, hoje, { acao: "EXPORTACAO", pagina: 1 }) },
  ];
  const exportar = `/api/logs/exportar${queryLogs({ ...f, pagina: 1 }, hoje)}`;

  return (
    <div className="grid grid-cols-1 gap-6">
      <CabecalhoPagina
        titulo="Logs de auditoria"
        descricao="Logins, acessos negados, mudanças em contas, sincronizações e exportações, com IP e navegador. Senhas e chaves nunca são registradas."
        acoes={
          can(usuario, "logs:exportar") && (
            <Button asChild variant="outline" size="sm">
              <a href={exportar} download>
                <Download aria-hidden="true" />
                Exportar CSV ({formatarInteiro(Math.min(total, 10_000))})
              </a>
            </Button>
          )
        }
      />

      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5" aria-label="Resumo do período">
        {resumo.map((r) => (
          <li key={r.rotulo}>
            <Link href={`/logs${r.href}`} className="flex h-full flex-col rounded-xl border border-border bg-card p-3 transition-colors hover:border-primary/40 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none">
              <span className="text-[11px] text-muted-foreground">{r.rotulo}</span>
              <span className={cn("mt-1 text-xl font-semibold tabular-nums", r.alerta && r.valor > 0 && "text-destructive")}>{formatarInteiro(r.valor)}</span>
            </Link>
          </li>
        ))}
      </ul>

      <form method="get" action="/logs" className="grid grid-cols-1 gap-3 rounded-xl border border-border bg-card p-4 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)_minmax(0,1.4fr)_minmax(0,0.8fr)_minmax(0,0.8fr)_auto] lg:items-end">
        <label className="grid min-w-0 gap-1 text-[11px] font-medium text-muted-foreground">
          Ação
          <select name="acao" defaultValue={f.acao} className={campo}>
            <option value="todas">Todas as ações</option>
            <optgroup label="Atalhos">
              <option value="seguranca">Segurança (falhas, bloqueios e negações)</option>
              <option value="contas">Mudanças em contas</option>
            </optgroup>
            <optgroup label="Ação específica">
              {ACOES.map((a) => (
                <option key={a} value={a}>
                  {ROTULO_ACAO[a]}
                </option>
              ))}
            </optgroup>
          </select>
        </label>
        <label className="grid min-w-0 gap-1 text-[11px] font-medium text-muted-foreground">
          Resultado
          <select name="resultado" defaultValue={f.resultado} className={campo}>
            <option value="todos">Todos</option>
            <option value="sucesso">Sucesso</option>
            <option value="falha">Falha</option>
          </select>
        </label>
        <label className="grid min-w-0 gap-1 text-[11px] font-medium text-muted-foreground">
          Buscar
          <input type="search" name="q" defaultValue={f.busca} maxLength={100} placeholder="E-mail, nome, IP ou alvo" className={campo} />
        </label>
        <label className="grid min-w-0 gap-1 text-[11px] font-medium text-muted-foreground">
          De
          <input type="date" name="de" defaultValue={f.de} max={hoje} className={campo} />
        </label>
        <label className="grid min-w-0 gap-1 text-[11px] font-medium text-muted-foreground">
          Até
          <input type="date" name="ate" defaultValue={f.ate} max={hoje} className={campo} />
        </label>
        <div className="flex gap-2">
          <Button type="submit" size="sm">
            <Filter aria-hidden="true" />
            Filtrar
          </Button>
          <Button asChild type="button" size="sm" variant="ghost">
            <Link href="/logs">Limpar</Link>
          </Button>
        </div>
      </form>

      {eventos.length === 0 ? (
        <EstadoVazio icone={ScrollText} titulo="Nenhum evento com estes filtros" descricao="Amplie as datas ou limpe os filtros. Os logs guardam todo o histórico desde a implantação." />
      ) : (
        <section aria-labelledby="titulo-eventos" className="rounded-xl border border-border bg-card">
          <h2 id="titulo-eventos" className="px-4 pt-4 text-sm font-semibold">
            {formatarInteiro(total)} {total === 1 ? "evento" : "eventos"}
          </h2>
          <div className="relative mt-3 overflow-x-auto border-y border-border">
            <table className="w-full min-w-[880px] text-xs">
              <caption className="sr-only">Eventos de auditoria, do mais recente para o mais antigo</caption>
              <thead className="bg-muted/40 text-left text-muted-foreground">
                <tr>
                  <th scope="col" className="px-4 py-2 font-medium">Quando (Brasília)</th>
                  <th scope="col" className="px-3 py-2 font-medium">Ação</th>
                  <th scope="col" className="px-3 py-2 font-medium">Quem</th>
                  <th scope="col" className="px-3 py-2 font-medium">IP</th>
                  <th scope="col" className="px-3 py-2 font-medium">Navegador</th>
                  <th scope="col" className="px-3 py-2 font-medium">Alvo e detalhes</th>
                </tr>
              </thead>
              <tbody>
                {eventos.map((e) => (
                  <tr key={e.id} className="border-t border-border/60 align-top">
                    <td className="px-4 py-2 whitespace-nowrap tabular-nums">{dataHora.format(e.criadoEm)}</td>
                    <td className="px-3 py-2">
                      <Badge variant={!e.sucesso ? "erro" : e.acao === "ACESSO_NEGADO" || e.acao === "LOGIN_BLOQUEADO" ? "alerta" : "neutro"}>
                        {ROTULO_ACAO[e.acao]}
                        {/* Ações administrativas recusadas pela regra (ex.: último ADMIN) ficam com sucesso = false. */}
                        {!e.sucesso && !["LOGIN_FALHA", "LOGIN_BLOQUEADO", "ACESSO_NEGADO"].includes(e.acao) && " · recusada"}
                      </Badge>
                    </td>
                    <td className="px-3 py-2">
                      {e.usuario?.nome && <span className="block font-medium">{e.usuario.nome}</span>}
                      <span className="text-muted-foreground">{e.email ?? "—"}</span>
                    </td>
                    <td className="px-3 py-2 font-mono whitespace-nowrap">{e.ip ?? "—"}</td>
                    <td className="px-3 py-2 whitespace-nowrap" title={e.userAgent ?? undefined}>
                      {navegador(e.userAgent)}
                    </td>
                    <td className="max-w-[22rem] px-3 py-2">
                      {e.alvo && <code className="block truncate font-mono text-[11px]">{e.alvo}</code>}
                      {(e.detalhes !== null || e.userAgent) && (
                        <details className="mt-0.5">
                          <summary className="cursor-pointer text-[11px] text-muted-foreground hover:text-foreground">Detalhes</summary>
                          <pre className="mt-1 max-h-48 overflow-auto rounded bg-muted/50 p-2 font-mono text-[11px] whitespace-pre-wrap break-all">
                            {JSON.stringify({ ...(e.detalhes && typeof e.detalhes === "object" ? e.detalhes : { valor: e.detalhes }), userAgent: e.userAgent }, null, 2)}
                          </pre>
                        </details>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <nav aria-label="Paginação dos logs" className="flex items-center justify-between gap-3 px-4 py-2.5 text-xs text-muted-foreground">
            <span>
              {formatarInteiro((f.pagina - 1) * POR_PAGINA + 1)}–{formatarInteiro(Math.min(total, f.pagina * POR_PAGINA))} de {formatarInteiro(total)}
            </span>
            <div className="flex items-center gap-1">
              <span className="mr-2">
                Página {f.pagina} de {paginas}
              </span>
              {f.pagina > 1 ? (
                <Button asChild variant="ghost" size="icon" className="size-7">
                  <Link href={`/logs${queryLogs(f, hoje, { pagina: f.pagina - 1 })}`} aria-label="Página anterior">
                    <ChevronLeft aria-hidden="true" />
                  </Link>
                </Button>
              ) : (
                <Button variant="ghost" size="icon" className="size-7" disabled aria-label="Página anterior">
                  <ChevronLeft aria-hidden="true" />
                </Button>
              )}
              {f.pagina < paginas ? (
                <Button asChild variant="ghost" size="icon" className="size-7">
                  <Link href={`/logs${queryLogs(f, hoje, { pagina: f.pagina + 1 })}`} aria-label="Próxima página">
                    <ChevronRight aria-hidden="true" />
                  </Link>
                </Button>
              ) : (
                <Button variant="ghost" size="icon" className="size-7" disabled aria-label="Próxima página">
                  <ChevronRight aria-hidden="true" />
                </Button>
              )}
            </div>
          </nav>
        </section>
      )}
    </div>
  );
}
