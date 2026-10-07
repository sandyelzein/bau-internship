-- Migration: 20260601000003_fix_academic_year_type
-- Migration 20260518055628 changed academicYear to TEXT,
-- but schema.prisma currently declares it as Int?
-- The import.service.js now stores the raw YEARDESC string (e.g. "Year 2"),
-- so we must align the schema to String? OR keep it Int and parse in the service.
--
-- DECISION: Keep academicYear as TEXT in the DB to match what import.service.js writes
-- (it stores the raw YEARDESC value as a string).
-- Therefore we must update schema.prisma to declare academicYear as String?
-- This migration is a NO-OP on the DB (column is already TEXT from migration 2).
-- The fix is only in schema.prisma (see the corrected schema file).
--
-- This file serves as a marker migration so Prisma's migration history stays in sync.

-- No SQL changes needed: column is already TEXT from 20260518055628_academic_year_string
SELECT 1; -- no-op placeholder
