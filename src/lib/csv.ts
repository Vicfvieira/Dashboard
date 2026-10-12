/**
 * CSV no padrão do Excel em pt-BR (separador ";", BOM UTF-8). Texto que começa com = + - @ ou
 * tabulação ganha um apóstrofo na frente: sem isso, um e-mail ou user-agent malicioso gravado na
 * auditoria viraria fórmula ao abrir a planilha (CSV injection).
 */
export function protegerFormula(texto: string): string {
  return /^[=+\-@\t\r]/.test(texto) ? `'${texto}` : texto;
}

export function celulaTexto(texto: string): string {
  const seguro = protegerFormula(texto);
  return /[";\n\r]/.test(seguro) ? `"${seguro.replace(/"/g, '""')}"` : seguro;
}

export function montarCsv(cabecalho: readonly string[], linhas: readonly (readonly (string | number | null)[])[]): string {
  const linha = (cols: readonly (string | number | null)[]) => cols.map((c) => (c === null ? "" : typeof c === "number" ? String(c).replace(".", ",") : celulaTexto(c))).join(";");
  return `﻿${[linha(cabecalho), ...linhas.map(linha)].join("\r\n")}`;
}
