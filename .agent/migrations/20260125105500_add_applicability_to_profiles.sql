-- Add applicability column to requirement_profiles table
-- Stores an array of strings acting as tags, e.g. ['layup', 'material:Core', 'material:Prepreg']

ALTER TABLE requirement_profiles 
ADD COLUMN IF NOT EXISTS applicability text[] DEFAULT '{}';

-- Policy update not needed if existing policies cover update/insert generally
