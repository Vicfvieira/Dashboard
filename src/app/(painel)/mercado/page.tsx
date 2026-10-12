import { Suspense } from "react";
import { z } from "zod";
import { CabecalhoPagina } from "@/components/painel/cabecalho-pagina";
import { EsqueletoDashboard } from "@/components/painel/esqueletos";
import type { InfoDistrito } from "@/components/mercado/comum";
import { MapaMercado } from "@/components/mercado/mapa-mercado";
import { CATEGORIAS, CATEGORIA_SLUGS } from "@/data/categorias";
import { DISTRITOS, REGIOES, SUBPREFEITURAS } from "@/data/sp-geo";
import { carregarMercado } from "@/lib/dados/mercado";
import { descreverIntervalo, hojeSP, intervaloAtual, lerFiltros } from "@/lib/filtros";
import { TODAS } from "@/lib/mercado";
import { requirePermission } from "@/lib/rbac";

export const metadata = { title: "Mapa de mercado" };

const NOME_REGIAO = new Map<string, string>(REGIOES.map((r) => [r.id, r.nome]));
const NOME_SUBPREFEITURA = new Map(SUBPREFEITURAS.map((s) => [s.slug, s.nome]));

const DISTRITOS_INFO: InfoDistrito[] = DISTRITOS.map((d) => ({
  slug: d.slug,
  nome: d.nome,
  regiao: d.regiao,
  nomeRegiao: NOME_REGIAO.get(d.regiao) ?? d.regiao,
  subprefeitura: `Subprefeitura ${NOME_SUBPREFEITURA.get(d.subprefeitura) ?? d.subprefeitura}`,
}));

/** Parâmetros próprios do mapa (tolerantes: valor inválido vira o padrão). */
const parametrosMapa = z.object({
  cat: z.enum(CATEGORIA_SLUGS as [string, ...string[]]).catch(TODAS).default(TODAS),
  metrica: z.enum(["indice", "buscas", "oferta", "conversao"]).catch("indice").default("indice"),
  distrito: z
    .string()
    .refine((s) => DISTRITOS.some((d) => d.slug === s))
    .nullable()
    .catch(null)
    .default(null),
});

export default function Pagina({ searchParams }: PageProps<"/mercado">) {
  return (
    <Suspense fallback={<EsqueletoDashboard />}>
      <Conteudo searchParams={searchParams} />
    </Suspense>
  );
}

async function Conteudo({ searchParams }: { searchParams: PageProps<"/mercado">["searchParams"] }) {
  await requirePermission("mercado:ver");
  const sp = await searchParams;
  const hoje = hojeSP();
  const filtros = lerFiltros(sp, hoje);
  const intervalo = intervaloAtual(filtros, hoje);
  const um = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const mapa = parametrosMapa.parse({ cat: um(sp.cat), metrica: um(sp.metrica), distrito: um(sp.distrito) ?? null });
  const { celulas, dataOferta } = await carregarMercado(intervalo);
  const periodo = descreverIntervalo(intervalo);

  return (
    <div className="grid grid-cols-1 gap-6">
      <CabecalhoPagina
        titulo="Mapa de mercado"
        marca="lirio"
        descricao={`Oferta de profissionais e procura de clientes da Lírio nos 96 distritos de São Paulo, de ${periodo}. O índice de demanda compara buscas por profissional ativa com a média da cidade.`}
      />
      <MapaMercado
        celulas={celulas}
        distritos={DISTRITOS_INFO}
        categorias={CATEGORIAS}
        inicial={{ categoria: mapa.cat, metrica: mapa.metrica, distrito: mapa.distrito }}
        intervalo={{ de: intervalo.de, ate: intervalo.ate }}
        descricaoIntervalo={periodo}
        dataOferta={dataOferta}
      />
    </div>
  );
}
