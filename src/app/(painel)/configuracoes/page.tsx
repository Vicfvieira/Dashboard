import { Suspense } from "react";
import { CalendarClock, KeyRound, PlugZap, Server } from "lucide-react";
import { CabecalhoPagina } from "@/components/painel/cabecalho-pagina";
import { EsqueletoTabela } from "@/components/painel/esqueletos";
import { EstadoVazio } from "@/components/painel/estado-vazio";
import { Badge } from "@/components/ui/badge";
import { historicoSincronizacoes, statusDasIntegracoes, type LinhaHistorico, type StatusFonte } from "@/lib/dados/integracoes";
import { formatarData, formatarDataHora, formatarDia, formatarDuracao, formatarInteiro, tempoRelativo } from "@/lib/formato";
import { can, requirePermission } from "@/lib/rbac";
import { cn } from "@/lib/utils";
import { BotaoSincronizar } from "./botao-sincronizar";

export const metadata = { title: "Configurações" };
// A sincronização manual roda nesta rota (Server Action): até 60 s.
export const maxDuration = 60;

export default function Pagina() {
  return (
    <Suspense fallback={<EsqueletoTabela />}>
      <Conteudo />
    </Suspense>
  );
}

const NOME_FONTE = { PELAGEM: "Pelagem Studio", LIRIO: "Lírio" } as const;
const NOME_GATILHO = { MANUAL: "Manual", CRON: "Agendada", SEED: "Seed" } as const;

function BadgeStatus({ status }: { status: LinhaHistorico["status"] | null }) {
  if (status === null) return <Badge>Nunca sincronizada</Badge>;
  const mapa = {
    SUCESSO: { v: "sucesso", t: "Sucesso" },
    PARCIAL: { v: "alerta", t: "Parcial" },
    ERRO: { v: "erro", t: "Falhou" },
    EXECUTANDO: { v: "info", t: "Em andamento" },
  } as const;
  const { v, t } = mapa[status];
  return <Badge variant={v}>{t}</Badge>;
}

async function Conteudo() {
  const usuario = await requirePermission("configuracoes:ver");
  const podeSincronizar = can(usuario, "sync:executar");
  const motivo = usuario.somenteLeitura ? "O acesso de demonstração é somente leitura." : "Somente a administração pode disparar sincronizações.";
  const [fontes, historico] = await Promise.all([statusDasIntegracoes(), historicoSincronizacoes()]);
  const agora = new Date();

  return (
    <div className="grid gap-8">
      <CabecalhoPagina
        titulo="Configurações"
        descricao="Integrações com o Pelagem Studio e a Lírio: estado de cada fonte, dados que chegaram ao Painelux e histórico das sincronizações."
        acoes={<BotaoSincronizar fonte="TODAS" permitido={podeSincronizar} motivoBloqueio={motivo} rotulo="Sincronizar agora" />}
      />

      <section aria-labelledby="titulo-fontes" className="grid gap-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="titulo-fontes" className="text-sm font-semibold">Fontes de dados</h2>
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <CalendarClock className="size-3.5" aria-hidden="true" />
            Sincronização automática todo dia às 06:00 (Brasília), via Vercel Cron
          </p>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          {fontes.map((f) => (
            <CartaoFonte key={f.fonte} fonte={f} agora={agora} podeSincronizar={podeSincronizar} motivo={motivo} />
          ))}
        </div>
      </section>

      <section aria-labelledby="titulo-historico" className="grid gap-3">
        <h2 id="titulo-historico" className="text-sm font-semibold">Histórico de sincronizações</h2>
        {historico.length === 0 ? (
          <EstadoVazio icone={PlugZap} titulo="Nenhuma sincronização registrada" descricao="A primeira execução automática acontece às 06:00. A administração pode sincronizar agora pelo botão acima." />
        ) : (
          <TabelaHistorico linhas={historico} />
        )}
      </section>
    </div>
  );
}

function CartaoFonte({ fonte: f, agora, podeSincronizar, motivo }: { fonte: StatusFonte; agora: Date; podeSincronizar: boolean; motivo: string }) {
  const api = f.cobertura.find((c) => c.origem === "API");
  const seed = f.cobertura.find((c) => c.origem === "SEED");
  const unidade = f.fonte === "PELAGEM" ? "agendamentos" : "linhas de eventos";
  const formatarLimite = (d: Date | null) => (d ? (f.fonte === "PELAGEM" ? formatarData(d) : formatarDia(d)) : "—");

  return (
    <article className="flex flex-col rounded-xl border border-border bg-card" aria-label={NOME_FONTE[f.fonte]}>
      <header className="flex items-start justify-between gap-4 border-b border-border p-4">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <span className={cn("size-2.5 rounded-full", f.fonte === "PELAGEM" ? "bg-pelagem" : "bg-lirio")} aria-hidden="true" />
            {NOME_FONTE[f.fonte]}
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            {f.ultimoSucesso ? `Último sucesso ${tempoRelativo(f.ultimoSucesso, agora)} (${formatarDataHora(f.ultimoSucesso)})` : "Ainda sem sincronização bem-sucedida"}
          </p>
        </div>
        <BadgeStatus status={f.ultima?.status ?? null} />
      </header>

      <dl className="grid flex-1 gap-3 p-4 text-sm sm:grid-cols-2">
        <div>
          <dt className="flex items-center gap-1.5 text-xs text-muted-foreground"><Server className="size-3.5" aria-hidden="true" /> Endpoint</dt>
          <dd className="mt-1 truncate font-mono text-xs">{f.host ? `${f.host}/api/integracao` : "Não configurado"}</dd>
        </div>
        <div>
          <dt className="flex items-center gap-1.5 text-xs text-muted-foreground"><KeyRound className="size-3.5" aria-hidden="true" /> Chave x-api-key</dt>
          <dd className="mt-1 text-xs">{f.chaveConfigurada ? "Configurada no ambiente (valor nunca exibido)" : <span className="text-destructive">Ausente</span>}</dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-xs text-muted-foreground">Dados no Painelux</dt>
          <dd className="mt-1 grid gap-1 text-xs">
            <span>
              <strong className="font-semibold tabular-nums">{formatarInteiro(api?.linhas ?? 0)}</strong> {unidade} vindos da API
              {api ? ` · ${formatarLimite(api.de)} a ${formatarLimite(api.ate)}` : ""}
            </span>
            {seed && seed.linhas > 0 && (
              <span className="text-muted-foreground">
                {formatarInteiro(seed.linhas)} fictícios do seed · {formatarLimite(seed.de)} a {formatarLimite(seed.ate)}
              </span>
            )}
            {f.oferta && (
              <span className="text-muted-foreground">
                Oferta em {formatarDia(f.oferta.data)}: {formatarInteiro(f.oferta.ativas)} profissionais ativas somadas em {formatarInteiro(f.oferta.contagens)} pares distrito × categoria ({f.oferta.origem === "API" ? "API" : "seed"})
              </span>
            )}
          </dd>
        </div>
        {f.ultima && (
          <div className="sm:col-span-2">
            <dt className="text-xs text-muted-foreground">Última execução</dt>
            <dd className={cn("mt-1 text-xs", f.ultima.status === "ERRO" && "text-destructive")}>
              {formatarDataHora(f.ultima.iniciadoEm)}
              {f.ultima.duracaoMs !== null ? ` · ${formatarDuracao(f.ultima.duracaoMs)}` : ""} · {f.ultima.erro ?? f.ultima.resumo ?? "—"}
            </dd>
          </div>
        )}
      </dl>

      <footer className="border-t border-border p-3">
        <BotaoSincronizar fonte={f.fonte} permitido={podeSincronizar} motivoBloqueio={motivo} rotulo="Sincronizar só esta fonte" variante="outline" />
      </footer>
    </article>
  );
}

function TabelaHistorico({ linhas }: { linhas: LinhaHistorico[] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card">
      <table className="w-full min-w-[760px] text-sm">
        <caption className="sr-only">Últimas {linhas.length} sincronizações, da mais recente para a mais antiga</caption>
        <thead>
          <tr className="border-b border-border text-left text-xs text-muted-foreground">
            <th scope="col" className="px-4 py-2.5 font-medium">Início</th>
            <th scope="col" className="px-4 py-2.5 font-medium">Fonte</th>
            <th scope="col" className="px-4 py-2.5 font-medium">Origem</th>
            <th scope="col" className="px-4 py-2.5 font-medium">Status</th>
            <th scope="col" className="px-4 py-2.5 text-right font-medium">Duração</th>
            <th scope="col" className="px-4 py-2.5 text-right font-medium">Lidos</th>
            <th scope="col" className="px-4 py-2.5 text-right font-medium">Gravados</th>
            <th scope="col" className="px-4 py-2.5 font-medium">Detalhe</th>
          </tr>
        </thead>
        <tbody>
          {linhas.map((l) => (
            <tr key={l.id} className="border-b border-border/60 last:border-0 hover:bg-muted/40">
              <td className="px-4 py-2.5 whitespace-nowrap tabular-nums">{formatarDataHora(l.iniciadoEm)}</td>
              <td className="px-4 py-2.5 whitespace-nowrap">
                <span className="flex items-center gap-2">
                  <span className={cn("size-2 rounded-full", l.fonte === "PELAGEM" ? "bg-pelagem" : "bg-lirio")} aria-hidden="true" />
                  {NOME_FONTE[l.fonte]}
                </span>
              </td>
              <td className="px-4 py-2.5 whitespace-nowrap text-muted-foreground">
                {NOME_GATILHO[l.gatilho]}
                {l.disparadoPor ? ` · ${l.disparadoPor}` : ""}
              </td>
              <td className="px-4 py-2.5"><BadgeStatus status={l.status} /></td>
              <td className="px-4 py-2.5 text-right whitespace-nowrap tabular-nums">{l.duracaoMs !== null ? formatarDuracao(l.duracaoMs) : "—"}</td>
              <td className="px-4 py-2.5 text-right tabular-nums">{formatarInteiro(l.registrosLidos)}</td>
              <td className="px-4 py-2.5 text-right tabular-nums">{formatarInteiro(l.registrosGravados)}</td>
              <td className={cn("max-w-80 truncate px-4 py-2.5 text-xs", l.erro ? "text-destructive" : "text-muted-foreground")} title={l.erro ?? l.resumo ?? undefined}>
                {l.erro ?? l.resumo ?? "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
