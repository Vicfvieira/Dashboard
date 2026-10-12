import { Suspense } from "react";
import { Settings } from "lucide-react";
import { AreaEmPreparo } from "@/components/painel/area-em-preparo";
import { EsqueletoTabela } from "@/components/painel/esqueletos";
import { requirePermission } from "@/lib/rbac";

export const metadata = { title: "Configurações" };

export default function Pagina() {
  return (
    <Suspense fallback={<EsqueletoTabela />}>
      <Conteudo />
    </Suspense>
  );
}

async function Conteudo() {
  await requirePermission("configuracoes:ver");
  return (
    <AreaEmPreparo
      titulo="Configurações"
      descricao="Integrações com o Pelagem e a Lírio e histórico de sincronização."
      icone={Settings}
      vazioTitulo="Painel de integrações em montagem"
      vazioDescricao="Aqui ficarão o status de cada fonte, o histórico de sincronizações e, para administradores, o botão Sincronizar agora."
      atalhos={[{ rotulo: "Ir para a visão geral", href: "/" }]}
    />
  );
}
