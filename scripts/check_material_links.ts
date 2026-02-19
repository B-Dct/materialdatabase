import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env vars
console.log('CWD:', process.cwd());
dotenv.config({ path: '.env.local' });

const supabase = createClient(
    process.env.VITE_SUPABASE_URL!,
    process.env.VITE_SUPABASE_ANON_KEY!
);

async function main() {
    const materialId = process.argv[2];
    if (!materialId) {
        console.error('Usage: tsx scripts/check_material_links.ts <materialId>');
        process.exit(1);
    }

    console.log(`Checking Material: ${materialId}`);

    // Fetch Material
    const { data: material, error } = await supabase
        .from('materials')
        .select('*')
        .eq('id', materialId)
        .single();

    if (error) {
        console.error('Error fetching material:', error);
        return;
    }

    console.log('--- Material ---');
    console.log(`Name: ${material.name}`);
    console.log(`Assigned Profile IDs: ${JSON.stringify(material.assigned_profile_ids)}`);
    console.log(`Assigned Reference Layup IDs: ${JSON.stringify(material.assigned_reference_layup_ids)}`);
    console.log(`Assigned Reference Assembly IDs: ${JSON.stringify(material.assigned_reference_assembly_ids)}`);
    console.log(`Variants: ${JSON.stringify(material.variants)}`);

    // Fetch Linked Layups (Direct & Assigned)
    const layupIds = [
        ...(material.assigned_reference_layup_ids || [])
    ];

    // Also check layups explicitly linked to this material ID in the layman table
    const { data: directLayups } = await supabase
        .from('layups')
        .select('id, name')
        .eq('material_id', materialId);

    directLayups?.forEach(l => {
        if (!layupIds.includes(l.id)) layupIds.push(l.id);
    });

    if (layupIds.length > 0) {
        const { data: layups } = await supabase
            .from('layups')
            .select('id, name, assigned_profile_ids, architecture_type_id')
            .in('id', layupIds);

        console.log('\n--- Linked Layups ---');
        layups?.forEach(l => {
            console.log(`Layup: ${l.name} (${l.id})`);
            console.log(`  Assigned Profile IDs: ${JSON.stringify(l.assigned_profile_ids)}`);
            console.log(`  Architecture Type ID: ${l.architecture_type_id}`);
        });
    } else {
        console.log('\nNo linked layups found.');
    }

    // Check Specifications
    const { data: specs } = await supabase
        .from('material_specifications')
        .select('id, name, requirement_profile_id') // Wait, does this column exist yet? User wants it.
        // It might NOT exist, and that's why they asked for it.
        // But if it DOES exists (maybe partially migrated?), let's check.
        // If not, Supabase will error, which is fine.
        .eq('material_id', materialId);

    console.log('\n--- Specifications ---');
    if (specs) {
        specs.forEach(s => {
            console.log(`Spec: ${s.name} (${s.id})`);
            // console.log(`  Linked Profile ID: ${s.requirement_profile_id}`); // This line might fail if column doesn't exist
        });
    }
}

main();
