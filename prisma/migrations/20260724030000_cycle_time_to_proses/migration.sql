-- Cycle Time pindah dari Part Name ke Proses -- satu Part Name bisa punya
-- beberapa Proses dengan Cycle Time yang beda-beda (contoh: Evaporator
-- 2230 punya 2 proses beda cycle time), jadi tidak bisa lagi cuma 1
-- angka per Part Name.

ALTER TABLE "MasterProses" ADD COLUMN "cycle_time" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- Isi awal: turunkan cycle time yang sudah ada di Part Name ke semua
-- Proses miliknya (titik awal yang masuk akal -- admin bisa edit satu-
-- satu lewat menu Master Data kalau ternyata beda per proses).
UPDATE "MasterProses" mp
SET "cycle_time" = mpn."cycle_time"
FROM "MasterPartName" mpn
WHERE mpn."part_name" = mp."part_name";

ALTER TABLE "MasterPartName" DROP COLUMN "cycle_time";
