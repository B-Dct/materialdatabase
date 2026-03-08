import 'dotenv/config';
import pkg from 'pg';
const { Client } = pkg;
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigration() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL
    });

    try {
        await client.connect();
        console.log('Connected to database');

        const sqlPath = path.join(__dirname, '../supabase/migrations/20260307120000_fix_status_rls.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        await client.query(sql);
        console.log('Fix executed successfully');
    } catch (err) {
        console.error('Error executing fix', err);
    } finally {
        await client.end();
    }
}

runMigration();
