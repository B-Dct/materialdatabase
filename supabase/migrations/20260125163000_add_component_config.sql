-- Add config column to assembly_components to store material-specific properties like thickness range, etc.
ALTER TABLE assembly_components ADD COLUMN IF NOT EXISTS config jsonb DEFAULT '{}'::jsonb;
