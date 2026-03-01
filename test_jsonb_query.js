import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    const { data, error } = await supabase.from('project_material_lists').select('id, items').limit(1);
    console.log("All Lists:", JSON.stringify(data, null, 2));

    if (data && data.length > 0 && data[0].items && data[0].items.length > 0) {
        const materialId = data[0].items[0].materialId;
        console.log("Testing with materialId:", materialId);
        
        const { data: q1, error: e1 } = await supabase.from('project_material_lists').select('id').contains('items', [{ materialId }]);
        console.log("Result using array contains:", q1, e1);

        const { data: q2, error: e2 } = await supabase.from('project_material_lists').select('id').contains('items', `[{"materialId": "${materialId}"}]`);
        console.log("Result using string contains:", q2, e2);
    }
}
run();
