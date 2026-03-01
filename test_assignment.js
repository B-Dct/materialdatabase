require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function test() {
  const wpId = "c89280d4-1af6-4d2a-aebb-a3ecff5083cf"; // the id of the WP in the video, or I can just fetch the first one
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
