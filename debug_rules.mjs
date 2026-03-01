import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY
);

async function main() {
    console.log('Fetching rules for DS_M0001...');
    const { data: profs } = await supabase.from('requirement_profiles').select('*').ilike('name', '%0001%');
    const prof = profs[0];

    if (!prof) {
        console.log('DS_M0001 not found.');
        return;
    }

    const rules = prof.rules || [];

    console.log(`Found ${rules.length} rules.`);
    console.log(JSON.stringify(rules.map(r => ({
        prop: r.propertyId,
        arch: r.referenceArchitectureId,
        target: r.target,
        tm: r.testMethodId
    })), null, 2));

    const { data: meas } = await supabase.from('measurements').select('*').eq('material_id', 'cc7c0100-2eeb-4337-8340-8732d08f1e3b'); // PHG 9012 ID approx
    console.log(`Found ${meas?.length} measurements for PHG.`);
    console.log(JSON.stringify(meas?.map(m => ({
        prop: m.property_definition_id,
        arch: m.reference_layup_id,
        tm: m.test_method,
        tmid: m.test_method_id
    })), null, 2));
}

main();
