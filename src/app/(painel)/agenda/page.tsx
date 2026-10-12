import { Suspense } from "react";
import Link from "next/link";
import { CalendarOff, CalendarX2, Car, ChevronLeft, ChevronRight, Clock } from "lucide-react";
import { z } from "zod";
import { CabecalhoPagina } from "@/components/painel/cabecalho-pagina";
import { EsqueletoTabela } from "@/components/painel/esqueletos";
import { EstadoVazio } from "@/components/painel/estado-vazio";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { abertoNoDia, CAPACIDADE_POR_SLOT, horaSP, ocupacaoPorSlot, proximoAtendimento, proximoDiaAberto, SLOTS, type ItemAgenda } from "@/lib/agenda";
import { agendaDoDia } from "@/lib/dados/agenda";
import { hojeSP } from "@/lib/filtros";
import { formatarDataHora, formatarPercentual, tempoRelativo } from "@/lib/formato";
import { requirePermission } from "@/lib/rbac";
import { nomeEspecie, PORTE } from "@/lib/rotulos-pelagem";
import { cn } from "@/lib/utils";

export const metadata = { title: "Agenda do dia" };

const diaLongo = new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
const diaCurto = new Intl.DateTimeFormat("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit", timeZone: "UTC" });
const DIA_MS = 86_400_000;
const somarDias = (d: string, n: number) => new Date(Date.parse(`${d}T00:00:00Z`) + n * DIA_MS).toISOString().slice(0, 10);
const fmt = (d: string, f: Intl.DateTimeFormat) => f.format(new Date(`${d}T00:00:00Z`)).replace(".", "");

const STATUS: Record<ItemAgenda["status"], { rotulo: string; variante: "neutro" | "sucesso" | "erro" | "info" }> = {
  AGENDADO: { rotulo: "Agendado", variante: "info" },
  CONCLUIDO: { rotulo: "Concluído", variante: "sucesso" },
  CANCELADO: { rotulo: "Cancelado", variante: "erro" },
};

export default function Pagina({ searchParams }: PageProps<"/agenda">) {
  return (
    <Suspense fallback={<EsqueletoTabela />}>
      <Conteudo searchParams={searchParams} />
    </Suspense>
  );
}

async function Conteudo({ searchParams }: { searchParams: PageProps<"/agenda">["searchParams"] }) {
  await requirePermission("agenda:ver");
  const agora = new Date();
  const hoje = hojeSP(agora);
  const sp = await searchParams;
  const pedido = Array.isArray(sp.dia) ? sp.dia[0] : sp.dia;
  // Até 30 dias para trás ou para frente (a API do Pelagem aceita agendamentos com 30 dias de antecedência).
  const dia = z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .refine((d) => !Number.isNaN(Date.parse(`${d}T00:00:00Z`)) && d >= somarDias(hoje, -30) && d <= somarDias(hoje, 30))
    .catch(hoje)
    .parse(pedido ?? hoje);
  const ehHoje = dia === hoje;
  const anterior = proximoDiaAberto(dia, -1);
  const seguinte = proximoDiaAberto(dia, 1);
  const link = (d: string) => (d === hoje ? "/agenda" : `/agenda?dia=${d}`);

  const navegacao = (
    <nav aria-label="Escolher dia" className="flex items-center gap-1">
      <Button asChild variant="outline" size="icon" className="size-8">
        <Link href={link(anterior)} aria-label={`Dia anterior com atendimento: ${fmt(anterior, diaLongo)}`}>
          <ChevronLeft aria-hidden="true" />
        </Link>
      </Button>
      {!ehHoje && (
        <Button asChild variant="outline" size="sm">
          <Link href="/agenda">Hoje</Link>
        </Button>
      )}
      <Button asChild variant="outline" size="icon" className="size-8">
        <Link href={link(seguinte)} aria-label={`Próximo dia com atendimento: ${fmt(seguinte, diaLongo)}`}>
          <ChevronRight aria-hidden="true" />
        </Link>
      </Button>
    </nav>
  );
  const titulo = `${ehHoje ? "Hoje, " : ""}${fmt(dia, diaLongo)}`;

  if (!abertoNoDia(dia)) {
    return (
      <div className="grid grid-cols-1 gap-6">
        <CabecalhoPagina titulo="Agenda do dia" marca="pelagem" descricao={titulo} acoes={navegacao} />
        <EstadoVazio
          icone={CalendarOff}
          titulo="O Pelagem não abre neste dia"
          descricao="O pet spa atende de terça a sábado, das 9h às 18h. Domingos e segundas não têm agenda."
          acao={
            <Button asChild size="sm">
              <Link href={link(seguinte)}>Ver {fmt(seguinte, diaLongo)}</Link>
            </Button>
          }
        />
      </div>
    );
  }

  const { itens, sincronizadoEm } = await agendaDoDia(dia);
  const ativos = itens.filter((i) => i.status !== "CANCELADO");
  const ocupacao = ocupacaoPorSlot(itens);
  // Ocupação limitada à capacidade; horários acima dela (encaixes) são sinalizados à parte.
  const usados = ocupacao.reduce((t, s) => t + Math.min(s.ocupados, CAPACIDADE_POR_SLOT), 0);
  const acima = ocupacao.filter((s) => s.ocupados > CAPACIDADE_POR_SLOT).length;
  const capacidade = SLOTS.length * CAPACIDADE_POR_SLOT;
  const agoraHHMM = horaSP(agora);
  const proximo = ehHoje ? proximoAtendimento(itens, agoraHHMM) : null;
  const porHorario = new Map<string, ItemAgenda[]>();
  for (const i of itens) porHorario.set(i.inicio, [...(porHorario.get(i.inicio) ?? []), i]);

  const numeros = [
    { rotulo: "Atendimentos", valor: String(ativos.length) },
    { rotulo: "Concluídos", valor: String(itens.filter((i) => i.status === "CONCLUIDO").length) },
    { rotulo: "A atender", valor: String(itens.filter((i) => i.status === "AGENDADO").length) },
    { rotulo: "Cancelados", valor: String(itens.filter((i) => i.status === "CANCELADO").length) },
    { rotulo: "Ocupação dos horários", valor: formatarPercentual(usados / capacidade) },
  ];

  return (
    <div className="grid grid-cols-1 gap-6">
      <CabecalhoPagina
        titulo="Agenda do dia"
        marca="pelagem"
        descricao={`${titulo}. Funcionamento das 9h às 18h, com 2 banhistas por horário.`}
        acoes={navegacao}
      />

      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5" aria-label="Resumo do dia">
        {numeros.map((n) => (
          <li key={n.rotulo} className="rounded-xl border border-border bg-card p-3">
            <span className="text-[11px] text-muted-foreground">{n.rotulo}</span>
            <span className="mt-1 block text-xl font-semibold tabular-nums">{n.valor}</span>
          </li>
        ))}
      </ul>

      {proximo && (
        <p className="flex items-center gap-2 rounded-xl border border-primary/40 bg-primary/5 px-4 py-3 text-sm">
          <Clock className="size-4 shrink-0 text-primary-ink" aria-hidden="true" />
          <span>
            {proximo.inicio <= agoraHHMM ? "Em andamento" : "Próximo"}: <span className="font-medium">{proximo.inicio}</span> · {proximo.servico}, porte {proximo.porte}
            {proximo.especie ? ` (${nomeEspecie(proximo.especie).toLowerCase()})` : ""} · cliente {proximo.cliente}
          </span>
        </p>
      )}

      <section aria-labelledby="titulo-ocupacao" className="rounded-xl border border-border bg-card p-4">
        <h2 id="titulo-ocupacao" className="text-sm font-semibold">
          Ocupação por horário
        </h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Cada bloco é um horário de 30 minutos; cada ponto é um banhista ocupado (capacidade 2).
          {acima > 0 && <span className="text-warning"> {acima} {acima === 1 ? "horário tem" : "horários têm"} mais atendimentos que banhistas (encaixes).</span>}
        </p>
        <ol className="mt-3 grid grid-cols-6 gap-1.5 sm:grid-cols-9 lg:grid-cols-18" aria-label="Banhistas ocupados por horário">
          {ocupacao.map((s) => {
            const passou = ehHoje && s.slot < agoraHHMM.slice(0, 3) + (Number(agoraHHMM.slice(3)) >= 30 ? "30" : "00");
            return (
              <li
                key={s.slot}
                className={cn("flex flex-col items-center gap-1 rounded-md border px-1 py-1.5 text-[10px] tabular-nums", s.ocupados >= CAPACIDADE_POR_SLOT ? "border-serie-pelagem/60 bg-serie-pelagem/15" : "border-border", passou && "opacity-60")}
              >
                <span>{s.slot}</span>
                <span className="flex gap-0.5" aria-hidden="true">
                  {Array.from({ length: CAPACIDADE_POR_SLOT }, (_, k) => (
                    <span key={k} className={cn("size-2 rounded-full", k < s.ocupados ? "bg-serie-pelagem" : "border border-muted-foreground/50")} />
                  ))}
                </span>
                {s.ocupados > CAPACIDADE_POR_SLOT && <span className="font-medium text-warning">+{s.ocupados - CAPACIDADE_POR_SLOT}</span>}
                <span className="sr-only">
                  {s.ocupados} atendimentos para {CAPACIDADE_POR_SLOT} banhistas
                </span>
              </li>
            );
          })}
        </ol>
      </section>

      {itens.length === 0 ? (
        <EstadoVazio icone={CalendarX2} titulo="Nenhum atendimento neste dia" descricao="A agenda está livre. Os agendamentos chegam pela sincronização diária com o sistema do Pelagem." />
      ) : (
        <section aria-labelledby="titulo-lista-agenda" className="rounded-xl border border-border bg-card">
          <h2 id="titulo-lista-agenda" className="px-4 pt-4 text-sm font-semibold">
            Atendimentos
          </h2>
          <ol className="mt-3 divide-y divide-border/60 border-t border-border">
            {[...porHorario].map(([horario, lista]) => (
              <li key={horario} className="grid gap-2 px-4 py-3 sm:grid-cols-[4.5rem_1fr]">
                <span className={cn("text-sm font-semibold tabular-nums", ehHoje && horario < agoraHHMM && "text-muted-foreground")}>{horario}</span>
                <ul className="grid gap-2 sm:grid-cols-2">
                  {lista.map((i) => (
                    <li key={i.id} className={cn("rounded-lg border p-3 text-xs", i.id === proximo?.id ? "border-primary/50 bg-primary/5" : "border-border", i.status === "CANCELADO" && "opacity-70")}>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className={cn("text-sm font-medium", i.status === "CANCELADO" && "line-through")}>{i.servico}</span>
                        <Badge variant={STATUS[i.status].variante}>{STATUS[i.status].rotulo}</Badge>
                      </div>
                      <p className="mt-1 text-muted-foreground">
                        {i.inicio}–{i.fim} ({i.duracao} min) · {PORTE[i.porte]?.longo ?? i.porte}
                        {i.especie ? ` · ${nomeEspecie(i.especie)}` : ""}
                      </p>
                      <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-muted-foreground">
                        <span>
                          Cliente <code className="font-mono text-foreground">{i.cliente}</code>
                        </span>
                        {i.taxiDog && (
                          <span className="inline-flex items-center gap-1">
                            <Car className="size-3.5" aria-hidden="true" />
                            Táxi dog · {i.taxiDog}
                          </span>
                        )}
                      </p>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>
        </section>
      )}

      <p className="text-[11px] text-muted-foreground">
        {sincronizadoEm ? `Agenda sincronizada com o Pelagem ${tempoRelativo(sincronizadoEm, agora)} (${formatarDataHora(sincronizadoEm)}). ` : "Agenda ainda não sincronizada. "}
        Atendimentos marcados depois disso aparecem na próxima sincronização. Navegue pelos dias de funcionamento: {fmt(anterior, diaCurto)} ← → {fmt(seguinte, diaCurto)}.
      </p>
    </div>
  );
}
