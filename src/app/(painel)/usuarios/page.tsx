import { Suspense } from "react";
import { UserCog } from "lucide-react";
import { AreaEmPreparo } from "@/components/painel/area-em-preparo";
import { EsqueletoTabela } from "@/components/painel/esqueletos";
import { requirePermission } from "@/lib/rbac";

export const metadata = { title: "Usuários" };

export default function Pagina() {
  return (
    <Suspense fallback={<EsqueletoTabela />}>
      <Conteudo />
    </Suspense>
  );
}

async function Conteudo() {
  await requirePermission("usuarios:ver");
  return (
    <AreaEmPreparo
      titulo="Usuários"
      descricao="Contas de acesso, papéis e situação."
      icone={UserCog}
      vazioTitulo="Gestão de usuários em montagem"
      vazioDescricao="Aqui será possível criar contas, mudar papéis, desativar acessos e redefinir senhas, sem nunca remover o último administrador."
      atalhos={[{ rotulo: "Ver logs de auditoria", href: "/logs" }]}
    />
  );
}
