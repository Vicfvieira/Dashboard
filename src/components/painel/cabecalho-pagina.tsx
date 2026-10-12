import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function CabecalhoPagina({ titulo, descricao, acoes, marca, className }: { titulo: string; descricao?: string; acoes?: ReactNode; marca?: "pelagem" | "lirio"; className?: string }) {
  return (
    <div className={cn("flex flex-wrap items-end justify-between gap-4", className)}>
      <div className="min-w-0">
        <h1 className="flex items-center gap-2.5 text-xl font-semibold tracking-tight text-balance">
          {marca && <span className={cn("size-2.5 rounded-full", marca === "pelagem" ? "bg-pelagem" : "bg-lirio")} aria-hidden="true" />}
          {titulo}
        </h1>
        {descricao && <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{descricao}</p>}
      </div>
      {acoes && <div className="ml-auto flex items-center gap-2">{acoes}</div>}
    </div>
  );
}
