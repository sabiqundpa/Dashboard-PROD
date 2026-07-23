-- ProblemLog: tambah konteks Line Produksi, Part Name, dan Tanggal produksi
-- supaya problem/root cause bisa dikaitkan dengan line & part yang mana.
ALTER TABLE "ProblemLog" ADD COLUMN "tanggal" TIMESTAMP(3);
ALTER TABLE "ProblemLog" ADD COLUMN "line_produksi" TEXT;
ALTER TABLE "ProblemLog" ADD COLUMN "part_name" TEXT;
