"use client";

import { useEffect } from "react";
import Link from "next/link";
import { RotateCcw, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Erro dentro do painel: o menu e a barra superior continuam, só a área de conteúdo cai aqui. */
export default function ErroPainel({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <section aria-labelledby="titulo-erro" className="flex min-h-[60dvh] flex-col items-center justify-center gap-4 px-6 text-center">
      <span className="flex size-12 items-center justify-center rounded-full border border-border bg-card text-warning">
        <TriangleAlert className="size-5" aria-hidden="true" />
      </span>
      <div>
        <h1 id="titulo-erro" className="text-xl font-semibold tracking-tight">
          Não foi possível carregar esta análise
        </h1>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
          Pode ser uma falha passageira na conexão com o banco. Tente de novo; se continuar, as outras páginas seguem funcionando.
        </p>
        {error.digest && <p className="mt-2 font-mono text-[11px] text-muted-foreground">Código do erro: {error.digest}</p>}
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        <Button onClick={() => retry()}>
          <RotateCcw aria-hidden="true" />
          Tentar de novo
        </Button>
        <Button asChild variant="outline">
          <Link href="/">Ir para a visão geral</Link>
        </Button>
      </div>
    </section>
  );
}
