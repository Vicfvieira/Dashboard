import { Suspense } from "react";
import { Flower2 } from "lucide-react";
import { AreaEmPreparo } from "@/components/painel/area-em-preparo";
import { EsqueletoDashboard } from "@/components/painel/esqueletos";
import { requirePermission } from "@/lib/rbac";

export const metadata = { title: "Lírio" };

export default function Pagina() {
  return (
    <Suspense fallback={<EsqueletoDashboard />}>
      <Conteudo />
    </Suspense>
  );
}

async function Conteudo() {
  await requirePermission("lirio:ver");
  return (
    <AreaEmPreparo
      titulo="Lírio"
      descricao="Funil de buscas até o contato no WhatsApp, categorias em alta e conversão por distrito."
      marca="lirio"
      icone={Flower2}
      vazioTitulo="Painel da Lírio em montagem"
      vazioDescricao="Aqui ficarão o funil buscas → visualizações → WhatsApp por categoria e região, as categorias em alta e o ranking de distritos por conversão."
      atalhos={[{ rotulo: "Ir para a visão geral", href: "/" }]}
    />
  );
}
