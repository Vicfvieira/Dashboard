import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { ProvedorTema } from "@/components/tema/provedor-tema";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const DESCRICAO = "Painel de gestão fictício que consolida um pet spa e um marketplace de beleza: KPIs, funil, mapa de oferta e demanda dos 96 distritos de São Paulo, insights por regras, RBAC e auditoria. Projeto de portfólio de Victoria Fernandes Vieira.";

export const metadata: Metadata = {
  metadataBase: new URL("https://painelux.vercel.app"),
  title: { default: "Painelux", template: "%s · Painelux" },
  description: DESCRICAO,
  applicationName: "Painelux",
  authors: [{ name: "Victoria Fernandes Vieira" }],
  openGraph: { type: "website", locale: "pt_BR", siteName: "Painelux", title: "Painelux · painel de gestão (projeto de portfólio)", description: DESCRICAO },
  twitter: { card: "summary_large_image", title: "Painelux · painel de gestão (projeto de portfólio)", description: DESCRICAO },
  // Só a tela de entrada é indexável (ela define o próprio robots); o painel exige login.
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0F0F14" },
    { media: "(prefers-color-scheme: light)", color: "#F7F7FB" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`${inter.variable} h-full`} suppressHydrationWarning>
      <body className="min-h-full font-sans">
        <ProvedorTema>{children}</ProvedorTema>
      </body>
    </html>
  );
}
