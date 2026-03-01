import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

let url = 'http://127.0.0.1:54321';
let key = '';

try {
    const envFile = fs.readFileSync('.env.local', 'utf8');
    const lines = envFile.split('\n');
    for (const line of lines) {
        if (line.startsWith('VITE_SUPABASE_URL=')) url = line.split('=')[1].trim();
        if (line.startsWith('VITE_SUPABASE_ANON_KEY=')) key = line.split('=')[1].trim();
    }
} catch (e) {
    console.log('No .env.local found');
}

const supabase = createClient(url, key);

async function main() {
    const { data, error } = await supabase.from('material_specifications').select('name, properties');
    if (error) {
        console.error("Error:", error);
        return;
    }
    console.log(JSON.stringify(data, null, 2));
}

main();
