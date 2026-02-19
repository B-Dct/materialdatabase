-- Add is_reference to layups table
ALTER TABLE layups
ADD COLUMN IF NOT EXISTS is_reference BOOLEAN DEFAULT FALSE;

-- Add reference_layup_id to measurements table
ALTER TABLE measurements
ADD COLUMN IF NOT EXISTS reference_layup_id UUID REFERENCES layups(id);

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_measurements_reference_layup_id ON measurements(reference_layup_id);

-- Comment on columns
COMMENT ON COLUMN layups.is_reference IS 'Flag indicating if this layup is a Reference Layup (standardized structure)';
COMMENT ON COLUMN measurements.reference_layup_id IS 'Link to the Reference Layup used for this property measurement';
