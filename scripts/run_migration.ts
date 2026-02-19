import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import pg from 'pg';

// Load env vars
// Try .env.local first, then .env
const envConfig = dotenv.config({ path: '.env.local' });
if (envConfig.error) {
    dotenv.config();
}

async function main() {
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
        console.error('Error: DATABASE_URL not found in environment variables.');
        console.error('Cannot run migration without direct database connection.');
        process.exit(1);
    }

    const migrationFile = 'supabase/migrations/20260215105000_add_spec_requirement_profile.sql';
    const sql = fs.readFileSync(migrationFile, 'utf8');

    console.log(`Running migration: ${migrationFile}`);

    const client = new pg.Client({
        connectionString: dbUrl,
    });

    try {
        await client.connect();
        await client.query(sql);
        console.log('Migration applied successfully.');
    } catch (err) {
        console.error('Error executing migration:', err);
    } finally {
        await client.end();
    }
}

main();
