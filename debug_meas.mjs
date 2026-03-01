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
        .select('*')
        .eq('material_id', phg.id);

    if (error) {
        console.error('Error fetching measurements:', error);
        return;
    }

    console.log(`Found ${measurements.length} measurements.`);
    console.log(JSON.stringify(measurements.slice(0, 5), null, 2));

    // Grouping simulation
    const grouped = measurements.reduce((acc, m) => {
        let archId = m.reference_layup_id || 'base';
        const tmKey = m.test_method_id || 'base';
        const key = `${m.property_definition_id}_${archId}_${tmKey}`;
        if (!acc[key]) acc[key] = { property: m.property_definition_id, archId, tmId: tmKey, count: 0 };
        acc[key].count++;
        return acc;
    }, {});
    console.log('Grouped measurements (Top 5):', JSON.stringify(Object.values(grouped).slice(0, 5), null, 2));
}

main();
