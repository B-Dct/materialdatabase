import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function fix() {
    const { data: updated, error } = await supabase.from('materials')
        .update({ assigned_reference_layup_ids: ['762b7df6-daea-4fd6-a7f2-f0abd36a93d5'] })
        .eq('id', 'cc7c0100-2eeb-4337-8340-8732d08f1e3b')
        .select();

    if (error) {
        console.error("Error updating material:", error);
    } else {
        console.log("Updated material successfully:", updated?.length ? updated[0].id : null);
    }
}
fix();
