/**
 * Seed idempotente do Painelux. Pode rodar quantas vezes quiser:
 * - usuários: criados uma vez (a senha nunca é sobrescrita depois); papel e flags são reaplicados;
 * - distritos: upsert dos 96 distritos oficiais;
 * - fatos fictícios: chaves determinísticas + createMany skipDuplicates (nada duplica).
 *
 *   npm run db:seed
 */
import { PrismaClient, type Papel } from "@prisma/client";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { DISTRITOS, SUBPREFEITURAS } from "@/data/sp-geo";
import { gerarAtendimentos } from "@/lib/seed/pelagem";
import { gerarEventos, gerarOferta } from "@/lib/seed/lirio";
import { diaSP, somarDias } from "@/lib/seed/datas";

const prisma = new PrismaClient();

const senha = z.string().min(12, "As senhas do seed precisam de pelo menos 12 caracteres.");
const env = z
  .object({
    SEED_ADMIN_PASSWORD: senha,
    SEED_GESTOR_PASSWORD: senha,
    SEED_ATENDENTE_PASSWORD: senha,
    SEED_DEMO_PASSWORD: senha,
  })
  .parse(process.env);

const USUARIOS: ReadonlyArray<{ email: string; nome: string; papel: Papel; somenteLeitura: boolean; senha: string }> = [
  { email: "admin@painelux.dev", nome: "Helena Prado", papel: "ADMIN", somenteLeitura: false, senha: env.SEED_ADMIN_PASSWORD },
  { email: "gestor@painelux.dev", nome: "Rafael Nogueira", papel: "GESTOR", somenteLeitura: false, senha: env.SEED_GESTOR_PASSWORD },
  { email: "atendente@painelux.dev", nome: "Bianca Torres", papel: "ATENDENTE", somenteLeitura: false, senha: env.SEED_ATENDENTE_PASSWORD },
  { email: "demo@painelux.dev", nome: "Acesso de demonstração", papel: "GESTOR", somenteLeitura: true, senha: env.SEED_DEMO_PASSWORD },
];

/** Meses de histórico fictício e dias de agenda futura do Pelagem. */
const DIAS_HISTORICO = 182;
const DIAS_FUTUROS = 14;
const CLIENTES_PELAGEM = 520;
const LOTE = 2_000;

async function emLotes<T>(itens: readonly T[], gravar: (lote: T[]) => Promise<{ count: number }>): Promise<number> {
  let gravados = 0;
  for (let i = 0; i < itens.length; i += LOTE) {
    gravados += (await gravar(itens.slice(i, i + LOTE))).count;
  }
  return gravados;
}

async function seedUsuarios() {
  for (const u of USUARIOS) {
    const existente = await prisma.user.findUnique({ where: { email: u.email }, select: { id: true } });
    if (existente) {
      await prisma.user.update({ where: { id: existente.id }, data: { papel: u.papel, somenteLeitura: u.somenteLeitura } });
    } else {
      await prisma.user.create({
        data: { email: u.email, nome: u.nome, papel: u.papel, somenteLeitura: u.somenteLeitura, senhaHash: await bcrypt.hash(u.senha, 12) },
      });
    }
  }
  console.log(`usuários: ${USUARIOS.length} garantidos`);
}

async function seedDistritos() {
  const nomeSubpref = new Map(SUBPREFEITURAS.map((s) => [s.slug, s.nome]));
  await prisma.$transaction(
    DISTRITOS.map((d) => {
      const dados = {
        nome: d.nome,
        sigla: d.sigla,
        codigo: d.codigo,
        subprefeituraSlug: d.subprefeitura,
        subprefeitura: nomeSubpref.get(d.subprefeitura) ?? d.subprefeitura,
        regiao: d.regiao,
        lat: d.centroide.lat,
        lng: d.centroide.lng,
        areaKm2: d.areaKm2,
      };
      return prisma.district.upsert({ where: { slug: d.slug }, create: { slug: d.slug, ...dados }, update: dados });
    }),
  );
  console.log(`distritos: ${DISTRITOS.length} garantidos`);
}

async function seedPelagem(agora: Date, inicio: Date) {
  const linhas = gerarAtendimentos({ agora, inicio, diasFuturos: DIAS_FUTUROS, totalClientes: CLIENTES_PELAGEM });
  const novos = await emLotes(linhas, (lote) =>
    prisma.appointmentFact.createMany({ data: lote.map((l) => ({ ...l, origem: "SEED" as const })), skipDuplicates: true }),
  );
  // Agendamentos fictícios que já passaram desde o último seed viram concluídos.
  const concluidos = await prisma.appointmentFact.updateMany({
    where: { origem: "SEED", status: "AGENDADO", fim: { lt: agora } },
    data: { status: "CONCLUIDO" },
  });
  console.log(`pelagem: ${linhas.length} atendimentos gerados, ${novos} novos, ${concluidos.count} concluídos desde o último seed`);
  return { lidos: linhas.length, gravados: novos };
}

async function seedLirio(inicio: Date, hoje: Date) {
  const oferta = gerarOferta({ inicio, hoje });
  const novaOferta = await emLotes(oferta, (lote) =>
    prisma.professionalStat.createMany({ data: lote.map((l) => ({ ...l, origem: "SEED" as const })), skipDuplicates: true }),
  );
  const eventos = gerarEventos({ inicio, hoje });
  const novosEventos = await emLotes(eventos, (lote) =>
    prisma.marketEventFact.createMany({ data: lote.map((l) => ({ ...l, origem: "SEED" as const })), skipDuplicates: true }),
  );
  console.log(`lírio: ${oferta.length} fotos de oferta (${novaOferta} novas), ${eventos.length} linhas de eventos (${novosEventos} novas)`);
  return { lidos: oferta.length + eventos.length, gravados: novaOferta + novosEventos };
}

async function registrarSync(fonte: "PELAGEM" | "LIRIO", r: { lidos: number; gravados: number }, inicioMs: number) {
  if (r.gravados === 0) return;
  await prisma.syncRun.create({
    data: {
      fonte,
      gatilho: "SEED",
      status: "SUCESSO",
      iniciadoEm: new Date(inicioMs),
      finalizadoEm: new Date(),
      duracaoMs: Date.now() - inicioMs,
      registrosLidos: r.lidos,
      registrosGravados: r.gravados,
      detalhes: { descricao: "Dados fictícios gerados pelo seed" },
    },
  });
}

async function main() {
  const agora = new Date();
  const hoje = diaSP(agora);
  const inicio = somarDias(hoje, -DIAS_HISTORICO);

  await seedUsuarios();
  await seedDistritos();
  let t = Date.now();
  await registrarSync("PELAGEM", await seedPelagem(agora, inicio), t);
  t = Date.now();
  await registrarSync("LIRIO", await seedLirio(inicio, hoje), t);
}

main()
  .catch((erro: unknown) => {
    console.error(erro instanceof Error ? erro.message : erro);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
