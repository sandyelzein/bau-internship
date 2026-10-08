ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'SUPERVISOR';

ALTER TABLE "internship_requests"
  ADD COLUMN "tasks" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "evidenceFileName" TEXT,
  ADD COLUMN "evidenceFilePath" TEXT,
  ADD COLUMN "evidenceFileSize" INTEGER;

ALTER TABLE "supervisors" ADD COLUMN "title" TEXT;
ALTER TABLE "supervisors" ADD COLUMN "userId" INTEGER;
CREATE UNIQUE INDEX "supervisors_userId_key" ON "supervisors"("userId");
ALTER TABLE "supervisors" ADD CONSTRAINT "supervisors_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "user_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "internships" ADD COLUMN "supervisorId" INTEGER;
UPDATE "internships" i SET "supervisorId" = s."id" FROM "supervisors" s WHERE s."internshipId" = i."id";
UPDATE "internships" i
SET "supervisorId" = canonical."keep_id"
FROM (
  SELECT LOWER("email") AS normalized_email, MIN("id") AS keep_id
  FROM "supervisors" GROUP BY LOWER("email")
) canonical
JOIN "supervisors" duplicate ON LOWER(duplicate."email") = canonical.normalized_email
WHERE i."supervisorId" = duplicate."id";
DELETE FROM "supervisors" s
USING "supervisors" keep
WHERE LOWER(s."email") = LOWER(keep."email") AND s."id" > keep."id";
UPDATE "supervisors" SET "email" = LOWER("email");
CREATE UNIQUE INDEX "supervisors_email_key" ON "supervisors"("email");
ALTER TABLE "internships" ADD CONSTRAINT "internships_supervisorId_fkey"
  FOREIGN KEY ("supervisorId") REFERENCES "supervisors"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "supervisors" DROP CONSTRAINT IF EXISTS "supervisors_internshipId_fkey";
DROP INDEX IF EXISTS "supervisors_internshipId_key";
ALTER TABLE "supervisors" DROP COLUMN "internshipId";

ALTER TABLE "documents" ADD COLUMN "internshipId" INTEGER;
UPDATE "documents" d
SET "internshipId" = (
  SELECT i."id"
  FROM "internships" i
  JOIN "internship_requests" r ON r."id" = i."requestId"
  WHERE r."studentId" = d."studentId"
  ORDER BY i."createdAt" DESC
  LIMIT 1
);
ALTER TABLE "documents" ADD CONSTRAINT "documents_internshipId_fkey"
  FOREIGN KEY ("internshipId") REFERENCES "internships"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "evaluation_submissions"
  ADD COLUMN "grade" TEXT,
  ADD COLUMN "internshipId" INTEGER,
  ADD COLUMN "supervisorId" INTEGER,
  ALTER COLUMN "tokenId" DROP NOT NULL;
UPDATE "evaluation_submissions" e
SET "internshipId" = selected."internshipId",
    "supervisorId" = i."supervisorId"
FROM (
  SELECT DISTINCT ON (t."internshipId") e2."id" AS evaluation_id, t."internshipId"
  FROM "evaluation_submissions" e2
  JOIN "evaluation_tokens" t ON t."id" = e2."tokenId"
  ORDER BY t."internshipId", e2."submittedAt" DESC
) selected
JOIN "internships" i ON i."id" = selected."internshipId"
WHERE e."id" = selected.evaluation_id;
CREATE UNIQUE INDEX "evaluation_submissions_internshipId_key" ON "evaluation_submissions"("internshipId");
ALTER TABLE "evaluation_submissions" ADD CONSTRAINT "evaluation_submissions_internshipId_fkey"
  FOREIGN KEY ("internshipId") REFERENCES "internships"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "evaluation_submissions" ADD CONSTRAINT "evaluation_submissions_supervisorId_fkey"
  FOREIGN KEY ("supervisorId") REFERENCES "supervisors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "system_settings" (
  "key" TEXT NOT NULL,
  "value" TEXT NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "system_settings_pkey" PRIMARY KEY ("key")
);
INSERT INTO "system_settings" ("key", "value", "updatedAt")
VALUES ('REQUESTS_OPEN', 'true', CURRENT_TIMESTAMP)
ON CONFLICT ("key") DO NOTHING;
