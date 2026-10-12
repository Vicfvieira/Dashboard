"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { animate, useReducedMotion } from "motion/react";
import { formatarInteiro, formatarMoeda, formatarPercentual, type FormatoNumero } from "@/lib/formato";

const assinarNada = () => () => {};

export type { FormatoNumero };

export function formatarNumero(valor: number, formato: FormatoNumero): string {
  if (formato === "moeda") return formatarMoeda(valor);
  if (formato === "percentual") return formatarPercentual(valor);
  return formatarInteiro(Math.round(valor));
}

/**
 * Número que conta até o valor. Na hidratação mostra o valor final de imediato (o HTML do servidor
 * já está na tela; recomeçar do zero seria um piscar). Anima quando o valor muda (troca de filtro)
 * ou quando o componente nasce no cliente. Sem animação com prefers-reduced-motion.
 * O texto animado é aria-hidden; leitores de tela recebem só o valor final.
 */
export function CountUp({ valor, formato, className }: { valor: number; formato: FormatoNumero; className?: string }) {
  const naHidratacao = useSyncExternalStore(assinarNada, () => false, () => true);
  const [nasceuNaHidratacao] = useState(naHidratacao);
  const reduzido = useReducedMotion();
  const visivel = useRef<HTMLSpanElement>(null);
  const anterior = useRef<number | null>(nasceuNaHidratacao ? valor : 0);

  useEffect(() => {
    const el = visivel.current;
    const de = anterior.current ?? valor;
    anterior.current = valor;
    if (!el || reduzido || de === valor) {
      if (el) el.textContent = formatarNumero(valor, formato);
      return;
    }
    const controle = animate(de, valor, {
      duration: 0.9,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => {
        el.textContent = formatarNumero(v, formato);
      },
    });
    return () => controle.stop();
  }, [valor, formato, reduzido]);

  const final = formatarNumero(valor, formato);
  return (
    <span className={className}>
      <span ref={visivel} aria-hidden="true" className="tabular-nums">
        {nasceuNaHidratacao ? final : formatarNumero(0, formato)}
      </span>
      <span className="sr-only">{final}</span>
    </span>
  );
}
