import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { ProvedorTema } from "@/components/tema/provedor-tema";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: { default: "Painelux", template: "%s · Painelux" },
  description:
    "Painel de gestão que consolida dados do Pelagem Studio e da Lírio: KPIs, funil, mapa de oferta e demanda e insights.",
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
