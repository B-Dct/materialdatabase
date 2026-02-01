-- Create properties definitions table
CREATE TABLE IF NOT EXISTS property_definitions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    unit text,
    data_type text NOT NULL CHECK (data_type IN ('numeric', 'text', 'range')),
    input_structure text CHECK (input_structure IN ('single', 'min-mean-max')),
    category text CHECK (category IN ('mechanical', 'chemical', 'physical')),
    test_methods text[], -- Array of strings
    options text[], -- Array of strings
    stats_config jsonb, -- JSONB for { calculateBasic: bool, ... }
    created_at timestamptz DEFAULT now()
);

-- Policy to allow public read (dev mode)
ALTER TABLE property_definitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read" ON property_definitions FOR SELECT USING (true);
CREATE POLICY "Allow public insert" ON property_definitions FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update" ON property_definitions FOR UPDATE USING (true);
