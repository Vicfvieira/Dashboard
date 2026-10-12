import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AcessoNegado() {
  return (
    // Sem <main>: dentro do painel esta tela já é renderizada no <main> do layout.
    <section aria-labelledby="titulo-403" className="flex min-h-[60dvh] flex-col items-center justify-center gap-4 px-6 text-center">
      <span className="flex size-12 items-center justify-center rounded-full border border-border bg-card text-warning">
        <ShieldAlert className="size-5" aria-hidden="true" />
      </span>
      <div>
        <p className="text-xs font-medium tracking-[0.18em] text-muted-foreground uppercase">Erro 403</p>
        <h1 id="titulo-403" className="mt-2 text-xl font-semibold tracking-tight">Seu papel não dá acesso a esta área</h1>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
          A tentativa foi registrada na auditoria. Se precisar deste acesso, peça à administração para revisar seu papel.
        </p>
      </div>
      <Button asChild variant="outline">
        <Link href="/">Voltar ao início</Link>
      </Button>
    </section>
  );
}
