-- Enable RLS on measurements table if not valid
ALTER TABLE measurements ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view all measurements
CREATE POLICY "Allow authenticated read access" ON measurements
    FOR SELECT
    TO authenticated
    USING (true);

-- Allow authenticated users to insert/update/delete (if needed, but read is critical for count)
CREATE POLICY "Allow authenticated full access" ON measurements
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);
