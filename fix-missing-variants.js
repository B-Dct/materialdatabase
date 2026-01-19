
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ndumzudeubllxfuifdex.supabase.co';
const supabaseAnonKey = 'sb_publishable_goGfjHUT3PDgGHTsJkRBNQ_GRkd6wQF';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function fix() {
    console.log("Fetching materials...");
    const { data: materials, error: mErr } = await supabase.from('materials').select('*, material_variants(*)');

    if (mErr) {
        console.error("Material Fetch Error:", mErr);
        return;
    }

    console.log(`Found ${materials.length} materials.`);

    for (const mat of materials) {
        const variants = mat.material_variants || [];
        if (variants.length === 0) {
            console.log(`Material '${mat.name}' (${mat.id}) has NO variants. Creating default...`);

            // Construct variant payload based on MaterialVariant interface
            const payload = {
                base_material_id: mat.id,
                variant_name: "Standard",
                // Assuming other fields might be inherited or nullable. 
                // DB snake_case for inserts usually.
            };

            const { data, error } = await supabase.from('material_variants').insert(payload).select();

            if (error) {
                console.error(`  FAILED to create variant:`, error);
            } else {
                console.log(`  CREATED variant: ${data[0].id}`);
            }
        } else {
            console.log(`Material '${mat.name}' has ${variants.length} variants. skipping.`);
        }
    }
    console.log("\nDone.");
}

fix();
