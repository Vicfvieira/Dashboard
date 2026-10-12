"use client";

import { useState, type ReactNode } from "react";
import { CartaoGrafico } from "@/components/graficos/cartao-grafico";
import type { ColunaTabela, LinhaTabela } from "@/components/graficos/exportar";
import { formatarInteiro, formatarPercentual } from "@/lib/formato";
import { DIA_SEMANA } from "@/lib/rotulos-pelagem";

export interface CelulaMapa {
  /** 1 = segunda … 7 = domingo (ISO). */
  diaSemana: number;
  hora: number;
  valor: number;
}

const ROTULO_X = 44;
const TOPO = 22;
const VAO = 3;
const TOTAL_L = 56;
/** Opacidade máxima da cor: mantém o contraste do número nas células mais fortes. */
const MAX_OPACIDADE = 0.85;
const ESCALA = [0.12, 0.3, 0.48, 0.66, MAX_OPACIDADE];

/** Escala sequencial de um matiz só: opacidade da cor da marca sobre o fundo do cartão. */
const intensidade = (v: number, max: number) => (v <= 0 || max <= 0 ? 0 : 0.12 + (MAX_OPACIDADE - 0.12) * (v / max));

/**
 * Mapa de calor dia da semana × hora em SVG próprio (o Recharts não tem heatmap; o SVG mantém a
 * exportação em PNG). Passar o mouse mostra o valor da célula; a tabela é a alternativa acessível.
 */
export function MapaCalor({
  titulo,
  descricao,
  recurso,
  celulas,
  dias,
  horas,
  cor,
  textoForte,
  unidade,
  resumo,
  larguraCelula = 58,
  className,
}: {
  titulo: string;
  descricao: string;
  recurso: string;
  celulas: readonly CelulaMapa[];
  dias: readonly number[];
  horas: readonly number[];
  /** Cor da série, ex.: "var(--serie-pelagem)". */
  cor: string;
  /** Cor do número nas células fortes (≥ 55% de intensidade). */
  textoForte: string;
  unidade: { singular: string; plural: string };
  /** Texto exibido quando nenhuma célula está em foco. */
  resumo: ReactNode;
  larguraCelula?: number;
  className?: string;
}) {
  const [foco, setFoco] = useState<{ dia: number; hora: number } | null>(null);
  const todosDias = [...new Set([...dias, ...celulas.map((c) => c.diaSemana)])].sort((a, b) => a - b);
  const todasHoras = [...new Set([...horas, ...celulas.map((c) => c.hora)])].sort((a, b) => a - b);
  const mapa = new Map(celulas.map((c) => [`${c.diaSemana}|${c.hora}`, c.valor]));
  const valor = (d: number, h: number) => mapa.get(`${d}|${h}`) ?? 0;
  const max = Math.max(0, ...celulas.map((c) => c.valor));
  const total = celulas.reduce((t, c) => t + c.valor, 0);
  const totalDia = (d: number) => todasHoras.reduce((t, h) => t + valor(d, h), 0);
  const fonte = larguraCelula >= 48 ? 11 : 10;
  const celA = larguraCelula >= 48 ? 34 : 30;

  const largura = ROTULO_X + todasHoras.length * larguraCelula + TOTAL_L;
  const altura = TOPO + todosDias.length * celA + 4;
  const nome = (n: number) => (n === 1 ? unidade.singular : unidade.plural);

  const colunas: ColunaTabela[] = [
    { chave: "dia", rotulo: "Dia", formato: "texto" },
    ...todasHoras.map((h) => ({ chave: `h${h}`, rotulo: `${h}h`, formato: "inteiro" as const })),
    { chave: "total", rotulo: "Total", formato: "inteiro" },
  ];
  const linhas: LinhaTabela[] = todosDias.map((d) => ({ dia: DIA_SEMANA[d]?.longo ?? "", ...Object.fromEntries(todasHoras.map((h) => [`h${h}`, valor(d, h)])), total: totalDia(d) }));
  const emFoco = foco ? valor(foco.dia, foco.hora) : null;

  return (
    <CartaoGrafico titulo={titulo} descricao={descricao} recurso={recurso} colunas={colunas} linhas={linhas} className={className}>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-x-6 gap-y-2 text-xs">
        <p className="text-muted-foreground" aria-live="polite">
          {foco && emFoco !== null ? (
            <>
              <span className="font-medium text-foreground">
                {DIA_SEMANA[foco.dia]?.longo}, {foco.hora}h
              </span>
              : {formatarInteiro(emFoco)} {nome(emFoco)}
              {total > 0 && ` (${formatarPercentual(emFoco / total)} do total)`}
            </>
          ) : (
            resumo
          )}
        </p>
        <div className="flex items-center gap-1.5 text-muted-foreground" aria-hidden="true">
          <span>Menos</span>
          {ESCALA.map((o) => (
            <span key={o} className="h-3 w-5 rounded-sm" style={{ background: cor, opacity: o }} />
          ))}
          <span>Mais</span>
        </div>
      </div>
      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${largura} ${altura}`} className="block w-full" style={{ minWidth: Math.min(largura, 520) }} onMouseLeave={() => setFoco(null)}>
          {todasHoras.map((h, i) => (
            <text key={h} x={ROTULO_X + i * larguraCelula + larguraCelula / 2} y={14} textAnchor="middle" fontSize={fonte} fill="var(--muted-foreground)">
              {h}h
            </text>
          ))}
          <text x={ROTULO_X + todasHoras.length * larguraCelula + TOTAL_L / 2} y={14} textAnchor="middle" fontSize={fonte} fill="var(--muted-foreground)">
            Total
          </text>
          {todosDias.map((d, li) => {
            const y = TOPO + li * celA;
            return (
              <g key={d}>
                <text x={0} y={y + celA / 2} dominantBaseline="central" fontSize={fonte} fill="var(--muted-foreground)">
                  {DIA_SEMANA[d]?.curto}
                </text>
                {todasHoras.map((h, ci) => {
                  const v = valor(d, h);
                  const i = intensidade(v, max);
                  const x = ROTULO_X + ci * larguraCelula;
                  const ativo = foco?.dia === d && foco.hora === h;
                  const ret = { x: x + VAO / 2, y: y + VAO / 2, width: larguraCelula - VAO, height: celA - VAO, rx: 4 };
                  return (
                    <g key={h} onMouseEnter={() => setFoco({ dia: d, hora: h })}>
                      <rect {...ret} fill="var(--muted)" fillOpacity={0.45} />
                      {i > 0 && <rect {...ret} fill={cor} fillOpacity={i} />}
                      {ativo && <rect {...ret} fill="none" stroke="var(--foreground)" strokeWidth={1.5} />}
                      {v > 0 && (
                        <text x={x + larguraCelula / 2} y={y + celA / 2} textAnchor="middle" dominantBaseline="central" fontSize={fonte} fontWeight={500} fill={i > 0.55 ? textoForte : "var(--foreground)"}>
                          {v}
                        </text>
                      )}
                    </g>
                  );
                })}
                <text x={ROTULO_X + todasHoras.length * larguraCelula + TOTAL_L / 2} y={y + celA / 2} textAnchor="middle" dominantBaseline="central" fontSize={fonte} fontWeight={600} fill="var(--foreground)">
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
