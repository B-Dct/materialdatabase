ALTER TABLE material_specifications 
ADD COLUMN IF NOT EXISTS properties JSONB DEFAULT '[]'::jsonb;
