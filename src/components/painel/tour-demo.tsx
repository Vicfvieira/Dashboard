"use client";

import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Lightbulb, Map, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePainel } from "./contexto";

/**
 * Tour curto para quem entra pela conta de demonstração. A conta é compartilhada por todos os
 * visitantes, então "já vi o tour" fica no navegador (localStorage), não no banco: o primeiro
 * recrutador não pode apagar o tour dos próximos.
 */
const CHAVE = "painelux:tour-demo-visto";
const EVENTO = "painelux:tour";

function lerVisto(): boolean {
  try {
    return localStorage.getItem(CHAVE) === "1";
  } catch {
    return true; // sem storage (aba privada restrita): não insiste no tour
  }
}
function gravarVisto(visto: boolean) {
  try {
    if (visto) localStorage.setItem(CHAVE, "1");
    else localStorage.removeItem(CHAVE);
  } catch {
    // ignora: o tour só não lembra da escolha
  }
  window.dispatchEvent(new Event(EVENTO));
}
function assinar(aviso: () => void) {
  window.addEventListener(EVENTO, aviso);
  window.addEventListener("storage", aviso);
  return () => {
    window.removeEventListener(EVENTO, aviso);
    window.removeEventListener("storage", aviso);
  };
}

/** Reabre o tour (botão "Ver o tour de novo" na barra lateral). */
export function reverTour() {
  gravarVisto(false);
}

interface Passo {
  alvo?: string;
  titulo: string;
  texto: string;
}

const PASSOS: Passo[] = [
  {
    titulo: "Boas-vindas ao Painelux",
    texto: "Um painel de gestão que junta o Pelagem Studio (pet spa) e a Lírio (profissionais de beleza em 96 distritos de São Paulo). Os números vêm das APIs reais dos dois sites, sincronizadas todo dia. Você está no perfil Gestão, só leitura.",
  },
  { alvo: "filtros", titulo: "Período e comparação", texto: "Troque o período (7 dias a 12 meses) e compare com o período anterior. A escolha fica na URL: dá para compartilhar o link de qualquer visão." },
  { alvo: "menu", titulo: "Uma análise por página", texto: "Pelagem (faturamento, horários, inativos), Lírio (funil e conversão), Mapa de mercado, Clientes e Insights. Todo gráfico tem “Ver como tabela” e exportação." },
  { alvo: "busca", titulo: "Atalho Ctrl+K", texto: "Abre a paleta de comandos: vá para qualquer página ou troque o período sem tirar a mão do teclado." },
  { titulo: "Por onde começar", texto: "Duas sugestões rápidas: o mapa de oferta e demanda dos distritos e os insights gerados por regras a partir dos dados." },
];

/** Primeiro elemento visível com o data-tour (o menu existe em versões desktop e celular). */
function alvoVisivel(nome: string): HTMLElement | null {
  for (const el of document.querySelectorAll<HTMLElement>(`[data-tour="${nome}"]`)) {
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.height > 0) return el;
  }
  return null;
}

type Caixa = { top: number; left: number; width: number; height: number };

export function TourDemo() {
  const { usuario } = usePainel();
  const visto = useSyncExternalStore(assinar, lerVisto, () => true);
  const [passo, setPasso] = useState(0);
  const [caixa, setCaixa] = useState<Caixa | null>(null);
  const cartao = useRef<HTMLDivElement>(null);
  const idTitulo = useId();
  const aberto = usuario.somenteLeitura && !visto;
  const atual = PASSOS[passo] ?? PASSOS[0];

  // Mede o alvo do passo (e de novo ao redimensionar). Atualiza no próximo quadro, fora do render.
  useEffect(() => {
    if (!aberto) return;
    let quadro = 0;
    const medir = () => {
      cancelAnimationFrame(quadro);
      quadro = requestAnimationFrame(() => {
        const el = atual?.alvo ? alvoVisivel(atual.alvo) : null;
        const r = el?.getBoundingClientRect();
        setCaixa(r ? { top: r.top, left: r.left, width: r.width, height: r.height } : null);
      });
    };
    medir();
    window.addEventListener("resize", medir);
    window.addEventListener("scroll", medir, true);
    return () => {
      cancelAnimationFrame(quadro);
      window.removeEventListener("resize", medir);
      window.removeEventListener("scroll", medir, true);
    };
  }, [aberto, atual]);

  useEffect(() => {
    if (aberto) cartao.current?.focus();
  }, [aberto, passo]);

  useEffect(() => {
    if (!aberto) return;
    const tecla = (e: KeyboardEvent) => {
      if (e.key === "Escape") fechar();
      if (e.key === "ArrowRight") setPasso((p) => Math.min(PASSOS.length - 1, p + 1));
      if (e.key === "ArrowLeft") setPasso((p) => Math.max(0, p - 1));
    };
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, [aberto]);

  function fechar() {
    gravarVisto(true);
    setPasso(0);
  }

  if (!aberto || !atual) return null;

  const MARGEM = 8;
  const destaque = caixa && { top: caixa.top - MARGEM / 2, left: caixa.left - MARGEM / 2, width: caixa.width + MARGEM, height: caixa.height + MARGEM };
  // Cartão abaixo do alvo (ou à direita, para o menu lateral); sem alvo, centralizado.
  const posicao: React.CSSProperties = !caixa
    ? { top: "50%", left: "50%", transform: "translate(-50%, -50%)" }
    : caixa.height > 300
      ? { top: Math.max(16, caixa.top + 40), left: Math.min(caixa.left + caixa.width + 16, window.innerWidth - 336) }
      : { top: caixa.top + caixa.height + 14, left: Math.max(16, Math.min(caixa.left + caixa.width / 2 - 160, window.innerWidth - 336)) };
  const ultimo = passo === PASSOS.length - 1;

  return (
    <div className="fixed inset-0 z-[60]">
      {/* Escurece a tela e recorta o alvo; sem alvo, só escurece. */}
      {destaque ? (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed rounded-lg ring-2 ring-primary transition-all duration-200 motion-reduce:transition-none"
          style={{ ...destaque, boxShadow: "0 0 0 9999px rgb(8 8 12 / 0.6)" }}
        />
      ) : (
        <div aria-hidden="true" className="fixed inset-0 bg-[rgb(8_8_12/0.6)]" />
      )}
      <div
        ref={cartao}
        role="dialog"
        aria-modal="true"
        aria-labelledby={idTitulo}
        tabIndex={-1}
        className="fixed w-[min(320px,calc(100vw-32px))] rounded-xl border border-border bg-popover p-4 text-popover-foreground shadow-2xl outline-none"
        style={posicao}
      >
        <div className="flex items-start justify-between gap-3">
          <p className="text-[11px] font-medium text-muted-foreground">
            Passo {passo + 1} de {PASSOS.length}
          </p>
          <button type="button" onClick={fechar} className="-mt-1 -mr-1 rounded p-1 text-muted-foreground hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none" aria-label="Fechar o tour">
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>
        <h2 id={idTitulo} className="mt-1 text-base font-semibold">
          {atual.titulo}
        </h2>
        <p className="mt-1.5 text-sm text-muted-foreground">{atual.texto}</p>
        {ultimo && (
          <div className="mt-3 grid gap-2">
            <Button asChild variant="outline" size="sm" className="justify-start">
              <Link href="/mercado" onClick={fechar}>
                <Map aria-hidden="true" /> Abrir o mapa de mercado
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="justify-start">
              <Link href="/insights" onClick={fechar}>
                <Lightbulb aria-hidden="true" /> Ver os insights
              </Link>
            </Button>
          </div>
        )}
        <div className="mt-4 flex items-center justify-between gap-2">
          <span className="flex gap-1" aria-hidden="true">
            {PASSOS.map((_, i) => (
              <span key={i} className={`h-1.5 rounded-full transition-all motion-reduce:transition-none ${i === passo ? "w-4 bg-primary" : "w-1.5 bg-muted-foreground/40"}`} />
            ))}
          </span>
          <div className="flex gap-1.5">
            {passo > 0 && (
              <Button variant="ghost" size="sm" onClick={() => setPasso(passo - 1)}>
                <ArrowLeft aria-hidden="true" /> Voltar
              </Button>
            )}
            {ultimo ? (
              <Button size="sm" onClick={fechar}>
                Explorar por conta própria
              </Button>
            ) : (
              <Button size="sm" onClick={() => setPasso(passo + 1)}>
                {passo === 0 ? "Fazer o tour" : "Próximo"} <ArrowRight aria-hidden="true" />
              </Button>
            )}
          </div>
        </div>
        {passo === 0 && (
          <button type="button" onClick={fechar} className="mt-2 text-[11px] text-muted-foreground underline-offset-2 hover:underline">
            Pular o tour
          </button>
        )}
      </div>
    </div>
  );
}
