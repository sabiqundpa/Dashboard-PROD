-- CreateTable
CREATE TABLE "WorkingCalendar" (
    "id" SERIAL NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "workingDays" INTEGER NOT NULL DEFAULT 22,

    CONSTRAINT "WorkingCalendar_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WorkingCalendar_year_month_key" ON "WorkingCalendar"("year", "month");
