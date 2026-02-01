-- Add properties column to layups table
ALTER TABLE layups ADD COLUMN IF NOT EXISTS properties JSONB DEFAULT '[]'::jsonb;
