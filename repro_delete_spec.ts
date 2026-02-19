import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function testDeleteLinked() {
    console.log("Creating Spec and linked Property...");

    // 1. Get Material
    const { data: mats } = await supabase.from('materials').select('id, properties').limit(1);
    if (!mats || mats.length === 0) {
        console.error("No materials found.");
        return;
    }
    const mat = mats[0];
    console.log("Using material:", mat.id);

    // 2. Create Spec
    const specId = uuidv4();
    const { error: specError } = await supabase.from('material_specifications').insert({
        id: specId,
        material_id: mat.id,
        name: "Delete Test Linked Spec",
        code: "DEL-LINK-001",
        revision: "A",
        status: "Draft",
        valid_from: new Date().toISOString()
    });
    if (specError) {
        console.error("Spec creation failed:", specError);
        return;
    }
    console.log("Spec created:", specId);

    // 3. Update Material with a Property linked to this Spec
    const currentProps = Array.isArray(mat.properties) ? mat.properties : [];
    const newProp = {
        id: uuidv4(),
        name: "Linked Property",
        value: 123,
        unit: "MPa",
        specificationId: specId // THIS IS THE LINK
    };

    const { error: updateError } = await supabase.from('materials').update({
        properties: [...currentProps, newProp]
    }).eq('id', mat.id);

    if (updateError) {
        console.error("Material update failed:", updateError);
        return;
    }
    console.log("Material property linked to spec.");

    // 4. Try to Delete Spec
    console.log("Attempting to delete spec...");
    const { error: deleteError } = await supabase.from('material_specifications').delete().eq('id', specId);

    if (deleteError) {
        console.error("DELETE FAILED:", deleteError);
    } else {
        console.log("DELETE SUCCESSFUL");
    }

    // cleanup property
    const { data: matRefreshed } = await supabase.from('materials').select('properties').eq('id', mat.id).single();
    if (matRefreshed) {
        const cleanProps = (matRefreshed.properties || []).filter((p: any) => p.id !== newProp.id);
        await supabase.from('materials').update({ properties: cleanProps }).eq('id', mat.id);
        console.log("Cleanup done.");
    }
}

testDeleteLinked();
