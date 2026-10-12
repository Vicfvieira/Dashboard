import { Suspense } from "react";
import { CalendarClock } from "lucide-react";
import { AreaEmPreparo } from "@/components/painel/area-em-preparo";
import { EsqueletoTabela } from "@/components/painel/esqueletos";
import { requirePermission } from "@/lib/rbac";

export const metadata = { title: "Agenda do dia" };

export default function Pagina() {
  return (
    <Suspense fallback={<EsqueletoTabela />}>
      <Conteudo />
    </Suspense>
  );
}

async function Conteudo() {
  await requirePermission("agenda:ver");
  return (
    <AreaEmPreparo
      titulo="Agenda do dia"
      descricao="Atendimentos de hoje no Pelagem Studio, por horário."
      marca="pelagem"
      icone={CalendarClock}
      vazioTitulo="Agenda em montagem"
      vazioDescricao="A agenda vai listar os atendimentos do dia com horário, serviço, porte e status, sem nenhum valor financeiro."
      atalhos={[]}
    />
  );
}
