CREATE TYPE "RequestAttachmentType" AS ENUM ('ACCEPTANCE_LETTER', 'OFFICIAL_TASKS');

CREATE TABLE "request_attachments" (
    "id" SERIAL NOT NULL,
    "type" "RequestAttachmentType" NOT NULL,
    "fileName" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "requestId" INTEGER NOT NULL,

    CONSTRAINT "request_attachments_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "request_attachments_requestId_idx" ON "request_attachments"("requestId");

ALTER TABLE "request_attachments"
ADD CONSTRAINT "request_attachments_requestId_fkey"
FOREIGN KEY ("requestId") REFERENCES "internship_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;