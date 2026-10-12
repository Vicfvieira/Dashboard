"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, Loader2, RefreshCw, TriangleAlert, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { formatarDuracao, formatarInteiro } from "@/lib/formato";
import { sincronizarAgora, type EstadoSincronizacao } from "./actions";

const NOME = { PELAGEM: "Pelagem", LIRIO: "Lírio" } as const;

export function BotaoSincronizar({
  fonte,
  permitido,
  motivoBloqueio,
  rotulo,
  variante = "default",
}: {
  fonte: "TODAS" | "PELAGEM" | "LIRIO";
  permitido: boolean;
  motivoBloqueio: string;
  rotulo: string;
  variante?: "default" | "outline";
}) {
  const [pendente, iniciar] = useTransition();
  const [estado, setEstado] = useState<EstadoSincronizacao | null>(null);

  const botao = (
    <Button
      size="sm"
      variant={variante}
      disabled={!permitido || pendente}
      aria-disabled={!permitido || pendente}
      onClick={() =>
        iniciar(async () => {
          setEstado(null);
          try {
            setEstado(await sincronizarAgora(fonte));
          } catch {
            setEstado({ resultados: [], erro: "Não foi possível concluir a sincronização. Tente novamente." });
          }
        })
      }
    >
      {pendente ? <Loader2 className="animate-spin" aria-hidden="true" /> : <RefreshCw aria-hidden="true" />}
      {pendente ? "Sincronizando…" : rotulo}
    </Button>
  );

  return (
    <div className="grid justify-items-end gap-2">
      {permitido ? (
        botao
      ) : (
        <Tooltip>
          {/* span: botão desabilitado não recebe hover/foco para o tooltip */}
          <TooltipTrigger asChild>
            <span tabIndex={0} className="rounded-md focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none">
              {botao}
            </span>
          </TooltipTrigger>
          <TooltipContent>{motivoBloqueio}</TooltipContent>
        </Tooltip>
      )}
      <div aria-live="polite" className="text-right text-xs">
        {estado?.erro && <p className="text-destructive">{estado.erro}</p>}
        {estado?.resultados.map((r) => (
          <p key={r.fonte} className="flex items-center justify-end gap-1.5 text-muted-foreground">
            {r.status === "SUCESSO" ? (
              <CheckCircle2 className="size-3.5 text-success" aria-hidden="true" />
            ) : r.status === "ERRO" ? (
              <XCircle className="size-3.5 text-destructive" aria-hidden="true" />
            ) : (
              <TriangleAlert className="size-3.5 text-warning" aria-hidden="true" />
            )}
            <span>
              {NOME[r.fonte]}:{" "}
              {r.status === "ERRO" || r.status === "IGNORADA"
                ? r.mensagem
                : `${formatarInteiro(r.registrosLidos)} lidos, ${formatarInteiro(r.registrosGravados)} gravados em ${formatarDuracao(r.duracaoMs)}`}
            </span>
          </p>
        ))}
      </div>
    </div>
  );
}
