"use client";

import { useSyncExternalStore, type ReactNode } from "react";
import { CartesianGrid, type TooltipContentProps, type TooltipValueType } from "recharts";

/** Peças comuns dos gráficos Recharts do painel: eixos, grade, dica e legenda. */

export const EIXO = { fill: "var(--muted-foreground)", fontSize: 11 } as const;
export const GRADE = <CartesianGrid vertical={false} stroke="var(--border)" strokeOpacity={0.7} />;

export type PropsDica = Pick<TooltipContentProps<TooltipValueType, string | number>, "active" | "payload">;

/** Caixa de dica comum aos gráficos. */
export function CaixaDica({ titulo, linhas }: { titulo: ReactNode; linhas: { rotulo: ReactNode; valor: ReactNode; cor?: string }[] }) {
  return (
    <div className="min-w-48 rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-lg">
      <p className="mb-1.5 font-medium">{titulo}</p>
      {linhas.map((l, i) => (
        <p key={i} className="flex items-center justify-between gap-4 py-0.5">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            {l.cor && <span className="size-2 rounded-sm" style={{ background: l.cor }} aria-hidden="true" />}
            {l.rotulo}
          </span>
          <span className="font-medium tabular-nums">{l.valor}</span>
        </p>
      ))}
    </div>
  );
}

export function Legenda({ itens }: { itens: { rotulo: ReactNode; cor: string; opacidade?: number; tracejado?: boolean }[] }) {
  return (
    <ul className="mb-2 flex flex-wrap gap-x-5 gap-y-1 text-xs" aria-label="Legenda">
      {itens.map((i, n) => (
        <li key={n} className="flex items-center gap-2">
          {i.tracejado ? (
            <span className="w-4 border-t border-dashed" style={{ borderColor: i.cor }} aria-hidden="true" />
          ) : (
            <span className="size-2.5 rounded-sm" style={{ background: i.cor, opacity: i.opacidade ?? 1 }} aria-hidden="true" />
          )}
          {i.rotulo}
        </li>
      ))}
    </ul>
  );
}


// Tela estreita: rótulos do eixo mais curtos para sobrar espaço às barras.
const CONSULTA_ESTREITA = "(max-width: 640px)";
function assinarLargura(aviso: () => void) {
  const m = window.matchMedia(CONSULTA_ESTREITA);
  m.addEventListener("change", aviso);
  return () => m.removeEventListener("change", aviso);
}
export const useTelaEstreita = () => useSyncExternalStore(assinarLargura, () => window.matchMedia(CONSULTA_ESTREITA).matches, () => false);

