import { cn } from "@/lib/utils";

/** Monograma do Painelux: dois painéis sobrepostos (as duas marcas consolidadas). */
export function Logo({ className, comNome = true }: { className?: string; comNome?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <svg viewBox="0 0 28 28" aria-hidden="true" className="size-7 shrink-0">
        <rect x="2" y="2" width="15" height="15" rx="4" className="fill-primary" />
        <rect x="11" y="11" width="15" height="15" rx="4" className="fill-primary/35 stroke-primary" strokeWidth="1.5" />
        <rect x="11" y="11" width="6" height="6" rx="1.5" className="fill-background" />
      </svg>
      {comNome && <span className="text-[15px] font-semibold tracking-tight">Painelux</span>}
    </span>
  );
}
