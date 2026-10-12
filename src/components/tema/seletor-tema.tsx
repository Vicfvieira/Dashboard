"use client";

import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { Laptop, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

const montado = () => true;
const noServidor = () => false;

export function SeletorTema() {
  const { theme, resolvedTheme, setTheme } = useTheme();
  // Evita divergência de hidratação: o tema só é conhecido no navegador.
  const noCliente = useSyncExternalStore(() => () => {}, montado, noServidor);
  const Icone = !noCliente ? Moon : resolvedTheme === "light" ? Sun : Moon;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Alterar tema">
          <Icone />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-40">
        <DropdownMenuLabel>Tema</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={noCliente ? (theme ?? "dark") : "dark"} onValueChange={setTheme}>
          <DropdownMenuRadioItem value="dark">
            <Moon /> Escuro
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="light">
            <Sun /> Claro
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="system">
            <Laptop /> Do sistema
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
