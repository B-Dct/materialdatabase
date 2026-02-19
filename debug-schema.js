
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Fix __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envPath = path.resolve(process.cwd(), '.env.local');
// Read env file manually
let envConfig = {};
if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf-8');
    content.split('\n').forEach(line => {
        const parts = line.split('=');
        if (parts.length >= 2) {
            const key = parts[0].trim();
            const value = parts.slice(1).join('=').trim().replace(/^["']|["']$/g, ''); // Simple unquote
            if (key && value) envConfig[key] = value;
        }
    });
}


const supabaseUrl = envConfig.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = envConfig.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials. Checked .env.local");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
    console.log("Checking schema for 'layups' table...");

    const { data, error } = await supabase
        .from('layups')
        .select('architecture_type_id')
        .limit(1);

    if (error) {
        console.error("Error selecting 'architecture_type_id':", error.message);
        if (error.message.includes("column") || error.code === "PGRST204" || error.code === "42703") {
            console.log("CONFIRMED: Column 'architecture_type_id' DOES NOT EXIST.");
        }
    } else {
        console.log("Success! Column 'architecture_type_id' exists.");
    }
}

checkSchema();
