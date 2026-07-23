-- Log problem/root-cause untuk kasus AR/produksi rendah, ditampilkan di
-- halaman detail AR.
CREATE TABLE "ProblemLog" (
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
