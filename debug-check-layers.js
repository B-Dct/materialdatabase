
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ndumzudeubllxfuifdex.supabase.co';
const supabaseAnonKey = 'sb_publishable_goGfjHUT3PDgGHTsJkRBNQ_GRkd6wQF';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function check() {
    console.log("Checking Layups...");
    const { data: layups, error: lErr } = await supabase.from('layups').select('*');
    if (lErr) {
        console.error("Layup Error:", lErr);
    } else {
        console.log(`Found ${layups.length} layups.`);
        if (layups.length > 0) console.log("Sample Layup:", layups[0].name, layups[0].id);
    }

    console.log("\nChecking Layers...");
    const { data: layers, error: lyErr } = await supabase.from('layup_layers').select('*');
    if (lyErr) {
        console.error("Layer Error:", lyErr);
    } else {
        console.log(`Found ${layers.length} layers.`);
        if (layers.length > 0) {
            console.log("Sample Layer:", layers[0]);
        } else {
            console.log("WARNING: No layers found in DB!");
        }
    }

    // Try to insert a dummy layer with REAL ID
    if (layups.length > 0) {
        console.log("\nAttempting insert with REAL Variant ID...");

        // Fetch a valid variant
        const { data: variants } = await supabase.from('material_variants').select('id').limit(1);
        if (!variants || variants.length === 0) {
            console.error("No variants found in DB to test with!");
            return;
        }
        const validVariantId = variants[0].id;
        console.log("Using Variant ID:", validVariantId);

        const layman = layups[0];
        const { data, error } = await supabase.from('layup_layers').insert({
            layup_id: layman.id,
            material_variant_id: validVariantId,
            orientation: 0,
            sequence: 1
        }).select();

        if (error) {
            console.error("Insert Error:", error);
        } else {
            console.log("Insert Success:", data);

            // Cleanup
            await supabase.from('layup_layers').delete().eq('id', data[0].id);
            console.log("Cleanup done.");
        }
    }
}
check();
