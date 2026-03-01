import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
    const { data: wps, error: wpErr } = await supabase.from('project_work_packages').select('*').limit(1);
    if (wpErr) { console.error("Error fetching WP:", wpErr); return; }

    const activeWp = wps[0];
    console.log("Work package:", activeWp.name);

    const currentMat = activeWp.assigned_materials || [];
    console.log("Current materials:", currentMat);

    const newMat = [...currentMat];
    const materialToAdd = { materialId: "818e7e14-d035-4dbb-8aa9-26d9eec21dbe", specificationId: "" };
    newMat.push(materialToAdd);

    console.log("Updating to new materials:", newMat);

    const { data, error } = await supabase.from('project_work_packages').update({ assigned_materials: newMat }).eq('id', activeWp.id).select();
    if (error) {
        console.error("Update error:", error);
    } else {
        console.log("Update success:", data[0].assigned_materials);
    }
}

test();
