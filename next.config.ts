import type { NextConfig } from "next";

const desenvolvimento = process.env.NODE_ENV === "development";

/**
 * CSP sem nonce: o Partial Prerendering (cacheComponents) entrega um HTML estático que não tem como
 * receber um nonce por requisição, e o payload do React vem em scripts inline. Por isso
 * script-src aceita 'unsafe-inline', e todo o resto fica restrito ao próprio domínio, mais os tiles
 * do OpenStreetMap no mapa de mercado. Sem iframes de terceiros e sem ser embutido em outro site.
 */
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${desenvolvimento ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' blob: data: https://*.tile.openstreetmap.org",
  "font-src 'self'",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  // Só na Vercel (sempre HTTPS): localmente, em http://localhost, a diretiva quebraria a navegação.
  ...(process.env.VERCEL ? ["upgrade-insecure-requests"] : []),
].join("; ");

const cabecalhosSeguranca = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
];

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  poweredByHeader: false,
  experimental: {
    // forbidden() / unauthorized() com páginas 403 e 401 próprias.
    authInterrupts: true,
  },
  async headers() {
    return [{ source: "/:path*", headers: cabecalhosSeguranca }];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
