-- Rename Breakdown columns to match RMO / CSV format
-- Prisma model field names stay the same (via @map), only DB column names change.

-- Drop unused column
ALTER TABLE "Breakdown" DROP COLUMN IF EXISTS "technician";

-- Rename columns to match RMO format
ALTER TABLE "Breakdown" RENAME COLUMN "machineId"   TO "machine_id";
ALTER TABLE "Breakdown" RENAME COLUMN "cause"        TO "problem";
ALTER TABLE "Breakdown" RENAME COLUMN "category"     TO "jenis_problem";
ALTER TABLE "Breakdown" RENAME COLUMN "date"         TO "tanggal_lapor";
ALTER TABLE "Breakdown" RENAME COLUMN "startTime"    TO "waktu_lapor";
ALTER TABLE "Breakdown" RENAME COLUMN "endDate"      TO "tanggal_selesai";
ALTER TABLE "Breakdown" RENAME COLUMN "endTime"      TO "waktu_selesai";
ALTER TABLE "Breakdown" RENAME COLUMN "durationHrs"  TO "downtime";
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Breakdown' AND column_name = 'repair_date') THEN
    ALTER TABLE "Breakdown" RENAME COLUMN "repair_date" TO "tanggal_mulai";
  ELSIF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Breakdown' AND column_name = 'tanggal_mulai') THEN
    ALTER TABLE "Breakdown" ADD COLUMN "tanggal_mulai" TIMESTAMP(3);
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Breakdown' AND column_name = 'repair_time') THEN
    ALTER TABLE "Breakdown" RENAME COLUMN "repair_time" TO "waktu_mulai";
  ELSIF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Breakdown' AND column_name = 'waktu_mulai') THEN
    ALTER TABLE "Breakdown" ADD COLUMN "waktu_mulai" TEXT;
  END IF;
END $$;
ALTER TABLE "Breakdown" RENAME COLUMN "picGh"        TO "grup_head";
ALTER TABLE "Breakdown" RENAME COLUMN "picMtn"       TO "pic_mtn";
ALTER TABLE "Breakdown" RENAME COLUMN "resolution"   TO "penyelesaian";
ALTER TABLE "Breakdown" RENAME COLUMN "action"       TO "tindakan";
ALTER TABLE "Breakdown" RENAME COLUMN "notes"        TO "catatan";
ALTER TABLE "Breakdown" RENAME COLUMN "createdAt"    TO "created_at";
