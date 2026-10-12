import { Suspense } from "react";
import { ScrollText } from "lucide-react";
import { AreaEmPreparo } from "@/components/painel/area-em-preparo";
import { EsqueletoTabela } from "@/components/painel/esqueletos";
import { requirePermission } from "@/lib/rbac";

export const metadata = { title: "Logs" };

export default function Pagina() {
  return (
    <Suspense fallback={<EsqueletoTabela />}>
      <Conteudo />
    </Suspense>
  );
}

async function Conteudo() {
  await requirePermission("logs:ver");
  return (
    <AreaEmPreparo
      titulo="Logs"
      descricao="Auditoria de logins, acessos negados, exportações e sincronizações."
      icone={ScrollText}
      vazioTitulo="Consulta de logs em montagem"
      vazioDescricao="Os eventos já estão sendo registrados com IP e user-agent. A tela terá filtros por ação, usuário e data e exportação CSV."
      atalhos={[]}
    />
  );
}
