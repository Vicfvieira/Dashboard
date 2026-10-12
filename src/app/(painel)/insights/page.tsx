import { Suspense } from "react";
import { Lightbulb } from "lucide-react";
import { AreaEmPreparo } from "@/components/painel/area-em-preparo";
import { EsqueletoDashboard } from "@/components/painel/esqueletos";
import { requirePermission } from "@/lib/rbac";

export const metadata = { title: "Insights" };

export default function Pagina() {
  return (
    <Suspense fallback={<EsqueletoDashboard />}>
      <Conteudo />
    </Suspense>
  );
}

async function Conteudo() {
  await requirePermission("insights:ver");
  return (
    <AreaEmPreparo
      titulo="Insights"
      descricao="Movimentos relevantes encontrados automaticamente nos dados, por regras explicáveis."
      icone={Lightbulb}
      vazioTitulo="Nenhum insight gerado ainda"
      vazioDescricao="As regras vão comparar períodos e distritos para apontar, por exemplo, demanda reprimida por categoria ou alta de cancelamentos aos sábados, com link para o gráfico de origem."
      atalhos={[{ rotulo: "Ir para a visão geral", href: "/" }]}
    />
  );
}
