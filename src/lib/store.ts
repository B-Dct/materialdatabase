import { create } from 'zustand'
import type { Material, Layup, Assembly, MaterialVariant, PropertyDefinition, RequirementProfile, Laboratory, Measurement, ManufacturingProcess, Allowable } from '@/types/domain'
import { supabase } from './supabase';

interface AppState {
    materials: Material[];
    variants: MaterialVariant[];
    layups: Layup[];
    assemblies: Assembly[];
    properties: PropertyDefinition[]; // Global Property Definitions
    requirementProfiles: RequirementProfile[]; // Spec Profiles
    laboratories: Laboratory[];
    measurements: Measurement[]; // Global Measurements
    processes: ManufacturingProcess[];
    documentCategories: string[];
    isLoading: boolean;
    error: string | null;

    // Actions
    fetchMaterials: () => Promise<void>;
    addMaterial: (material: Omit<Material, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
    updateMaterial: (id: string, updates: Partial<Material>) => Promise<void>;
    deleteMaterial: (id: string) => Promise<void>;

    // Layup Logic
    fetchLayups: () => Promise<void>;
    addLayup: (layup: Omit<Layup, 'id' | 'createdAt' | 'version'>) => Promise<void>;
    updateLayup: (id: string, updates: Partial<Layup>) => Promise<void>;
    deleteLayup: (id: string) => Promise<void>;
    getLayupsByVariant: (variantId: string) => Promise<Layup[]>;

    // Assembly Logic
    fetchAssemblies: () => Promise<void>;
    addAssembly: (
        assembly: Omit<Assembly, 'id' | 'createdAt'>,
        components: { layupId: string, quantity: number }[]
    ) => Promise<void>;

    // Quality Logic
    fetchProperties: () => Promise<void>;
    addProperty: (property: Omit<PropertyDefinition, 'id'>) => Promise<void>;
    updateProperty: (id: string, property: Partial<PropertyDefinition>) => Promise<void>;
    fetchRequirementProfiles: () => Promise<void>;
    addRequirementProfile: (profile: Omit<RequirementProfile, 'id'>) => Promise<void>;
    updateRequirementProfile: (id: string, updates: Partial<RequirementProfile>) => Promise<void>;

    fetchLaboratories: () => Promise<void>;
    addLaboratory: (lab: Omit<Laboratory, 'id'>) => Promise<void>;
    updateLaboratory: (id: string, updates: Partial<Laboratory>) => Promise<void>;

    // Measurements
    fetchMeasurements: () => Promise<void>;
    addMeasurement: (measurement: Omit<Measurement, 'id' | 'createdAt'>) => Promise<void>;

    // Processes
    fetchProcesses: () => Promise<void>;
    addProcess: (process: Omit<ManufacturingProcess, 'id'>) => Promise<void>;

    // Material Types
    materialTypes: string[];
    fetchMaterialTypes: () => Promise<void>;
    addMaterialType: (type: string) => Promise<void>;
    deleteMaterialType: (type: string) => Promise<void>;

    // Allowables
    addAllowable: (allowable: Omit<Allowable, 'id'>) => Promise<void>;
    fetchAllowables: (parentId: string, parentType: 'material' | 'layup') => Promise<void>;
    deleteAllowable: (id: string, parentId: string, parentType: 'material' | 'layup') => Promise<void>;

    // Variant Logic
    addVariant: (materialId: string, variant: Omit<MaterialVariant, 'createdAt' | 'updatedAt' | 'baseMaterialId'>) => Promise<void>;
    updateVariant: (materialId: string, variantId: string, updates: Partial<MaterialVariant>) => Promise<void>;
    deleteVariant: (materialId: string, variantId: string) => Promise<void>;
}

import { persist } from 'zustand/middleware'

export const useAppStore = create<AppState>()(
    persist(
        (set, get) => ({
            materials: [],
            variants: [],
            layups: [],
            assemblies: [],
            properties: [],
            requirementProfiles: [],
            laboratories: [],
            measurements: [],
            processes: [],
            materialTypes: [], // Init empty
            documentCategories: ["Datasheet", "Specification", "Others"],
            isLoading: false,
            error: null,

            // ... (previous actions)
            // Allowables
            addAllowable: async () => { },
            fetchAllowables: async () => { },
            deleteAllowable: async () => { },

            fetchMaterials: async () => {
                set({ isLoading: true, error: null });
                try {
                    const { data, error } = await supabase
                        .from('materials')
                        .select('*, variants:material_variants(*)');

                    if (error) throw error;

                    // Map variants from DB structure to Domain structure
                    const materials: Material[] = data.map((m: any) => {
                        // Unpack properties if possible
                        let unpacked: any = {};
                        let materialProperties: any[] = [];

                        // Check if m.properties is our new JSON structure or legacy array
                        if (m.properties && !Array.isArray(m.properties) && m.properties.customProperties) {
                            // New Structure
                            const { customProperties, ...rest } = m.properties;
                            unpacked = rest;
                            materialProperties = customProperties || [];
                        } else {
                            // Legacy or Empty
                            materialProperties = Array.isArray(m.properties) ? m.properties : [];
                        }

                        return {
                            ...m,
                            // Overwrite with unpacked fields if they exist in JSON but not in DB header
                            ...unpacked,

                            variants: (m.variants || []).map((v: any) => ({
                                ...v,
                                id: v.variant_id, // Map DB PK to Domain ID
                                variantId: v.properties?.code || v.variant_name, // Map User Code, fallback to name
                                baseMaterialId: v.base_material_id, // Map FK
                                variantName: v.variant_name, // Map DB Name to Domain Name
                                description: v.properties?.description, // Map Description from JSONB
                                // Ensure properties is an object
                                properties: v.properties || {}
                            })),
                            // Ensure properties array is correct
                            properties: materialProperties,
                            allowables: m.properties?._allowables || [] // Hydrate allowables from JSONB
                        };
                    });

                    set({ materials });
                } catch (e: any) {
                    set({ error: e.message });
                } finally {
                    set({ isLoading: false });
                }
            },

            addMaterial: async (material) => {
                set({ isLoading: true, error: null });
                try {
                    // Pack missing columns into properties JSON
                    const {
                        materialId,
                        materialListNumber,
                        manufacturerAddress,
                        supplier,
                        reachStatus,
                        maturityLevel,
                        properties,
                        // Exclude extraneous fields
                        variants,
                        allowables,
                        measurements,
                        documents,
                        createdAt,
                        updatedAt,
                        ...baseMaterial
                    } = material as any;

                    const packedProperties = {
                        customProperties: properties || [],
                        materialId,
                        materialListNumber,
                        manufacturerAddress,
                        supplier,
                        reachStatus,
                        maturityLevel,
                        // Persist allowables if passed?
                        _allowables: material.allowables || []
                    };

                    const dbPayload = {
                        ...baseMaterial,
                        properties: packedProperties
                    };

                    // 1. Insert Material
                    const { data: matData, error: matError } = await supabase.from('materials').insert(dbPayload).select().single();
                    if (matError) throw matError;

                    // 2. Insert Default Variant "Standard"
                    // This ensures the material is usable in Layups immediately
                    const { data: varData, error: varError } = await supabase.from('material_variants').insert({
                        base_material_id: matData.id,
                        variant_name: "Standard",
                        // Inherit or leave empty other fields
                    }).select().single();

                    if (varError) {
                        console.error("Failed to create default variant:", varError);
                    }

                    // 3. Update Local State
                    // Attach the new variant to the material object so UI sees it immediately
                    const newMaterial: Material = {
                        ...(matData as Material),
                        // Unpack for local state consistency
                        materialId,
                        materialListNumber,
                        manufacturerAddress,
                        supplier,
                        reachStatus,
                        maturityLevel,
                        properties: properties || [],
                        variants: varData ? [varData as MaterialVariant] : []
                    };

                    set((state) => ({ materials: [...state.materials, newMaterial] }));
                } catch (e: any) {
                    set({ error: e.message });
                } finally {
                    set({ isLoading: false });
                }
            },

            updateMaterial: async (id, updates) => {
                set({ isLoading: true, error: null });
                try {
                    const state = get();
                    const currentMaterial = state.materials.find(m => m.id === id);
                    if (!currentMaterial) throw new Error("Material not found");

                    // Integrity Lock
                    const { isEditable } = await import('./integrity-utils');
                    if (!isEditable(currentMaterial.status)) {
                        // Allow status changes (e.g. Obsolete), but usually restrict content
                        if (!updates.status) { // If updating content while locked
                            throw new Error(`Material is ${currentMaterial.status} and cannot be edited. Create a new version.`);
                        }
                    }

                    // Merge current state with updates to ensure we don't lose existing packed data
                    const merged = { ...currentMaterial, ...updates };

                    // Pack extended fields
                    const {
                        assignedProfileIds,
                        variants,
                        allowables,
                        measurements,
                        documents,
                        properties, // MaterialProperty[] specific context
                        createdAt,
                        updatedAt,
                        id: _id, // Don't update ID

                        // Fields to pack
                        materialId,
                        materialListNumber,
                        manufacturerAddress,
                        supplier,
                        reachStatus,
                        maturityLevel,

                        ...dbUpdates
                    } = updates as any;

                    // Re-construct the properties JSON object based on MERGED data
                    const packedProperties = {
                        customProperties: merged.properties || [],
                        materialId: merged.materialId,
                        materialListNumber: merged.materialListNumber,
                        manufacturerAddress: merged.manufacturerAddress,
                        supplier: merged.supplier,
                        reachStatus: merged.reachStatus,
                        maturityLevel: merged.maturityLevel,
                        _allowables: merged.allowables || []
                    };

                    // Add properties to dbUpdates
                    // We must cast dbUpdates to allow 'properties' if it was stripped
                    (dbUpdates as any).properties = packedProperties;

                    if (Object.keys(dbUpdates).length > 0) {
                        const { error } = await supabase.from('materials').update(dbUpdates).eq('id', id);
                        if (error) {
                            console.warn("DB Update failed (might be schema mismatch):", error);
                            throw error; // Throw so UI knows
                        }
                    }

                    // Update Local State with ALL updates (including client-side props)
                    set((state) => ({
                        materials: state.materials.map(m =>
                            m.id === id ? { ...m, ...updates } : m
                        )
                    }));

                } catch (e: any) {
                    set({ error: e.message });
                } finally {
                    set({ isLoading: false });
                }
            },

            deleteMaterial: async (id) => {
                const state = get();

                // Integrity Check
                const { checkTraceability } = await import('./integrity-utils');
                const check = checkTraceability(id, 'material', {
                    materials: state.materials,
                    layups: state.layups,
                    assemblies: state.assemblies
                });

                if (check.isUsed) {
                    set({ error: `Cannot delete material: Used in ${check.usages.length} dependent items (${check.usages[0]}, ...)` });
                    return;
                }

                set({ isLoading: true });
                try {
                    const { error } = await supabase.from('materials').delete().eq('id', id);
                    if (error) throw error;
                    set((state) => ({
                        materials: state.materials.filter((m) => m.id !== id),
                    }));
                } catch (e: any) {
                    set({ error: e.message });
                } finally {
                    set({ isLoading: false });
                }
            },

            fetchLayups: async () => {
                set({ isLoading: true });
                try {
                    // 1. Fetch Layups
                    const { data: layupsData, error: layupsError } = await supabase
                        .from('layups')
                        .select('*');

                    if (layupsError) throw layupsError;

                    // 2. Fetch ALL Layers (optimization: or fetch only for these layups if list is huge, but fine for now)
                    const { data: layersData, error: layersError } = await supabase
                        .from('layup_layers')
                        .select('*');

                    if (layersError) console.warn("Error fetching layers:", layersError);

                    // 3. Map manually
                    const layupsWithLayers = layupsData.map((l: any) => {
                        const associatedLayers = layersData?.filter((layer: any) => layer.layup_id === l.id) || [];
                        return {
                            ...l,
                            layers: associatedLayers.map((layer: any) => ({
                                id: layer.id,
                                layupId: layer.layup_id,
                                materialVariantId: layer.material_variant_id,
                                orientation: layer.orientation,
                                sequence: layer.sequence
                            })).sort((a: any, b: any) => a.sequence - b.sequence)
                        };
                    });

                    set({ layups: layupsWithLayers as Layup[] });
                } catch (e: any) {
                    set({ error: e.message });
                } finally {
                    set({ isLoading: false });
                }
            },

            addLayup: async (layup) => {
                set({ isLoading: true });
                try {
                    // 0. Duplicate Check
                    const existingLayups = get().layups;
                    // Hash logic: Create a signature string for the stack layer sequence
                    // Signature = "ProcessID + [VariantID-Orientation-Sequence, ...]"
                    // We need to ensure we only check against *active* layups? Or all? 
                    // Usually duplicates are bad even against archived ones if we want strict uniqueness.
                    // Let's prevent duplicates against ANY existing layup.

                    const createStackSignature = (pId: string | undefined, layers: typeof layup.layers) => {
                        const sortedLayers = [...(layers || [])].sort((a, b) => a.sequence - b.sequence);
                        const layerSig = sortedLayers.map(l => `${l.materialVariantId}:${l.orientation}`).join('|');
                        return `${pId || 'none'}|${layerSig}`;
                    };

                    const newSignature = createStackSignature(layup.processId, layup.layers);

                    const isDuplicate = existingLayups.some(l => {
                        const existingSig = createStackSignature(l.processId, l.layers);
                        return existingSig === newSignature;
                    });

                    if (isDuplicate) {
                        throw new Error("A layup with this exact stack configuration already exists.");
                    }

                    // 1. Prepare Layup Payload (snake_case)
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    const { layers, measurements, ...rest } = layup;

                    const dbLayup = {
                        name: rest.name,
                        status: rest.status,
                        // description: rest.description, // Add if exists
                        process_id: rest.processId,
                        process_params: rest.processParams,
                        total_thickness: rest.totalThickness,
                        total_weight: rest.totalWeight,
                        created_by: rest.createdBy,
                        previous_version_id: rest.previousVersionId,
                        // production_site: rest.productionSite, // Column missing in DB
                        restriction_reason: rest.restrictionReason
                    };

                    // 2. Insert Layup
                    const { data: layupData, error: layupError } = await supabase
                        .from('layups')
                        .insert(dbLayup)
                        .select()
                        .single();

                    if (layupError) throw layupError;

                    const newLayupId = layupData.id;

                    // 3. Prepare & Insert Layers
                    if (layers && layers.length > 0) {
                        const dbLayers = layers.map(l => ({
                            layup_id: newLayupId,
                            material_variant_id: l.materialVariantId,
                            orientation: l.orientation,
                            sequence: l.sequence
                        }));

                        const { error: layersError } = await supabase
                            .from('layup_layers')
                            .insert(dbLayers);

                        if (layersError) throw layersError;
                    }

                    // 4. Update Local State (Re-fetch or construct)
                    // Constructing full object to avoid re-fetch latency
                    const newLayup: Layup = {
                        ...layup, // specific fields like measurements might be empty
                        id: newLayupId,
                        createdAt: layupData.created_at,
                        layers: layers || [],
                        measurements: [],
                        version: layupData.version || 1
                    } as Layup;

                    set((state) => ({ layups: [...state.layups, newLayup] }));
                } catch (e: any) {
                    console.error("Failed to add layup:", e);
                    set({ error: e.message });
                    throw e; // Re-throw so UI knows it failed
                } finally {
                    set({ isLoading: false });
                }
            },



            getLayupsByVariant: async (variantId: string) => {
                const { data, error } = await supabase
                    .from('layups')
                    .select('*, layup_layers!inner(material_variant_id)')
                    .eq('layup_layers.material_variant_id', variantId);

                if (error) {
                    console.error("Error fetching usage:", error);
                    return [];
                }
                return data as Layup[];
            },

            updateLayup: async (id, updates) => {
                set({ isLoading: true });
                try {
                    const { assignedProfileIds, ...rest } = updates;
                    const dbUpdates: any = {};

                    // Map known fields to snake_case
                    if (rest.name) dbUpdates.name = rest.name;
                    if (rest.status) dbUpdates.status = rest.status;
                    if (rest.description) dbUpdates.description = rest.description;
                    if (rest.processId) dbUpdates.process_id = rest.processId;
                    if (rest.processParams) dbUpdates.process_params = rest.processParams;
                    if (rest.totalThickness !== undefined) dbUpdates.total_thickness = rest.totalThickness;
                    if (rest.totalWeight !== undefined) dbUpdates.total_weight = rest.totalWeight;
                    if (rest.restrictionReason !== undefined) dbUpdates.restriction_reason = rest.restrictionReason;

                    // Handle assignedProfileIds - assuming column might NOT exist in migration yet, be resilient
                    if (assignedProfileIds) {
                        // Assuming column is 'assigned_profile_ids' text[]
                        // Try to update it.
                        dbUpdates.assigned_profile_ids = assignedProfileIds;
                    }

                    if (Object.keys(dbUpdates).length > 0) {
                        const { error } = await supabase
                            .from('layups')
                            .update(dbUpdates)
                            .eq('id', id);

                        // Fail silently for prototype if column missing? 
                        if (error) {
                            console.warn("Update Layup DB Error (partial update?):", error);
                        }
                    }

                    // Always update local state
                    set(state => ({
                        layups: state.layups.map(l => l.id === id ? { ...l, ...updates } : l)
                    }));
                } catch (e: any) {
                    set({ error: e.message });
                } finally {
                    set({ isLoading: false });
                }
            },

            deleteLayup: async (id) => {
                set({ isLoading: true });
                try {
                    // Start transaction equivalent? No, supabase generic.
                    // Delete layers first? Cascade should handle it if set up in DB. 
                    // If not, we might fail. Let's assume cascade or explicit delete.
                    // Safest is to rely on DB cascade, but let's try delete layup directly.

                    const { error } = await supabase.from('layups').delete().eq('id', id);
                    if (error) throw error;

                    set((state) => ({
                        layups: state.layups.filter((l) => l.id !== id),
                    }));
                } catch (e: any) {
                    set({ error: e.message });
                } finally {
                    set({ isLoading: false });
                }
            },

            // Assembly Logic
            fetchAssemblies: async () => {
                set({ isLoading: true });
                try {
                    const { data, error } = await supabase.from('assemblies').select('*');
                    if (error) throw error;
                    set({ assemblies: data as Assembly[] });
                } catch (e: any) {
                    set({ error: e.message });
                } finally {
                    set({ isLoading: false });
                }
            },

            addAssembly: async (assembly: Omit<Assembly, 'id' | 'createdAt'>, components: { layupId: string, quantity: number }[]) => {
                set({ isLoading: true });
                try {
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    const { components: _c, measurements: _m, ...dbPayload } = assembly;

                    const { data: asm, error: asmError } = await supabase
                        .from('assemblies')
                        .insert(dbPayload)
                        .select()
                        .single();
                    if (asmError) throw asmError;

                    if (components.length > 0) {
                        const compsToInsert = components.map(c => ({
                            assembly_id: asm.id,
                            component_type: 'layup',
                            component_id: c.layupId,
                            quantity: c.quantity
                        }));

                        const { error: compError } = await supabase
                            .from('assembly_components')
                            .insert(compsToInsert);

                        if (compError) throw compError;
                    }

                    set((state) => ({ assemblies: [...state.assemblies, asm as Assembly] }));
                } catch (e: any) {
                    set({ error: e.message });
                } finally {
                    set({ isLoading: false });
                }
            },

            // Quality Logic
            fetchProperties: async () => {
                set({ isLoading: true });
                // Re-seed if empty OR if we only have the old mock data (e.g. < 5 items)
                // This ensures the new 30 properties replace the old 3.
                if (get().properties.length > 5) {
                    set({ isLoading: false });
                    return;
                }

                try {
                    // Default Initial Data
                    const mockProps: PropertyDefinition[] = [
                        // Mechanical - Tensile
                        { id: 'mech-01', name: 'Tensile Strength (0°)', unit: 'MPa', dataType: 'numeric', testMethods: ['ISO 527-4', 'ASTM D3039'], category: 'mechanical' },
                        { id: 'mech-02', name: 'Tensile Modulus (0°)', unit: 'GPa', dataType: 'numeric', testMethods: ['ISO 527-4', 'ASTM D3039'], category: 'mechanical' },
                        { id: 'mech-03', name: 'Tensile Strain to Failure', unit: '%', dataType: 'numeric', testMethods: ['ISO 527-4', 'ASTM D3039'], category: 'mechanical' },

                        // Mechanical - Compressive
                        { id: 'mech-04', name: 'Compressive Strength (0°)', unit: 'MPa', dataType: 'numeric', testMethods: ['ISO 14126', 'ASTM D6641'], category: 'mechanical' },
                        { id: 'mech-05', name: 'Compressive Modulus (0°)', unit: 'GPa', dataType: 'numeric', testMethods: ['ISO 14126', 'ASTM D6641'], category: 'mechanical' },

                        // Mechanical - Flexural
                        { id: 'mech-06', name: 'Flexural Strength', unit: 'MPa', dataType: 'numeric', testMethods: ['ISO 14125', 'ASTM D7264'], category: 'mechanical' },
                        { id: 'mech-07', name: 'Flexural Modulus', unit: 'GPa', dataType: 'numeric', testMethods: ['ISO 14125', 'ASTM D7264'], category: 'mechanical' },

                        // Mechanical - Shear
                        { id: 'mech-08', name: 'In-Plane Shear Strength', unit: 'MPa', dataType: 'numeric', testMethods: ['ISO 14129', 'ASTM D3518'], category: 'mechanical' },
                        { id: 'mech-09', name: 'In-Plane Shear Modulus', unit: 'GPa', dataType: 'numeric', testMethods: ['ISO 14129', 'ASTM D3518'], category: 'mechanical' },
                        { id: 'mech-10', name: 'Interlaminar Shear Strength (ILSS)', unit: 'MPa', dataType: 'numeric', testMethods: ['ISO 14130', 'ASTM D2344'], category: 'mechanical' },

                        // Fractural
                        { id: 'mech-11', name: 'Fracture Toughness G1c', unit: 'J/m²', dataType: 'numeric', testMethods: ['ISO 15024', 'ASTM D5528'], category: 'mechanical' },
                        { id: 'mech-12', name: 'Fracture Toughness G2c', unit: 'J/m²', dataType: 'numeric', testMethods: ['ISO 6033', 'ASTM D7905'], category: 'mechanical' },
                        { id: 'mech-13', name: "Poisson's Ratio", unit: '-', dataType: 'numeric', testMethods: ['ISO 527-4', 'ASTM D3039'], category: 'mechanical' },

                        // Structural
                        { id: 'mech-14', name: 'Bearing Strength', unit: 'MPa', dataType: 'numeric', testMethods: ['ASTM D5961'], category: 'mechanical' },
                        { id: 'mech-15', name: 'Open Hole Compression (OHC)', unit: 'MPa', dataType: 'numeric', testMethods: ['ASTM D6484'], category: 'mechanical' },
                        { id: 'mech-16', name: 'Open Hole Tension (OHT)', unit: 'MPa', dataType: 'numeric', testMethods: ['ASTM D5766'], category: 'mechanical' },
                        { id: 'mech-17', name: 'Compression After Impact (CAI)', unit: 'MPa', dataType: 'numeric', testMethods: ['ISO 18352', 'ASTM D7137'], category: 'mechanical' },

                        // Physical
                        { id: 'phys-01', name: 'Density', unit: 'g/cm³', dataType: 'numeric', testMethods: ['ISO 1183', 'ASTM D792'], category: 'physical' },
                        { id: 'phys-02', name: 'Fiber Volume Content (FVC)', unit: '%', dataType: 'numeric', testMethods: ['ISO 11667', 'ASTM D3171'], category: 'physical' },
                        { id: 'phys-03', name: 'Void Content', unit: '%', dataType: 'numeric', testMethods: ['ISO 7822', 'ASTM D2734'], category: 'physical' },
                        { id: 'phys-04', name: 'Areal Weight', unit: 'g/m²', dataType: 'numeric', testMethods: ['ISO 10352', 'ASTM D3776'], category: 'physical' },
                        { id: 'phys-05', name: 'Cured Ply Thickness (CPT)', unit: 'mm', dataType: 'numeric', testMethods: ['ASTM D3171'], category: 'physical' },

                        // Chemical / Thermal
                        { id: 'chem-01', name: 'Glass Transition Temp (Tg) - Onset', unit: '°C', dataType: 'numeric', testMethods: ['ISO 11357-2 (DSC)', 'ASTM D3418'], category: 'chemical' },
                        { id: 'chem-02', name: 'Glass Transition Temp (Tg) - Tan Delta', unit: '°C', dataType: 'numeric', testMethods: ['ISO 6721 (DMA)', 'ASTM D7028'], category: 'chemical' },
                        { id: 'chem-03', name: 'Melting Point (Tm)', unit: '°C', dataType: 'numeric', testMethods: ['ISO 11357-3', 'ASTM D3418'], category: 'chemical' },
                        { id: 'chem-04', name: 'CTE (Alpha 1)', unit: '10⁻⁶/K', dataType: 'numeric', testMethods: ['ISO 11359-2', 'ASTM E831'], category: 'chemical' },
                        { id: 'chem-05', name: 'Gel Time', unit: 'min', dataType: 'numeric', testMethods: ['ISO 3521', 'ASTM D2471'], category: 'chemical' },
                        { id: 'chem-06', name: 'Water Absorption', unit: '%', dataType: 'numeric', testMethods: ['ISO 62', 'ASTM D570'], category: 'chemical' },
                        { id: 'chem-07', name: 'Volatile Content', unit: '%', dataType: 'numeric', testMethods: ['ISO 15040', 'ASTM D3530'], category: 'chemical' },
                        { id: 'chem-08', name: 'Resin Flow', unit: '%', dataType: 'numeric', testMethods: ['ASTM D3531'], category: 'chemical' },

                        // Flammability
                        { id: 'fire-01', name: 'Flammability (Vertical Burn)', unit: 's', dataType: 'numeric', testMethods: ['FAR 25.853'], category: 'physical' },
                    ];
                    set({ properties: mockProps });
                } catch (e: any) {
                    set({ error: e.message });
                } finally {
                    set({ isLoading: false });
                }
            },

            addProperty: async (property) => {
                // Mock Add
                const newProp = { ...property, id: Math.random().toString(36).substring(7) };
                set(state => ({ properties: [...state.properties, newProp] }));
            },

            updateProperty: async (id, updates) => {
                set(state => ({
                    properties: state.properties.map(p =>
                        p.id === id ? { ...p, ...updates } : p
                    )
                }));
            },

            fetchRequirementProfiles: async () => {
                if (get().requirementProfiles.length > 0) return;

                // Mock Data
                const mockProfiles: RequirementProfile[] = [
                    {
                        id: 'rp1',
                        name: 'Airbus A350 Interior',
                        description: 'Standard interior components spec',
                        rules: [
                            { propertyId: 'p1', min: 500 }, // Tensile > 500
                            { propertyId: 'p2', max: 1.5 }, // Density < 1.5
                        ]
                    }
                ];
                set({ requirementProfiles: mockProfiles, isLoading: false });
            },

            addRequirementProfile: async (profile) => {
                const newProfile = { ...profile, id: Math.random().toString(36).substring(7) };
                set(state => ({ requirementProfiles: [...state.requirementProfiles, newProfile] }));
            },

            updateRequirementProfile: async (id, updates) => {
                set(state => ({
                    requirementProfiles: state.requirementProfiles.map(p => p.id === id ? { ...p, ...updates } : p)
                }));
            },

            fetchLaboratories: async () => {
                if (get().laboratories.length > 0) return;

                const mockLabs: Laboratory[] = [
                    { id: 'l1', name: 'In-House Testing Lab', authorizedMethods: ['ISO 527-4', 'ISO 1183'] },
                    { id: 'l2', name: 'External Certified Lab GmbH', authorizedMethods: ['ISO 527-4', 'DSC'] }
                ];
                set({ laboratories: mockLabs });
            },
            addLaboratory: async (lab) => {
                const newLab = { ...lab, id: Math.random().toString(36).substring(7) };
                set(state => ({ laboratories: [...state.laboratories, newLab] }));
            },
            updateLaboratory: async (id, updates) => {
                set(state => ({
                    laboratories: state.laboratories.map(l => l.id === id ? { ...l, ...updates } : l)
                }));
            },

            fetchMeasurements: async () => {
                set({ isLoading: true });
                try {
                    const { data, error } = await supabase.from('measurements').select(`
                        id,
                        materialId:material_id,
                        propertyDefinitionId:property_definition_id,
                        value,
                        unit,
                        laboratoryId:laboratory_id,
                        reliability,
                        valueType:value_type,
                        testMethod:test_method,
                        processParams:process_params,
                        date,
                        sourceType:source_type,
                        sourceRef:source_file_url,
                        sourceFilename:source_filename,
                        createdBy:created_by,
                        createdAt:created_at
                    `);

                    if (error) throw error;

                    // Map DB result to Domain
                    const measurements: Measurement[] = data.map((m: any) => {
                        // Attempt to extract extended data from process_params if it exists
                        const params = m.processParams || {};
                        const rawValues = params._raw_values || (m.value ? [m.value] : []);
                        const stats = params._statistics || undefined;

                        return {
                            ...m,
                            values: rawValues,
                            resultValue: m.value,
                            statistics: stats,
                            processParams: params, // Keep original
                        };
                    });

                    set({ measurements });
                } catch (e: any) {
                    set({ error: e.message });
                } finally {
                    set({ isLoading: false });
                }
            },

            addMeasurement: async (measurement) => {
                set({ isLoading: true });
                try {
                    // Pack complex data into processParams for DB storage
                    const packedParams = {
                        ...measurement.processParams,
                        _raw_values: measurement.values,
                        _statistics: measurement.statistics
                    };

                    const dbPayload = {
                        material_id: measurement.materialId,
                        property_definition_id: measurement.propertyDefinitionId,
                        value: measurement.resultValue, // Store Mean/Primary value in the standard column
                        unit: measurement.unit,
                        laboratory_id: measurement.laboratoryId,
                        reliability: measurement.reliability,
                        value_type: 'mean', // Default to mean if we are aggregating
                        test_method: measurement.testMethod,
                        process_params: packedParams, // Storing JSONB
                        date: measurement.date,
                        source_type: measurement.sourceType,
                        source_file_url: measurement.sourceRef,
                        source_filename: measurement.sourceFilename,
                    };

                    const { data, error } = await supabase.from('measurements').insert(dbPayload).select().single();

                    if (error) throw error;

                    // Construct Domain Object
                    const newMeasurement: Measurement = {
                        ...measurement,
                        id: data.id,
                        createdAt: data.created_at
                    };

                    set((state) => ({ measurements: [...state.measurements, newMeasurement] }));
                } catch (e: any) {
                    set({ error: e.message });
                } finally {
                    set({ isLoading: false });
                }
            },

            // Processes
            fetchProcesses: async () => {
                set({ isLoading: true });
                try {
                    const { data, error } = await supabase.from('manufacturing_processes').select(`
                        id,
                        name,
                        description,
                        defaultParams:default_params
                    `);

                    if (error) throw error;
                    set({ processes: data as ManufacturingProcess[] });
                } catch (e: any) {
                    set({ error: e.message });
                } finally {
                    set({ isLoading: false });
                }
            },

            addProcess: async (newItem) => {
                set({ isLoading: true });
                try {
                    const dbPayload = {
                        name: newItem.name,
                        description: newItem.description,
                        default_params: newItem.defaultParams
                    };
                    const { data, error } = await supabase.from('manufacturing_processes').insert(dbPayload).select(`
                        id, name, description, defaultParams:default_params
                    `).single();
                    if (error) throw error;
                    set(state => ({ processes: [...state.processes, data as ManufacturingProcess] }));
                } catch (e: any) {
                    set({ error: e.message });
                } finally {
                    set({ isLoading: false });
                }
            },

            // Material Types
            fetchMaterialTypes: async () => {
                set({ isLoading: true });
                try {
                    const { data, error } = await supabase.from('material_type_definitions').select('name');
                    if (error) {
                        console.warn("Material Types - DB Fetch failed, using local/default:", error);
                        // Fallback to defaults if list is empty
                        if (get().materialTypes.length === 0) {
                            set({ materialTypes: ["Prepreg", "Fabric", "Resin", "Core", "Adhesive"] });
                        }
                    } else {
                        set({ materialTypes: data.map((d: any) => d.name) });
                    }
                } catch (e: any) {
                    // Network error or 404 -> fallback
                    console.warn("Material Types - Network/DB error, using local:", e);
                    if (get().materialTypes.length === 0) {
                        set({ materialTypes: ["Prepreg", "Fabric", "Resin", "Core", "Adhesive"] });
                    }
                } finally {
                    set({ isLoading: false });
                }
            },

            addMaterialType: async (type) => {
                set({ isLoading: true });
                try {
                    // Optimistically update local state first
                    set(state => ({ materialTypes: [...state.materialTypes, type] }));

                    // Try DB insert
                    const { error } = await supabase.from('material_type_definitions').insert({ name: type });
                    if (error) {
                        console.warn("Material Types - DB Insert failed (store only mode):", error);
                    }
                } catch (e: any) {
                    console.warn("Material Types - Network error on add:", e);
                } finally {
                    set({ isLoading: false });
                }
            },

            deleteMaterialType: async (type) => {
                set({ isLoading: true });
                try {
                    // Optimistically update
                    set(state => ({ materialTypes: state.materialTypes.filter(t => t !== type) }));

                    const { error } = await supabase.from('material_type_definitions').delete().eq('name', type);
                    if (error) {
                        console.warn("Material Types - DB Delete failed (store only mode):", error);
                    }
                } catch (e: any) {
                    console.warn("Material Types - Network error on delete:", e);
                } finally {
                    set({ isLoading: false });
                }
            },

            // Variant Logic
            addVariant: async (materialId, variant) => {
                set({ isLoading: true });
                try {
                    // 1. Prepare Base Material Data
                    const state = get();
                    const baseMaterial = state.materials.find(m => m.id === materialId);
                    if (!baseMaterial) throw new Error("Base material not found");

                    const newVariant: MaterialVariant = {
                        ...baseMaterial, // Inherit base properties
                        ...variant,
                        baseMaterialId: materialId,
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString(),
                        // Ensure these identify it as a variant
                        id: variant.id, // User provided ID is used as the distinct ID for this entity?
                        // Wait, user inputs "Variant ID" (e.g. VAR-01). 
                        // Should this be the PK `id` or a separate `variantId` field?
                        // Domain says: id: string (Base Material ID) ?? No.
                        // Domain `MaterialVariant` extends `Material`. 
                        // It has both `id` (inherited) and `variantId`.
                        // Usually `id` is the UUID PK. `variantId` is the user facing code.
                        // But user said "Variants must have a unique ID that one must input".
                        // I will map User Input ID -> `variantId` AND use it as `id` if possible, or generate UUID for `id`.
                        // Let's use User Input as `variantId` and generate a UUID for `id` to be safe and consistent with other entities.
                        // However, the interface says `variant` passed in has `id`. 
                        // Let's assume the user input ID is passed as `variantId`.
                        // And we generate `id` if not present? 
                        // The user prompt said: "Variants must have a unique ID...".
                        // Let's stick to the interface I defined: `Omit<MaterialVariant, ...>`.
                        // If I treat `variant.id` as the UUID, I need another field for the user-code?
                        // `MaterialVariant` has `variantId`. I will use that for the user code.
                        // And I will generate a random UUID for `id`.

                        // actually, the `variant` arg in `addVariant` is `Omit<MaterialVariant...`.
                        // The UI will pass the data.
                    };

                    // If the UI passes `id` as the user input code, I should map it correctly.
                    // Domain: `variantId: string`. `id: string`.
                    // I will assume the UI passes `variantId` as the user code. 
                    // And I will generate a UUID for the system `id`.
                    // But wait, the `variant` argument includes `id` because I only omitted createdAt/updatedAt/baseMaterialId.
                    // Let's rely on the UI to pass the structure.

                    // Local State Update
                    const updatedMaterials = state.materials.map(m => {
                        if (m.id === materialId) {
                            const currentVariants = m.variants || [];
                            return { ...m, variants: [...currentVariants, newVariant] };
                        }
                        return m;
                    });
                    set({ materials: updatedMaterials });

                    const dbPayload = {
                        variant_id: newVariant.id,
                        base_material_id: materialId,
                        variant_name: newVariant.variantName,
                        properties: {
                            code: newVariant.variantId,
                            description: newVariant.description
                        }
                    };

                    const { error } = await supabase.from('material_variants').insert(dbPayload);
                    if (error) throw error;

                } catch (e: any) {
                    console.error("Add Variant failed", e);
                    set({ error: e.message });
                    throw e; // RETHROW
                } finally {
                    set({ isLoading: false });
                }
            },

            updateVariant: async (materialId, variantId, updates) => {
                set({ isLoading: true });
                try {
                    const { variantName /*, description */ } = updates;

                    const { error } = await supabase
                        .from('material_variants')
                        .update({
                            variant_name: variantName,
                            // properties: { description } 
                        })
                        .eq('variant_id', variantId); // Use correct PK

                    if (error) throw error;

                    const state = get();
                    const updatedMaterials = state.materials.map(m => {
                        if (m.id === materialId && m.variants) {
                            return {
                                ...m,
                                variants: m.variants.map(v =>
                                    v.variantId === variantId ? { ...v, ...updates } : v
                                )
                            };
                        }
                        return m;
                    });
                    set({ materials: updatedMaterials });
                } catch (e: any) {
                    set({ error: e.message });
                    throw e;
                } finally {
                    set({ isLoading: false });
                }
            },

            deleteVariant: async (materialId, variantId) => {
                set({ isLoading: true });
                try {
                    const { error } = await supabase
                        .from('material_variants')
                        .delete()
                        .eq('variant_id', variantId);

                    if (error) throw error;

                    const state = get();
                    const updatedMaterials = state.materials.map(m => {
                        if (m.id === materialId && m.variants) {
                            return {
                                ...m,
                                variants: m.variants.filter(v => v.variantId !== variantId)
                            };
                        }
                        return m;
                    });
                    set({ materials: updatedMaterials });
                } catch (e: any) {
                    set({ error: e.message });
                    throw e;
                } finally {
                    set({ isLoading: false });
                }
            }
        }),
        {
            name: 'material-db-storage',
            partialize: (state) => ({
                laboratories: state.laboratories,
                properties: state.properties,
                requirementProfiles: state.requirementProfiles,
                documentCategories: state.documentCategories,
                processes: state.processes,
                materialTypes: state.materialTypes
            }),
        }
    )
);
