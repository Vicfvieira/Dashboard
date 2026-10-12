import Link from "next/link";
import { Compass } from "lucide-react";
import { Logo } from "@/components/marca/logo";
import { Rodape } from "@/components/rodape";
import { Button } from "@/components/ui/button";

export default function NaoEncontrado() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-between gap-8 px-6 py-8">
      <Logo />
      <main className="flex flex-col items-center gap-4 text-center">
        <span className="flex size-12 items-center justify-center rounded-full border border-border bg-card text-primary-ink">
          <Compass className="size-5" aria-hidden="true" />
        </span>
        <div>
          <p className="text-xs font-medium tracking-[0.18em] text-muted-foreground uppercase">Erro 404</p>
          <h1 className="mt-2 text-xl font-semibold tracking-tight">Esta página não existe no Painelux</h1>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">O endereço pode ter mudado ou estar incompleto. As análises estão na visão geral e no menu lateral.</p>
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          <Button asChild>
            <Link href="/">Ir para a visão geral</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/login">Tela de entrada</Link>
          </Button>
        </div>
      </main>
      <Rodape />
    </div>
  );
}
