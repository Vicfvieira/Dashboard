/** Exportação no navegador: CSV (separador ";" e vírgula decimal, como o Excel em pt-BR) e PNG do SVG. */

export interface ColunaTabela {
  chave: string;
  rotulo: string;
  formato?: "inteiro" | "moeda" | "percentual" | "decimal" | "texto";
}
export type LinhaTabela = Record<string, string | number | null>;

export function baixar(blob: Blob, nome: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nome;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function celulaCsv(valor: string | number | null, formato: ColunaTabela["formato"]): string {
  if (valor === null) return "";
  let texto: string;
  if (typeof valor === "number") {
    // Valores monetários chegam em centavos.
    const n = formato === "moeda" ? valor / 100 : valor;
    texto = String(Number.isInteger(n) ? n : n.toFixed(formato === "percentual" ? 4 : 2)).replace(".", ",");
  } else {
    texto = valor;
  }
  return /[";\n]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
}

export function baixarCsv(nome: string, colunas: readonly ColunaTabela[], linhas: readonly LinhaTabela[]) {
  const cabecalho = colunas.map((c) => celulaCsv(c.rotulo, "texto")).join(";");
  const corpo = linhas.map((l) => colunas.map((c) => celulaCsv(l[c.chave] ?? null, c.formato)).join(";"));
  // BOM: o Excel reconhece UTF-8 e mantém os acentos.
  baixar(new Blob(["﻿", [cabecalho, ...corpo].join("\r\n")], { type: "text/csv;charset=utf-8" }), `${nome}.csv`);
}

const PROPRIEDADES = ["fill", "stroke", "stroke-width", "stroke-dasharray", "stroke-opacity", "fill-opacity", "opacity", "font-family", "font-size", "font-weight", "text-anchor", "dominant-baseline"] as const;

/** Copia os estilos calculados (inclusive var(--...)) para atributos: o SVG solto não tem o CSS da página. */
function embutirEstilos(original: Element, copia: Element) {
  const estilo = getComputedStyle(original);
  for (const p of PROPRIEDADES) {
    const v = estilo.getPropertyValue(p);
    if (v) copia.setAttribute(p, v);
  }
  const filhosO = original.children;
  const filhosC = copia.children;
  for (let i = 0; i < filhosO.length; i++) {
    const o = filhosO[i];
    const c = filhosC[i];
    if (o && c) embutirEstilos(o, c);
  }
}

/** PNG do primeiro <svg> do container, com fundo do tema, título e escala 2x. */
export async function gerarPng(container: HTMLElement, titulo: string): Promise<Blob> {
  const svg = container.querySelector("svg.recharts-surface") ?? container.querySelector("svg");
  if (!svg) throw new Error("Gráfico não encontrado para exportar.");
  const { width, height } = svg.getBoundingClientRect();
  const copia = svg.cloneNode(true) as SVGSVGElement;
  embutirEstilos(svg, copia);
  copia.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  copia.setAttribute("width", String(width));
  copia.setAttribute("height", String(height));

  const corpo = getComputedStyle(document.body);
  const fundo = getComputedStyle(container).backgroundColor !== "rgba(0, 0, 0, 0)" ? getComputedStyle(container).backgroundColor : corpo.backgroundColor;
  const tinta = corpo.color;
  const fonte = corpo.fontFamily;

  const imagem = new Image();
  const dados = new XMLSerializer().serializeToString(copia);
  imagem.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(dados)}`;
  await imagem.decode();

  const escala = 2;
  const margem = 24;
  const alturaTitulo = 40;
  const canvas = document.createElement("canvas");
  canvas.width = (width + margem * 2) * escala;
  canvas.height = (height + margem * 2 + alturaTitulo) * escala;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas indisponível.");
  ctx.scale(escala, escala);
  ctx.fillStyle = fundo;
  ctx.fillRect(0, 0, width + margem * 2, height + margem * 2 + alturaTitulo);
  ctx.fillStyle = tinta;
  ctx.font = `600 15px ${fonte}`;
  ctx.fillText(titulo, margem, margem + 14);
  ctx.globalAlpha = 0.6;
  ctx.font = `11px ${fonte}`;
  ctx.fillText("Painelux · projeto fictício de portfólio", margem, margem + 32);
  ctx.globalAlpha = 1;
  ctx.drawImage(imagem, margem, margem + alturaTitulo, width, height);

  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/png"));
  if (!blob) throw new Error("Falha ao gerar a imagem.");
  return blob;
}
