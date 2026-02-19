ALTER TABLE material_specifications 
ADD COLUMN IF NOT EXISTS requirement_profile_id UUID REFERENCES requirement_profiles(id);

COMMENT ON COLUMN material_specifications.requirement_profile_id IS 'Links the specification to a requirement profile (Standard) to inherit reference layup definitions.';
