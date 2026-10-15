/*
  Warnings:

  - Made the column `startDate` on table `internship_requests` required. This step will fail if there are existing NULL values in that column.
  - Made the column `endDate` on table `internship_requests` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "evaluation_submissions" DROP CONSTRAINT "evaluation_submissions_tokenId_fkey";

-- AlterTable
ALTER TABLE "internship_requests" ALTER COLUMN "startDate" SET NOT NULL,
ALTER COLUMN "endDate" SET NOT NULL,
ALTER COLUMN "tasks" DROP DEFAULT;

-- AddForeignKey
ALTER TABLE "evaluation_submissions" ADD CONSTRAINT "evaluation_submissions_tokenId_fkey" FOREIGN KEY ("tokenId") REFERENCES "evaluation_tokens"("id") ON DELETE SET NULL ON UPDATE CASCADE;
