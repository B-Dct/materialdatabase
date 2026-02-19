
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    console.log('--- Checking Material Types ---');
    const { data: types, error: fetchError } = await supabase.from('material_type_definitions').select('*');
    if (fetchError) {
        console.error('Error fetching types:', fetchError);
        return;
    }
    console.log('Current types:', types);

    // Try to add
    const testName = 'Debug_Delete_Me';
    console.log(`--- Adding ${testName} ---`);
    const { data: added, error: addError } = await supabase.from('material_type_definitions').insert({ name: testName }).select().single();
    if (addError) {
        console.error('Error adding:', addError);
    } else {
        console.log('Added:', added);
    }

    // Try to delete
    console.log(`--- Deleting ${testName} ---`);
    const { error: deleteError } = await supabase.from('material_type_definitions').delete().eq('name', testName);
    if (deleteError) {
        console.error('Error deleting:', deleteError);
    } else {
        console.log('Deletion successful (no error returned).');
    }

    // Verify deletion
    const { data: check } = await supabase.from('material_type_definitions').select('*').eq('name', testName);
    console.log('Check after delete:', check);
}

run();
