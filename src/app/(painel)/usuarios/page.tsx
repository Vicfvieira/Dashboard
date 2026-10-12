import { Suspense } from "react";
import { GestaoUsuarios, type LinhaUsuario } from "@/components/admin/gestao-usuarios";
import { CabecalhoPagina } from "@/components/painel/cabecalho-pagina";
import { EsqueletoTabela } from "@/components/painel/esqueletos";
import { formatarData, formatarDataHora, tempoRelativo } from "@/lib/formato";
import { prisma } from "@/lib/prisma";
import { can, MATRIZ, PERMISSOES, requirePermission, TODAS_PERMISSOES } from "@/lib/rbac";
import { PAPEIS, ROTULO_PAPEL } from "@/lib/usuarios";
import { Check, Minus } from "lucide-react";

export const metadata = { title: "Usuários" };

export default function Pagina() {
  return (
    <Suspense fallback={<EsqueletoTabela />}>
      <Conteudo />
    </Suspense>
  );
}

async function Conteudo() {
  const ator = await requirePermission("usuarios:ver");
  const agora = new Date();
  const contas = await prisma.user.findMany({
    orderBy: [{ ativo: "desc" }, { papel: "asc" }, { nome: "asc" }],
    // Seleção explícita: hash de senha e contadores internos nunca saem do servidor.
    select: { id: true, nome: true, email: true, papel: true, ativo: true, somenteLeitura: true, bloqueadoAte: true, ultimoLoginEm: true, criadoEm: true },
  });
  const usuarios: LinhaUsuario[] = contas.map((u) => ({
    id: u.id,
    nome: u.nome,
    email: u.email,
    papel: u.papel,
    ativo: u.ativo,
    somenteLeitura: u.somenteLeitura,
    bloqueadoAte: u.bloqueadoAte && u.bloqueadoAte > agora ? formatarDataHora(u.bloqueadoAte) : null,
    ultimoAcesso: u.ultimoLoginEm ? `${tempoRelativo(u.ultimoLoginEm, agora)} (${formatarDataHora(u.ultimoLoginEm)})` : "nunca entrou",
    criadoEm: formatarData(u.criadoEm),
  }));

  return (
    <div className="grid grid-cols-1 gap-6">
      <CabecalhoPagina titulo="Usuários" descricao="Contas, papéis e acesso ao Painelux. Toda criação, troca de papel, desativação e redefinição de senha vai para a auditoria." />
      <GestaoUsuarios usuarios={usuarios} atorId={ator.id} podeGerenciar={can(ator, "usuarios:gerenciar")} />
      <section aria-labelledby="titulo-matriz" className="rounded-xl border border-border bg-card">
        <header className="px-4 pt-4">
          <h2 id="titulo-matriz" className="text-sm font-semibold">
            Matriz de permissões
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">O que cada papel pode fazer, lido da mesma matriz que o servidor aplica. Contas somente leitura (demonstração) perdem as permissões de escrita.</p>
        </header>
        <div className="relative mt-3 overflow-x-auto border-t border-border">
          <table className="w-full min-w-[640px] text-xs">
            <caption className="sr-only">Permissões por papel</caption>
            <thead className="bg-muted/40 text-muted-foreground">
              <tr>
                <th scope="col" className="px-4 py-2 text-left font-medium">Permissão</th>
                {PAPEIS.map((p) => (
                  <th key={p} scope="col" className="px-3 py-2 text-center font-medium">
                    {ROTULO_PAPEL[p]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {TODAS_PERMISSOES.map((perm) => (
                <tr key={perm} className="border-t border-border/60">
                  <th scope="row" className="px-4 py-2 text-left font-normal">
                    {PERMISSOES[perm].descricao}
                    {PERMISSOES[perm].escrita && <span className="ml-1.5 text-[11px] text-muted-foreground">(escrita)</span>}
                  </th>
                  {PAPEIS.map((p) => (
                    <td key={p} className="px-3 py-2 text-center">
                      {MATRIZ[p].has(perm) ? <Check className="mx-auto size-4 text-success" aria-label="Permitido" /> : <Minus className="mx-auto size-4 text-muted-foreground/60" aria-label="Não permitido" />}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
