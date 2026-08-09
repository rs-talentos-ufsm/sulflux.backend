/*
  Warnings:

  - You are about to drop the column `hours` on the `tasks` table. All the data in the column will be lost.
  - You are about to drop the column `logged_hours` on the `time_logs` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "tasks" DROP COLUMN "hours",
ADD COLUMN     "totalMinutes" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "time_logs" DROP COLUMN "logged_hours",
ADD COLUMN     "logged_minutes" INTEGER NOT NULL DEFAULT 0;
