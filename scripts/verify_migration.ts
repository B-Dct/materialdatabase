import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env vars
dotenv.config({ path: '.env.local' });

const supabase = createClient(
    process.env.VITE_SUPABASE_URL!,
    process.env.VITE_SUPABASE_ANON_KEY!
);

async function main() {
    console.log('Verifying material_specifications schema...');

    // Try to select the new column
    const { data, error } = await supabase
        .from('material_specifications')
        .select('id, requirement_profile_id')
        .limit(1);

    if (error) {
        console.error('Migration Verification FAILED:', error.message);
        process.exit(1);
    } else {
        console.log('Migration Verification SUCCESS: Column exists.');
        console.log('Sample Data:', data);
    }
}

main();
