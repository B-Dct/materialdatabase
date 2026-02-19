-- Add is_reference and material_id columns to layups table
ALTER TABLE layups 
ADD COLUMN is_reference BOOLEAN DEFAULT FALSE,
ADD COLUMN material_id UUID REFERENCES materials(id);

-- Add index for performance on filtering
CREATE INDEX idx_layups_is_reference ON layups(is_reference);
CREATE INDEX idx_layups_material_id ON layups(material_id);
