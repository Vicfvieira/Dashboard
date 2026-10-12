import { Skeleton } from "@/components/ui/skeleton";

/** Esqueleto de dashboard: cabeçalho, faixa de KPIs e dois blocos de gráfico. */
export function EsqueletoDashboard() {
  return (
    <div className="grid gap-6" role="status" aria-label="Carregando">
      <div className="grid gap-2">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-4">
            <Skeleton className="h-3.5 w-24" />
            <Skeleton className="mt-3 h-7 w-32" />
            <Skeleton className="mt-3 h-3 w-20" />
          </div>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Skeleton className="h-72 rounded-xl lg:col-span-2" />
        <Skeleton className="h-72 rounded-xl" />
      </div>
    </div>
  );
}

/** Esqueleto de tabela: cabeçalho e linhas. */
export function EsqueletoTabela({ linhas = 8 }: { linhas?: number }) {
  return (
    <div className="grid gap-6" role="status" aria-label="Carregando">
      <div className="grid gap-2">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-4 w-72 max-w-full" />
      </div>
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <Skeleton className="h-10 rounded-none" />
        {Array.from({ length: linhas }, (_, i) => (
          <div key={i} className="flex gap-4 border-t border-border px-4 py-3">
            <Skeleton className="h-4 w-1/4" />
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="ml-auto h-4 w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Esqueleto do shell enquanto a sessão é lida. */
export function EsqueletoShell() {
  return (
    <div className="flex min-h-dvh">
      <div className="hidden w-60 shrink-0 border-r border-sidebar-border bg-sidebar p-4 md:block">
        <Skeleton className="h-7 w-28" />
        <div className="mt-8 grid gap-2">
          {Array.from({ length: 7 }, (_, i) => (
            <Skeleton key={i} className="h-8" />
          ))}
        </div>
      </div>
      <div className="flex-1">
        <div className="flex h-14 items-center gap-4 border-b border-border px-6">
          <Skeleton className="h-5 w-28" />
          <Skeleton className="mx-auto h-8 w-72 max-w-[40%]" />
          <Skeleton className="size-8 rounded-full" />
        </div>
        <div className="p-6">
          <EsqueletoDashboard />
        </div>
      </div>
    </div>
  );
}
