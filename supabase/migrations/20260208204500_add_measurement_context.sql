-- Add reference_layup_id to measurements table
-- This was missing from the previous migration but is required for the new functionality.

ALTER TABLE measurements 
ADD COLUMN IF NOT EXISTS reference_layup_id UUID REFERENCES layups(id);

-- Optional: Add index for performance
CREATE INDEX IF NOT EXISTS idx_measurements_reference_layup_id ON measurements(reference_layup_id);
