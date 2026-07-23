-- Master data direstrukturisasi jadi relasional:
--   Group Head (1) -> Cluster (1)
--   Cluster (1) -> Part Name (banyak), Part Name (1) -> Cycle Time (1)
--   Part Name (1) -> Proses (banyak), Proses (1) -> Line Produksi + Mesin + Man Power
--
-- Tabel lama "MP", "Mesin", "Nama Parts", "Proses" (dibuat manual di Supabase)
-- TIDAK dihapus (datanya masih ada untuk referensi saat isi ulang lewat menu
-- Master Data baru), tapi tidak dipakai lagi oleh aplikasi mulai sekarang.

CREATE TABLE "MasterGroupHead" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "cluster" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MasterGroupHead_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "MasterGroupHead_name_key" ON "MasterGroupHead"("name");

CREATE TABLE "MasterPartName" (
    "id" SERIAL NOT NULL,
    "part_name" TEXT NOT NULL,
    "cluster" TEXT NOT NULL,
    "cycle_time" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MasterPartName_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "MasterPartName_part_name_key" ON "MasterPartName"("part_name");

CREATE TABLE "MasterProses" (
    "id" SERIAL NOT NULL,
    "proses" TEXT NOT NULL,
    "part_name" TEXT NOT NULL,
    "line_produksi" TEXT NOT NULL,
    "mesin" TEXT NOT NULL,
    "man_power" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MasterProses_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "MasterProses_proses_part_name_key" ON "MasterProses"("proses", "part_name");

-- ProblemLog: tambah kolom untuk fitur tutup problem + komentar.
ALTER TABLE "ProblemLog" ADD COLUMN "close_comment" TEXT;
ALTER TABLE "ProblemLog" ADD COLUMN "closed_at" TIMESTAMP(3);
