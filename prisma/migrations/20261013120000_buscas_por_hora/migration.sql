-- CreateTable
CREATE TABLE "SearchHourFact" (
    "id" TEXT NOT NULL,
    "dia" DATE NOT NULL,
    "hora" INTEGER NOT NULL,
    "buscas" INTEGER NOT NULL DEFAULT 0,
    "origem" "OrigemDado" NOT NULL,
    "sincronizadoEm" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SearchHourFact_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SearchHourFact_dia_idx" ON "SearchHourFact"("dia");

-- CreateIndex
CREATE UNIQUE INDEX "SearchHourFact_dia_hora_key" ON "SearchHourFact"("dia", "hora");

