
import { createClient } from '@supabase/supabase-js';

// Environment variables should be loaded from .env usually, but here accessing them might be tricky if not using Vite/Node env loader properly in standalone script.
// I will try to read them or assume they are available if I run with `node --env-file=.env` (Node 20+) or just `dotenv`.
// Or read the values from src/lib/supabase.ts if I can import it? 
// Importing TS in JS script is hard.
// I'll assume I can read .env manually.

import fs from 'fs';
import path from 'path';

const envPath = path.resolve(process.cwd(), '.env.local');
const envConfig = fs.existsSync(envPath)
    ? Object.fromEntries(fs.readFileSync(envPath, 'utf-8').split('\n').filter(Boolean).map(line => line.split('=')))
    : {};

const supabaseUrl = envConfig.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = envConfig.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials.");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
    console.log("Checking schema for 'layups' table...");

    // We can't query information_schema directly with supabase-js easily unless we have rpc or direct SQL access.
    // But we can try to select * from layups limit 1 and see the data structure if there is data.
    // Or try to insert a dummy record and see if it fails on unknown column? No, destructive.

    // Best hack: Try to select the specific column.

    const { data, error } = await supabase
        .from('layups')
        .select('restriction_reason')
        .limit(1);

    if (error) {
        console.error("Error selecting 'restriction_reason':", error.message);
        console.log("Likely the column DOES NOT EXIST.");
    } else {
        console.log("Success! Column 'restriction_reason' exists.");
    }

    const { data: d2, error: e2 } = await supabase
        .from('layups')
        .select('restrictionReason')
        .limit(1);

    if (e2) {
        console.error("Error selecting 'restrictionReason':", e2.message);
    } else {
        console.log("Success! Column 'restrictionReason' exists.");
    }
}

checkSchema();
