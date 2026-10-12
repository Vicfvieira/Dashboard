export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
      <span className="text-xs font-medium tracking-[0.2em] text-muted-foreground uppercase">
        Painelux
      </span>
      <h1 className="text-2xl font-semibold tracking-tight">
        Gestão consolidada do Pelagem Studio e da Lírio
      </h1>
      <p className="max-w-md text-sm text-muted-foreground">
        Ambiente em configuração. Autenticação e dashboards entram nas próximas etapas.
      </p>
      <footer className="absolute bottom-4 text-xs text-muted-foreground">
        Projeto fictício desenvolvido para portfólio por Victoria Fernandes Vieira.
      </footer>
    </main>
  );
}
