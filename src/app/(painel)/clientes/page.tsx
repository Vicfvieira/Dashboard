import { Suspense } from "react";
import { Users } from "lucide-react";
import { AreaEmPreparo } from "@/components/painel/area-em-preparo";
import { EsqueletoTabela } from "@/components/painel/esqueletos";
import { requirePermission } from "@/lib/rbac";

export const metadata = { title: "Clientes" };

export default function Pagina() {
  return (
    <Suspense fallback={<EsqueletoTabela />}>
      <Conteudo />
    </Suspense>
  );
}

async function Conteudo() {
  await requirePermission("clientes:ver");
  return (
    <AreaEmPreparo
      titulo="Clientes"
      descricao="Recorrência, taxa de retorno e clientes sem visita há mais de 30 dias (identificados só por hash anônimo)."
      marca="pelagem"
      icone={Users}
      vazioTitulo="Análise de clientes em montagem"
      vazioDescricao="A tabela de clientes inativos terá busca, ordenação e exportação do hash anônimo, sem nenhum dado pessoal."
      atalhos={[{ rotulo: "Ir para a visão geral", href: "/" }]}
    />
  );
}
