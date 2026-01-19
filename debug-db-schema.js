
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ndumzudeubllxfuifdex.supabase.co';
const supabaseAnonKey = 'sb_publishable_goGfjHUT3PDgGHTsJkRBNQ_GRkd6wQF';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function test() {
    console.log("Testing material_variants insert...");

    // 1. Get a material ID
    const { data: mats } = await supabase.from('materials').select('id').limit(1);
    if (!mats || mats.length === 0) {
        console.error("No materials found to test with.");
        return;
    }
    const matId = mats[0].id;
    console.log("Using material ID:", matId);

    // 2. Try insert with full logging
    const payload = {
        base_material_id: matId,
        variant_name: "Debug Variant " + Date.now(),
        // description: "Test" 
    };

    const { data, error } = await supabase
        .from('material_variants')
        .insert(payload)
        .select();

    if (error) {
        console.error("INSERT ERROR:");
        console.error(JSON.stringify(error, null, 2));
    } else {
        console.log("INSERT SUCCESS. Data:");
        console.log(JSON.stringify(data, null, 2));
    }
}

test();
