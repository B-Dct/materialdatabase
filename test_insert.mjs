import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing environment variables");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testInsert() {
    const packedProperties = {
        customProperties: [],
        _allowables: []
    };

    const { data, error } = await supabase.from('layups').insert({
        name: "Test Reference Layup",
        description: "test",
        status: "engineering",
        process_params: {},
        properties: packedProperties,
        total_thickness: 1,
        total_weight: 1,
        created_by: '00000000-0000-0000-0000-000000000000',
        is_reference: true,
    }).select().single();

    if (error) {
        console.error("INSERT ERROR", JSON.stringify(error, null, 2));
    } else {
        console.log("INSERT SUCCESS", data);
    }
}

testInsert();
