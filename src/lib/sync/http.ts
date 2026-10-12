/**
 * Requisição JSON às APIs de integração com header x-api-key, timeout e até 3 tentativas com
 * espera crescente. Repete só o que pode dar certo na próxima vez (rede, timeout, 429 e 5xx);
 * 400/401/403/404 falham na hora. Módulo puro: fetch e espera são injetáveis nos testes.
 */

export type Fetch = (entrada: string, init?: RequestInit) => Promise<Response>;

export interface OpcoesRequisicao {
  chave: string;
  fetch?: Fetch;
  /** Espera entre tentativas (injetável nos testes). */
  esperar?: (ms: number) => Promise<void>;
  tentativas?: number;
  /** Espera antes da 2ª tentativa; dobra... triplica a cada nova tentativa. */
  esperaInicialMs?: number;
  timeoutMs?: number;
}

export class ErroIntegracao extends Error {
  constructor(
    message: string,
    readonly detalhes: { url: string; status?: number; tentativas: number; repetivel: boolean },
  ) {
    super(message);
    this.name = "ErroIntegracao";
  }
}

export interface RespostaJson {
  corpo: unknown;
  tentativas: number;
}

const esperarPadrao = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** Esperas usadas entre as tentativas: 500 ms, 1,5 s, 4,5 s… */
export function esperaDaTentativa(tentativa: number, inicialMs: number): number {
  return inicialMs * 3 ** (tentativa - 1);
}

/** Remove a query string da URL nas mensagens (nunca há segredo nela, mas fica mais limpo). */
function semQuery(url: string): string {
  return url.split("?")[0] ?? url;
}

export async function requisitarJson(url: string, op: OpcoesRequisicao): Promise<RespostaJson> {
  const executar = op.fetch ?? fetch;
  const esperar = op.esperar ?? esperarPadrao;
  const total = op.tentativas ?? 3;
  const inicial = op.esperaInicialMs ?? 500;
  let ultimoErro: ErroIntegracao | null = null;

  for (let tentativa = 1; tentativa <= total; tentativa++) {
    let resposta: Response;
    try {
      resposta = await executar(url, {
        headers: { "x-api-key": op.chave, accept: "application/json" },
        cache: "no-store",
        signal: AbortSignal.timeout(op.timeoutMs ?? 20_000),
      });
    } catch (erro) {
      const motivo = erro instanceof Error && erro.name === "TimeoutError" ? "tempo esgotado" : "falha de rede";
      ultimoErro = new ErroIntegracao(`${motivo} em ${semQuery(url)}`, { url: semQuery(url), tentativas: tentativa, repetivel: true });
      if (tentativa < total) await esperar(esperaDaTentativa(tentativa, inicial));
      continue;
    }

    if (resposta.ok) {
      try {
        return { corpo: await resposta.json(), tentativas: tentativa };
      } catch {
        throw new ErroIntegracao(`Resposta não é JSON em ${semQuery(url)}`, { url: semQuery(url), status: resposta.status, tentativas: tentativa, repetivel: false });
      }
    }

    const repetivel = resposta.status === 429 || resposta.status >= 500;
    const mensagem =
      resposta.status === 401 || resposta.status === 403
        ? `Chave de API recusada (${resposta.status}) em ${semQuery(url)}`
        : `HTTP ${resposta.status} em ${semQuery(url)}`;
    ultimoErro = new ErroIntegracao(mensagem, { url: semQuery(url), status: resposta.status, tentativas: tentativa, repetivel });
    if (!repetivel) throw ultimoErro;
    if (tentativa < total) {
      // 429: respeita Retry-After (até 10 s); senão, espera crescente.
      const retryAfter = Number(resposta.headers.get("retry-after"));
      const espera = resposta.status === 429 && retryAfter > 0 ? Math.min(retryAfter * 1000, 10_000) : esperaDaTentativa(tentativa, inicial);
      await esperar(espera);
    }
  }

  throw ultimoErro ?? new ErroIntegracao(`Falha em ${semQuery(url)}`, { url: semQuery(url), tentativas: total, repetivel: true });
}
