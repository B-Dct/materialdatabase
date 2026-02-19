
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '.env.local') });

const supabase = createClient(
    process.env.VITE_SUPABASE_URL!,
    process.env.VITE_SUPABASE_ANON_KEY!
);

async function updatedContext() {
    // 1. Get a material
    const { data: materials, error: matError } = await supabase
        .from('materials')
        .select('id, name')
        .limit(1);

    if (matError || !materials?.length) {
        console.error('Error fetching materials:', matError);
        return;
    }
    const material = materials[0];

    // 2. Get a layup
    const { data: layups, error: layError } = await supabase
        .from('layups')
        .select('id, name')
        .limit(1);

    if (layError || !layups?.length) {
        console.error('Error fetching layups:', layError);
        return;
    }
    const layup = layups[0];

    console.log(`Assigning Layup: ${layup.name} (${layup.id}) to Material: ${material.name} (${material.id})`);

    // 3. Update
    const { error: updateError } = await supabase
        .from('materials')
        .update({ assigned_reference_layup_ids: [layup.id] })
        .eq('id', material.id);

    if (updateError) {
        console.error('Error updating material:', updateError);
    } else {
        console.log('Successfully updated material.');
        console.log(`Navigate to: http://localhost:5175/04_materialdatabase/materials/${material.id}`);
    }
}

updatedContext();
