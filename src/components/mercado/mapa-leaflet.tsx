"use client";

import type { Feature, FeatureCollection, Geometry } from "geojson";
import L, { type Layer, type Path, type PathOptions } from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useRef, useState } from "react";
import { GeoJSON, MapContainer, TileLayer, useMap } from "react-leaflet";
import { CONTORNO, type Tema } from "@/lib/mercado-cores";

type Distritos = FeatureCollection<Geometry, { slug: string }>;

export interface PropsMapaLeaflet {
  /** Cor de preenchimento por slug. */
  cores: Readonly<Record<string, string>>;
  selecionado: string | null;
  aoSelecionar: (slug: string) => void;
  /** Texto da dica ao passar o mouse (nome e valor da métrica). */
  rotulo: (slug: string) => string;
  tema: Tema;
  movimentoReduzido: boolean;
}

function Enquadrar({ geo, selecionado, movimentoReduzido }: { geo: Distritos; selecionado: string | null; movimentoReduzido: boolean }) {
  const map = useMap();
  const enquadrado = useRef(false);
  useEffect(() => {
    map.attributionControl.setPrefix('<a href="https://leafletjs.com">Leaflet</a>');
    if (!enquadrado.current) {
      // O contêiner pode ganhar altura depois do primeiro desenho (carregamento dinâmico).
      map.invalidateSize();
      map.fitBounds(L.geoJSON(geo).getBounds(), { padding: [12, 12] });
      enquadrado.current = true;
    }
  }, [geo, map]);
  // Seleção feita pela tabela ou pela lista: traz o distrito para a vista se estiver fora dela.
  useEffect(() => {
    if (!selecionado) return;
    const feature = geo.features.find((f) => f.properties.slug === selecionado);
    if (!feature) return;
    const limites = L.geoJSON(feature).getBounds();
    if (!map.getBounds().contains(limites)) map.fitBounds(limites, { maxZoom: 13, padding: [40, 40], animate: !movimentoReduzido });
  }, [selecionado, geo, map, movimentoReduzido]);
  return null;
}

/** Mapa coroplético dos 96 distritos. Só no navegador (carregado com next/dynamic, ssr: false). */
export default function MapaLeaflet({ cores, selecionado, aoSelecionar, rotulo, tema, movimentoReduzido }: PropsMapaLeaflet) {
  const [geo, setGeo] = useState<Distritos | null>(null);
  const camada = useRef<L.GeoJSON | null>(null);
  // Refs: os handlers do Leaflet são registrados uma vez; leem sempre o valor atual.
  const estado = useRef({ cores, selecionado, aoSelecionar, rotulo, tema });
  useEffect(() => {
    estado.current = { cores, selecionado, aoSelecionar, rotulo, tema };
  });

  useEffect(() => {
    let vivo = true;
    import("@/data/sp-distritos.geo.json").then((m) => vivo && setGeo(m.default as Distritos));
    return () => {
      vivo = false;
    };
  }, []);

  const estilo = (slug: string, destaque = false): PathOptions => {
    const { cores: c, selecionado: s, tema: t } = estado.current;
    const selecionadoAgora = slug === s;
    return {
      fillColor: c[slug] ?? "transparent",
      fillOpacity: 0.88,
      color: selecionadoAgora ? CONTORNO[t].selecao : CONTORNO[t].linha,
      weight: selecionadoAgora ? 3 : destaque ? 2 : 0.8,
      opacity: 1,
    };
  };

  useEffect(() => {
    const g = camada.current;
    if (!g) return;
    g.eachLayer((l) => {
      const slug = (l as L.GeoJSON & { feature?: Feature<Geometry, { slug: string }> }).feature?.properties.slug;
      if (!slug) return;
      (l as Path).setStyle(estilo(slug));
      if (slug === selecionado) (l as Path).bringToFront();
    });
  }, [cores, selecionado, tema, geo]);

  function aoCriar(feature: Feature<Geometry, { slug: string }>, layer: Layer) {
    const slug = feature.properties.slug;
    layer.bindTooltip(() => estado.current.rotulo(slug), { sticky: true, direction: "top", className: "mercado-dica" });
    layer.on({
      click: () => estado.current.aoSelecionar(slug),
      mouseover: (e) => {
        (e.target as Path).setStyle(estilo(slug, true));
        (e.target as Path).bringToFront();
      },
      mouseout: (e) => (e.target as Path).setStyle(estilo(slug)),
    });
  }

  return (
    <MapContainer
      center={[-23.62, -46.62]}
      zoom={10}
      minZoom={9}
      zoomSnap={0.25}
      maxZoom={15}
      scrollWheelZoom={false}
      zoomAnimation={!movimentoReduzido}
      fadeAnimation={!movimentoReduzido}
      markerZoomAnimation={!movimentoReduzido}
      className={`mercado-mapa h-full w-full ${tema === "escuro" ? "mercado-mapa-escuro" : ""}`}
    >
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" subdomains={["a", "b", "c"]} attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' />
      {geo && (
        <>
          <GeoJSON ref={camada} data={geo} style={(f) => estilo(f?.properties.slug ?? "")} onEachFeature={aoCriar} />
          <Enquadrar geo={geo} selecionado={selecionado} movimentoReduzido={movimentoReduzido} />
        </>
      )}
    </MapContainer>
  );
}
