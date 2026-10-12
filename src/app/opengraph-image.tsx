import { ImageResponse } from "next/og";

export const alt = "Painelux: painel de gestão do Pelagem Studio e da Lírio";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Prévia do link (LinkedIn, WhatsApp, portfólio). Sem fontes externas: usa a fonte padrão do gerador. */
export default function Imagem() {
  const chip = (cor: string, texto: string) => (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 20px", borderRadius: 999, border: "1px solid #2A2A36", background: "#1A1A23", fontSize: 26 }}>
      <div style={{ width: 16, height: 16, borderRadius: 999, background: cor }} />
      {texto}
    </div>
  );
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 72, background: "#0F0F14", color: "#EDEDF2" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div style={{ display: "flex", position: "relative", width: 72, height: 72 }}>
            <div style={{ position: "absolute", left: 0, top: 0, width: 42, height: 42, borderRadius: 11, background: "#7C3AED" }} />
            <div style={{ position: "absolute", left: 30, top: 30, width: 42, height: 42, borderRadius: 11, background: "rgba(124,58,237,0.35)", border: "4px solid #7C3AED" }} />
          </div>
          <div style={{ display: "flex", fontSize: 44, fontWeight: 700 }}>Painelux</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ display: "flex", fontSize: 60, fontWeight: 700, lineHeight: 1.1, maxWidth: 960 }}>Pet spa e marketplace de beleza num só painel de gestão</div>
          <div style={{ display: "flex", fontSize: 28, color: "#A1A1B5", maxWidth: 980 }}>KPIs, funil, mapa de demanda dos 96 distritos de São Paulo, insights por regras, RBAC e auditoria.</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", gap: 16 }}>
            {chip("#E8833A", "Pelagem Studio")}
            {chip("#D8B4A6", "Lírio")}
          </div>
          <div style={{ display: "flex", fontSize: 24, color: "#A1A1B5" }}>Portfólio · Victoria Fernandes Vieira</div>
        </div>
      </div>
    ),
    size,
  );
}
