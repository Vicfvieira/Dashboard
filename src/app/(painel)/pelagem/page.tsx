import { Suspense } from "react";
import { PawPrint } from "lucide-react";
import { AreaEmPreparo } from "@/components/painel/area-em-preparo";
import { EsqueletoDashboard } from "@/components/painel/esqueletos";
import { requirePermission } from "@/lib/rbac";

export const metadata = { title: "Pelagem" };

export default function Pagina() {
  return (
    <Suspense fallback={<EsqueletoDashboard />}>
      <Conteudo />
    </Suspense>
  );
}

async function Conteudo() {
  await requirePermission("pelagem:ver");
  return (
    <AreaEmPreparo
      titulo="Pelagem"
      descricao="Faturamento semanal, serviços mais vendidos, horários de pico e cancelamentos do pet spa."
      marca="pelagem"
      icone={PawPrint}
      vazioTitulo="Painel do Pelagem em montagem"
      vazioDescricao="Aqui ficarão o faturamento por semana, o top 10 de serviços, o mapa de calor dia × hora, o mix por porte e espécie e a taxa de cancelamento."
      atalhos={[{ rotulo: "Ir para a visão geral", href: "/" }]}
    />
  );
}
