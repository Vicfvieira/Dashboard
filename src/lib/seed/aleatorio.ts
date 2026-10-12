import { createHash } from "node:crypto";
import { Faker, pt_BR, base } from "@faker-js/faker";

/**
 * Aleatoriedade determinística por chave: a mesma chave gera sempre os mesmos valores,
 * independentemente da ordem de execução. É o que torna o seed idempotente e estável.
 */
const faker = new Faker({ locale: [pt_BR, base] });

/** Inteiro de 32 bits derivado de uma chave (FNV-1a). */
export function hashNumerico(chave: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < chave.length; i++) {
    h ^= chave.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export interface Sorteio {
  /** Número em [0, 1). */
  real(): number;
  /** Inteiro em [min, max]. */
  inteiro(min: number, max: number): number;
  /** true com a probabilidade informada. */
  chance(probabilidade: number): boolean;
  /** Elemento escolhido com peso. */
  ponderado<T>(itens: ReadonlyArray<{ valor: T; peso: number }>): T;
  /** Amostra de Poisson com média lambda. */
  poisson(lambda: number): number;
}

/** Sorteador semeado pela chave. Use um por entidade (cliente, dia, distrito × categoria). */
export function sorteio(chave: string): Sorteio {
  faker.seed(hashNumerico(chave));
  // Gera uma sequência própria para não depender do estado global do faker entre chamadas.
  const sequencia = Array.from({ length: 64 }, () => faker.number.float({ min: 0, max: 1, fractionDigits: 9 }));
  let i = 0;
  let extra = hashNumerico(`${chave}#extra`);
  const real = () => {
    if (i < sequencia.length) return Math.min(sequencia[i++] ?? 0, 0.999999999);
    // mulberry32 para sequências longas
    extra = (extra + 0x6d2b79f5) >>> 0;
    let t = extra;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    real,
    inteiro: (min, max) => min + Math.floor(real() * (max - min + 1)),
    chance: (p) => real() < p,
    ponderado: (itens) => {
      const total = itens.reduce((s, it) => s + it.peso, 0);
      let alvo = real() * total;
      for (const it of itens) {
        alvo -= it.peso;
        if (alvo < 0) return it.valor;
      }
      const ultimo = itens[itens.length - 1];
      if (!ultimo) throw new Error("ponderado: lista vazia");
      return ultimo.valor;
    },
    poisson: (lambda) => {
      if (lambda <= 0) return 0;
      if (lambda > 30) {
        // Aproximação normal (Box-Muller) para médias altas.
        const u = Math.max(real(), 1e-9);
        const v = real();
        const z = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
        return Math.max(0, Math.round(lambda + Math.sqrt(lambda) * z));
      }
      const limite = Math.exp(-lambda);
      let k = 0;
      let p = 1;
      do {
        k++;
        p *= real();
      } while (p > limite);
      return k - 1;
    },
  };
}

/** Hash hexadecimal no mesmo formato do clienteHash do Pelagem (SHA-256). */
export function sha256Hex(texto: string): string {
  return createHash("sha256").update(texto).digest("hex");
}
