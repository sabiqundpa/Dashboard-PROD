/*
  Warnings:

  - You are about to drop the column `location` on the `Machine` table. All the data in the column will be lost.
  - You are about to drop the column `type` on the `Machine` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Machine" DROP COLUMN "location",
DROP COLUMN "type",
ADD COLUMN     "cluster" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "line" TEXT NOT NULL DEFAULT '';
