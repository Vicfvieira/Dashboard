import { Suspense } from "react";
import { EsqueletoShell } from "@/components/painel/esqueletos";
import { ProvedorPainel } from "@/components/painel/contexto";
import { PaletaComandos } from "@/components/painel/paleta-comandos";
import { Sidebar, SidebarMovel } from "@/components/painel/sidebar";
import { Topbar } from "@/components/painel/topbar";
import { Rodape } from "@/components/rodape";
import { TooltipProvider } from "@/components/ui/tooltip";
import { itensVisiveis } from "@/lib/navegacao";
import { can } from "@/lib/rbac";
import { usuarioAtual } from "@/lib/sessao";

/**
 * Shell autenticado. A sessão é lida dentro do <Suspense> (exigência do Cache Components):
 * o esqueleto do shell vai no HTML estático e o restante chega por streaming.
 */
export default function LayoutPainel({ children }: LayoutProps<"/">) {
  return (
    <Suspense fallback={<EsqueletoShell />}>
      <ShellAutenticado>{children}</ShellAutenticado>
    </Suspense>
  );
}

async function ShellAutenticado({ children }: { children: React.ReactNode }) {
  const u = await usuarioAtual();
  const usuario = { nome: u.nome, email: u.email, papel: u.papel, somenteLeitura: u.somenteLeitura, podeExportar: can(u, "dados:exportar") };

  return (
    <TooltipProvider>
      <ProvedorPainel usuario={usuario} itens={itensVisiveis(u)}>
        <a
          href="#conteudo"
          className="sr-only z-50 rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
        >
          Pular para o conteúdo
        </a>
        <div className="flex min-h-dvh">
          <Sidebar />
          <div className="flex min-w-0 flex-1 flex-col">
            <Topbar />
            <main id="conteudo" tabIndex={-1} className="flex-1 px-4 py-6 outline-none lg:px-6">
              {children}
            </main>
            <footer className="border-t border-border px-4 py-4 lg:px-6">
              <Rodape />
            </footer>
          </div>
        </div>
        <SidebarMovel />
        <PaletaComandos />
      </ProvedorPainel>
    </TooltipProvider>
  );
}
