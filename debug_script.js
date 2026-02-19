
import { useAppStore } from './src/lib/store';

async function checkData() {
    const store = useAppStore.getState();

    // 1. Fetch all necessary data
    await Promise.all([
        store.fetchMaterials(),
        store.fetchLayups(),
        store.fetchRequirementProfiles()
    ]);

    const state = useAppStore.getState();

    console.log("--- Data Check ---");

    // 2. Find Material PHG-9012
    const material = state.materials.find(m => m.name.includes("PHG-9012") || m.name.includes("PHG9012"));
    if (!material) {
        console.log("ERROR: Material PHG-9012 not found");
        return;
    }
    console.log(`Material Found: ${material.name} (${material.id})`);
    console.log(`- Assigned Profiles: ${material.assignedProfileIds?.join(', ') || 'None'}`);

    // 3. Find Layup
    const layup = state.layups.find(l => l.name.includes("PHG9012")); // Adjust based on known name
    if (!layup) {
        console.log("ERROR: Layup for PHG-9012 not found");
    } else {
        console.log(`Layup Found: ${layup.name} (${layup.id})`);
        console.log(`- Material ID: ${layup.materialId}`);
        console.log(`- Architecture Type ID: ${layup.architectureTypeId}`);
        console.log(`- Layers: ${layup.layers?.length}`);
    }

    // 4. Check Profiles
    if (material.assignedProfileIds) {
        material.assignedProfileIds.forEach(pid => {
            const profile = state.requirementProfiles.find(p => p.id === pid);
            if (profile) {
                console.log(`Profile: ${profile.name} (${profile.id})`);
                console.log(`- Architectures: ${profile.layupArchitectures?.map(a => a.name).join(', ') || 'None'}`);
                console.log(`- Applicability: ${profile.applicability}`);
            } else {
                console.log(`Profile ID ${pid} linked but not found in store.`);
            }
        });
    } else {
        console.log("Material has no assigned profiles.");
    }

    console.log("--- End Check ---");
}

// Since we cannot easily run this node script with the store which uses browser APIs/Zustand, 
// I will create a small UI component logic to run this in the browser console 
// OR I can try to read the local storage/db dump if available.
// ACTUALLY, the best way is to use the browser subagent to run this JS in the context of the running app.
