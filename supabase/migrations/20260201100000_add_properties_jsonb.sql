-- Add properties column to test_methods to store complex configuration
ALTER TABLE test_methods ADD COLUMN IF NOT EXISTS properties JSONB DEFAULT '[]'::jsonb;

-- (Optional) Backfill properties from property_ids if needed, but for now we assume fresh start or app level handling
