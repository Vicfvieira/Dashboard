import { Suspense } from "react";
import { Check, LogOut, Minus } from "lucide-react";
import { sair } from "@/app/actions/sessao";
import { Logo } from "@/components/marca/logo";
import { Rodape } from "@/components/rodape";
import { Button } from "@/components/ui/button";
import { NOME_PAPEL, PERMISSOES, TODAS_PERMISSOES, can, requirePermission } from "@/lib/rbac";
import { usuarioAtual } from "@/lib/sessao";

// Página provisória até a Etapa 4 (layout e navegação): mostra a sessão e as permissões efetivas.
export default function Inicio() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col gap-8 px-6 py-10">
      <Logo />
      <Suspense fallback={<div className="h-96 animate-pulse rounded-xl bg-card" />}>
        <Sessao />
      </Suspense>
      <Rodape className="mt-auto" />
    </main>
  );
}

async function Sessao() {
  const base = await usuarioAtual();
  // Atendente não tem visão geral: a página exige a permissão (403 + auditoria para quem não tem).
  const usuario = base.papel === "ATENDENTE" ? base : await requirePermission("visao-geral:ver");

  return (
    <section className="rounded-xl border border-border bg-card p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Sessão ativa</p>
          <h1 className="mt-1 text-xl font-semibold tracking-tight">{usuario.nome}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {usuario.email} · {NOME_PAPEL[usuario.papel]}
            {usuario.somenteLeitura ? " · somente leitura" : ""}
          </p>
        </div>
        <form action={sair}>
          <Button variant="outline" size="sm" type="submit">
            <LogOut aria-hidden="true" />
            Sair
          </Button>
        </form>
      </div>

      <h2 className="mt-8 text-sm font-medium">Permissões efetivas deste acesso</h2>
      <ul className="mt-3 grid gap-1.5 sm:grid-cols-2">
        {TODAS_PERMISSOES.map((p) => {
          const permitido = can(usuario, p);
          return (
            <li key={p} className="flex items-center gap-2 text-sm">
              {permitido ? (
                <Check className="size-4 text-success" aria-label="Permitido" />
              ) : (
                <Minus className="size-4 text-muted-foreground" aria-label="Negado" />
              )}
              <span className={permitido ? "" : "text-muted-foreground"}>{PERMISSOES[p].descricao}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
