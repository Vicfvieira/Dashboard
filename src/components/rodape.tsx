import { cn } from "@/lib/utils";

export function Rodape({ className }: { className?: string }) {
  return (
    <p className={cn("text-xs text-muted-foreground", className)}>
      Projeto fictício desenvolvido para portfólio por Victoria Fernandes Vieira.
    </p>
  );
}
