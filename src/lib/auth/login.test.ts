import { beforeEach, describe, expect, it } from "vitest";
import { BLOQUEIO_MINUTOS, HASH_EQUALIZACAO, MAX_TENTATIVAS, verificarLogin, type DependenciasLogin, type EventoLogin, type UsuarioLogin } from "./login";

/** Banco e relógio em memória: a regra é testada sem Prisma nem bcrypt. */
function cenario(usuarioInicial: Partial<UsuarioLogin> = {}) {
  let agora = new Date("2026-10-12T12:00:00.000Z");
  const usuario: UsuarioLogin = {
    id: "u1",
    nome: "Rafael Nogueira",
    email: "gestor@painelux.dev",
    senhaHash: "hash:senha-certa",
    papel: "GESTOR",
    ativo: true,
    somenteLeitura: false,
    tentativasFalhas: 0,
    bloqueadoAte: null,
    ...usuarioInicial,
  };
  const eventos: EventoLogin[] = [];
  const hashesComparados: string[] = [];
  const deps: DependenciasLogin = {
    buscarPorEmail: async (email) => (email === usuario.email ? { ...usuario } : null),
    incrementarFalhas: async () => ++usuario.tentativasFalhas,
    bloquear: async (_id, ate) => {
      usuario.bloqueadoAte = ate;
      usuario.tentativasFalhas = 0;
    },
    registrarSucesso: async () => {
      usuario.tentativasFalhas = 0;
      usuario.bloqueadoAte = null;
    },
    compararSenha: async (senha, hash) => {
      hashesComparados.push(hash);
      return hash === `hash:${senha}`;
    },
    auditar: async (e) => {
      eventos.push(e);
    },
    agora: () => agora,
  };
  return {
    deps,
    usuario,
    eventos,
    hashesComparados,
    avancarMinutos: (m: number) => {
      agora = new Date(agora.getTime() + m * 60_000);
    },
  };
}

describe("login com bloqueio por tentativas", () => {
  let c: ReturnType<typeof cenario>;
  beforeEach(() => {
    c = cenario();
  });

  it("autentica com a senha certa, zera falhas e audita o sucesso", async () => {
    c.usuario.tentativasFalhas = 3;
    const r = await verificarLogin(c.deps, "  Gestor@Painelux.dev ", "senha-certa");
    expect(r).toEqual({ ok: true, usuario: { id: "u1", nome: "Rafael Nogueira", email: "gestor@painelux.dev", papel: "GESTOR", somenteLeitura: false } });
    expect(c.usuario.tentativasFalhas).toBe(0);
    expect(c.eventos).toEqual([{ acao: "LOGIN_SUCESSO", usuarioId: "u1", email: "gestor@painelux.dev" }]);
  });

  it(`bloqueia na ${MAX_TENTATIVAS}ª senha errada seguida, por ${BLOQUEIO_MINUTOS} minutos`, async () => {
    for (let i = 1; i < MAX_TENTATIVAS; i++) {
      expect(await verificarLogin(c.deps, "gestor@painelux.dev", "errada")).toEqual({ ok: false, motivo: "credenciais_invalidas" });
    }
    const quinta = await verificarLogin(c.deps, "gestor@painelux.dev", "errada");
    expect(quinta.ok).toBe(false);
    expect(quinta).toMatchObject({ motivo: "bloqueada" });
    expect(c.usuario.bloqueadoAte?.toISOString()).toBe("2026-10-12T12:15:00.000Z");
    expect(c.eventos.map((e) => e.acao)).toEqual([...Array(MAX_TENTATIVAS - 1).fill("LOGIN_FALHA"), "LOGIN_BLOQUEADO"]);
  });

  it("recusa até a senha certa durante o bloqueio, sem nem verificá-la", async () => {
    c.usuario.bloqueadoAte = new Date("2026-10-12T12:10:00.000Z");
    const r = await verificarLogin(c.deps, "gestor@painelux.dev", "senha-certa");
    expect(r).toMatchObject({ ok: false, motivo: "bloqueada" });
    expect(c.hashesComparados).toEqual([]);
    expect(c.eventos[0]).toMatchObject({ acao: "LOGIN_BLOQUEADO", motivo: "conta_bloqueada" });
  });

  it("não bloqueia a conta de demonstração (senha pública, somente leitura), mas audita as falhas", async () => {
    const d = cenario({ email: "demo@painelux.dev", somenteLeitura: true, bloqueadoAte: new Date("2026-10-12T12:10:00.000Z") });
    for (let i = 0; i < MAX_TENTATIVAS + 2; i++) await verificarLogin(d.deps, "demo@painelux.dev", "errada");
    expect(d.usuario.bloqueadoAte?.toISOString()).toBe("2026-10-12T12:10:00.000Z"); // nada novo gravado
    expect(d.usuario.tentativasFalhas).toBe(0);
    expect(d.eventos.every((e) => e.acao === "LOGIN_FALHA")).toBe(true);
    expect((await verificarLogin(d.deps, "demo@painelux.dev", "senha-certa")).ok).toBe(true);
  });

  it("libera o acesso quando os 15 minutos passam", async () => {
    for (let i = 0; i < MAX_TENTATIVAS; i++) await verificarLogin(c.deps, "gestor@painelux.dev", "errada");
    c.avancarMinutos(BLOQUEIO_MINUTOS - 1);
    expect(await verificarLogin(c.deps, "gestor@painelux.dev", "senha-certa")).toMatchObject({ ok: false, motivo: "bloqueada" });
    c.avancarMinutos(1);
    expect((await verificarLogin(c.deps, "gestor@painelux.dev", "senha-certa")).ok).toBe(true);
    expect(c.usuario.bloqueadoAte).toBeNull();
  });

  it("um sucesso no meio zera a contagem de falhas", async () => {
    for (let i = 0; i < MAX_TENTATIVAS - 1; i++) await verificarLogin(c.deps, "gestor@painelux.dev", "errada");
    await verificarLogin(c.deps, "gestor@painelux.dev", "senha-certa");
    const r = await verificarLogin(c.deps, "gestor@painelux.dev", "errada");
    expect(r).toEqual({ ok: false, motivo: "credenciais_invalidas" });
    expect(c.usuario.tentativasFalhas).toBe(1);
  });

  it("responde igual para e-mail inexistente, gastando o mesmo bcrypt", async () => {
    const r = await verificarLogin(c.deps, "ninguem@painelux.dev", "qualquer");
    expect(r).toEqual({ ok: false, motivo: "credenciais_invalidas" });
    expect(c.hashesComparados).toEqual([HASH_EQUALIZACAO]);
    expect(c.eventos[0]).toEqual({ acao: "LOGIN_FALHA", usuarioId: null, email: "ninguem@painelux.dev", motivo: "usuario_inexistente" });
  });

  it("recusa conta desativada mesmo com a senha certa, com a mesma mensagem genérica", async () => {
    c.usuario.ativo = false;
    const r = await verificarLogin(c.deps, "gestor@painelux.dev", "senha-certa");
    expect(r).toEqual({ ok: false, motivo: "credenciais_invalidas" });
    expect(c.eventos[0]).toMatchObject({ acao: "LOGIN_FALHA", motivo: "conta_inativa" });
  });

  it("audita toda tentativa, com ou sem sucesso", async () => {
    await verificarLogin(c.deps, "gestor@painelux.dev", "errada");
    await verificarLogin(c.deps, "x@y.dev", "errada");
    await verificarLogin(c.deps, "gestor@painelux.dev", "senha-certa");
    expect(c.eventos).toHaveLength(3);
  });
});
