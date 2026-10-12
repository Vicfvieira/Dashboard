import type { Metadata } from "next";
import { Suspense } from "react";
import { BarChart3, ExternalLink, FolderGit2, Map, PlugZap, ShieldCheck } from "lucide-react";
import { Logo } from "@/components/marca/logo";
import { Rodape } from "@/components/rodape";
import { BLOQUEIO_MINUTOS, MAX_TENTATIVAS, SESSAO_HORAS } from "@/lib/auth/login";
import { credenciaisDemo } from "@/lib/demo";
import { BotaoDemo } from "./botao-demo";
import { FormularioLogin } from "./formulario-login";

export const metadata: Metadata = {
  title: "Entrar",
  robots: { index: true, follow: true },
  alternates: { canonical: "/login" },
  description: "Painel de gestão fictício que consolida um pet spa e um marketplace de beleza: KPIs, funil, mapa de demanda dos 96 distritos de SP, insights e auditoria. Acesso de demonstração com um clique.",
};

const REPOSITORIO = "https://github.com/Vicfvieira/Dashboard";
const SITES = [
  { nome: "Pelagem Studio", url: "https://pelagem-studio.vercel.app", cor: "bg-pelagem" },
  { nome: "Lírio", url: "https://lirio-estetica.vercel.app", cor: "bg-lirio" },
] as const;

const PILARES = [
  { icone: BarChart3, titulo: "Análise de dados", texto: "KPIs contra o período anterior, funil de contato, mapa de calor de horários e insights gerados por regras." },
  { icone: Map, titulo: "Mapa de oferta e demanda", texto: "Os 96 distritos de São Paulo coloridos pelo índice de demanda, com detalhe por distrito e categoria." },
  { icone: ShieldCheck, titulo: "Segurança", texto: `Papéis com permissões no servidor, auditoria de cada ação e bloqueio após ${MAX_TENTATIVAS} tentativas.` },
  { icone: PlugZap, titulo: "Integração", texto: "Sincronização diária com as APIs do Pelagem Studio e da Lírio, validada e com histórico por fonte." },
] as const;

function LinkExterno({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
      {children}
      <span className="sr-only"> (abre em nova aba)</span>
    </a>
  );
}

export default function PaginaLogin() {
  const demo = credenciaisDemo();
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.05fr_1fr]">
      <aside className="relative overflow-hidden border-b border-border bg-sidebar px-6 py-8 sm:px-10 lg:flex lg:flex-col lg:justify-between lg:border-r lg:border-b-0 lg:p-12">
        <div aria-hidden="true" className="pointer-events-none absolute -top-32 -left-32 size-[520px] rounded-full bg-primary/15 blur-3xl" />
        <Logo className="relative" />
        <div className="relative mt-8 max-w-lg lg:mt-0">
          <p className="text-xs font-medium tracking-[0.18em] text-muted-foreground uppercase">Projeto de portfólio · dados fictícios</p>
          <h1 className="mt-3 text-2xl leading-tight font-semibold tracking-tight text-balance sm:text-3xl">Um pet spa e um marketplace de beleza num só painel de gestão.</h1>
          <p className="mt-3 hidden text-sm text-muted-foreground sm:block">
            O Painelux lê as APIs de dois produtos publicados e transforma agendamentos, buscas e contatos em decisões: onde falta profissional, quais clientes reativar, que horário lota.
          </p>
          <div className="mt-4 flex flex-wrap gap-2 text-xs">
            {SITES.map((s) => (
              <LinkExterno key={s.nome} href={s.url} className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 transition-colors hover:border-primary/50 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none">
                <span className={`size-2 rounded-full ${s.cor}`} aria-hidden="true" />
                {s.nome}
                <ExternalLink className="size-3 text-muted-foreground" aria-hidden="true" />
              </LinkExterno>
            ))}
            <LinkExterno href={REPOSITORIO} className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 transition-colors hover:border-primary/50 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none">
              <FolderGit2 className="size-3" aria-hidden="true" />
              Código no GitHub
            </LinkExterno>
          </div>
          <ul className="mt-8 hidden gap-5 sm:grid sm:grid-cols-2 lg:mt-10 lg:grid-cols-1">
            {PILARES.map(({ icone: Icone, titulo, texto }) => (
              <li key={titulo} className="flex gap-4">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-card text-primary-ink">
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
        <Rodape className="relative hidden lg:block" />
      </aside>

      <main className="flex flex-col justify-between gap-8 px-6 py-8 sm:px-10">
        <span aria-hidden="true" className="hidden lg:block" />
        <div className="mx-auto w-full max-w-sm">
          <section aria-labelledby="titulo-demo" className="rounded-xl border border-primary/40 bg-primary/5 p-5">
            <h2 id="titulo-demo" className="text-lg font-semibold tracking-tight">
              Veio pelo portfólio?
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">Entre com um clique na conta de demonstração: todos os dashboards, com dados reais das duas APIs, sem poder alterar nada.</p>
            <div className="mt-4">
              <Suspense fallback={<div className="h-10 animate-pulse rounded-md bg-muted/40" />}>
                <BotaoDemo />
              </Suspense>
            </div>
            {demo && (
              <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 rounded-lg border border-border bg-card px-3 py-2.5 text-xs">
                <dt className="text-muted-foreground">E-mail</dt>
                <dd className="font-mono select-all">{demo.email}</dd>
                <dt className="text-muted-foreground">Senha</dt>
                <dd className="font-mono select-all">{demo.senha}</dd>
              </dl>
            )}
            <p className="mt-3 text-[11px] text-muted-foreground">Perfil Gestão, somente leitura. Usuários e Logs são da administração: veja as capturas no README do GitHub.</p>
          </section>

          <div className="my-6 flex items-center gap-3 text-[11px] text-muted-foreground" aria-hidden="true">
            <span className="h-px flex-1 bg-border" />
            ou entre com a sua conta
            <span className="h-px flex-1 bg-border" />
          </div>

          <Suspense fallback={<div className="h-[248px] animate-pulse rounded-lg bg-muted/40" />}>
            <FormularioLogin />
          </Suspense>
          <p className="mt-6 text-xs text-muted-foreground">
            Sessão de {SESSAO_HORAS} horas. Após {MAX_TENTATIVAS} tentativas sem sucesso, a conta fica bloqueada por {BLOQUEIO_MINUTOS} minutos. Todas as tentativas ficam registradas na auditoria.
          </p>
        </div>
        <Rodape className="lg:hidden" />
      </main>
    </div>
  );
}
