import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva("inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-medium", {
  variants: {
    variant: {
      neutro: "border-border bg-muted text-muted-foreground",
      sucesso: "border-success/30 bg-success/10 text-success",
      alerta: "border-warning/30 bg-warning/10 text-warning",
      erro: "border-destructive/30 bg-destructive/10 text-destructive",
      info: "border-primary/30 bg-primary/10 text-accent-foreground",
    },
  },
  defaultVariants: { variant: "neutro" },
});

function Badge({ className, variant, ...props }: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
