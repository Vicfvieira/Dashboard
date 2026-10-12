"use client";

import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { AlertCircle, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { entrarComoDemo, type EstadoLogin } from "./actions";

const inicial: EstadoLogin = { erro: null, email: "" };

/** Entrada de um clique na conta de demonstração (somente leitura). */
export function BotaoDemo() {
  const destino = useSearchParams().get("destino") ?? "";
  const [estado, acao, enviando] = useActionState(entrarComoDemo, inicial);
  return (
    <form action={acao} className="grid gap-2">
      <input type="hidden" name="destino" value={destino} />
      <Button type="submit" size="lg" className="w-full" disabled={enviando}>
        {enviando ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Sparkles aria-hidden="true" />}
        {enviando ? "Abrindo a demonstração" : "Explorar a demonstração"}
      </Button>
      {estado.erro && (
        <p role="alert" className="flex items-start gap-2 text-xs text-destructive">
          <AlertCircle className="mt-px size-3.5 shrink-0" aria-hidden="true" />
          {estado.erro}
        </p>
      )}
    </form>
  );
}
