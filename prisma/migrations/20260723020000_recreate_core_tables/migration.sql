-- ProduksiHarian, ProblemLog, dan WorkingCalendar sempat terhapus di luar
-- sistem migrasi (perubahan manual di Supabase). Migrasi sebelumnya yang
-- membuat tabel ini sudah tercatat "applied" di _prisma_migrations, jadi
-- perlu dibuat ulang lewat migrasi baru ini.

CREATE TABLE IF NOT EXISTS "WorkingCalendar" (
    "id" SERIAL NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "workingDays" INTEGER NOT NULL DEFAULT 22,

    CONSTRAINT "WorkingCalendar_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "WorkingCalendar_year_month_key" ON "WorkingCalendar"("year", "month");

CREATE TABLE IF NOT EXISTS "ProduksiHarian" (
    "id" SERIAL NOT NULL,
    "tanggal" TIMESTAMP(3) NOT NULL,
    "waktu" TEXT,
    "shift" TEXT NOT NULL,
    "cluster" TEXT NOT NULL,
    "line_produksi" TEXT NOT NULL,
    "grup_head" TEXT,

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

CREATE TABLE IF NOT EXISTS "ProblemLog" (
    "id" SERIAL NOT NULL,
    "problem" TEXT NOT NULL,
    "root_cause" TEXT,
    "temporary_action" TEXT,
    "permanent_action" TEXT,
    "due_date" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'open',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProblemLog_pkey" PRIMARY KEY ("id")
);
