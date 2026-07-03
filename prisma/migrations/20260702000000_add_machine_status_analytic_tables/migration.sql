-- ================================================================
-- Migration: Pisahkan status dari Machine, buat MachineStatus dan Analytic
-- ================================================================
--
-- Urutan yang HARUS diikuti:
-- 1. Buat tabel MachineStatus dan Analytic dulu
-- 2. Migrate data status yang ada dari Machine ke MachineStatus
-- 3. Hapus kolom status, performancePct, qualityPct dari Machine
--
-- Catatan: kolom "status" di Machine masih ada di database dengan nama
-- asli "status" (bukan di-@map), jadi referensinya pakai "status".
-- ================================================================

-- Step 1: Buat tabel MachineStatus
CREATE TABLE "MachineStatus" (
    "id"        SERIAL NOT NULL,
    "machineId" INTEGER NOT NULL,
    "status"    TEXT NOT NULL DEFAULT 'idle',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MachineStatus_pkey" PRIMARY KEY ("id")
);

-- Unique constraint: satu status per mesin
CREATE UNIQUE INDEX "MachineStatus_machineId_key" ON "MachineStatus"("machineId");

-- Foreign key ke Machine
ALTER TABLE "MachineStatus"
    ADD CONSTRAINT "MachineStatus_machineId_fkey"
    FOREIGN KEY ("machineId") REFERENCES "Machine"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- Step 2: Migrate data status dari Machine ke MachineStatus
-- (isi status dan updatedAt = now() untuk semua mesin yang ada)
INSERT INTO "MachineStatus" ("machineId", "status", "updatedAt")
SELECT "id", COALESCE("status", 'idle'), NOW()
FROM "Machine";

-- Step 3: Buat tabel Analytic
CREATE TABLE "Analytic" (
    "id"              SERIAL NOT NULL,
    "machineId"       INTEGER NOT NULL,
    "periodStart"     TIMESTAMP(3) NOT NULL,
    "periodEnd"       TIMESTAMP(3) NOT NULL,
    "periodType"      TEXT NOT NULL,
    "availability"    DOUBLE PRECISION NOT NULL DEFAULT 0,
    "mtbf"            DOUBLE PRECISION NOT NULL DEFAULT 0,
    "mttr"            DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalDowntime"   DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalBreakdowns" INTEGER NOT NULL DEFAULT 0,
    "plannedHours"    DOUBLE PRECISION NOT NULL DEFAULT 0,
    "notes"           TEXT,
    "calculatedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Analytic_pkey" PRIMARY KEY ("id")
);

-- Index untuk query per mesin dan per periode
CREATE INDEX "Analytic_machineId_idx" ON "Analytic"("machineId");
CREATE INDEX "Analytic_periodStart_idx" ON "Analytic"("periodStart");

-- Foreign key ke Machine
ALTER TABLE "Analytic"
    ADD CONSTRAINT "Analytic_machineId_fkey"
    FOREIGN KEY ("machineId") REFERENCES "Machine"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- Step 4: Hapus kolom yang tidak lagi masuk ke Machine (master data saja)
ALTER TABLE "Machine" DROP COLUMN IF EXISTS "status";
ALTER TABLE "Machine" DROP COLUMN IF EXISTS "performancePct";
ALTER TABLE "Machine" DROP COLUMN IF EXISTS "qualityPct";
