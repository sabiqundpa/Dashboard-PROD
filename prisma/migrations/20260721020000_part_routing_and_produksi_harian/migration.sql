-- Ganti struktur ResumeControlHarian (ringkasan per shift) dengan struktur
-- per Part+Proses+Mesin sesuai format Excel produksi existing, plus master
-- data routing (Part/Line/Mesin/MP/CT per Cluster).

DROP TABLE IF EXISTS "ResumeControlHarian";

CREATE TABLE "PartRouting" (
    "id" SERIAL NOT NULL,
    "cluster" TEXT NOT NULL,
    "line_produksi" TEXT NOT NULL,
    "part_name" TEXT NOT NULL,
    "part_number" TEXT NOT NULL DEFAULT '',
    "proses" TEXT NOT NULL,
    "mesin" TEXT NOT NULL,
    "man_power" TEXT,
    "cycle_time" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PartRouting_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PartRouting_partName_proses_mesin_key" ON "PartRouting"("part_name", "proses", "mesin");

CREATE TABLE "ProduksiHarian" (
    "id" SERIAL NOT NULL,
    "tanggal" TIMESTAMP(3) NOT NULL,
    "shift" TEXT NOT NULL,
    "cluster" TEXT NOT NULL,
    "line_produksi" TEXT NOT NULL,

    "no_lot" TEXT,
    "part_name" TEXT NOT NULL,
    "part_number" TEXT,
    "proses" TEXT NOT NULL,
    "mesin" TEXT NOT NULL,
    "man_power" TEXT,
    "cycle_time" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "waktu_efektif" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "plan" INTEGER NOT NULL DEFAULT 0,

    "ok1" INTEGER NOT NULL DEFAULT 0,
    "ok2" INTEGER NOT NULL DEFAULT 0,
    "rwk" INTEGER NOT NULL DEFAULT 0,
    "rjct" INTEGER NOT NULL DEFAULT 0,

    "breakdown_mesin" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lost_time" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "keterangan" TEXT,

    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProduksiHarian_pkey" PRIMARY KEY ("id")
);
