import { create } from 'zustand'
import type { Material, Layup, Assembly, MaterialVariant, PropertyDefinition, RequirementProfile, Laboratory, Measurement, ManufacturingProcess, Allowable, AssemblyComponent, MaterialSpecification, TestMethod } from '@/types/domain'
import { supabase } from './supabase';
import { v4 as uuidv4 } from "uuid";

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
    testMethods: TestMethod[]; // Test Method Entities
    documentCategories: string[];
    isLoading: boolean;
    error: string | null;



    // Specifications
    specifications: MaterialSpecification[];

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
        assembly: Omit<Assembly, 'id' | 'createdAt' | 'components'>,
        components: Omit<AssemblyComponent, 'id' | 'sequence'>[]
    ) => Promise<void>;
    updateAssembly: (id: string, updates: Partial<Assembly>) => Promise<void>;

    // Quality Logic
    fetchProperties: () => Promise<void>;
    addProperty: (property: Omit<PropertyDefinition, 'id'>) => Promise<void>;
    seedStandardProperties: (options?: { suffix?: string }) => Promise<void>;
    seedStandardTestMethods: () => Promise<void>;
    updateProperty: (id: string, property: Partial<PropertyDefinition>) => Promise<void>;
    deleteProperty: (id: string) => Promise<void>;
    fetchRequirementProfiles: () => Promise<void>;
    addRequirementProfile: (profile: Omit<RequirementProfile, 'id'>) => Promise<void>;
    updateRequirementProfile: (id: string, updates: Partial<RequirementProfile>) => Promise<void>;

    fetchLaboratories: () => Promise<void>;
    addLaboratory: (lab: Omit<Laboratory, 'id'>) => Promise<void>;
    updateLaboratory: (id: string, updates: Partial<Laboratory>) => Promise<void>;

    // Measurements
    fetchMeasurements: () => Promise<void>;
    addMeasurement: (measurement: Omit<Measurement, 'id' | 'createdAt'>) => Promise<void>;
    updateMeasurement: (id: string, updates: Partial<Measurement>) => Promise<void>;

    // Processes
    fetchProcesses: () => Promise<void>;
    addProcess: (process: Omit<ManufacturingProcess, 'id'>) => Promise<void>;

    // Test Methods
    fetchTestMethods: () => Promise<void>;
    addTestMethod: (method: Omit<TestMethod, 'id'>) => Promise<void>;
    updateTestMethod: (id: string, updates: Partial<TestMethod>) => Promise<void>;
    deleteTestMethod: (id: string) => Promise<void>;

    // Material Types
    materialTypes: string[];
    fetchMaterialTypes: () => Promise<void>;
    addMaterialType: (type: string) => Promise<void>;
    deleteMaterialType: (type: string) => Promise<void>;

    // Specification Actions
    fetchSpecifications: (entityId: string, entityType?: 'material' | 'layup' | 'assembly') => Promise<void>;
    addSpecification: (spec: Omit<MaterialSpecification, 'createdAt' | 'id'> & { id?: string }) => Promise<void>;
    deleteSpecification: (id: string) => Promise<void>;

    // Allowables
    addAllowable: (allowable: Omit<Allowable, 'id'>) => Promise<void>;
    fetchAllowables: (parentId: string, parentType: 'material' | 'layup' | 'assembly') => Promise<void>;
    deleteAllowable: (id: string, parentId: string, parentType: 'material' | 'layup' | 'assembly') => Promise<void>;

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
            testMethods: [], // Init empty
            requirementProfiles: [],
            laboratories: [],
            measurements: [],
            processes: [],
            materialTypes: [], // Init empty
            specifications: [], // Init empty
            documentCategories: ["Datasheet", "Specification", "Others"],
            isLoading: false,
            error: null,

            // ... (previous actions)
            // Allowables
            addAllowable: async (allowable) => {
                set({ isLoading: true });
                try {
                    const newAllowable = { ...allowable, id: uuidv4() };
                    const { parentId, parentType } = allowable;

                    // 1. Determine Table and Field to update
                    let tableName = 'materials';
                    if (parentType === 'layup') tableName = 'layups';
                    if (parentType === 'assembly') tableName = 'assemblies';

                    // 2. Optimistic Update Local State
                    if (parentType === 'material') {
                        set(state => ({
                            materials: state.materials.map(m =>
                                m.id === parentId ? { ...m, allowables: [...(m.allowables || []), newAllowable] } : m
                            )
                        }));
                        // Fetch current to append safely for DB? OR just push to DB if it's JSONB append?
                        // Supabase doesn't support easy JSONB append without func?
                        // We fetch current from state logic is fine.
                        const current = get().materials.find(m => m.id === parentId);
                        if (current) {
                            await supabase.from(tableName).update({ allowables: [...(current.allowables || []), newAllowable] }).eq('id', parentId);
                        }
                    } else if (parentType === 'layup') {
                        set(state => ({
                            layups: state.layups.map(l =>
                                l.id === parentId ? { ...l, allowables: [...(l.allowables || []), newAllowable] } : l
                            )
                        }));
                        const current = get().layups.find(l => l.id === parentId);
                        if (current) {
                            await supabase.from(tableName).update({ allowables: [...(current.allowables || []), newAllowable] }).eq('id', parentId);
                        }
                    } else if (parentType === 'assembly') {
                        set(state => ({
                            assemblies: state.assemblies.map(a =>
                                a.id === parentId ? { ...a, allowables: [...(a.allowables || []), newAllowable] } : a
                            )
                        }));
                        const current = get().assemblies.find(a => a.id === parentId);
                        if (current) {
                            await supabase.from(tableName).update({ allowables: [...(current.allowables || []), newAllowable] }).eq('id', parentId);
                        }
                    }

                } catch (e: any) {
                    set({ error: e.message });
                } finally {
                    set({ isLoading: false });
                }
            },

            fetchAllowables: async (_parentId, _parentType) => {
                // Usually fetched with parent entity. If needed standalone, impl here.
                // For now, assuming load-on-init of parent entity logic is sufficient.
            },

            deleteAllowable: async (id, parentId, parentType) => {
                set({ isLoading: true });
                try {
                    let tableName = 'materials';
                    if (parentType === 'layup') tableName = 'layups';
                    if (parentType === 'assembly') tableName = 'assemblies';

                    if (parentType === 'material') {
                        set(state => ({
                            materials: state.materials.map(m =>
                                m.id === parentId ? { ...m, allowables: (m.allowables || []).filter(a => a.id !== id) } : m
                            )
                        }));
                        const current = get().materials.find(m => m.id === parentId);
                        if (current) {
                            const filtered = (current.allowables || []).filter(a => a.id !== id);
                            await supabase.from(tableName).update({ allowables: filtered }).eq('id', parentId);
                        }
                    } else if (parentType === 'layup') {
                        set(state => ({
                            layups: state.layups.map(l =>
                                l.id === parentId ? { ...l, allowables: (l.allowables || []).filter(a => a.id !== id) } : l
                            )
                        }));
                        const current = get().layups.find(l => l.id === parentId);
                        if (current) {
                            const filtered = (current.allowables || []).filter(a => a.id !== id);
                            await supabase.from(tableName).update({ allowables: filtered }).eq('id', parentId);
                        }
                    } else if (parentType === 'assembly') {
                        set(state => ({
                            assemblies: state.assemblies.map(a =>
                                a.id === parentId ? { ...a, allowables: (a.allowables || []).filter(a => a.id !== id) } : a
                            )
                        }));
                        const current = get().assemblies.find(a => a.id === parentId);
                        if (current) {
                            const filtered = (current.allowables || []).filter(a => a.id !== id);
                            await supabase.from(tableName).update({ allowables: filtered }).eq('id', parentId);
                        }
                    }

                } catch (e: any) {
                    set({ error: e.message });
                } finally {
                    set({ isLoading: false });
                }
            },

            // Assembly Logic - Init
            // Removed stub, implementation is below

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
                            assignedProfileIds: m.assigned_profile_ids || [],
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

                        // Internal fields to exclude
                        _allowables,

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

                    // Handle assignedProfileIds
                    if (assignedProfileIds) {
                        (dbUpdates as any).assigned_profile_ids = assignedProfileIds;
                    }

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
                            // Map DB snake_case to Domain camelCase
                            processId: l.process_id,
                            totalThickness: l.total_thickness,
                            totalWeight: l.total_weight,
                            restrictionReason: l.restriction_reason,
                            properties: l.properties || [], // Map properties column
                            previousVersionId: l.previous_version_id,
                            createdBy: l.created_by,

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

                // Map snake_case to camelCase
                return data.map((l: any) => ({
                    ...l,
                    processId: l.process_id,
                    totalThickness: l.total_thickness,
                    totalWeight: l.total_weight,
                    restrictionReason: l.restriction_reason,
                    previousVersionId: l.previous_version_id,
                    createdBy: l.created_by,
                })) as Layup[];
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
                    if (rest.properties !== undefined) dbUpdates.properties = rest.properties;

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
            // Assembly Logic
            fetchAssemblies: async () => {
                set({ isLoading: true });
                try {
                    // 1. Fetch Assemblies
                    const { data: assembliesData, error: assembliesError } = await supabase.from('assemblies').select('*');
                    if (assembliesError) throw assembliesError;

                    // 2. Fetch Components
                    const { data: componentsData, error: componentsError } = await supabase.from('assembly_components').select('*');
                    if (componentsError) console.warn("Error fetching assembly components:", componentsError);

                    // 3. Map
                    const assemblies: Assembly[] = assembliesData.map((a: any) => {
                        const associatedComponents = componentsData?.filter((c: any) => c.assembly_id === a.id) || [];

                        return {
                            id: a.id,
                            name: a.name,
                            description: a.description,
                            status: a.status,
                            version: a.version,
                            createdAt: a.created_at,

                            // New Fields
                            processIds: a.process_ids || [],
                            properties: a.properties || [], // JSONB
                            assignedProfileIds: a.assigned_profile_ids || [],
                            allowables: a.allowables || [], // JSONB
                            measurements: [], // Fetch separately or leave empty for list view?

                            components: associatedComponents.map((c: any) => ({
                                id: c.id,
                                componentType: c.component_type, // 'layup' | 'material'
                                componentId: c.component_id,
                                componentName: "Loading...", // Will need to resolve this against materials/layups stores
                                quantity: c.quantity,
                                sequence: c.sequence || 0,
                                position: c.position,
                                config: c.config
                            })).sort((x: any, y: any) => x.sequence - y.sequence)
                        };
                    });

                    // Resolve component names?
                    // It's better to do this in the Component/Page or resolve once here against current store state?
                    // Doing it here might be tricky if materials/layups aren't loaded yet.
                    // But usually, we might need to rely on IDs in the pages.

                    set({ assemblies });
                } catch (e: any) {
                    set({ error: e.message });
                } finally {
                    set({ isLoading: false });
                }
            },

            addAssembly: async (assembly, components) => {
                set({ isLoading: true });
                try {
                    const {
                        processIds,
                        properties,
                        assignedProfileIds,
                        allowables,
                        // Exclude non-db fields
                        components: _c,
                        measurements: _m,
                        ...rest
                    } = assembly as any;

                    const dbPayload = {
                        name: rest.name,
                        description: rest.description,
                        status: rest.status,
                        version: rest.version,
                        process_ids: processIds,
                        properties: properties,
                        assigned_profile_ids: assignedProfileIds,
                        allowables: allowables
                    };

                    const { data: asm, error: asmError } = await supabase
                        .from('assemblies')
                        .insert(dbPayload)
                        .select()
                        .single();
                    if (asmError) throw asmError;

                    if (components && components.length > 0) {
                        const compsToInsert = components.map((c: any, index: number) => ({
                            assembly_id: asm.id,
                            component_type: c.componentType,
                            component_id: c.componentId,
                            quantity: c.quantity,
                            sequence: index + 1, // Auto-sequence
                            position: c.position,
                            config: c.config
                        }));

                        const { error: compError } = await supabase
                            .from('assembly_components')
                            .insert(compsToInsert);

                        if (compError) throw compError;
                    }

                    // For local update, we construct the object
                    const newAssembly: Assembly = {
                        ...assembly as Assembly,
                        id: asm.id,
                        createdAt: asm.created_at,
                        components: components as any, // Cast
                        processIds: processIds || [],
                        properties: properties || [],
                        measurements: []
                    };

                    set((state) => ({ assemblies: [...state.assemblies, newAssembly] }));
                } catch (e: any) {
                    set({ error: e.message });
                } finally {
                    set({ isLoading: false });
                }
            },

            updateAssembly: async (id, updates) => {
                set({ isLoading: true });
                try {
                    // Unpack special fields
                    // Note: Updating components is complex (delete/re-insert or diff). 
                    // For now, if components are passed, we might warn or handle fully replacment.
                    // This mvp implementation will focus on updating scalar fields + simple JSONB.
                    // If components need update, we likely need a separate action or specialized logic here.

                    const {
                        processIds,
                        properties,
                        assignedProfileIds,
                        allowables,
                        components, // If passed, we might need to handle stack update
                        ...rest
                    } = updates as any;

                    const dbUpdates: any = {};
                    if (rest.name) dbUpdates.name = rest.name;
                    if (rest.description) dbUpdates.description = rest.description;
                    if (rest.status) dbUpdates.status = rest.status;
                    if (rest.version) dbUpdates.version = rest.version;

                    if (processIds) dbUpdates.process_ids = processIds;
                    if (properties) dbUpdates.properties = properties;
                    if (assignedProfileIds) dbUpdates.assigned_profile_ids = assignedProfileIds;
                    if (allowables) dbUpdates.allowables = allowables;

                    // 1. Update Assembly Table
                    if (Object.keys(dbUpdates).length > 0) {
                        const { error } = await supabase.from('assemblies').update(dbUpdates).eq('id', id);
                        if (error) throw error;
                    }

                    // 2. Handle Components Update (Full Replace for simplicity if provided)
                    if (components) {
                        // A. Delete existing
                        await supabase.from('assembly_components').delete().eq('assembly_id', id);

                        // B. Insert new
                        const compsToInsert = components.map((c: any, index: number) => ({
                            assembly_id: id,
                            component_type: c.componentType,
                            component_id: c.componentId,
                            quantity: c.quantity,
                            sequence: index + 1,
                            position: c.position
                        }));

                        const { error: compError } = await supabase.from('assembly_components').insert(compsToInsert);
                        if (compError) throw compError;
                    }

                    // 3. Update Local State
                    set(state => ({
                        assemblies: state.assemblies.map(a => a.id === id ? { ...a, ...updates } : a)
                    }));

                } catch (e: any) {
                    set({ error: e.message });
                } finally {
                    set({ isLoading: false });
                }
            },

            // Quality Logic
            fetchProperties: async () => {
                set({ isLoading: true });
                try {
                    const { data, error } = await supabase.from('property_definitions').select('*');

                    if (error) {
                        // Fallback to mock if table doesn't exist?
                        // Or throw log?
                        console.warn("Error fetching properties from DB:", error);
                        // Don't throw for now to keep mock data if DB fails
                    }

                    if (data && data.length > 0) {
                        const properties = data.map((p: any) => ({
                            ...p,
                            dataType: p.data_type,
                            testMethods: p.test_methods,
                            statsConfig: p.stats_config,
                            inputStructure: p.input_structure
                        }));

                        // Check if standard properties are present (heuristic)
                        const hasStandard = properties.some(p => p.name === "Tensile Strength (0°)");

                        if (!hasStandard) {
                            console.log("Standard properties missing. Seeding...");
                            await get().seedStandardProperties();
                            // Fetch again
                            const { data: newData } = await supabase.from('property_definitions').select('*');
                            if (newData) {
                                const newProps = newData.map((p: any) => ({
                                    ...p,
                                    dataType: p.data_type,
                                    testMethods: p.test_methods,
                                    statsConfig: p.stats_config,
                                    inputStructure: p.input_structure
                                }));
                                set({ properties: newProps });
                            }
                        } else {
                            set({ properties });
                        }
                    } else {
                        // Auto-seed if completely empty
                        console.log("Database empty. Seeding standard properties...");
                        await get().seedStandardProperties();
                        // Fetch again
                        const { data: newData } = await supabase.from('property_definitions').select('*');
                        if (newData) {
                            const properties = newData.map((p: any) => ({
                                ...p,
                                dataType: p.data_type,
                                testMethods: p.test_methods,
                                statsConfig: p.stats_config,
                                inputStructure: p.input_structure
                            }));
                            set({ properties });
                        }
                    }
                } catch (e: any) {
                    set({ error: e.message });
                } finally {
                    set({ isLoading: false });
                }
            },

            addProperty: async (property) => {
                set({ isLoading: true });
                try {
                    const dbPayload = {
                        name: property.name,
                        unit: property.unit,
                        data_type: property.dataType,
                        test_methods: property.testMethods,
                        category: property.category,
                        options: property.options,
                        stats_config: property.statsConfig,
                        input_structure: property.inputStructure
                    };

                    const { data, error } = await supabase.from('property_definitions').insert(dbPayload).select().single();
                    if (error) throw error;

                    const newProp: PropertyDefinition = {
                        ...property,
                        id: data.id,
                        inputStructure: data.input_structure
                    } as PropertyDefinition;

                    set(state => ({ properties: [...state.properties, newProp] }));
                } catch (e: any) {
                    set({ error: e.message });
                    console.error("Add Property Failed:", e);
                    throw e;
                } finally {
                    set({ isLoading: false });
                }
            },

            updateProperty: async (id, updates) => {
                set({ isLoading: true });
                try {
                    const dbUpdates: any = {};
                    if (updates.name) dbUpdates.name = updates.name;
                    if (updates.unit) dbUpdates.unit = updates.unit;
                    if (updates.dataType) dbUpdates.data_type = updates.dataType;
                    if (updates.inputStructure) dbUpdates.input_structure = updates.inputStructure;
                    if (updates.category) dbUpdates.category = updates.category;
                    if (updates.testMethods) dbUpdates.test_methods = updates.testMethods;
                    if (updates.options) dbUpdates.options = updates.options;
                    if (updates.statsConfig) dbUpdates.stats_config = updates.statsConfig;

                    const { error } = await supabase.from('property_definitions').update(dbUpdates).eq('id', id);
                    if (error) throw error;

                    set(state => ({
                        properties: state.properties.map(p =>
                            p.id === id ? { ...p, ...updates } : p
                        )
                    }));
                } catch (e: any) {
                    set({ error: e.message });
                    console.error("Update Property Failed:", e);
                    throw e;
                } finally {
                    set({ isLoading: false });
                }
            },

            deleteProperty: async (id) => {
                set({ isLoading: true });
                try {
                    const { error } = await supabase.from('property_definitions').delete().eq('id', id);
                    if (error) throw error;
                    set((state) => ({
                        properties: state.properties.filter((p) => p.id !== id),
                    }));
                } catch (e: any) {
                    set({ error: e.message });
                    console.error("Delete Property Failed:", e);
                    throw e;
                } finally {
                    set({ isLoading: false });
                }
            },

            seedStandardProperties: async (options?: { suffix?: string }) => {
                // Standard Aerospace Properties
                const suffix = options?.suffix ? ` ${options.suffix}` : "";

                const baseProps: Omit<PropertyDefinition, 'id'>[] = [
                    // Mechanical - 0°
                    { name: "Tensile Strength (0°)", unit: "MPa", dataType: "numeric", category: "mechanical", inputStructure: "min-mean-max", testMethods: ["ISO 527-4", "ASTM D3039"] },
                    { name: "Tensile Modulus (0°)", unit: "GPa", dataType: "numeric", category: "mechanical", inputStructure: "min-mean-max", testMethods: ["ISO 527-4", "ASTM D3039"] },
                    { name: "Tensile Strain (0°)", unit: "%", dataType: "numeric", category: "mechanical", inputStructure: "min-mean-max", testMethods: ["ISO 527-4"] },
                    // Mechanical - 90°
                    { name: "Tensile Strength (90°)", unit: "MPa", dataType: "numeric", category: "mechanical", inputStructure: "min-mean-max", testMethods: ["ISO 527-4", "ASTM D3039"] },
                    { name: "Tensile Modulus (90°)", unit: "GPa", dataType: "numeric", category: "mechanical", inputStructure: "min-mean-max", testMethods: ["ISO 527-4"] },
                    // Compression
                    { name: "Compression Strength (0°)", unit: "MPa", dataType: "numeric", category: "mechanical", inputStructure: "min-mean-max", testMethods: ["ISO 14126", "ASTM D6641"] },
                    { name: "Compression Modulus (0°)", unit: "GPa", dataType: "numeric", category: "mechanical", inputStructure: "min-mean-max", testMethods: ["ISO 14126"] },
                    // Shear
                    { name: "In-Plane Shear Strength", unit: "MPa", dataType: "numeric", category: "mechanical", inputStructure: "min-mean-max", testMethods: ["ISO 14129", "ASTM D3518"] },
                    { name: "ILSS (Interlaminar Shear)", unit: "MPa", dataType: "numeric", category: "mechanical", inputStructure: "min-mean-max", testMethods: ["ISO 14130", "ASTM D2344"] },

                    // Physical
                    { name: "Density", unit: "g/cm³", dataType: "numeric", category: "physical", inputStructure: "single", testMethods: ["ISO 1183", "ASTM D792"] },
                    { name: "Fiber Volume Content", unit: "%Vol", dataType: "numeric", category: "physical", inputStructure: "single", testMethods: ["ISO 1172", "ASTM D3171"] },
                    { name: "Resin Content", unit: "%Wt", dataType: "numeric", category: "physical", inputStructure: "single", testMethods: ["ISO 1172"] },
                    { name: "Void Content", unit: "%", dataType: "numeric", category: "physical", inputStructure: "single", testMethods: ["ASTM D2734"] },
                    { name: "Glass Transition Temp (Tg) Onset", unit: "°C", dataType: "numeric", category: "physical", inputStructure: "single", testMethods: ["ISO 11357", "ASTM D7028"] },

                    // Fire / FST (Flammability, Smoke, Toxicity)
                    { name: "Flammability (Vertical 60s)", unit: "mm", dataType: "numeric", category: "chemical", inputStructure: "single", testMethods: ["ISO 3795", "FAR 25.853"] },
                    { name: "Flammability (Vertical 12s)", unit: "mm", dataType: "numeric", category: "chemical", inputStructure: "single", testMethods: ["FAR 25.853"] },
                    { name: "Heat Release (Peak)", unit: "kW/m²", dataType: "numeric", category: "chemical", inputStructure: "single", testMethods: ["OSU", "FAR 25.853"] },
                    { name: "Heat Release (Total)", unit: "kWmin/m²", dataType: "numeric", category: "chemical", inputStructure: "single", testMethods: ["OSU", "FAR 25.853"] },
                    { name: "Smoke Density (Ds max)", unit: "", dataType: "numeric", category: "chemical", inputStructure: "single", testMethods: ["NBS", "ASTM E662"] },
                    { name: "Toxicity (HCN)", unit: "ppm", dataType: "numeric", category: "chemical", inputStructure: "single", testMethods: ["AITM 3.0005"] },
                    { name: "Toxicity (CO)", unit: "ppm", dataType: "numeric", category: "chemical", inputStructure: "single", testMethods: ["AITM 3.0005"] },
                    { name: "Toxicity (NOx)", unit: "ppm", dataType: "numeric", category: "chemical", inputStructure: "single", testMethods: ["AITM 3.0005"] },
                    { name: "Toxicity (SO2)", unit: "ppm", dataType: "numeric", category: "chemical", inputStructure: "single", testMethods: ["AITM 3.0005"] },
                    { name: "Toxicity (HF)", unit: "ppm", dataType: "numeric", category: "chemical", inputStructure: "single", testMethods: ["AITM 3.0005"] },
                    { name: "Toxicity (HCl)", unit: "ppm", dataType: "numeric", category: "chemical", inputStructure: "single", testMethods: ["AITM 3.0005"] }
                ];

                const standardProps = baseProps.map(p => ({
                    ...p,
                    name: p.name + suffix
                }));

                const { data: existing } = await supabase.from('property_definitions').select('name');
                const existingNames = new Set(existing?.map(e => e.name) || []);

                const toInsert = standardProps.filter(p => !existingNames.has(p.name));

                if (toInsert.length === 0) {
                    if (!suffix) {
                        throw new Error("Standard properties already exist (but might be hidden). Use suffix to force create.");
                    }
                    console.log("All standard properties already exist.");
                    return;
                }

                const payload = toInsert.map(p => ({
                    id: uuidv4(),
                    name: p.name,
                    unit: p.unit,
                    category: p.category,
                    data_type: p.dataType,
                    test_methods: p.testMethods,
                    input_structure: p.inputStructure
                }));

                const { error } = await supabase.from('property_definitions').insert(payload);
                if (error) {
                    console.error("Failed to seed properties:", error);
                    set({ error: "Failed to seed: " + error.message });
                    throw error;
                } else {
                    console.log(`Successfully seeded ${toInsert.length} standard properties.`);
                }
            },

            fetchRequirementProfiles: async () => {
                set({ isLoading: true });
                try {
                    const { data, error } = await supabase.from('requirement_profiles').select('*');

                    if (error) {
                        console.warn("Error fetching profiles:", error);
                        // fallback mock data logic if table missing? 
                        // For now assuming migration ran or ignore.
                    }

                    if (data && data.length > 0) {
                        const profiles: RequirementProfile[] = data.map((p: any) => ({
                            id: p.id,
                            name: p.name,
                            description: p.description,
                            rules: p.rules || [], // usage of jsonb
                            applicability: p.applicability || [],
                            document: p.document // JSONB or column
                        }));
                        set({ requirementProfiles: profiles });
                    } else if (get().requirementProfiles.length === 0) {
                        // Fallback Mock if DB empty
                        const mockProfiles: RequirementProfile[] = [
                            {
                                id: 'rp1',
                                name: 'Airbus A350 Interior',
                                description: 'Standard interior components spec',
                                rules: [
                                    { propertyId: 'p1', min: 500 },
                                    { propertyId: 'p2', max: 1.5 },
                                ],
                                applicability: ['material:Core Material', 'layup']
                            }
                        ];
                        set({ requirementProfiles: mockProfiles });
                    }
                } catch (e: any) {
                    set({ error: e.message });
                } finally {
                    set({ isLoading: false });
                }
            },

            addRequirementProfile: async (profile) => {
                set({ isLoading: true });
                try {
                    const dbPayload = {
                        name: profile.name,
                        description: profile.description,
                        rules: profile.rules,
                        applicability: profile.applicability,
                        document: profile.document
                    };
                    const { data, error } = await supabase.from('requirement_profiles').insert(dbPayload).select().single();
                    if (error) throw error;

                    const newProfile = { ...profile, id: data.id };
                    set(state => ({ requirementProfiles: [...state.requirementProfiles, newProfile] }));
                } catch (e: any) {
                    set({ error: e.message });
                } finally {
                    set({ isLoading: false });
                }
            },

            updateRequirementProfile: async (id, updates) => {
                set({ isLoading: true });
                try {
                    const dbUpdates: any = {};
                    if (updates.name) dbUpdates.name = updates.name;
                    if (updates.description) dbUpdates.description = updates.description;
                    if (updates.rules) dbUpdates.rules = updates.rules;
                    if (updates.applicability) dbUpdates.applicability = updates.applicability;
                    if (updates.document) dbUpdates.document = updates.document;

                    const { error } = await supabase.from('requirement_profiles').update(dbUpdates).eq('id', id);
                    if (error) throw error;

                    set(state => ({
                        requirementProfiles: state.requirementProfiles.map(p => p.id === id ? { ...p, ...updates } : p)
                    }));
                } catch (e: any) {
                    set({ error: e.message });
                } finally {
                    set({ isLoading: false });
                }
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
                            orderNumber: params.orderNumber || "", // Retrieve from JSONB
                            referenceNumber: params.referenceNumber || "", // Retrieve from JSONB
                            comment: params.comment || "", // Retrieve from JSONB
                            layupId: m.layup_id || params.layupId, // Prefer DB col, fallback to JSONB
                            assemblyId: params.assemblyId, // JSONB Only (safe bet)
                            values: rawValues,
                            resultValue: m.value,
                            statistics: stats,
                            processParams: params, // Keep original
                            isActive: params.isActive !== undefined ? params.isActive : true
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
                        orderNumber: measurement.orderNumber, // Fallback storage
                        referenceNumber: measurement.referenceNumber, // Fallback storage
                        comment: measurement.comment, // Fallback storage
                        layupId: measurement.layupId,         // Fallback storage (if needed)
                        assemblyId: measurement.assemblyId,   // Fallback storage
                        _raw_values: measurement.values,
                        _statistics: measurement.statistics,
                        isActive: measurement.isActive !== undefined ? measurement.isActive : true
                    };

                    const dbPayload = {
                        material_id: measurement.materialId,
                        property_definition_id: measurement.propertyDefinitionId,
                        // order_number removed - missing in DB
                        // layup_id & assembly_id: Try to send if present, but also pack them just in case
                        // layup_id: measurement.layupId,
                        // assembly_id: measurement.assemblyId, // Commented out to avoid 400 if column missing. Rely on fallback.
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

            updateMeasurement: async (id, updates) => {
                set({ isLoading: true });
                try {
                    const state = get();
                    const current = state.measurements.find(m => m.id === id);
                    if (!current) throw new Error("Measurement not found");

                    // We store most metadata in process_params JSONB
                    // Merge updates into processParams
                    const currentParams = current.processParams || {};
                    const newParams = { ...currentParams };

                    if (updates.isActive !== undefined) newParams.isActive = updates.isActive;
                    // Add other fields if needed

                    const dbUpdates: any = {};
                    if (updates.resultValue !== undefined) dbUpdates.value = updates.resultValue;
                    if (updates.unit !== undefined) dbUpdates.unit = updates.unit;
                    if (updates.testMethod !== undefined) dbUpdates.test_method = updates.testMethod;

                    // Always update process_params if we touched metadata
                    dbUpdates.process_params = newParams;

                    const { error } = await supabase.from('measurements').update(dbUpdates).eq('id', id);
                    if (error) throw error;

                    set(state => ({
                        measurements: state.measurements.map(m =>
                            m.id === id ? { ...m, ...updates, processParams: newParams } : m
                        )
                    }));
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

            // --- Test Methods ---
            fetchTestMethods: async () => {
                const { data, error } = await supabase.from('test_methods').select('*');
                if (error) throw error;
                // Map DB snake_case to Domain camelCase
                // We prefer 'properties' (JSONB). If not present, fallback to 'property_ids' mapping (Migration compat).
                const methods = data.map((m: any) => ({
                    id: m.id,
                    name: m.name,
                    description: m.description,
                    properties: (m.properties && Array.isArray(m.properties) && m.properties.length > 0)
                        ? m.properties
                        : (m.property_ids || []).map((id: string) => ({ propertyId: id, statsTypes: ['mean', 'range'] }))
                }));
                set({ testMethods: methods || [] });
            },

            addTestMethod: async (method) => {
                const newMethodId = crypto.randomUUID();
                const dbPayload = {
                    id: newMethodId,
                    name: method.name,
                    description: method.description,
                    properties: method.properties
                };
                const { error } = await supabase.from('test_methods').insert(dbPayload);
                if (error) throw error;

                const newMethod: TestMethod = { ...method, id: newMethodId };
                set(state => ({ testMethods: [...state.testMethods, newMethod] }));
            },

            updateTestMethod: async (id, updates) => {
                const dbUpdates: any = {};
                if (updates.name) dbUpdates.name = updates.name;
                if (updates.description) dbUpdates.description = updates.description;
                if (updates.properties) dbUpdates.properties = updates.properties;

                const { error } = await supabase.from('test_methods').update(dbUpdates).eq('id', id);
                if (error) throw error;

                set(state => ({
                    testMethods: state.testMethods.map(m => m.id === id ? { ...m, ...updates } : m)
                }));
            },

            deleteTestMethod: async (id) => {
                const { error } = await supabase.from('test_methods').delete().eq('id', id);
                if (error) throw error;
                set(state => ({
                    testMethods: state.testMethods.filter(m => m.id !== id)
                }));
            },

            seedStandardTestMethods: async () => {
                const { properties, testMethods } = get();
                if (properties.length === 0) throw new Error("Please seed Properties first.");

                const methodsToSeed = [
                    {
                        name: "ISO 527-4",
                        description: "Tensile Properties of Composites",
                        propertyNames: ["Tensile Strength (0°)", "Tensile Modulus (0°)", "Poisson Ratio"]
                    },
                    {
                        name: "ISO 14125",
                        description: "Flexural Properties",
                        propertyNames: ["Flexural Strength", "Flexural Modulus"]
                    },
                    {
                        name: "ISO 14129",
                        description: "In-Plane Shear (±45°)",
                        propertyNames: ["In-Plane Shear Strength", "In-Plane Shear Modulus"]
                    },
                    {
                        name: "DIN EN 6043",
                        description: "Interlaminar Shear Strength (ILSS)",
                        propertyNames: ["ILSS"]
                    },
                    {
                        name: "ISO 1183-1",
                        description: "Density (Method A)",
                        propertyNames: ["Density"]
                    },
                    {
                        name: "ISO 11357-2",
                        description: "DSC - Glass Transition Temperature",
                        propertyNames: ["Tg (Onset)", "Tg (Midpoint)"]
                    },
                    {
                        name: "FAR 25.853 (a) App. F Pt I",
                        description: "Vertical Bunsen Burner Test (60s/12s)",
                        propertyNames: ["Burn Length", "After Flame Time", "Drip Flame Time"]
                    },
                    {
                        name: "ABD0031",
                        description: "Fire, Smoke, and Toxicity",
                        propertyNames: ["Heat Release (Peak)", "Heat Release (Total)", "Smoke Density (Ds max)", "Toxicity (Gas Component)"]
                    }
                ];

                for (const tm of methodsToSeed) {
                    if (testMethods.some(m => m.name === tm.name)) continue;

                    // Map names to IDs with default Config
                    const methodProperties = tm.propertyNames.map(name => {
                        const prop = properties.find(p => p.name === name);
                        if (!prop) return null;
                        return { propertyId: prop.id, statsType: 'basic' } as const;
                    }).filter(Boolean) as any[];

                    await get().addTestMethod({
                        name: tm.name,
                        description: tm.description,
                        properties: methodProperties
                    });
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
            },

            // Specification Actions
            fetchSpecifications: async (entityId, entityType = 'material') => {
                set({ isLoading: true });
                try {
                    let query = supabase.from('material_specifications').select('*');

                    if (entityType === 'material') query = query.eq('material_id', entityId);
                    else if (entityType === 'layup') query = query.eq('layup_id', entityId);
                    else if (entityType === 'assembly') query = query.eq('assembly_id', entityId);

                    const { data, error } = await query;

                    if (error) throw error;

                    const mapped = data.map((d: any) => ({
                        id: d.id,
                        materialId: d.material_id,
                        layupId: d.layup_id,
                        assemblyId: d.assembly_id,
                        name: d.name,
                        code: d.code,
                        description: d.description,
                        revision: d.revision,
                        status: d.status,
                        validFrom: d.valid_from,
                        documentUrl: d.document_url,
                        createdAt: d.created_at
                    }));
                    set({ specifications: mapped });
                } catch (e: any) {
                    console.warn("Fetch Specifications failed:", e);
                } finally {
                    set({ isLoading: false });
                }
            },

            addSpecification: async (spec) => {
                set({ isLoading: true });
                try {
                    const newId = spec.id || uuidv4();
                    const dbPayload = {
                        id: newId,
                        material_id: spec.materialId,
                        layup_id: spec.layupId,
                        assembly_id: spec.assemblyId,
                        name: spec.name,
                        code: spec.code,
                        description: spec.description,
                        revision: spec.revision,
                        status: spec.status,
                        valid_from: spec.validFrom,
                        document_url: spec.documentUrl
                    };

                    // Optimistic update
                    const newSpec: MaterialSpecification = {
                        ...spec,
                        id: newId,
                        createdAt: new Date().toISOString()
                    };

                    set(state => ({ specifications: [...state.specifications, newSpec] }));

                    const { error } = await supabase.from('material_specifications').insert(dbPayload);
                    if (error) {
                        console.warn("DB Insert Specification failed:", error);
                    }
                } catch (e: any) {
                    console.error("Add Spec failed:", e);
                } finally {
                    set({ isLoading: false });
                }
            },

            deleteSpecification: async (id) => {
                set({ isLoading: true });
                try {
                    set(state => ({ specifications: state.specifications.filter(s => s.id !== id) }));
                    await supabase.from('material_specifications').delete().eq('id', id);
                } catch (e) {
                    console.error("Delete Spec failed", e);
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
                materialTypes: state.materialTypes,
                specifications: state.specifications
            }),
        }
    )
);
