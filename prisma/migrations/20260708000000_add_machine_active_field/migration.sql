-- Add 'active' flag to Machine table
-- Existing machines get active=true so KPI is preserved after migration.
-- New machines imported via CSV will be created with active=false
-- until manually activated by an operator.

ALTER TABLE "Machine" ADD COLUMN "active" BOOLEAN NOT NULL DEFAULT true;
-- Change DB default to false so new rows inserted without explicit value are nonaktif
ALTER TABLE "Machine" ALTER COLUMN "active" SET DEFAULT false;
