-- Parameter tambahan untuk perhitungan Availability/Performance/Yield/AR/OEE
ALTER TABLE "ResumeControlHarian"
  ADD COLUMN "waktu_efektif" DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN "breakdown_mesin" DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN "cycle_time" DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN "plan_produksi" INTEGER NOT NULL DEFAULT 0;
