-- Migration: 20260601000002_add_supervisor_evaluation
-- Adds: EvaluationStatus enum, evaluationStatus column on internships,
--       supervisors table, evaluation_tokens table, evaluation_submissions table,
--       new EmailTrigger enum values

-- Step 1: Add new EmailTrigger values
ALTER TYPE "EmailTrigger" ADD VALUE IF NOT EXISTS 'SUPERVISOR_REMINDER';
ALTER TYPE "EmailTrigger" ADD VALUE IF NOT EXISTS 'SUPERVISOR_MISSING';
ALTER TYPE "EmailTrigger" ADD VALUE IF NOT EXISTS 'EVALUATION_REQUEST';

-- Step 2: Create EvaluationStatus enum
CREATE TYPE "EvaluationStatus" AS ENUM ('NOT_SENT', 'SENT', 'COMPLETED', 'OVERDUE');

-- Step 3: Add evaluationStatus to internships
ALTER TABLE "internships" ADD COLUMN "evaluationStatus" "EvaluationStatus" NOT NULL DEFAULT 'NOT_SENT';

-- Step 4: Create supervisors table
CREATE TABLE "supervisors" (
    "id"           SERIAL NOT NULL,
    "name"         TEXT NOT NULL,
    "email"        TEXT NOT NULL,
    "phone"        TEXT,
    "submittedAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"    TIMESTAMP(3) NOT NULL,
    "internshipId" INTEGER NOT NULL,

    CONSTRAINT "supervisors_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "supervisors_internshipId_key" ON "supervisors"("internshipId");

ALTER TABLE "supervisors"
    ADD CONSTRAINT "supervisors_internshipId_fkey"
    FOREIGN KEY ("internshipId") REFERENCES "internships"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- Step 5: Create evaluation_tokens table
CREATE TABLE "evaluation_tokens" (
    "id"           SERIAL NOT NULL,
    "tokenHash"    TEXT NOT NULL,
    "expiresAt"    TIMESTAMP(3) NOT NULL,
    "usedAt"       TIMESTAMP(3),
    "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "internshipId" INTEGER NOT NULL,

    CONSTRAINT "evaluation_tokens_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "evaluation_tokens_tokenHash_key" ON "evaluation_tokens"("tokenHash");

ALTER TABLE "evaluation_tokens"
    ADD CONSTRAINT "evaluation_tokens_internshipId_fkey"
    FOREIGN KEY ("internshipId") REFERENCES "internships"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- Step 6: Create evaluation_submissions table
CREATE TABLE "evaluation_submissions" (
    "id"                   SERIAL NOT NULL,
    "professionalism"      INTEGER NOT NULL,
    "technicalSkills"      INTEGER NOT NULL,
    "communicationSkills"  INTEGER NOT NULL,
    "teamwork"             INTEGER NOT NULL,
    "attendanceCommitment" INTEGER NOT NULL,
    "overallPerformance"   INTEGER NOT NULL,
    "comments"             TEXT,
    "wouldRecommend"       BOOLEAN NOT NULL,
    "submittedAt"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tokenId"              INTEGER NOT NULL,

    CONSTRAINT "evaluation_submissions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "evaluation_submissions_tokenId_key" ON "evaluation_submissions"("tokenId");

ALTER TABLE "evaluation_submissions"
    ADD CONSTRAINT "evaluation_submissions_tokenId_fkey"
    FOREIGN KEY ("tokenId") REFERENCES "evaluation_tokens"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
