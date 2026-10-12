import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/** Estado vazio que explica o porquê e aponta o próximo passo, em vez de só dizer "sem dados". */
export function EstadoVazio({ icone: Icone, titulo, descricao, acao, className }: { icone: LucideIcon; titulo: string; descricao: string; acao?: ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/40 px-6 py-14 text-center", className)}>
      <span className="flex size-11 items-center justify-center rounded-full border border-border bg-card text-primary-ink">
        <Icone className="size-5" aria-hidden="true" />
      </span>
      <h2 className="mt-4 text-sm font-semibold">{titulo}</h2>
      <p className="mt-1.5 max-w-md text-sm text-muted-foreground">{descricao}</p>
      {acao && <div className="mt-5 flex flex-wrap justify-center gap-2">{acao}</div>}
    </div>
  );
}
