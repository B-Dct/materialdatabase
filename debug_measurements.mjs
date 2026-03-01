import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function main() {
    console.log('Fetching measurements for PHG-9012...');
    const { data: mats } = await supabase.from('materials').select('id, name').ilike('name', '%9012%');
    const phg = mats[0];
    
    if (!phg) {
        console.log('PHG-9012 not found.');
        return;
    }
    console.log(`Found material: ${phg.name} (${phg.id})`);

    const { data: measurements, error } = await supabase
        .from('measurements')
        .select(`
            id,
            property_id,
            test_method_id,
            result_value,
            reference_layup_id
        `)
        .eq('material_id', phg.id);

    if (error) {
        console.error('Error fetching measurements:', error);
        return;
    }

    console.log(`Found ${measurements.length} measurements.`);
    console.log(JSON.stringify(measurements.slice(0, 10), null, 2));
}

main();
