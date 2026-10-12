"use client";

import { useState } from "react";
import { CartaoGrafico } from "@/components/graficos/cartao-grafico";
import type { ColunaTabela, LinhaTabela } from "@/components/graficos/exportar";
import type { CelulaCalor } from "@/lib/dados/pelagem";
import { formatarInteiro, formatarPercentual } from "@/lib/formato";
import { DIA_SEMANA, DIAS_FUNCIONAMENTO, HORAS_FUNCIONAMENTO } from "@/lib/rotulos-pelagem";

// Geometria do SVG (unidades do viewBox; o SVG escala com a largura do cartão).
const ROTULO_X = 44;
const TOPO = 22;
const CEL_L = 58;
const CEL_A = 34;
const VAO = 3;
const TOTAL_L = 52;

/** Escala sequencial de um matiz só: opacidade da série do Pelagem sobre o fundo do cartão. */
const intensidade = (v: number, max: number) => (v <= 0 || max <= 0 ? 0 : 0.14 + 0.86 * (v / max));
/** Texto escuro sobre células intensas (laranja forte), texto do tema nas claras. */
const corTexto = (i: number) => (i > 0.55 ? "#17110b" : "var(--foreground)");

/**
 * Mapa de calor dia da semana × hora de início dos agendamentos não cancelados (procura real por
 * horário). Feito em SVG próprio: o Recharts não tem heatmap e o SVG mantém a exportação em PNG.
 */
export function MapaCalor({ celulas, descricaoIntervalo }: { celulas: CelulaCalor[]; descricaoIntervalo: string }) {
  const [foco, setFoco] = useState<{ dia: number; hora: number } | null>(null);
  const dias = [...new Set([...DIAS_FUNCIONAMENTO, ...celulas.map((c) => c.diaSemana)])].sort((a, b) => a - b);
  const horas = [...new Set([...HORAS_FUNCIONAMENTO, ...celulas.map((c) => c.hora)])].sort((a, b) => a - b);
  const valor = (d: number, h: number) => celulas.find((c) => c.diaSemana === d && c.hora === h)?.atendimentos ?? 0;
  const max = Math.max(0, ...celulas.map((c) => c.atendimentos));
  const total = celulas.reduce((t, c) => t + c.atendimentos, 0);
  const totalDia = (d: number) => horas.reduce((t, h) => t + valor(d, h), 0);
  const totalHora = (h: number) => dias.reduce((t, d) => t + valor(d, h), 0);
  const pico = celulas.reduce<CelulaCalor | null>((a, c) => (!a || c.atendimentos > a.atendimentos ? c : a), null);
  const horaPico = horas.reduce((a, h) => (totalHora(h) > totalHora(a) ? h : a), horas[0] ?? 9);
  const diaPico = dias.reduce((a, d) => (totalDia(d) > totalDia(a) ? d : a), dias[0] ?? 2);

  const largura = ROTULO_X + horas.length * CEL_L + TOTAL_L;
  const altura = TOPO + dias.length * CEL_A + 4;

  const colunas: ColunaTabela[] = [{ chave: "dia", rotulo: "Dia", formato: "texto" }, ...horas.map((h) => ({ chave: `h${h}`, rotulo: `${h}h`, formato: "inteiro" as const })), { chave: "total", rotulo: "Total", formato: "inteiro" }];
  const linhas: LinhaTabela[] = dias.map((d) => ({ dia: DIA_SEMANA[d]?.longo ?? "", ...Object.fromEntries(horas.map((h) => [`h${h}`, valor(d, h)])), total: totalDia(d) }));

  const emFoco = foco ? valor(foco.dia, foco.hora) : null;

  return (
    <CartaoGrafico
      titulo="Mapa de calor: dia × hora"
      descricao={`Agendamentos não cancelados por dia da semana e hora de início em ${descricaoIntervalo}. Quanto mais forte a cor, maior a procura.`}
      recurso="pelagem-mapa-calor"
      colunas={colunas}
      linhas={linhas}
      className="lg:col-span-2"
    >
      <div className="mb-2 flex flex-wrap items-center justify-between gap-x-6 gap-y-2 text-xs">
        <p className="text-muted-foreground" aria-live="polite">
          {foco && emFoco !== null ? (
            <>
              <span className="font-medium text-foreground">
                {DIA_SEMANA[foco.dia]?.longo}, {foco.hora}h
              </span>
              : {formatarInteiro(emFoco)} agendamentos{total > 0 && ` (${formatarPercentual(emFoco / total)} do total)`}
            </>
          ) : pico && pico.atendimentos > 0 ? (
            <>
              Pico em <span className="font-medium text-foreground">{DIA_SEMANA[pico.diaSemana]?.longo} às {pico.hora}h</span> ({formatarInteiro(pico.atendimentos)}). Dia mais cheio: {DIA_SEMANA[diaPico]?.longo}; horário mais procurado: {horaPico}h.
            </>
          ) : (
            "Sem agendamentos no período."
          )}
        </p>
        <div className="flex items-center gap-1.5 text-muted-foreground" aria-hidden="true">
          <span>Menos</span>
          {[0.14, 0.35, 0.57, 0.78, 1].map((o) => (
            <span key={o} className="h-3 w-5 rounded-sm bg-serie-pelagem" style={{ opacity: o }} />
          ))}
          <span>Mais</span>
        </div>
      </div>
      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${largura} ${altura}`} className="block w-full min-w-[520px]" onMouseLeave={() => setFoco(null)}>
          {horas.map((h, i) => (
            <text key={h} x={ROTULO_X + i * CEL_L + CEL_L / 2} y={14} textAnchor="middle" fontSize={11} fill="var(--muted-foreground)">
              {h}h
            </text>
          ))}
          <text x={ROTULO_X + horas.length * CEL_L + TOTAL_L / 2} y={14} textAnchor="middle" fontSize={11} fill="var(--muted-foreground)">
            Total
          </text>
          {dias.map((d, li) => {
            const y = TOPO + li * CEL_A;
            return (
              <g key={d}>
                <text x={0} y={y + CEL_A / 2} dominantBaseline="central" fontSize={11} fill="var(--muted-foreground)">
                  {DIA_SEMANA[d]?.curto}
                </text>
                {horas.map((h, ci) => {
                  const v = valor(d, h);
                  const i = intensidade(v, max);
                  const x = ROTULO_X + ci * CEL_L;
                  const ativo = foco?.dia === d && foco.hora === h;
                  return (
                    <g key={h} onMouseEnter={() => setFoco({ dia: d, hora: h })}>
                      <rect x={x + VAO / 2} y={y + VAO / 2} width={CEL_L - VAO} height={CEL_A - VAO} rx={4} fill="var(--muted)" fillOpacity={0.45} />
                      {i > 0 && <rect x={x + VAO / 2} y={y + VAO / 2} width={CEL_L - VAO} height={CEL_A - VAO} rx={4} fill="var(--serie-pelagem)" fillOpacity={i} />}
                      {ativo && <rect x={x + VAO / 2} y={y + VAO / 2} width={CEL_L - VAO} height={CEL_A - VAO} rx={4} fill="none" stroke="var(--foreground)" strokeWidth={1.5} />}
                      {v > 0 && (
                        <text x={x + CEL_L / 2} y={y + CEL_A / 2} textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={500} fill={corTexto(i)}>
                          {v}
                        </text>
                      )}
                    </g>
                  );
                })}
                <text x={ROTULO_X + horas.length * CEL_L + TOTAL_L / 2} y={y + CEL_A / 2} textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={600} fill="var(--foreground)">
                  {formatarInteiro(totalDia(d))}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </CartaoGrafico>
  );
}
