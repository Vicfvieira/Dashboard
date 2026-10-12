import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CabecalhoPagina } from "./cabecalho-pagina";
import { EstadoVazio } from "./estado-vazio";

/**
 * Página com cabeçalho e estado vazio explicativo, usada enquanto os gráficos da área são
 * construídos. Diz o que a área vai mostrar e oferece caminhos úteis.
 */
export function AreaEmPreparo({
  titulo,
  descricao,
  marca,
  icone,
  vazioTitulo,
  vazioDescricao,
  atalhos = [],
}: {
  titulo: string;
  descricao: string;
  marca?: "pelagem" | "lirio";
  icone: LucideIcon;
  vazioTitulo: string;
  vazioDescricao: string;
  atalhos?: ReadonlyArray<{ rotulo: string; href: string }>;
}) {
  return (
    <div className="grid gap-6">
      <CabecalhoPagina titulo={titulo} descricao={descricao} marca={marca} />
      <EstadoVazio
        icone={icone}
        titulo={vazioTitulo}
        descricao={vazioDescricao}
        acao={atalhos.map((a) => (
          <Button key={a.href} asChild variant="outline" size="sm">
            <Link href={a.href}>{a.rotulo}</Link>
          </Button>
        ))}
      />
    </div>
  );
}
