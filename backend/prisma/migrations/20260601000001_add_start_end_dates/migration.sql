-- Migration: 20260601000001_add_start_end_dates
-- Adds startDate and endDate to internship_requests (where the schema now defines them)
-- Makes durationWeeks nullable (schema changed it to Int?)
-- Drops startDate and endDate from internships (they were in the old init but removed from schema)

-- Step 1: Add startDate and endDate to internship_requests
-- We add them as nullable first so existing rows don't violate NOT NULL
ALTER TABLE "internship_requests" ADD COLUMN "startDate" TIMESTAMP(3);
ALTER TABLE "internship_requests" ADD COLUMN "endDate"   TIMESTAMP(3);

-- Step 2: Backfill existing rows with a placeholder date
-- (Required so we can later enforce NOT NULL if needed)
UPDATE "internship_requests" SET "startDate" = CURRENT_TIMESTAMP WHERE "startDate" IS NULL;
UPDATE "internship_requests" SET "endDate"   = CURRENT_TIMESTAMP + INTERVAL '8 weeks' WHERE "endDate" IS NULL;

-- Step 3: Make durationWeeks nullable (was NOT NULL in init migration)
ALTER TABLE "internship_requests" ALTER COLUMN "durationWeeks" DROP NOT NULL;

-- Step 4: Drop startDate and endDate from internships table
-- (These columns existed in the init migration but were removed from the Internship schema model)
ALTER TABLE "internships" DROP COLUMN IF EXISTS "startDate";
ALTER TABLE "internships" DROP COLUMN IF EXISTS "endDate";
