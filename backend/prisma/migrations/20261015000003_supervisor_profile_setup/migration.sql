ALTER TYPE "EmailTrigger" ADD VALUE IF NOT EXISTS 'SUPERVISOR_PROFILE_INVITATION';

CREATE TABLE "supervisor_profile_tokens" (
    "id" SERIAL NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "supervisorId" INTEGER NOT NULL,

    CONSTRAINT "supervisor_profile_tokens_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "supervisor_profile_tokens_tokenHash_key" ON "supervisor_profile_tokens"("tokenHash");
CREATE UNIQUE INDEX "supervisor_profile_tokens_supervisorId_key" ON "supervisor_profile_tokens"("supervisorId");

ALTER TABLE "supervisor_profile_tokens"
ADD CONSTRAINT "supervisor_profile_tokens_supervisorId_fkey"
FOREIGN KEY ("supervisorId") REFERENCES "supervisors"("id") ON DELETE CASCADE ON UPDATE CASCADE;