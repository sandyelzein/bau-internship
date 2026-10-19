ALTER TABLE "documents"
ADD COLUMN "reviewedAt" TIMESTAMP(3),
ADD COLUMN "reviewedById" INTEGER;

ALTER TABLE "documents"
ADD CONSTRAINT "documents_reviewedById_fkey"
FOREIGN KEY ("reviewedById") REFERENCES "committee_members"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
