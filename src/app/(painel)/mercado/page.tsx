import { Suspense } from "react";
import { Map } from "lucide-react";
import { AreaEmPreparo } from "@/components/painel/area-em-preparo";
import { EsqueletoDashboard } from "@/components/painel/esqueletos";
import { requirePermission } from "@/lib/rbac";

export const metadata = { title: "Mapa de mercado" };

export default function Pagina() {
  return (
    <Suspense fallback={<EsqueletoDashboard />}>
      <Conteudo />
    </Suspense>
  );
}

async function Conteudo() {
  await requirePermission("mercado:ver");
  return (
    <AreaEmPreparo
      titulo="Mapa de mercado"
      descricao="Oferta de profissionais e demanda de clientes nos 96 distritos de São Paulo."
      marca="lirio"
      icone={Map}
      vazioTitulo="Mapa em montagem"
      vazioDescricao="O mapa vai colorir os 96 distritos pelo índice de demanda (buscas por profissional ativa), com filtro por categoria e painel de detalhes por distrito."
      atalhos={[{ rotulo: "Ir para a visão geral", href: "/" }]}
    />
  );
}
