"use client";

import { useEffect } from "react";

/**
 * Falha no layout raiz: substitui o documento inteiro, sem o CSS global. Estilos inline e as
 * cores do tema escuro padrão do Painelux.
 */
export default function ErroGlobal({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="pt-BR">
      <body style={{ margin: 0, minHeight: "100dvh", display: "grid", placeItems: "center", background: "#0F0F14", color: "#EDEDF2", fontFamily: "system-ui, sans-serif" }}>
        <title>Erro · Painelux</title>
        <main style={{ maxWidth: 420, padding: 24, textAlign: "center" }}>
          <h1 style={{ fontSize: 20, margin: 0 }}>O Painelux não conseguiu abrir agora</h1>
          <p style={{ color: "#A1A1B5", fontSize: 14, lineHeight: 1.5 }}>Uma falha inesperada impediu o carregamento. Tente de novo em alguns segundos.</p>
          {error.digest && <p style={{ color: "#A1A1B5", fontSize: 11, fontFamily: "monospace" }}>Código do erro: {error.digest}</p>}
          <button type="button" onClick={() => retry()} style={{ marginTop: 8, padding: "10px 16px", borderRadius: 8, border: 0, background: "#7C3AED", color: "#FFFFFF", fontSize: 14, cursor: "pointer" }}>
            Tentar de novo
          </button>
          <p style={{ color: "#A1A1B5", fontSize: 12, marginTop: 24 }}>Projeto fictício desenvolvido para portfólio por Victoria Fernandes Vieira.</p>
        </main>
      </body>
    </html>
  );
}
