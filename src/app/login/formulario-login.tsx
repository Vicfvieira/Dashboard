"use client";

import { useActionState, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AlertCircle, ArrowRight, Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { entrar, type EstadoLogin } from "./actions";

const inicial: EstadoLogin = { erro: null, email: "" };

export function FormularioLogin() {
  const destino = useSearchParams().get("destino") ?? "";
  const [estado, acao, enviando] = useActionState(entrar, inicial);
  const [mostrarSenha, setMostrarSenha] = useState(false);

  return (
    <form action={acao} className="grid gap-5" noValidate>
      <input type="hidden" name="destino" value={destino} />

      <div className="grid gap-2">
        <Label htmlFor="email">E-mail corporativo</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          inputMode="email"
          required
          defaultValue={estado.email}
          placeholder="nome@painelux.dev"
          aria-invalid={Boolean(estado.erro) || undefined}
          aria-describedby={estado.erro ? "erro-login" : undefined}
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="senha">Senha</Label>
        <div className="relative">
          <Input
            id="senha"
            name="senha"
            type={mostrarSenha ? "text" : "password"}
            autoComplete="current-password"
            required
            className="pr-10"
            aria-invalid={Boolean(estado.erro) || undefined}
            aria-describedby={estado.erro ? "erro-login" : undefined}
          />
          <button
            type="button"
            onClick={() => setMostrarSenha((v) => !v)}
            className="absolute inset-y-0 right-0 flex w-10 items-center justify-center rounded-r-md text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40"
            aria-label={mostrarSenha ? "Ocultar senha" : "Mostrar senha"}
            aria-pressed={mostrarSenha}
          >
            {mostrarSenha ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
      </div>

      <div aria-live="polite" className="min-h-0">
        {estado.erro && (
          <p
            id="erro-login"
            role="alert"
            className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2.5 text-sm text-foreground"
          >
            <AlertCircle className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden="true" />
            {estado.erro}
          </p>
        )}
      </div>

      <Button type="submit" size="lg" disabled={enviando} className="w-full">
        {enviando ? (
          <>
            <Loader2 className="animate-spin" aria-hidden="true" />
            Verificando credenciais
          </>
        ) : (
          <>
            Entrar no painel
            <ArrowRight aria-hidden="true" />
          </>
        )}
      </Button>
    </form>
  );
}
