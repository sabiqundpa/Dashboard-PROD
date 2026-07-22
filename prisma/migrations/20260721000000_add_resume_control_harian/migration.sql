-- Resume Control Harian Produksi: ringkasan produksi per shift/line,
-- diisi lewat form publik /rmo (tanpa login) oleh operator produksi.
CREATE TABLE "ResumeControlHarian" (
    "id" SERIAL NOT NULL,
    "tanggal" TIMESTAMP(3) NOT NULL,
    "shift" TEXT NOT NULL,
    "cluster" TEXT NOT NULL,
    "line_produksi" TEXT NOT NULL,

    "qty_produksi" INTEGER NOT NULL DEFAULT 0,
    "ar" TEXT,
    "keterangan_qty" TEXT,

    "qty_ng" INTEGER NOT NULL DEFAULT 0,
    "faktor_ng" TEXT,
    "jenis_ng" TEXT,

    "lost_time" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "keterangan_lost_time" TEXT,

    "man_power" TEXT,
    "grup_head" TEXT,

    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ResumeControlHarian_pkey" PRIMARY KEY ("id")
);
