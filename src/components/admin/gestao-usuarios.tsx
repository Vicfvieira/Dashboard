"use client";

import { useId, useState, useTransition } from "react";
import type { Papel } from "@prisma/client";
import { Check, Copy, KeyRound, Loader2, MoreHorizontal, Power, ShieldCheck, UserPlus } from "lucide-react";
import { alterarAtivo, alterarPapel, criarUsuario, redefinirSenha, type ResultadoAcao } from "@/app/(painel)/usuarios/acoes";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DESCRICAO_PAPEL, PAPEIS, ROTULO_PAPEL } from "@/lib/usuarios";
import { cn } from "@/lib/utils";

export interface LinhaUsuario {
  id: string;
  nome: string;
  email: string;
  papel: Papel;
  ativo: boolean;
  somenteLeitura: boolean;
  /** Texto pronto (formatado no servidor, sem risco de divergir na hidratação). */
  bloqueadoAte: string | null;
  ultimoAcesso: string;
  criadoEm: string;
}

type Dialogo = { tipo: "novo" } | { tipo: "papel"; usuario: LinhaUsuario } | { tipo: "ativo"; usuario: LinhaUsuario } | { tipo: "senha"; usuario: LinhaUsuario } | { tipo: "senha-gerada"; titulo: string; mensagem: string; senha: string } | null;

function SeletorPapel({ valor, aoMudar, nome }: { valor: Papel; aoMudar: (p: Papel) => void; nome: string }) {
  return (
    <fieldset className="grid min-w-0 gap-2">
      <legend className="mb-1.5 text-xs font-medium">Papel</legend>
      {PAPEIS.map((p) => (
        <label key={p} className={cn("flex cursor-pointer items-start gap-2.5 rounded-lg border p-2.5 text-xs transition-colors", valor === p ? "border-primary bg-primary/5" : "border-border hover:border-primary/40")}>
          <input type="radio" name={nome} value={p} checked={valor === p} onChange={() => aoMudar(p)} className="mt-0.5 accent-[var(--primary)]" />
          <span>
            <span className="block font-medium">{ROTULO_PAPEL[p]}</span>
            <span className="text-muted-foreground">{DESCRICAO_PAPEL[p]}</span>
          </span>
        </label>
      ))}
    </fieldset>
  );
}

function SenhaGerada({ senha }: { senha: string }) {
  const [copiada, setCopiada] = useState(false);
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/50 p-2.5">
      <code className="flex-1 font-mono text-sm tracking-wider select-all">{senha}</code>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={async () => {
          await navigator.clipboard.writeText(senha).catch(() => undefined);
          setCopiada(true);
        }}
      >
        {copiada ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
        {copiada ? "Copiada" : "Copiar"}
      </Button>
    </div>
  );
}

function Situacao({ u }: { u: LinhaUsuario }) {
  return (
    <span className="flex flex-wrap gap-1">
      {!u.ativo ? <Badge variant="erro">Desativada</Badge> : u.bloqueadoAte ? <Badge variant="alerta">Bloqueada até {u.bloqueadoAte}</Badge> : <Badge variant="sucesso">Ativa</Badge>}
      {u.somenteLeitura && <Badge variant="info">Somente leitura</Badge>}
    </span>
  );
}

export function GestaoUsuarios({ usuarios, atorId, podeGerenciar }: { usuarios: LinhaUsuario[]; atorId: string; podeGerenciar: boolean }) {
  const [dialogo, setDialogo] = useState<Dialogo>(null);
  const [aviso, setAviso] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);
  const [erroDialogo, setErroDialogo] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();
  const idForm = useId();

  // Formulário de nova conta e de troca de papel (estado local do diálogo aberto).
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [papel, setPapel] = useState<Papel>("GESTOR");

  function abrir(d: Dialogo) {
    setErroDialogo(null);
    if (d?.tipo === "novo") {
      setNome("");
      setEmail("");
      setPapel("GESTOR");
    }
    if (d?.tipo === "papel") setPapel(d.usuario.papel);
    setDialogo(d);
  }

  function executar(acao: () => Promise<ResultadoAcao>, tituloSenha?: string) {
    setErroDialogo(null);
    iniciar(async () => {
      const r = await acao().catch(() => ({ ok: false as const, erro: "Não foi possível concluir agora. Tente de novo." }));
      if (!r.ok) {
        setErroDialogo(r.erro);
        return;
      }
      if (r.senhaTemporaria && tituloSenha) {
        setDialogo({ tipo: "senha-gerada", titulo: tituloSenha, mensagem: r.mensagem, senha: r.senhaTemporaria });
      } else {
        setDialogo(null);
      }
      setAviso({ tipo: "ok", texto: r.mensagem });
    });
  }

  const admins = usuarios.filter((u) => u.papel === "ADMIN" && u.ativo).length;

  return (
    <section aria-labelledby="titulo-usuarios" className="rounded-xl border border-border bg-card">
      <header className="flex flex-wrap items-start justify-between gap-3 px-4 pt-4">
        <div>
          <h2 id="titulo-usuarios" className="text-sm font-semibold">
            {usuarios.length} contas
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {admins} {admins === 1 ? "conta" : "contas"} de administração ativa{admins === 1 ? "" : "s"}. A última nunca pode ser desativada nem rebaixada.
          </p>
        </div>
        {podeGerenciar && (
          <Button size="sm" onClick={() => abrir({ tipo: "novo" })}>
            <UserPlus aria-hidden="true" />
            Nova conta
          </Button>
        )}
      </header>
      <p role="status" aria-live="polite" className={cn("px-4 pt-2 text-xs", aviso?.tipo === "erro" ? "text-destructive" : "text-success", !aviso && "sr-only")}>
        {aviso?.texto}
      </p>
      <div className="relative mt-3 overflow-x-auto border-t border-border">
        <table className="w-full min-w-[720px] text-xs">
          <caption className="sr-only">Contas do Painelux com papel, situação e último acesso</caption>
          <thead className="bg-muted/40 text-left text-muted-foreground">
            <tr>
              <th scope="col" className="px-4 py-2 font-medium">Pessoa</th>
              <th scope="col" className="px-3 py-2 font-medium">Papel</th>
              <th scope="col" className="px-3 py-2 font-medium">Situação</th>
              <th scope="col" className="px-3 py-2 font-medium">Último acesso</th>
              <th scope="col" className="px-3 py-2 font-medium">Criada em</th>
              {podeGerenciar && (
                <th scope="col" className="px-4 py-2 text-right font-medium">
                  <span className="sr-only">Ações</span>
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {usuarios.map((u) => (
              <tr key={u.id} className={cn("border-t border-border/60", !u.ativo && "text-muted-foreground")}>
                <th scope="row" className="px-4 py-2.5 text-left font-normal">
                  <span className="block font-medium text-foreground">
                    {u.nome}
                    {u.id === atorId && <span className="ml-1.5 text-[11px] font-normal text-muted-foreground">(você)</span>}
                  </span>
                  <span className="text-muted-foreground">{u.email}</span>
                </th>
                <td className="px-3 py-2.5">
                  <span className="inline-flex items-center gap-1.5">
                    {u.papel === "ADMIN" && <ShieldCheck className="size-3.5 text-primary-ink" aria-hidden="true" />}
                    {ROTULO_PAPEL[u.papel]}
                  </span>
                </td>
                <td className="px-3 py-2.5">
                  <Situacao u={u} />
                </td>
                <td className="px-3 py-2.5 whitespace-nowrap">{u.ultimoAcesso}</td>
                <td className="px-3 py-2.5 whitespace-nowrap">{u.criadoEm}</td>
                {podeGerenciar && (
                  <td className="px-4 py-2.5 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="size-7" aria-label={`Ações para ${u.nome}`}>
                          <MoreHorizontal aria-hidden="true" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>{u.email}</DropdownMenuLabel>
                        <DropdownMenuItem onSelect={() => abrir({ tipo: "papel", usuario: u })}>
                          <ShieldCheck /> Alterar papel
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => abrir({ tipo: "senha", usuario: u })} disabled={u.somenteLeitura}>
                          <KeyRound /> Redefinir senha
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onSelect={() => abrir({ tipo: "ativo", usuario: u })} className={cn(u.ativo && "text-destructive focus:text-destructive")}>
                          <Power /> {u.ativo ? "Desativar conta" : "Reativar conta"}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={dialogo !== null} onOpenChange={(aberto) => !aberto && !pendente && setDialogo(null)}>
        <DialogContent className="max-w-md">
          {dialogo?.tipo === "novo" && (
            <form
              id={idForm}
              className="grid gap-4"
              onSubmit={(e) => {
                e.preventDefault();
                executar(() => criarUsuario({ nome, email, papel }), "Conta criada");
              }}
            >
              <div>
                <DialogTitle>Nova conta</DialogTitle>
                <DialogDescription>Uma senha temporária é gerada e mostrada uma única vez, para você entregar por um canal seguro.</DialogDescription>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor={`${idForm}-nome`}>Nome</Label>
                <Input id={`${idForm}-nome`} value={nome} onChange={(e) => setNome(e.target.value)} required minLength={2} maxLength={80} autoComplete="off" />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor={`${idForm}-email`}>E-mail</Label>
                <Input id={`${idForm}-email`} type="email" value={email} onChange={(e) => setEmail(e.target.value)} required maxLength={254} autoComplete="off" />
              </div>
              <SeletorPapel valor={papel} aoMudar={setPapel} nome={`${idForm}-papel`} />
              {erroDialogo && <p role="alert" className="text-xs text-destructive">{erroDialogo}</p>}
              <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={() => setDialogo(null)} disabled={pendente}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={pendente}>
                  {pendente && <Loader2 className="animate-spin" aria-hidden="true" />}
                  Criar conta
                </Button>
              </div>
            </form>
          )}

          {dialogo?.tipo === "papel" && (
            <form
              className="grid gap-4"
              onSubmit={(e) => {
                e.preventDefault();
                executar(() => alterarPapel(dialogo.usuario.id, papel));
              }}
            >
              <div>
                <DialogTitle>Alterar papel</DialogTitle>
                <DialogDescription>
                  {dialogo.usuario.nome} ({dialogo.usuario.email}). A mudança vale em até 1 minuto, sem precisar sair.
                </DialogDescription>
              </div>
              <SeletorPapel valor={papel} aoMudar={setPapel} nome="papel-alterar" />
              {erroDialogo && <p role="alert" className="text-xs text-destructive">{erroDialogo}</p>}
              <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={() => setDialogo(null)} disabled={pendente}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={pendente || papel === dialogo.usuario.papel}>
                  {pendente && <Loader2 className="animate-spin" aria-hidden="true" />}
                  Salvar papel
                </Button>
              </div>
            </form>
          )}

          {dialogo?.tipo === "ativo" && (
            <div className="grid gap-4">
              <div>
                <DialogTitle>{dialogo.usuario.ativo ? "Desativar conta" : "Reativar conta"}</DialogTitle>
                <DialogDescription>
                  {dialogo.usuario.ativo
                    ? `${dialogo.usuario.nome} não consegue mais entrar, e a sessão aberta cai em até 1 minuto. O histórico na auditoria é mantido.`
                    : `${dialogo.usuario.nome} volta a entrar com a senha atual. Bloqueios por tentativas são zerados.`}
                </DialogDescription>
              </div>
              {erroDialogo && <p role="alert" className="text-xs text-destructive">{erroDialogo}</p>}
              <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={() => setDialogo(null)} disabled={pendente}>
                  Cancelar
                </Button>
                <Button type="button" variant={dialogo.usuario.ativo ? "destructive" : "default"} disabled={pendente} onClick={() => executar(() => alterarAtivo(dialogo.usuario.id, !dialogo.usuario.ativo))}>
                  {pendente && <Loader2 className="animate-spin" aria-hidden="true" />}
                  {dialogo.usuario.ativo ? "Desativar" : "Reativar"}
                </Button>
              </div>
            </div>
          )}

          {dialogo?.tipo === "senha" && (
            <div className="grid gap-4">
              <div>
                <DialogTitle>Redefinir senha</DialogTitle>
                <DialogDescription>Gera uma senha temporária para {dialogo.usuario.email} e desbloqueia a conta. A senha atual deixa de funcionar.</DialogDescription>
              </div>
              {erroDialogo && <p role="alert" className="text-xs text-destructive">{erroDialogo}</p>}
              <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={() => setDialogo(null)} disabled={pendente}>
                  Cancelar
                </Button>
                <Button type="button" disabled={pendente} onClick={() => executar(() => redefinirSenha(dialogo.usuario.id), "Senha redefinida")}>
                  {pendente && <Loader2 className="animate-spin" aria-hidden="true" />}
                  Gerar senha temporária
                </Button>
              </div>
            </div>
          )}

          {dialogo?.tipo === "senha-gerada" && (
            <div className="grid gap-4">
              <div>
                <DialogTitle>{dialogo.titulo}</DialogTitle>
                <DialogDescription>{dialogo.mensagem}</DialogDescription>
              </div>
              <SenhaGerada senha={dialogo.senha} />
              <p className="text-[11px] text-muted-foreground">Esta senha não fica salva em lugar nenhum e não aparece de novo. Ela não vai para os logs.</p>
              <div className="flex justify-end">
                <Button type="button" onClick={() => setDialogo(null)}>
                  Entendi, já copiei
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
