-- Add layup_id and assembly_id to measurements for direct linking
ALTER TABLE measurements 
ADD COLUMN IF NOT EXISTS layup_id uuid REFERENCES layups(id),
ADD COLUMN IF NOT EXISTS assembly_id uuid REFERENCES assemblies(id);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_measurements_layup_id ON measurements(layup_id);
CREATE INDEX IF NOT EXISTS idx_measurements_assembly_id ON measurements(assembly_id);

-- Update RLS (already done in previous migration, but good to ensure policy covers new columns - standard policies do)
