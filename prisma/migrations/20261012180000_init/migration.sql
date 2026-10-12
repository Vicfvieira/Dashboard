-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Papel" AS ENUM ('ADMIN', 'GESTOR', 'ATENDENTE');

-- CreateEnum
CREATE TYPE "AcaoAuditoria" AS ENUM ('LOGIN_SUCESSO', 'LOGIN_FALHA', 'LOGIN_BLOQUEADO', 'LOGOUT', 'ACESSO_NEGADO', 'USUARIO_CRIADO', 'USUARIO_ATUALIZADO', 'USUARIO_DESATIVADO', 'USUARIO_REATIVADO', 'SENHA_REDEFINIDA', 'SINCRONIZACAO', 'EXPORTACAO');

-- CreateEnum
CREATE TYPE "Fonte" AS ENUM ('PELAGEM', 'LIRIO');

-- CreateEnum
CREATE TYPE "GatilhoSync" AS ENUM ('MANUAL', 'CRON', 'SEED');

-- CreateEnum
CREATE TYPE "StatusSync" AS ENUM ('EXECUTANDO', 'SUCESSO', 'PARCIAL', 'ERRO');

-- CreateEnum
CREATE TYPE "OrigemDado" AS ENUM ('SEED', 'API');

-- CreateEnum
CREATE TYPE "Porte" AS ENUM ('P', 'M', 'G');

-- CreateEnum
CREATE TYPE "Especie" AS ENUM ('CACHORRO', 'GATO');

-- CreateEnum
CREATE TYPE "StatusAtendimento" AS ENUM ('AGENDADO', 'CONCLUIDO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "Regiao" AS ENUM ('centro', 'oeste', 'sul', 'norte', 'leste');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senhaHash" TEXT NOT NULL,
    "papel" "Papel" NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "somenteLeitura" BOOLEAN NOT NULL DEFAULT false,
    "tentativasFalhas" INTEGER NOT NULL DEFAULT 0,
    "bloqueadoAte" TIMESTAMPTZ(3),
    "ultimoLoginEm" TIMESTAMPTZ(3),
    "tourConcluidoEm" TIMESTAMPTZ(3),
    "criadoEm" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "criadoEm" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acao" "AcaoAuditoria" NOT NULL,
    "sucesso" BOOLEAN NOT NULL DEFAULT true,
    "usuarioId" TEXT,
    "email" TEXT,
    "ip" TEXT,
    "userAgent" TEXT,
    "alvo" TEXT,
    "detalhes" JSONB,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SyncRun" (
    "id" TEXT NOT NULL,
    "fonte" "Fonte" NOT NULL,
    "gatilho" "GatilhoSync" NOT NULL,
    "status" "StatusSync" NOT NULL DEFAULT 'EXECUTANDO',
    "iniciadoEm" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finalizadoEm" TIMESTAMPTZ(3),
    "duracaoMs" INTEGER,
    "paginas" INTEGER NOT NULL DEFAULT 0,
    "registrosLidos" INTEGER NOT NULL DEFAULT 0,
    "registrosGravados" INTEGER NOT NULL DEFAULT 0,
    "tentativas" INTEGER NOT NULL DEFAULT 0,
    "erro" TEXT,
    "detalhes" JSONB,
    "disparadoPorId" TEXT,

    CONSTRAINT "SyncRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppointmentFact" (
    "id" TEXT NOT NULL,
    "idOrigem" TEXT NOT NULL,
    "clienteHash" TEXT NOT NULL,
    "servicoSlug" TEXT NOT NULL,
    "servicoNome" TEXT NOT NULL,
    "porte" "Porte" NOT NULL,
    "especie" "Especie",
    "status" "StatusAtendimento" NOT NULL,
    "inicio" TIMESTAMPTZ(3) NOT NULL,
    "fim" TIMESTAMPTZ(3) NOT NULL,
    "duracaoMinutos" INTEGER NOT NULL,
    "valorServicoCentavos" INTEGER NOT NULL,
    "taxaTaxiCentavos" INTEGER NOT NULL DEFAULT 0,
    "totalCentavos" INTEGER NOT NULL,
    "zonaTaxi" TEXT,
    "criadoEmOrigem" TIMESTAMPTZ(3) NOT NULL,
    "canceladoEmOrigem" TIMESTAMPTZ(3),
    "origem" "OrigemDado" NOT NULL,
    "sincronizadoEm" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AppointmentFact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "District" (
    "slug" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "sigla" TEXT NOT NULL,
    "codigo" INTEGER NOT NULL,
    "subprefeituraSlug" TEXT NOT NULL,
    "subprefeitura" TEXT NOT NULL,
    "regiao" "Regiao" NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "areaKm2" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "District_pkey" PRIMARY KEY ("slug")
);

-- CreateTable
CREATE TABLE "ProfessionalStat" (
    "id" TEXT NOT NULL,
    "data" DATE NOT NULL,
    "distritoSlug" TEXT NOT NULL,
    "regiao" "Regiao" NOT NULL,
    "categoria" TEXT NOT NULL,
    "ativas" INTEGER NOT NULL,
    "verificadas" INTEGER NOT NULL DEFAULT 0,
    "origem" "OrigemDado" NOT NULL,
    "sincronizadoEm" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProfessionalStat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketEventFact" (
    "id" TEXT NOT NULL,
    "chave" TEXT NOT NULL,
    "dia" DATE NOT NULL,
    "distritoSlug" TEXT,
    "regiao" "Regiao",
    "categoria" TEXT,
    "buscas" INTEGER NOT NULL DEFAULT 0,
    "visualizacoes" INTEGER NOT NULL DEFAULT 0,
    "cliquesWhatsapp" INTEGER NOT NULL DEFAULT 0,
    "cliquesInstagram" INTEGER NOT NULL DEFAULT 0,
    "origem" "OrigemDado" NOT NULL,
    "sincronizadoEm" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MarketEventFact_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "AuditLog_criadoEm_idx" ON "AuditLog"("criadoEm" DESC);

-- CreateIndex
CREATE INDEX "AuditLog_acao_criadoEm_idx" ON "AuditLog"("acao", "criadoEm");

-- CreateIndex
CREATE INDEX "AuditLog_usuarioId_criadoEm_idx" ON "AuditLog"("usuarioId", "criadoEm");

-- CreateIndex
CREATE INDEX "SyncRun_fonte_iniciadoEm_idx" ON "SyncRun"("fonte", "iniciadoEm" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "AppointmentFact_idOrigem_key" ON "AppointmentFact"("idOrigem");

-- CreateIndex
CREATE INDEX "AppointmentFact_inicio_idx" ON "AppointmentFact"("inicio");

-- CreateIndex
CREATE INDEX "AppointmentFact_status_inicio_idx" ON "AppointmentFact"("status", "inicio");

-- CreateIndex
CREATE INDEX "AppointmentFact_clienteHash_inicio_idx" ON "AppointmentFact"("clienteHash", "inicio");

-- CreateIndex
CREATE INDEX "AppointmentFact_servicoSlug_inicio_idx" ON "AppointmentFact"("servicoSlug", "inicio");

-- CreateIndex
CREATE UNIQUE INDEX "District_sigla_key" ON "District"("sigla");

-- CreateIndex
CREATE UNIQUE INDEX "District_codigo_key" ON "District"("codigo");

-- CreateIndex
CREATE INDEX "District_regiao_idx" ON "District"("regiao");

-- CreateIndex
CREATE INDEX "ProfessionalStat_categoria_data_idx" ON "ProfessionalStat"("categoria", "data");

-- CreateIndex
CREATE UNIQUE INDEX "ProfessionalStat_data_distritoSlug_categoria_key" ON "ProfessionalStat"("data", "distritoSlug", "categoria");

-- CreateIndex
CREATE UNIQUE INDEX "MarketEventFact_chave_key" ON "MarketEventFact"("chave");

-- CreateIndex
CREATE INDEX "MarketEventFact_dia_idx" ON "MarketEventFact"("dia");

-- CreateIndex
CREATE INDEX "MarketEventFact_distritoSlug_categoria_dia_idx" ON "MarketEventFact"("distritoSlug", "categoria", "dia");

-- CreateIndex
CREATE INDEX "MarketEventFact_categoria_dia_idx" ON "MarketEventFact"("categoria", "dia");

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SyncRun" ADD CONSTRAINT "SyncRun_disparadoPorId_fkey" FOREIGN KEY ("disparadoPorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfessionalStat" ADD CONSTRAINT "ProfessionalStat_distritoSlug_fkey" FOREIGN KEY ("distritoSlug") REFERENCES "District"("slug") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketEventFact" ADD CONSTRAINT "MarketEventFact_distritoSlug_fkey" FOREIGN KEY ("distritoSlug") REFERENCES "District"("slug") ON DELETE SET NULL ON UPDATE CASCADE;

