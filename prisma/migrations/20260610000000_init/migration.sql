-- CreateTable
CREATE TABLE "Machine" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'idle',
    "performancePct" DOUBLE PRECISION NOT NULL DEFAULT 95,
    "qualityPct" DOUBLE PRECISION NOT NULL DEFAULT 98,
    "plannedHours" DOUBLE PRECISION NOT NULL DEFAULT 16,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Machine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Breakdown" (
    "id" SERIAL NOT NULL,
    "machineId" INTEGER NOT NULL,
    "cause" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'warning',
    "date" TIMESTAMP(3) NOT NULL,
    "startTime" TEXT,
    "endTime" TEXT,
    "durationHrs" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "technician" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Breakdown_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Machine_name_key" ON "Machine"("name");

-- AddForeignKey
ALTER TABLE "Breakdown" ADD CONSTRAINT "Breakdown_machineId_fkey" FOREIGN KEY ("machineId") REFERENCES "Machine"("id") ON DELETE CASCADE ON UPDATE CASCADE;
