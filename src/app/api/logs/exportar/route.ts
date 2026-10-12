import { registrarAuditoria } from "@/lib/auditoria";
import { montarCsv } from "@/lib/csv";
import { hojeSP } from "@/lib/filtros";
import { lerFiltrosLogs, MAX_EXPORTACAO, queryLogs, ROTULO_ACAO, whereLogs } from "@/lib/logs";
import { prisma } from "@/lib/prisma";
import { requirePermissionApi } from "@/lib/rbac";

const dataHora = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "medium" });

/** GET /api/logs/exportar?<filtros da tela> — CSV da auditoria (ADMIN), auditado antes do envio. */
export async function GET(request: Request) {
  const acesso = await requirePermissionApi("logs:exportar");
  if (!acesso.ok) return acesso.resposta;

  const hoje = hojeSP();
  const filtros = lerFiltrosLogs(Object.fromEntries(new URL(request.url).searchParams), hoje);
  const eventos = await prisma.auditLog.findMany({
    where: whereLogs(filtros),
    orderBy: { criadoEm: "desc" },
    take: MAX_EXPORTACAO,
    select: { criadoEm: true, acao: true, sucesso: true, email: true, ip: true, userAgent: true, alvo: true, detalhes: true, usuario: { select: { nome: true } } },
  });

  await registrarAuditoria({
    acao: "EXPORTACAO",
    usuarioId: acesso.usuario.id,
    email: acesso.usuario.email,
    alvo: "export:logs.csv",
    detalhes: { formato: "csv", linhas: eventos.length, filtros: queryLogs({ ...filtros, pagina: 1 }, hoje).slice(1) },
  });

  const csv = montarCsv(
    ["Data e hora (Brasília)", "Ação", "Código", "Resultado", "Pessoa", "E-mail", "IP", "Navegador", "Alvo", "Detalhes"],
    eventos.map((e) => [
      dataHora.format(e.criadoEm),
      ROTULO_ACAO[e.acao],
      e.acao,
      e.sucesso ? "sucesso" : "falha",
      e.usuario?.nome ?? null,
      e.email,
      e.ip,
      e.userAgent,
      e.alvo,
      e.detalhes === null ? null : JSON.stringify(e.detalhes),
    ]),
  );
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="painelux-logs-${filtros.de}-a-${filtros.ate}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}
