
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Manual env parsing
const envPath = path.resolve(process.cwd(), '.env.local');
let env = {};
try {
    const data = fs.readFileSync(envPath, 'utf8');
    data.split('\n').forEach(line => {
        const [key, value] = line.split('=');
        if (key && value) {
            env[key.trim()] = value.trim();
        }
    });
} catch (e) {
    console.warn("Could not read .env.local", e);
}

const supabaseUrl = env.VITE_SUPABASE_URL; // || 'HARDCODED_FALLBACK_IF_NEEDED';
const supabaseKey = env.VITE_SUPABASE_ANON_KEY; //|| '...';

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials in .env.local");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkMaterials() {
    console.log("Fetching materials...");
    const { data, error } = await supabase.from('materials').select('*').limit(1);

    if (error) {
        console.error("Error:", error);
        return;
    }

    if (data && data.length > 0) {
        console.log("Keys in returned data:", Object.keys(data[0]));
        console.log("Sample Data:", JSON.stringify(data[0], null, 2));
    } else {
        console.log("No materials found.");
    }
}

checkMaterials();
