import type { Metadata } from "next";
import { Suspense } from "react";
import { BarChart3, PlugZap, ShieldCheck } from "lucide-react";
import { Logo } from "@/components/marca/logo";
import { Rodape } from "@/components/rodape";
import { BLOQUEIO_MINUTOS, MAX_TENTATIVAS, SESSAO_HORAS } from "@/lib/auth/login";
import { FormularioLogin } from "./formulario-login";

export const metadata: Metadata = { title: "Entrar" };

const PILARES = [
  {
    icone: BarChart3,
    titulo: "Análise de dados",
    texto: "KPIs com comparação de período, funil de contato e mapa de oferta e demanda por distrito.",
  },
  {
    icone: ShieldCheck,
    titulo: "Segurança",
    texto: `Acesso por papel, auditoria de cada ação e bloqueio após ${MAX_TENTATIVAS} tentativas.`,
  },
  {
    icone: PlugZap,
    titulo: "Integração",
    texto: "Sincronização diária com as APIs do Pelagem Studio e da Lírio, com histórico por fonte.",
  },
] as const;

export default function PaginaLogin() {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.05fr_1fr]">
      <aside className="relative hidden overflow-hidden border-r border-border bg-sidebar lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -left-32 -top-32 size-[520px] rounded-full bg-primary/15 blur-3xl"
        />
        <Logo className="relative" />
        <div className="relative max-w-md">
          <p className="text-xs font-medium tracking-[0.18em] text-muted-foreground uppercase">Gestão consolidada</p>
          <h1 className="mt-3 text-3xl font-semibold leading-tight tracking-tight text-balance">
            Pet spa e marketplace de beleza num só painel.
          </h1>
          <div className="mt-4 flex flex-wrap gap-2 text-xs">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1">
              <span className="size-2 rounded-full bg-pelagem" aria-hidden="true" />
              Pelagem Studio
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1">
              <span className="size-2 rounded-full bg-lirio" aria-hidden="true" />
              Lírio · 96 distritos de São Paulo
            </span>
          </div>
          <ul className="mt-10 grid gap-6">
            {PILARES.map(({ icone: Icone, titulo, texto }) => (
              <li key={titulo} className="flex gap-4">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-card text-primary">
                  <Icone className="size-4" aria-hidden="true" />
                </span>
                <div>
                  <p className="text-sm font-medium">{titulo}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{texto}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
        <Rodape className="relative" />
      </aside>

      <main className="flex flex-col justify-between px-6 py-8 sm:px-10">
        <Logo className="lg:invisible" />
        <div className="mx-auto w-full max-w-sm">
          <h2 className="text-2xl font-semibold tracking-tight">Entrar no Painelux</h2>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Use as credenciais fornecidas pela administração. A sessão dura {SESSAO_HORAS} horas.
          </p>
          <div className="mt-8">
            <Suspense fallback={<div className="h-[248px] animate-pulse rounded-lg bg-muted/40" />}>
              <FormularioLogin />
            </Suspense>
          </div>
          <p className="mt-6 text-xs text-muted-foreground">
            Após {MAX_TENTATIVAS} tentativas sem sucesso, o acesso fica bloqueado por {BLOQUEIO_MINUTOS} minutos. Todas as
            tentativas ficam registradas na auditoria.
          </p>
        </div>
        <Rodape className="lg:invisible" />
      </main>
    </div>
  );
}
