"use client";

import { useEffect, type RefObject } from "react";
import { useReducedMotion } from "motion/react";

/**
 * Rola até o elemento quando a âncora da URL é o id dele. As páginas de dados chegam por streaming
 * (Suspense), depois de o navegador já ter tentado rolar até a âncora; os links dos insights
 * dependem disto para cair no gráfico de origem.
 */
export function useRolarSeAncora(id: string, ref: RefObject<HTMLElement | null>) {
  const reduzido = useReducedMotion();
  useEffect(() => {
    if (window.location.hash !== `#${id}` || !ref.current) return;
    ref.current.scrollIntoView({ behavior: reduzido ? "auto" : "smooth", block: "start" });
    // Destaque breve para o olho achar o cartão.
    ref.current.dataset.ancorado = "1";
    const t = setTimeout(() => ref.current && delete ref.current.dataset.ancorado, 1800);
    return () => clearTimeout(t);
  }, [id, ref, reduzido]);
}
