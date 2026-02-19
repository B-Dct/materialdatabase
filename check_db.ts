
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env vars
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error("Missing env vars");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function main() {
    const { data, error } = await supabase
        .from('requirement_profiles')
        .select('*');

    if (error) {
        console.error("Error:", error);
        return;
    }

    console.log("Requirement Profiles:");
    data.forEach(p => {
        console.log(`- ${p.name} (${p.id})`);
        console.log(`  Layup Architectures:`, JSON.stringify(p.layup_architectures, null, 2));
    });
}

main();
