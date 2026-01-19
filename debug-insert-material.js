
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Manual env parsing
const envPath = path.resolve(process.cwd(), '.env.local');
let env = {};
try {
    const data = fs.readFileSync(envPath, 'utf8');
    data.split('\n').forEach(line => {
        const [key, value] = line.split('=');
        if (key && value) {
            env[key.trim()] = value.trim();
        }
    });
} catch (e) {
    console.warn("Could not read .env.local", e);
}

const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseKey = env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials in .env.local");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testInsert() {
    console.log("Attempting to insert material with packed properties...");

    const testMaterial = {
        name: "Debug Material " + Date.now(),
        type: "Resin",
        manufacturer: "Debug Corp",
        status: "active",
        // properties as array (legacy) or object (new)? 
        // The store tries to send an object.
        properties: {
            customProperties: [],
            materialListNumber: "L-123",
            manufacturerAddress: "Test City",
            supplier: "Test Supplier",
            reachStatus: "reach_compliant",
            maturityLevel: 1
        }
    };

    const { data, error } = await supabase.from('materials').insert(testMaterial).select().single();

    if (error) {
        console.error("INSERT ERROR:", JSON.stringify(error, null, 2));
    } else {
        console.log("INSERT SUCCESS:", data);
        // Cleanup
        await supabase.from('materials').delete().eq('id', data.id);
    }
}

testInsert();
