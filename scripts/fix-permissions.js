
import pg from 'pg';
const { Client } = pg;

const client = new Client({
    connectionString: 'postgres://postgres:postgres@localhost:5432/postgres',
});

const sql = `
-- Enable RLS on tables if not already enabled (redundant but safe)
ALTER TABLE manufacturing_processes ENABLE ROW LEVEL SECURITY;
ALTER TABLE material_type_definitions ENABLE ROW LEVEL SECURITY;

-- Policy for manufacturing_processes
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON manufacturing_processes;
CREATE POLICY "Enable all access for authenticated users" ON manufacturing_processes
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Policy for material_type_definitions
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON material_type_definitions;
CREATE POLICY "Enable all access for authenticated users" ON material_type_definitions
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Policy for laboratories (just in case)
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON laboratories;
CREATE POLICY "Enable all access for authenticated users" ON laboratories
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);
`;

async function run() {
    try {
        await client.connect();
        console.log("Connected to database.");
        await client.query(sql);
        console.log("Migration executed successfully.");
    } catch (e) {
        console.error("Migration failed:", e);
    } finally {
        await client.end();
    }
}

run();
