-- Migration to CREATE 'requirement_profiles' table
-- Run this in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS requirement_profiles (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL,
    description text,
    rules jsonb DEFAULT '[]'::jsonb,
    applicability text[] DEFAULT '{}',
    created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE requirement_profiles ENABLE ROW LEVEL SECURITY;

-- Allow Public Access (for local dev simplicity)
DROP POLICY IF EXISTS "Enable read access for all users" ON requirement_profiles;
CREATE POLICY "Enable read access for all users" ON requirement_profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Enable insert access for all users" ON requirement_profiles;
CREATE POLICY "Enable insert access for all users" ON requirement_profiles FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Enable update access for all users" ON requirement_profiles;
CREATE POLICY "Enable update access for all users" ON requirement_profiles FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Enable delete access for all users" ON requirement_profiles;
CREATE POLICY "Enable delete access for all users" ON requirement_profiles FOR DELETE USING (true);

-- Add Columns to associate profiles to Materials/Layups
ALTER TABLE materials ADD COLUMN IF NOT EXISTS assigned_profile_ids uuid[] DEFAULT '{}';
ALTER TABLE layups ADD COLUMN IF NOT EXISTS assigned_profile_ids uuid[] DEFAULT '{}';
