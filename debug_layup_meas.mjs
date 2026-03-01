import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY
);

async function main() {
    console.log('Fetching layups for PHG-9012...');
    // Base material ID is cc7c0100-2eeb-4337-8340-8732d08f1e3b
    const { data: layups, error: errorLayups } = await supabase
        .from('layups')
        .select('*')
        .eq('material_id', 'cc7c0100-2eeb-4337-8340-8732d08f1e3b');

    console.log(`Found ${layups?.length} layups.`);

    const layupIds = layups?.map(l => l.id) || [];
    if (layupIds.length > 0) {
        const { data: layupMeas } = await supabase
            .from('measurements')
            .select('*')
            .in('layup_id', layupIds);
        console.log(`Found ${layupMeas?.length} measurements on layups.`);
        if (layupMeas && layupMeas.length > 0) {
            console.log(layupMeas[0]);
        }
    }
}

main();
