"use client";

import { useCallback, useMemo, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { hojeSP, intervaloAnterior, intervaloAtual, lerFiltros, queryComFiltros, serializarFiltros, type Filtros } from "@/lib/filtros";

/** Filtros globais lidos da URL, com escrita via router.replace (sem recarregar a página). */
export function useFiltros() {
  const parametros = useSearchParams();
  const caminho = usePathname();
  const router = useRouter();
  const [atualizando, iniciar] = useTransition();
  const hoje = hojeSP();

  const filtros = useMemo(() => lerFiltros(parametros, hoje), [parametros, hoje]);
  const intervalo = useMemo(() => intervaloAtual(filtros, hoje), [filtros, hoje]);
  const anterior = useMemo(() => intervaloAnterior(intervalo), [intervalo]);

  const alterar = useCallback(
    (mudanca: Partial<Filtros>) => {
      iniciar(() => router.replace(`${caminho}${queryComFiltros(filtros, mudanca)}`, { scroll: false }));
    },
    [caminho, filtros, router],
  );

  /** Query string atual dos filtros, para levar junto ao navegar entre páginas de análise. */
  const query = useMemo(() => {
    const q = serializarFiltros(filtros).toString();
    return q ? `?${q}` : "";
  }, [filtros]);

  return { filtros, intervalo, anterior, alterar, atualizando, query, hoje };
}
