"use client";

import { MapaCalor } from "@/components/graficos/mapa-calor";
import type { CelulaCalor } from "@/lib/dados/pelagem";
import { formatarInteiro } from "@/lib/formato";
import { DIA_SEMANA, DIAS_FUNCIONAMENTO, HORAS_FUNCIONAMENTO } from "@/lib/rotulos-pelagem";

/** Procura real por horário: agendamentos não cancelados por dia da semana e hora de início. */
export function MapaCalorPelagem({ celulas, descricaoIntervalo }: { celulas: CelulaCalor[]; descricaoIntervalo: string }) {
  const dados = celulas.map((c) => ({ diaSemana: c.diaSemana, hora: c.hora, valor: c.atendimentos }));
  const soma = <K,>(chave: (c: (typeof dados)[number]) => K) => {
    const m = new Map<K, number>();
    for (const c of dados) m.set(chave(c), (m.get(chave(c)) ?? 0) + c.valor);
    return [...m.entries()].reduce<[K, number] | null>((a, b) => (!a || b[1] > a[1] ? b : a), null);
  };
  const pico = dados.reduce<(typeof dados)[number] | null>((a, c) => (!a || c.valor > a.valor ? c : a), null);
  const dia = soma((c) => c.diaSemana);
  const hora = soma((c) => c.hora);

  return (
    <MapaCalor
      titulo="Mapa de calor: dia × hora"
      descricao={`Agendamentos não cancelados por dia da semana e hora de início em ${descricaoIntervalo}. Quanto mais forte a cor, maior a procura.`}
      recurso="pelagem-mapa-calor"
      celulas={dados}
      dias={DIAS_FUNCIONAMENTO}
      horas={HORAS_FUNCIONAMENTO}
      cor="var(--serie-pelagem)"
      textoForte="#17110b"
      unidade={{ singular: "agendamento", plural: "agendamentos" }}
      className="lg:col-span-2"
      resumo={
        pico && pico.valor > 0 ? (
          <>
            Pico em{" "}
            <span className="font-medium text-foreground">
              {DIA_SEMANA[pico.diaSemana]?.longo} às {pico.hora}h
            </span>{" "}
            ({formatarInteiro(pico.valor)}). Dia mais cheio: {dia ? DIA_SEMANA[dia[0]]?.longo : "—"}; horário mais procurado: {hora ? `${hora[0]}h` : "—"}.
          </>
        ) : (
          "Sem agendamentos no período."
        )
      }
    />
  );
}
