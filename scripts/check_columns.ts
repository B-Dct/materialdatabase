
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env
const envPath = path.resolve(process.cwd(), '.env.local');
dotenv.config({ path: envPath });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Env Vars");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    console.log("Checking columns on", supabaseUrl);

    // Try to select the new columns
    const { data: matData, error: matError } = await supabase
        .from('materials')
        .select('id, assigned_reference_layup_ids, assigned_reference_assembly_ids')
        .limit(1);

    if (matError) {
        console.error("Error verifying MATERIALS columns:", matError);
    } else {
        console.log("MATERIALS Columns EXIST.");
    }

    const { data: measData, error: measError } = await supabase
        .from('measurements')
        .select('id, reference_layup_id')
        .limit(1);

    if (measError) {
        console.error("Error verifying MEASUREMENTS columns:", measError);
    } else {
        console.log("MEASUREMENTS Columns EXIST.");
    }
}

check();
