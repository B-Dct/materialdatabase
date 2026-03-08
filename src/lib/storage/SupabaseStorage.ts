import { supabase } from '../supabase';
import type { StorageRepository, MaterialUsageRecord } from './types';
import type {
    Material,
    Layup,
    Assembly,
    MaterialVariant,
    PropertyDefinition,
    RequirementProfile,
    Laboratory,
    Measurement,
    ManufacturingProcess,
    Allowable,
    AssemblyComponent,
    MaterialSpecification,
    TestMethod,
    EntityHistory,

    StandardPart,
    MaterialTypeDefinition,
    Project,
    ProjectWorkPackage,
    ProjectMaterialList,
    ProjectProcessList,
    WorkPackageRevision,
    AssignableEntityType,
    ProductionSite
} from '@/types/domain';
import { v4 as uuidv4 } from 'uuid';

export class SupabaseStorage implements StorageRepository {

    // --- Materials ---

    async getMaterials(): Promise<Material[]> {
        const { data, error } = await supabase
            .from('materials')
            .select('*, variants:material_variants(*)');

        if (error) throw error;

        return data.map((m: any) => {
            let unpacked: any = {};
            let materialProperties: any[] = [];

            if (m.properties && !Array.isArray(m.properties) && m.properties.customProperties) {
                const { customProperties, ...rest } = m.properties;
                unpacked = rest;
                materialProperties = customProperties || [];
            } else {
                materialProperties = Array.isArray(m.properties) ? m.properties : [];
            }

            return {
                ...m,
                ...unpacked,
                variants: (m.variants || []).map((v: any) => ({
                    ...v,
                    id: v.variant_id,
                    variantId: v.properties?.code || v.variant_name,
                    baseMaterialId: v.base_material_id,
                    variantName: v.variant_name,
                    description: v.properties?.description,
                    properties: v.properties || {}
                })),
                properties: materialProperties,
                assignedProfileIds: m.assigned_profile_ids || [],
                assignedReferenceLayupIds: m.assigned_reference_layup_ids || [],
                assignedReferenceAssemblyIds: m.assigned_reference_assembly_ids || [],
                allowables: m.properties?._allowables || [],
                projectIds: m.properties?._projectIds || []
            };
        });
    }

    async createMaterial(material: Omit<Material, 'id' | 'createdAt' | 'updatedAt'>): Promise<Material> {
        const {
            materialId,
            materialListNumber,
            manufacturerAddress,
            supplier,
            reachStatus,
            maturityLevel,
            properties,
            variants, // Exclude
            assignedReferenceLayupIds,
            assignedReferenceAssemblyIds,
            allowables,
            measurements, // Exclude
            documents, // Exclude
            projectIds, // Exclude from SQL payload
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
            _allowables: material.allowables || [],
            _projectIds: projectIds || []
        };

        const dbPayload = {
            ...baseMaterial,
            properties: packedProperties,
            assigned_reference_layup_ids: assignedReferenceLayupIds,
            assigned_reference_assembly_ids: assignedReferenceAssemblyIds
        };

        const { data: matData, error: matError } = await supabase.from('materials').insert(dbPayload).select().single();
        if (matError) throw matError;

        // Create Default Variant
        const { data: varData, error: varError } = await supabase.from('material_variants').insert({
            base_material_id: matData.id,
            variant_name: "Standard",
        }).select().single();

        if (varError) console.error("Failed to create default variant:", varError);

        return {
            ...matData,
            materialId,
            materialListNumber,
            manufacturerAddress,
            supplier,
            reachStatus,
            maturityLevel,
            properties: properties || [],
            assignedReferenceLayupIds,
            assignedReferenceAssemblyIds,
            variants: varData ? [{
                ...varData,
                id: varData.variant_id,
                variantId: varData.properties?.code || varData.variant_name,
                baseMaterialId: varData.base_material_id,
                variantName: varData.variant_name,
                description: varData.properties?.description,
                properties: varData.properties || {}
            } as MaterialVariant] : [],
            allowables: material.allowables || [],
            projectIds: projectIds || []
        } as Material;
    }

    async updateMaterial(id: string, updates: Partial<Material>): Promise<void> {
        const {
            assignedProfileIds,
            assignedReferenceLayupIds,
            assignedReferenceAssemblyIds,
            variants,
            allowables,
            measurements,
            documents,
            properties,
            createdAt,
            updatedAt,
            id: _id,
            _allowables, // Internal
            // Fields to pack
            materialId,
            materialListNumber,
            manufacturerAddress,
            supplier,
            reachStatus,
            maturityLevel,
            projectIds, // Exclude from SQL payload
            ...dbUpdates
        } = updates as any;


        let current: any = {};
        if (materialId === undefined || properties === undefined) {
            const { data } = await supabase.from('materials').select('properties').eq('id', id).single();
            current = data?.properties || {};
        }

        const packedProperties = {
            customProperties: properties !== undefined ? properties : current.customProperties,
            materialId: materialId !== undefined ? materialId : current.materialId,
            materialListNumber: materialListNumber !== undefined ? materialListNumber : current.materialListNumber,
            manufacturerAddress: manufacturerAddress !== undefined ? manufacturerAddress : current.manufacturerAddress,
            supplier: supplier !== undefined ? supplier : current.supplier,
            reachStatus: reachStatus !== undefined ? reachStatus : current.reachStatus,
            maturityLevel: maturityLevel !== undefined ? maturityLevel : current.maturityLevel,
            _allowables: allowables !== undefined ? allowables : (current._allowables || []),
            _projectIds: projectIds !== undefined ? projectIds : (current._projectIds || [])
        };

        (dbUpdates as any).properties = packedProperties;

        if (assignedProfileIds) {
            (dbUpdates as any).assigned_profile_ids = assignedProfileIds;
        }
        if (assignedReferenceLayupIds) {
            (dbUpdates as any).assigned_reference_layup_ids = assignedReferenceLayupIds;
        }
        if (assignedReferenceAssemblyIds) {
            (dbUpdates as any).assigned_reference_assembly_ids = assignedReferenceAssemblyIds;
        }

        if (Object.keys(dbUpdates).length > 0) {
            const { error } = await supabase.from('materials').update(dbUpdates).eq('id', id);
            if (error) throw error;
        }
    }

    async deleteMaterial(id: string): Promise<void> {
        // Validation: Verify existence first
        const { data: material, error: fetchError } = await supabase.from('materials').select('id').eq('id', id).single();
        if (fetchError || !material) throw new Error(`Material not found: ${id}`);

        // 1. Delete Allowables linked to variants
        // First get variants
        const { data: variants } = await supabase.from('material_variants').select('id').eq('base_material_id', id);
        const variantIds = variants?.map(v => v.id) || [];

        if (variantIds.length > 0) {
            // Delete Allowables
            const { error: allowError } = await supabase.from('material_allowables').delete().in('material_variant_id', variantIds);
            if (allowError) throw allowError;

            // Delete Measurements
            const { error: measError } = await supabase.from('measurements').delete().in('material_variant_id', variantIds);
            if (measError) throw measError;

            // Delete Specifications
            const { error: specError } = await supabase.from('material_specifications').delete().in('material_variant_id', variantIds);
            if (specError) throw specError;

            // Delete Variants
            const { error: varError } = await supabase.from('material_variants').delete().in('base_material_id', [id]);
            if (varError) throw varError;
        }

        // 2. Finally delete the material
        const { error } = await supabase.from('materials').delete().eq('id', id);
        if (error) throw error;
    }

    // --- Variants ---

    async createVariant(materialId: string, variant: Omit<MaterialVariant, 'createdAt' | 'updatedAt' | 'baseMaterialId'>): Promise<MaterialVariant> {
        const { data, error } = await supabase.from('material_variants').insert({
            base_material_id: materialId,
            variant_name: variant.variantName,
            properties: {
                ...variant.properties,
                code: variant.variantId,
                description: variant.description
            }
        }).select().single();

        if (error) throw error;

        return {
            ...variant,
            id: data.variant_id,
            baseMaterialId: data.base_material_id,
            createdAt: data.created_at,
            updatedAt: data.updated_at
        } as MaterialVariant;
    }

    async updateVariant(_materialId: string, variantId: string, updates: Partial<MaterialVariant>): Promise<void> {
        const dbUpdates: any = {};
        if (updates.variantName) dbUpdates.variant_name = updates.variantName;

        if (updates.properties || updates.variantId || updates.description) {
            const { data } = await supabase.from('material_variants').select('properties').eq('variant_id', variantId).single();
            const currentProps = data?.properties || {};

            dbUpdates.properties = {
                ...currentProps,
                ...(updates.properties || {}),
                code: updates.variantId !== undefined ? updates.variantId : currentProps.code,
                description: updates.description !== undefined ? updates.description : currentProps.description
            };
        }

        if (Object.keys(dbUpdates).length > 0) {
            const { error } = await supabase.from('material_variants').update(dbUpdates).eq('variant_id', variantId);
            if (error) throw error;
        }
    }

    async deleteVariant(_materialId: string, variantId: string): Promise<void> {
        const { error } = await supabase.from('material_variants').delete().eq('variant_id', variantId);
        if (error) throw error;
    }

    // --- Layups ---

    async getLayups(): Promise<Layup[]> {
        const { data: layupsData, error: layupsError } = await supabase.from('layups').select('*');
        if (layupsError) throw layupsError;

        const { data: layersData, error: layersError } = await supabase.from('layup_layers').select('*');
        if (layersError) console.warn("Error fetching layers:", layersError);

        // Fetch counts/links via lightweight select
        const { data: measurementsData } = await supabase.from('measurements').select('id, layup_id, process_params');

        return layupsData.map((l: any) => {
            const associatedLayers = layersData?.filter((layer: any) => layer.layup_id === l.id) || [];
            const associatedMeasurements = measurementsData?.filter((m: any) => m.layup_id === l.id).map((m: any) => ({
                ...m,
                isActive: m.process_params?.isActive // Map isActive for UI filtering
            })) || [];

            // Extract Allowables and Properties
            let layupProperties = [];
            if (l.properties && !Array.isArray(l.properties) && l.properties.customProperties) {
                layupProperties = l.properties.customProperties;
            } else {
                layupProperties = Array.isArray(l.properties) ? l.properties : [];
            }
            const allowables = l.properties?._allowables || [];

            return {
                ...l,
                id: l.id,
                name: l.name,
                description: l.description,
                status: l.status,
                layers: associatedLayers.map((layer: any) => ({
                    id: layer.id,
                    materialVariantId: layer.material_variant_id,
                    orientation: layer.orientation,
                    sequence: layer.sequence
                })).sort((a: any, b: any) => a.sequence - b.sequence),
                totalThickness: l.total_thickness,
                totalWeight: l.total_weight,
                processId: l.process_id,
                processParams: l.process_params || {},
                measurements: associatedMeasurements as unknown as Measurement[], // Populated separately or optionally
                allowables: allowables,
                properties: layupProperties,
                version: l.version,
                previousVersionId: l.previous_version_id,
                createdAt: l.created_at,
                createdBy: l.created_by,
                restrictionReason: l.restriction_reason,
                assignedProfileIds: l.assigned_profile_ids || [],
                isReference: l.is_reference,
                materialId: l.material_id,
                architectureTypeId: l.architecture_type_id,
                processNumber: l.process_number,
                reference: l.reference,
                initiatingProjectId: l.initiating_project_id,
                productionSiteId: l.production_site_id,
                projectIds: l.properties?._projectIds || []
            };
        });
    }

    async getLayupsByVariant(variantId: string): Promise<Layup[]> {
        const { data, error } = await supabase
            .from('layups')
            .select('*, layup_layers!inner(material_variant_id)')
            .eq('layup_layers.material_variant_id', variantId);

        if (error) {
            console.error("Error fetching usage:", error);
            return [];
        }

        return data.map((l: any) => {
            // Extract Allowables and Properties (Duplicate logic for safety)
            let layupProperties = [];
            if (l.properties && !Array.isArray(l.properties) && l.properties.customProperties) {
                layupProperties = l.properties.customProperties;
            } else {
                layupProperties = Array.isArray(l.properties) ? l.properties : [];
            }

            return {
                ...l,
                processId: l.process_id,
                totalThickness: l.total_thickness,
                totalWeight: l.total_weight,
                restrictionReason: l.restriction_reason,
                previousVersionId: l.previous_version_id,
                createdBy: l.created_by,
                createdAt: l.created_at,
                measurements: [], // Empty for now in this view
                assignedProfileIds: l.assigned_profile_ids || [],
                allowables: l.properties?._allowables || [],
                properties: layupProperties,
                projectIds: l.properties?._projectIds || []
            };
        }) as Layup[];
    }

    async getLayupUsage(layupId: string): Promise<{ assemblyId: string, assemblyName: string }[]> {
        // Find assemblies that use this layup
        const { data, error } = await supabase
            .from('assembly_components')
            .select('assembly_id, assemblies(name)')
            .eq('component_type', 'layup')
            .eq('component_id', layupId);

        if (error) {
            console.error("Error fetching layup usage:", error);
            return [];
        }

        // De-duplicate by assembly ID
        const unique = new Map();
        (data || []).forEach((item: any) => {
            if (item.assembly_id && !unique.has(item.assembly_id)) {
                unique.set(item.assembly_id, {
                    assemblyId: item.assembly_id,
                    assemblyName: item.assemblies?.name || "Unknown Assembly"
                });
            }
        });
        return Array.from(unique.values());
    }

    async createLayup(layup: Omit<Layup, 'id' | 'createdAt' | 'version'>): Promise<Layup> {
        // Duplicate Prevention Check
        if (layup.layers && layup.layers.length > 0 && !layup.isReference) {
            const { data: allLayups, error: searchError } = await supabase
                .from('layups')
                .select('id, name, status, layup_layers(material_variant_id, orientation, sequence)')
                .neq('status', 'obsolete');

            if (!searchError && allLayups) {
                const duplicateLayup = allLayups.find(existingLayup => {
                    const existingLayers = existingLayup.layup_layers || [];
                    if (existingLayers.length !== layup.layers!.length) return false;

                    const sortedExisting = [...existingLayers].sort((a: any, b: any) => a.sequence - b.sequence);
                    const sortedNew = [...layup.layers!].sort((a, b) => a.sequence - b.sequence);

                    return sortedExisting.every((el: any, i) => {
                        return el.material_variant_id === sortedNew[i].materialVariantId &&
                            el.orientation === sortedNew[i].orientation;
                    });
                });

                if (duplicateLayup) {
                    throw new Error(`Duplicate Configuration: A layup with this exact stack sequence already exists: ${duplicateLayup.name} (${duplicateLayup.status})`);
                }
            }
        }

        // Pack properties
        const packedProperties = {
            customProperties: layup.properties || [],
            _allowables: layup.allowables || [],
            _projectIds: layup.projectIds || []
        };

        const { data: layupData, error: layupError } = await supabase.from('layups').insert({
            name: layup.name,
            description: layup.description,
            status: layup.status,
            process_id: layup.processId,
            process_params: layup.processParams,
            properties: packedProperties,
            restriction_reason: layup.restrictionReason,
            total_thickness: layup.totalThickness,
            total_weight: layup.totalWeight,
            assigned_profile_ids: layup.assignedProfileIds,
            created_by: layup.createdBy,
            previous_version_id: layup.previousVersionId,
            is_reference: layup.isReference,
            material_id: layup.materialId,
            architecture_type_id: layup.architectureTypeId,
            process_number: layup.processNumber,
            reference: layup.reference,
            initiating_project_id: layup.initiatingProjectId,
            production_site_id: layup.productionSiteId
        }).select().single();

        if (layupError) throw layupError;

        const layers = layup.layers;
        if (layers && layers.length > 0) {
            const dbLayers = layers.map(l => ({
                layup_id: layupData.id,
                material_variant_id: l.materialVariantId,
                orientation: l.orientation,
                sequence: l.sequence
            }));
            const { error: layersError } = await supabase.from('layup_layers').insert(dbLayers);
            if (layersError) throw layersError;
        }

        return {
            ...layup,
            id: layupData.id,
            createdAt: layupData.created_at,
            version: layupData.version,
            layers: layers || [],
            measurements: []
        } as Layup;
    }

    async updateLayup(id: string, updates: Partial<Layup>): Promise<void> {
        const { assignedProfileIds, allowables, projectIds, ...rest } = updates;
        const dbUpdates: any = {};

        // Fetch current to merge properties/allowables
        const { data: currentData } = await supabase.from('layups').select('properties').eq('id', id).single();
        const currentProps = currentData?.properties || {};

        if (rest.name) dbUpdates.name = rest.name;
        if (rest.status) dbUpdates.status = rest.status;
        if (rest.description) dbUpdates.description = rest.description;
        if (rest.processId) dbUpdates.process_id = rest.processId;
        if (rest.processParams) dbUpdates.process_params = rest.processParams;
        if (rest.totalThickness !== undefined) dbUpdates.total_thickness = rest.totalThickness;
        if (rest.totalWeight !== undefined) dbUpdates.total_weight = rest.totalWeight;
        if (rest.restrictionReason !== undefined) dbUpdates.restriction_reason = rest.restrictionReason;
        if (rest.isReference !== undefined) dbUpdates.is_reference = rest.isReference;
        if (rest.materialId !== undefined) dbUpdates.material_id = rest.materialId;
        if (rest.architectureTypeId !== undefined) dbUpdates.architecture_type_id = rest.architectureTypeId;
        if (rest.processNumber !== undefined) dbUpdates.process_number = rest.processNumber;
        if (rest.reference !== undefined) dbUpdates.reference = rest.reference;
        if (rest.initiatingProjectId !== undefined) dbUpdates.initiating_project_id = rest.initiatingProjectId;
        if (rest.productionSiteId !== undefined) dbUpdates.production_site_id = rest.productionSiteId;

        // Merge properties and allowables
        if (rest.properties !== undefined || allowables !== undefined) {
            // Handle unpacking logic for current properties if they exist
            let currentCustomProps = [];
            if (currentProps && !Array.isArray(currentProps) && currentProps.customProperties) {
                currentCustomProps = currentProps.customProperties;
            } else if (Array.isArray(currentProps)) {
                currentCustomProps = currentProps;
            }

            dbUpdates.properties = {
                customProperties: rest.properties !== undefined ? rest.properties : currentCustomProps,
                _allowables: allowables !== undefined ? allowables : (currentProps._allowables || []),
                _projectIds: projectIds !== undefined ? projectIds : (currentProps._projectIds || [])
            };
        }

        if (assignedProfileIds) {
            dbUpdates.assigned_profile_ids = assignedProfileIds;
        }

        if (Object.keys(dbUpdates).length > 0) {
            const { error } = await supabase.from('layups').update(dbUpdates).eq('id', id);
            if (error) throw error;
        }
    }

    async archiveLayup(id: string): Promise<void> {
        const { error } = await supabase.from('layups').update({ status: 'obsolete' }).eq('id', id);
        if (error) throw error;
    }

    async deleteLayup(id: string): Promise<void> {
        // Delete dependent layers first (manual cascade)
        const { error: layersError } = await supabase
            .from('layup_layers')
            .delete()
            .eq('layup_id', id);

        if (layersError) throw layersError;

        // Then delete the layup
        const { error } = await supabase
            .from('layups')
            .delete()
            .eq('id', id);

        if (error) throw error;
    }

    // --- Assemblies ---

    async getAssemblies(): Promise<Assembly[]> {
        const { data: assembliesData, error: assembliesError } = await supabase.from('assemblies').select('*');
        if (assembliesError) throw assembliesError;

        const { data: componentsData, error: componentsError } = await supabase.from('assembly_components').select('*');
        if (componentsError) console.warn("Error fetching components:", componentsError);

        // NEW: Fetch all measurements (id, assembly_id)
        const { data: measurementsData } = await supabase.from('measurements').select('id, assembly_id, process_params');


        return assembliesData.map((a: any) => {
            const associatedComponents = componentsData?.filter((c: any) => c.assembly_id === a.id) || [];
            const associatedMeasurements = measurementsData?.filter((m: any) => m.assembly_id === a.id).map((m: any) => ({
                ...m,
                isActive: m.process_params?.isActive
            })) || [];
            const allowables = a.properties?._allowables || [];

            return {
                id: a.id,
                name: a.name,
                description: a.description,
                status: a.status,
                version: a.version,
                createdAt: a.created_at,
                processIds: a.process_ids || [],
                properties: a.properties || [],
                assignedProfileIds: a.assigned_profile_ids || [],
                allowables: allowables, // Helper for UI
                totalWeight: a.total_weight,
                totalThickness: a.total_thickness,
                processNumber: a.process_number,
                reference: a.reference,
                initiatingProjectId: a.initiating_project_id,
                productionSiteId: a.production_site_id,
                measurements: associatedMeasurements as unknown as Measurement[],
                projectIds: a.properties?._projectIds || [],
                components: associatedComponents.map((c: any) => ({
                    id: c.id,
                    componentType: c.component_type,
                    componentId: c.component_id,
                    componentName: "Loading...",
                    quantity: c.quantity,
                    sequence: c.sequence || 0,
                    position: c.position,
                    config: c.config
                })).sort((x: any, y: any) => x.sequence - y.sequence)
            };
        });
    }

    async createAssembly(assembly: Omit<Assembly, 'id' | 'createdAt' | 'components'>, components: Omit<AssemblyComponent, 'id' | 'sequence'>[]): Promise<Assembly> {
        const { processIds, properties, assignedProfileIds, allowables, projectIds, ...rest } = assembly as any;

        const dbPayload = {
            name: rest.name,
            description: rest.description,
            status: rest.status,
            version: rest.version,
            process_ids: processIds,
            properties: {
                customProperties: properties || [],
                _allowables: allowables || [],
                _projectIds: projectIds || []
            },
            assigned_profile_ids: assignedProfileIds,
            allowables: allowables,
            total_weight: rest.totalWeight,
            total_thickness: rest.totalThickness,
            process_number: rest.processNumber,
            reference: rest.reference,
            initiating_project_id: rest.initiatingProjectId,
            production_site_id: rest.productionSiteId
        };


        console.log("Creating Assembly Payload:", dbPayload);

        const { data: asm, error: asmError } = await supabase.from('assemblies').insert(dbPayload).select().single();
        if (asmError) {
            console.error("Error creating assembly:", asmError);
            throw asmError;
        }
        console.log("Assembly created:", asm.id);

        if (components && components.length > 0) {
            console.log("Inserting components:", components);
            const compsToInsert = components.map((c: any, index: number) => ({
                assembly_id: asm.id,
                component_type: c.componentType,
                component_id: c.componentId,
                quantity: c.quantity,
                position: index,
                config: c.config
            }));
            const { error: compError } = await supabase.from('assembly_components').insert(compsToInsert);
            if (compError) {
                console.error("Error inserting components:", compError);
                throw compError;
            }
        }

        return {
            ...assembly,
            id: asm.id,
            createdAt: asm.created_at,
            components: components as any,
            measurements: []
        } as Assembly;
    }

    async updateAssembly(id: string, updates: Partial<Assembly>): Promise<void> {
        const {
            processIds,
            properties,
            assignedProfileIds,
            allowables,
            components,
            projectIds,
            ...rest
        } = updates as any;

        const dbUpdates: any = {};
        if (rest.name) dbUpdates.name = rest.name;
        if (rest.description) dbUpdates.description = rest.description;
        if (rest.status) dbUpdates.status = rest.status;
        if (rest.version) dbUpdates.version = rest.version;
        if (processIds) dbUpdates.process_ids = processIds;

        let currentProperties: any = {};
        if (properties !== undefined || allowables !== undefined || projectIds !== undefined) {
            const { data } = await supabase.from('assemblies').select('properties').eq('id', id).single();
            currentProperties = data?.properties || {};

            dbUpdates.properties = {
                customProperties: properties !== undefined ? properties : (currentProperties.customProperties || currentProperties),
                _allowables: allowables !== undefined ? allowables : (currentProperties._allowables || []),
                _projectIds: projectIds !== undefined ? projectIds : (currentProperties._projectIds || [])
            };
        }

        if (assignedProfileIds) dbUpdates.assigned_profile_ids = assignedProfileIds;
        if (allowables) dbUpdates.allowables = allowables; // Keeping external format for backwards compat if needed
        if (rest.totalWeight !== undefined) dbUpdates.total_weight = rest.totalWeight;
        if (rest.totalThickness !== undefined) dbUpdates.total_thickness = rest.totalThickness;
        if (rest.processNumber !== undefined) dbUpdates.process_number = rest.processNumber;
        if (rest.reference !== undefined) dbUpdates.reference = rest.reference;
        if (rest.initiatingProjectId !== undefined) dbUpdates.initiating_project_id = rest.initiatingProjectId;
        if (rest.productionSiteId !== undefined) dbUpdates.production_site_id = rest.productionSiteId;

        if (Object.keys(dbUpdates).length > 0) {
            const { error } = await supabase.from('assemblies').update(dbUpdates).eq('id', id);
            if (error) throw error;
        }

        if (components) {
            await supabase.from('assembly_components').delete().eq('assembly_id', id);
            const compsToInsert = components.map((c: any, index: number) => ({
                assembly_id: id,
                component_type: c.componentType,
                component_id: c.componentId,
                quantity: c.quantity,
                position: index
            }));
            const { error: compError } = await supabase.from('assembly_components').insert(compsToInsert);
            if (compError) throw compError;
        }
    }

    async archiveAssembly(id: string): Promise<void> {
        const { error } = await supabase.from('assemblies').update({ status: 'obsolete' }).eq('id', id);
        if (error) throw error;
    }

    async getAssemblyUsage(assemblyId: string): Promise<{ assemblyId: string, assemblyName: string }[]> {
        const { data, error } = await supabase
            .from('assembly_components')
            .select('assembly_id, assemblies(name)')
            .eq('component_type', 'assembly')
            .eq('component_id', assemblyId);

        if (error) {
            console.error("Error fetching assembly usage:", error);
            return [];
        }

        const unique = new Map();
        (data || []).forEach((item: any) => {
            if (item.assembly_id && !unique.has(item.assembly_id)) {
                unique.set(item.assembly_id, {
                    assemblyId: item.assembly_id,
                    assemblyName: item.assemblies?.name || "Unknown Assembly"
                });
            }
        });
        return Array.from(unique.values());
    }

    async deleteAssembly(id: string): Promise<void> {
        const { error } = await supabase.from('assemblies').delete().eq('id', id);
        if (error) throw error;
    }

    // --- Properties ---

    async getProperties(): Promise<PropertyDefinition[]> {
        const { data, error } = await supabase.from('property_definitions').select('*');
        if (error) throw error;

        return (data || []).map((p: any) => ({
            ...p,
            dataType: p.data_type,
            testMethods: p.test_methods,
            statsConfig: p.stats_config,
            inputStructure: p.input_structure
        }));
    }

    async createProperty(property: Omit<PropertyDefinition, 'id'>): Promise<PropertyDefinition> {
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

        return {
            ...property,
            id: data.id,
            inputStructure: data.input_structure
        } as PropertyDefinition;
    }

    async updateProperty(id: string, updates: Partial<PropertyDefinition>): Promise<void> {
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
    }

    async deleteProperty(id: string): Promise<void> {
        const { error } = await supabase.from('property_definitions').delete().eq('id', id);
        if (error) throw error;
    }

    // --- Requirement Profiles ---

    async getRequirementProfiles(): Promise<RequirementProfile[]> {
        const { data, error } = await supabase.from('requirement_profiles').select('*');
        if (error) throw error;
        return (data || []).map((p: any) => ({
            id: p.id,
            name: p.name,
            description: p.description,
            rules: p.rules || [],
            applicability: p.applicability || [],
            document: p.document,
            layupArchitectures: p.layup_architectures || []
        }));
    }

    async createRequirementProfile(profile: Omit<RequirementProfile, 'id'>): Promise<RequirementProfile> {
        const { data, error } = await supabase.from('requirement_profiles').insert({
            name: profile.name,
            description: profile.description,
            rules: profile.rules,
            applicability: profile.applicability,
            document: profile.document,
            layup_architectures: (profile as any).layupArchitectures // New field
        }).select().single();

        if (error) throw error;
        return { ...profile, id: data.id };
    }

    async updateRequirementProfile(id: string, updates: Partial<RequirementProfile>): Promise<void> {
        const dbUpdates: any = {};
        if (updates.name) dbUpdates.name = updates.name;
        if (updates.description) dbUpdates.description = updates.description;
        if (updates.rules) dbUpdates.rules = updates.rules;
        if (updates.applicability) dbUpdates.applicability = updates.applicability;
        if (updates.document) dbUpdates.document = updates.document;
        if ((updates as any).layupArchitectures) dbUpdates.layup_architectures = (updates as any).layupArchitectures;

        const { error } = await supabase.from('requirement_profiles').update(dbUpdates).eq('id', id);
        if (error) throw error;
    }

    async deleteRequirementProfile(id: string): Promise<void> {
        const { error } = await supabase.from('requirement_profiles').delete().eq('id', id);
        if (error) throw error;
    }

    // --- Projects ---

    async getProjects(): Promise<Project[]> {
        const { data, error } = await supabase.from('projects').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        return (data || []).map((p: any) => ({
            id: p.id,
            projectNumber: p.project_number,
            name: p.name,
            description: p.description,
            status: p.status,
            revision: p.revision,
            createdAt: p.created_at,
            updatedAt: p.updated_at,
            createdBy: p.created_by
        }));
    }

    async createProject(project: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>): Promise<Project> {
        const dbPayload = {
            project_number: project.projectNumber,
            name: project.name,
            description: project.description,
            status: project.status,
            revision: project.revision,
            created_by: project.createdBy
        };

        const { data, error } = await supabase.from('projects').insert(dbPayload).select().single();
        if (error) throw error;

        return {
            ...project,
            id: data.id,
            createdAt: data.created_at,
            updatedAt: data.updated_at
        };
    }

    async updateProject(id: string, updates: Partial<Project>): Promise<void> {
        const dbUpdates: any = {};
        if (updates.projectNumber) dbUpdates.project_number = updates.projectNumber;
        if (updates.name) dbUpdates.name = updates.name;
        if (updates.description) dbUpdates.description = updates.description;
        if (updates.status) dbUpdates.status = updates.status;
        if (updates.revision) dbUpdates.revision = updates.revision;

        dbUpdates.updated_at = new Date().toISOString();

        const { error } = await supabase.from('projects').update(dbUpdates).eq('id', id);
        if (error) throw error;
    }

    async deleteProject(id: string): Promise<void> {
        const { error } = await supabase.from('projects').delete().eq('id', id);
        if (error) throw error;
    }

    // --- Project Work Packages ---

    async getProjectWorkPackages(projectId: string): Promise<ProjectWorkPackage[]> {
        const { data, error } = await supabase
            .from('project_work_packages')
            .select('*')
            .eq('project_id', projectId)
            .order('created_at', { ascending: false });
        if (error) throw error;

        return (data || []).map((wp: any) => ({
            id: wp.id,
            projectId: wp.project_id,
            name: wp.name,
            description: wp.description,
            status: wp.status,
            materialListStatus: wp.material_list_status,
            materialListRevision: wp.material_list_revision,
            processListStatus: wp.process_list_status,
            processListRevision: wp.process_list_revision,
            partListStatus: wp.part_list_status,
            partListRevision: wp.part_list_revision,
            layupListStatus: wp.layup_list_status,
            layupListRevision: wp.layup_list_revision,
            assemblyListStatus: wp.assembly_list_status,
            assemblyListRevision: wp.assembly_list_revision,
            assignedMaterials: wp.assigned_materials || [],
            assignedProcesses: wp.assigned_processes || [],
            assignedStandardParts: wp.assigned_standard_parts || [],
            assignedLayups: wp.assigned_layups || [],
            assignedAssemblies: wp.assigned_assemblies || [],
            createdAt: wp.created_at,
            updatedAt: wp.updated_at
        }));
    }

    async createProjectWorkPackage(wp: Omit<ProjectWorkPackage, 'id' | 'createdAt' | 'updatedAt'>): Promise<ProjectWorkPackage> {
        const dbPayload = {
            project_id: wp.projectId,
            name: wp.name,
            description: wp.description,
            status: wp.status || 'planned',
            material_list_status: wp.materialListStatus,
            material_list_revision: wp.materialListRevision,
            process_list_status: wp.processListStatus,
            process_list_revision: wp.processListRevision,
            part_list_status: wp.partListStatus,
            part_list_revision: wp.partListRevision,
            layup_list_status: wp.layupListStatus,
            layup_list_revision: wp.layupListRevision,
            assembly_list_status: wp.assemblyListStatus,
            assembly_list_revision: wp.assemblyListRevision,
            assigned_materials: wp.assignedMaterials,
            assigned_processes: wp.assignedProcesses,
            assigned_standard_parts: wp.assignedStandardParts,
            assigned_layups: wp.assignedLayups,
            assigned_assemblies: wp.assignedAssemblies
        };

        const { data, error } = await supabase.from('project_work_packages').insert(dbPayload).select().single();
        if (error) throw error;

        return {
            ...wp,
            id: data.id,
            createdAt: data.created_at,
            updatedAt: data.updated_at
        };
    }

    async updateProjectWorkPackage(id: string, updates: Partial<ProjectWorkPackage>): Promise<void> {
        const dbUpdates: any = {};
        if (updates.name) dbUpdates.name = updates.name;
        if (updates.description !== undefined) dbUpdates.description = updates.description;
        if (updates.status) dbUpdates.status = updates.status;

        if (updates.materialListStatus) dbUpdates.material_list_status = updates.materialListStatus;
        if (updates.materialListRevision) dbUpdates.material_list_revision = updates.materialListRevision;
        if (updates.processListStatus) dbUpdates.process_list_status = updates.processListStatus;
        if (updates.processListRevision) dbUpdates.process_list_revision = updates.processListRevision;
        if (updates.partListStatus) dbUpdates.part_list_status = updates.partListStatus;
        if (updates.partListRevision) dbUpdates.part_list_revision = updates.partListRevision;
        if (updates.layupListStatus) dbUpdates.layup_list_status = updates.layupListStatus;
        if (updates.layupListRevision) dbUpdates.layup_list_revision = updates.layupListRevision;
        if (updates.assemblyListStatus) dbUpdates.assembly_list_status = updates.assemblyListStatus;
        if (updates.assemblyListRevision) dbUpdates.assembly_list_revision = updates.assemblyListRevision;

        if (updates.assignedMaterials) dbUpdates.assigned_materials = updates.assignedMaterials;
        if (updates.assignedProcesses) dbUpdates.assigned_processes = updates.assignedProcesses;
        if (updates.assignedStandardParts) dbUpdates.assigned_standard_parts = updates.assignedStandardParts;
        if (updates.assignedLayups) dbUpdates.assigned_layups = updates.assignedLayups;
        if (updates.assignedAssemblies) dbUpdates.assigned_assemblies = updates.assignedAssemblies;

        dbUpdates.updated_at = new Date().toISOString();

        const { error } = await supabase.from('project_work_packages').update(dbUpdates).eq('id', id);
        if (error) throw error;
    }

    async deleteProjectWorkPackage(id: string): Promise<void> {
        const { error } = await supabase.from('project_work_packages').delete().eq('id', id);
        if (error) throw error;
    }

    async closeProjectWorkPackageList(id: string, listType: AssignableEntityType, changelog: string, snapshot: any): Promise<void> {
        // Fetch current to get revision
        const selectColumn = listType === 'standardPart' ? 'part_list_revision' : `${listType}_list_revision`;
        const { data: wpData, error: wpError } = await supabase.from('project_work_packages').select(selectColumn).eq('id', id).single();
        if (wpError) throw wpError;

        const currentRevision = (wpData as any)[selectColumn] || 'A';

        // Insert revision snapshot
        const { error: revError } = await supabase.from('work_package_revisions').insert({
            work_package_id: id,
            list_type: listType === 'standardPart' ? 'part' : listType,
            revision: currentRevision,
            changelog,
            snapshot
        });
        if (revError) throw revError;

        // Update status
        const updateColumn = listType === 'standardPart' ? 'part_list_status' : `${listType}_list_status`;
        const { error: updError } = await supabase.from('project_work_packages').update({ [updateColumn]: 'closed' }).eq('id', id);
        if (updError) throw updError;
    }

    async reopenProjectWorkPackageList(id: string, listType: AssignableEntityType, currentRevision: string): Promise<string> {
        // Simple logic: charCodeAt + 1. 'A' -> 'B', 'Z' -> 'AA' (basic handler)
        let newRevision = 'A';
        if (currentRevision) {
            const lastChar = currentRevision.slice(-1);
            if (lastChar === 'Z') {
                newRevision = currentRevision + 'A';
            } else {
                newRevision = currentRevision.slice(0, -1) + String.fromCharCode(lastChar.charCodeAt(0) + 1);
            }
        }

        const statusColumn = listType === 'standardPart' ? 'part_list_status' : `${listType}_list_status`;
        const revisionColumn = listType === 'standardPart' ? 'part_list_revision' : `${listType}_list_revision`;

        const { error } = await supabase.from('project_work_packages').update({
            [statusColumn]: 'open',
            [revisionColumn]: newRevision
        }).eq('id', id);

        if (error) throw error;

        return newRevision;
    }

    async getWorkPackageRevisions(workPackageId: string, listType?: AssignableEntityType): Promise<WorkPackageRevision[]> {
        let query = supabase.from('work_package_revisions')
            .select('*')
            .eq('work_package_id', workPackageId)

        if (listType) {
            query = query.eq('list_type', listType === 'standardPart' ? 'part' : listType);
        }

        const { data, error } = await query.order('created_at', { ascending: false });

        if (error) throw error;

        return (data || []).map((r: any) => ({
            id: r.id,
            workPackageId: r.work_package_id,
            listType: r.list_type as AssignableEntityType,
            revision: r.revision,
            changelog: r.changelog,
            snapshot: r.snapshot,
            createdAt: r.created_at
        }));
    }

    // --- Project Lists ---

    async getProjectLists(projectId: string): Promise<{ materialLists: ProjectMaterialList[], processLists: ProjectProcessList[] }> {
        const { data: matData, error: matError } = await supabase
            .from('project_material_lists')
            .select('*')
            .eq('project_id', projectId);

        if (matError) throw matError;

        const { data: procData, error: procError } = await supabase
            .from('project_process_lists')
            .select('*')
            .eq('project_id', projectId);

        if (procError) throw procError;

        const materialLists = (matData || []).map((l: any) => ({
            id: l.id,
            projectId: l.project_id,
            name: l.name,
            revision: l.revision,
            status: l.status,
            items: l.items || [],
            createdAt: l.created_at,
            updatedAt: l.updated_at,
            createdBy: l.created_by
        }));

        const processLists = (procData || []).map((l: any) => ({
            id: l.id,
            projectId: l.project_id,
            name: l.name,
            revision: l.revision,
            status: l.status,
            items: l.items || [],
            createdAt: l.created_at,
            updatedAt: l.updated_at,
            createdBy: l.created_by
        }));

        return { materialLists, processLists };
    }

    // -- Material Lists --

    async createMaterialList(list: Omit<ProjectMaterialList, 'id' | 'createdAt' | 'updatedAt'>): Promise<ProjectMaterialList> {
        const dbPayload = {
            project_id: list.projectId,
            name: list.name,
            revision: list.revision,
            status: list.status,
            items: list.items,
            created_by: list.createdBy
        };

        const { data, error } = await supabase.from('project_material_lists').insert(dbPayload).select().single();
        if (error) throw error;

        return {
            ...list,
            id: data.id,
            createdAt: data.created_at,
            updatedAt: data.updated_at
        };
    }

    async updateMaterialList(id: string, updates: Partial<ProjectMaterialList>): Promise<void> {
        const dbUpdates: any = {};
        if (updates.name) dbUpdates.name = updates.name;
        if (updates.revision) dbUpdates.revision = updates.revision;
        if (updates.status) dbUpdates.status = updates.status;
        if (updates.items) dbUpdates.items = updates.items;

        dbUpdates.updated_at = new Date().toISOString();

        const { error } = await supabase.from('project_material_lists').update(dbUpdates).eq('id', id);
        if (error) throw error;
    }

    async deleteMaterialList(id: string): Promise<void> {
        const { error } = await supabase.from('project_material_lists').delete().eq('id', id);
        if (error) throw error;
    }

    // -- Process Lists --

    async createProcessList(list: Omit<ProjectProcessList, 'id' | 'createdAt' | 'updatedAt'>): Promise<ProjectProcessList> {
        const dbPayload = {
            project_id: list.projectId,
            name: list.name,
            revision: list.revision,
            status: list.status,
            items: list.items,
            created_by: list.createdBy
        };

        const { data, error } = await supabase.from('project_process_lists').insert(dbPayload).select().single();
        if (error) throw error;

        return {
            ...list,
            id: data.id,
            createdAt: data.created_at,
            updatedAt: data.updated_at
        };
    }

    async updateProcessList(id: string, updates: Partial<ProjectProcessList>): Promise<void> {
        const dbUpdates: any = {};
        if (updates.name) dbUpdates.name = updates.name;
        if (updates.revision) dbUpdates.revision = updates.revision;
        if (updates.status) dbUpdates.status = updates.status;
        if (updates.items) dbUpdates.items = updates.items;

        dbUpdates.updated_at = new Date().toISOString();

        const { error } = await supabase.from('project_process_lists').update(dbUpdates).eq('id', id);
        if (error) throw error;
    }

    async deleteProcessList(id: string): Promise<void> {
        const { error } = await supabase.from('project_process_lists').delete().eq('id', id);
        if (error) throw error;
    }

    // --- Generic / Simple ---

    async getLaboratories(includeArchived = false): Promise<Laboratory[]> {
        let query = supabase.from('laboratories').select('*');
        if (!includeArchived) {
            query = query.eq('entry_status', 'active');
        }
        const { data, error } = await query;
        if (error) throw error;
        return data.map((l: any) => ({
            id: l.id,
            name: l.name,
            description: l.description,
            city: l.city,
            country: l.country,
            authorizedMethods: l.authorized_methods || [],
            entryStatus: l.entry_status
        })) as Laboratory[];
    }

    async archiveLaboratory(id: string): Promise<void> {
        const { error } = await supabase.from('laboratories').update({ entry_status: 'archived' }).eq('id', id);
        if (error) throw error;
    }

    async createLaboratory(lab: Omit<Laboratory, 'id'>): Promise<Laboratory> {
        const { data, error } = await supabase.from('laboratories').insert({
            name: lab.name,
            description: (lab as any).description,
            city: lab.city,
            country: lab.country,
            authorized_methods: lab.authorizedMethods,
            entry_status: 'active'
        }).select().single();
        if (error) throw error;

        return {
            id: data.id,
            name: data.name,
            city: data.city,
            country: data.country,
            authorizedMethods: data.authorized_methods || []
        } as Laboratory;
    }

    async updateLaboratory(id: string, updates: Partial<Laboratory>): Promise<void> {
        const dbUpdates: any = {};
        if (updates.name !== undefined) dbUpdates.name = updates.name;
        if ((updates as any).description !== undefined) dbUpdates.description = (updates as any).description;
        if (updates.city !== undefined) dbUpdates.city = updates.city;
        if (updates.country !== undefined) dbUpdates.country = updates.country;
        if (updates.authorizedMethods !== undefined) dbUpdates.authorized_methods = updates.authorizedMethods;

        const { error } = await supabase.from('laboratories').update(dbUpdates).eq('id', id);
        if (error) throw error;
    }

    async deleteLaboratory(id: string): Promise<void> {
        const { error } = await supabase.from('laboratories').delete().eq('id', id);
        if (error) throw error;
    }

    async deleteProcess(id: string): Promise<void> {
        const { error } = await supabase.from('manufacturing_processes').delete().eq('id', id);
        if (error) throw error;
    }

    async getMeasurements(): Promise<Measurement[]> {
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
            createdAt:created_at,
            layupId:layup_id,
            assemblyId:assembly_id,
            referenceLayupId:reference_layup_id
        `);
        if (error) throw error;

        return data.map((m: any) => {
            const params = m.processParams || {};
            const rawValues = params._raw_values || (m.value ? [m.value] : []);
            return {
                ...m,
                orderNumber: params.orderNumber || m.order_number || "",
                referenceNumber: params.referenceNumber || m.reference_number || "",
                comment: params.comment || m.comment || "",
                layupId: m.layupId || params.layupId,
                assemblyId: m.assemblyId || params.assemblyId,
                referenceLayupId: m.referenceLayupId, // New Field
                values: rawValues,
                resultValue: m.value,
                statistics: params._statistics,
                processParams: params,
                isActive: params.isActive !== undefined ? params.isActive : true
            };
        });
    }

    async createMeasurement(measurement: Omit<Measurement, 'id' | 'createdAt'>): Promise<Measurement> {
        const packedParams = {
            ...measurement.processParams,
            // Legacy Params Support
            orderNumber: measurement.orderNumber,
            referenceNumber: measurement.referenceNumber,
            comment: measurement.comment,
            layupId: measurement.layupId,
            assemblyId: measurement.assemblyId,
            referenceLayupId: measurement.referenceLayupId,
            _raw_values: measurement.values,
            _statistics: measurement.statistics,
            isActive: measurement.isActive !== undefined ? measurement.isActive : true
        };

        const dbPayload = {
            material_id: measurement.materialId,
            property_definition_id: measurement.propertyDefinitionId,
            value: measurement.resultValue,
            unit: measurement.unit,
            laboratory_id: measurement.laboratoryId,
            reliability: measurement.reliability,
            value_type: 'mean',
            test_method: measurement.testMethod,
            process_params: packedParams,
            date: measurement.date,
            source_type: measurement.sourceType,
            source_file_url: measurement.sourceRef,
            source_filename: measurement.sourceFilename,
            layup_id: measurement.layupId,
            reference_layup_id: measurement.referenceLayupId, // New Field
            assembly_id: measurement.assemblyId,
            // Shadow Columns
            order_number: measurement.orderNumber,
            reference_number: measurement.referenceNumber,
            comment: measurement.comment,
        };

        const { data, error } = await supabase.from('measurements').insert(dbPayload).select().single();
        if (error) throw error;

        return { ...measurement, id: data.id, createdAt: data.created_at } as Measurement;
    }

    async updateMeasurement(id: string, updates: Partial<Measurement>): Promise<void> {
        let currentParams = {};
        // Check if we need to fetch current params
        if (updates.isActive !== undefined ||
            updates.orderNumber !== undefined ||
            updates.referenceNumber !== undefined ||
            updates.resultValue !== undefined ||
            updates.comment !== undefined ||
            updates.attachments !== undefined ||
            updates.referenceLayupId !== undefined) {

            const { data } = await supabase.from('measurements').select('process_params').eq('id', id).single();
            currentParams = data?.process_params || {};
        }

        const newParams = { ...currentParams } as any;
        let paramsChanged = false;

        if (updates.isActive !== undefined) { newParams.isActive = updates.isActive; paramsChanged = true; }
        if (updates.orderNumber !== undefined) { newParams.orderNumber = updates.orderNumber; paramsChanged = true; }
        if (updates.referenceNumber !== undefined) { newParams.referenceNumber = updates.referenceNumber; paramsChanged = true; }
        if (updates.referenceLayupId !== undefined) { newParams.referenceLayupId = updates.referenceLayupId; paramsChanged = true; }

        const dbUpdates: any = {};
        if (updates.resultValue !== undefined) dbUpdates.value = updates.resultValue;
        if (updates.unit !== undefined) dbUpdates.unit = updates.unit;
        if (updates.testMethod !== undefined) dbUpdates.test_method = updates.testMethod;
        if (updates.layupId !== undefined) dbUpdates.layup_id = updates.layupId;
        if (updates.assemblyId !== undefined) dbUpdates.assembly_id = updates.assemblyId;
        if (updates.materialId !== undefined) dbUpdates.material_id = updates.materialId;
        if (updates.referenceLayupId !== undefined) dbUpdates.reference_layup_id = updates.referenceLayupId; // New Field

        // NEW COLUMNS
        if (updates.comment !== undefined) dbUpdates.comment = updates.comment;
        if (updates.attachments !== undefined) dbUpdates.attachments = updates.attachments;

        // Try to update top-level columns if they exist (shadow columns)
        if (updates.orderNumber !== undefined) dbUpdates.order_number = updates.orderNumber;
        if (updates.referenceNumber !== undefined) dbUpdates.reference_number = updates.referenceNumber;

        if (paramsChanged) {
            dbUpdates.process_params = newParams;
        }

        if (Object.keys(dbUpdates).length > 0) {
            const { error } = await supabase.from('measurements').update(dbUpdates).eq('id', id);
            if (error) throw error;
        }
    }

    async deleteMeasurement(id: string): Promise<void> {
        const { error } = await supabase.from('measurements').delete().eq('id', id);
        if (error) throw error;
    }

    async getProcesses(includeArchived = false): Promise<ManufacturingProcess[]> {
        let query = supabase.from('manufacturing_processes').select(`
            id, name, description, defaultParams:default_params, subProcess:sub_process, processNumber:process_number, entryStatus:entry_status
        `);
        if (!includeArchived) {
            query = query.eq('entry_status', 'active');
        }
        const { data, error } = await query;
        if (error) throw error;
        return data.map((d: any) => {
            const { _projectIds, ...restParams } = d.defaultParams || {};
            return {
                id: d.id,
                name: d.name,
                description: d.description,
                defaultParams: restParams,
                subProcess: d.subProcess,
                processNumber: d.processNumber,
                entryStatus: d.entryStatus,
                projectIds: _projectIds || []
            } as ManufacturingProcess;
        });
    }

    async archiveProcess(id: string): Promise<void> {
        const { error } = await supabase.from('manufacturing_processes').update({ entry_status: 'archived' }).eq('id', id);
        if (error) throw error;
    }

    async updateProcess(id: string, updates: Partial<ManufacturingProcess>): Promise<void> {
        const { projectIds, defaultParams, ...rest } = updates;
        const dbUpdates: any = {};
        if (rest.name) dbUpdates.name = rest.name;
        if (rest.description !== undefined) dbUpdates.description = rest.description;
        if (rest.subProcess !== undefined) dbUpdates.sub_process = rest.subProcess;
        if (rest.processNumber !== undefined) dbUpdates.process_number = rest.processNumber;
        if (rest.entryStatus) dbUpdates.entry_status = rest.entryStatus;

        if (defaultParams !== undefined || projectIds !== undefined) {
            const { data } = await supabase.from('manufacturing_processes').select('default_params').eq('id', id).single();
            const currentParams = data?.default_params || {};
            dbUpdates.default_params = {
                ...currentParams,
                ...(defaultParams || {}),
                _projectIds: projectIds !== undefined ? projectIds : (currentParams._projectIds || [])
            };
        }

        if (Object.keys(dbUpdates).length > 0) {
            const { error } = await supabase.from('manufacturing_processes').update(dbUpdates).eq('id', id);
            if (error) throw error;
        }
    }

    async createProcess(process: Omit<ManufacturingProcess, 'id'>): Promise<ManufacturingProcess> {
        const payloadParams = { ...(process.defaultParams || {}), _projectIds: process.projectIds || [] };
        const { data, error } = await supabase.from('manufacturing_processes').insert({
            name: process.name,
            description: process.description,
            default_params: payloadParams,
            sub_process: process.subProcess,
            process_number: process.processNumber,
            entry_status: 'active'
        }).select(`id, name, description, defaultParams:default_params, subProcess:sub_process, processNumber:process_number, entryStatus:entry_status`).single();
        if (error) throw error;

        const { _projectIds, ...restParams } = data.defaultParams || {};
        return {
            ...data,
            defaultParams: restParams,
            projectIds: _projectIds || []
        } as ManufacturingProcess;
    }



    async getTestMethods(): Promise<TestMethod[]> {
        const { data, error } = await supabase.from('test_methods').select('*');
        if (error) throw error;
        return data.map((m: any) => ({
            id: m.id,
            name: m.name,
            title: m.title,
            category: m.category,
            description: m.description,
            properties: (m.properties && Array.isArray(m.properties) && m.properties.length > 0)
                ? m.properties
                : (m.property_ids || []).map((id: string) => ({ propertyId: id, statsTypes: ['mean', 'range'] }))
        }));
    }

    async createTestMethod(method: Omit<TestMethod, 'id'>): Promise<TestMethod> {
        const { data, error } = await supabase.from('test_methods').insert({
            name: method.name,
            title: method.title,
            category: method.category,
            description: method.description,
            properties: method.properties
        }).select().single();

        if (error) throw error;

        return {
            ...method,
            id: data.id,
            title: data.title,
            category: data.category
        } as TestMethod;
    }

    async updateTestMethod(id: string, updates: Partial<TestMethod>): Promise<void> {
        const dbUpdates: any = {};
        if (updates.name) dbUpdates.name = updates.name;
        if (updates.title !== undefined) dbUpdates.title = updates.title;
        if (updates.category !== undefined) dbUpdates.category = updates.category;
        if (updates.description !== undefined) dbUpdates.description = updates.description;
        if (updates.properties) dbUpdates.properties = updates.properties;

        const { error } = await supabase.from('test_methods').update(dbUpdates).eq('id', id);
        if (error) throw error;
    }

    async deleteTestMethod(id: string): Promise<void> {
        const { error } = await supabase.from('test_methods').delete().eq('id', id);
        if (error) throw error;
    }

    async getMaterialTypes(includeArchived = false): Promise<MaterialTypeDefinition[]> {
        let query = supabase.from('material_type_definitions').select('name, entry_status');
        if (!includeArchived) {
            query = query.eq('entry_status', 'active');
        }
        const { data, error } = await query;
        if (error) throw error;
        // Map to MaterialTypeDefinition
        return data.map(d => ({
            name: d.name,
            entryStatus: d.entry_status as 'active' | 'archived'
        }));
    }

    async archiveMaterialType(type: string): Promise<void> {
        const { error } = await supabase.from('material_type_definitions').update({ entry_status: 'archived' }).eq('name', type);
        if (error) throw error;
    }

    async restoreMaterialType(type: string): Promise<void> {
        const { error } = await supabase.from('material_type_definitions').update({ entry_status: 'active' }).eq('name', type);
        if (error) throw error;
    }

    // --- Production Sites ---

    async getProductionSites(includeArchived: boolean = false): Promise<ProductionSite[]> {
        let query = supabase.from('production_sites').select('*, layups(count)');
        if (!includeArchived) {
            query = query.eq('entry_status', 'active');
        }
        const { data, error } = await query;
        if (error) throw error;

        // Fetch associated test counts via layups
        const siteIds = data.map(d => d.id);
        const testCounts: Record<string, number> = {};

        if (siteIds.length > 0) {
            const { data: layupsData } = await supabase.from('layups').select('id, production_site_id').in('production_site_id', siteIds);

            if (layupsData && layupsData.length > 0) {
                const layupIds = layupsData.map(l => l.id);
                const { data: measurementsData } = await supabase.from('measurements').select('layup_id').in('layup_id', layupIds);

                if (measurementsData) {
                    measurementsData.forEach(m => {
                        const siteId = layupsData.find(l => l.id === m.layup_id)?.production_site_id;
                        if (siteId) {
                            testCounts[siteId] = (testCounts[siteId] || 0) + 1;
                        }
                    });
                }
            }
        }

        return (data || []).map(row => {
            // PostgREST returns count in an array
            const layupCountObj = Array.isArray(row.layups) ? row.layups[0] : row.layups;
            return {
                id: row.id,
                name: row.name,
                description: row.description,
                entryStatus: row.entry_status,
                layupCount: layupCountObj?.count || 0,
                testCount: testCounts[row.id] || 0
            };
        });
    }

    async createProductionSite(site: Omit<ProductionSite, 'id'>): Promise<ProductionSite> {
        const dbPayload = {
            name: site.name,
            description: site.description,
            entry_status: site.entryStatus || 'active'
        };
        const { data, error } = await supabase.from('production_sites').insert(dbPayload).select().single();
        if (error) throw error;
        return {
            id: data.id,
            name: data.name,
            description: data.description,
            entryStatus: data.entry_status
        };
    }

    async updateProductionSite(id: string, updates: Partial<ProductionSite>): Promise<void> {
        const dbUpdates: any = {};
        if (updates.name !== undefined) dbUpdates.name = updates.name;
        if (updates.description !== undefined) dbUpdates.description = updates.description;
        if (updates.entryStatus !== undefined) dbUpdates.entry_status = updates.entryStatus;

        if (Object.keys(dbUpdates).length > 0) {
            const { error } = await supabase.from('production_sites').update(dbUpdates).eq('id', id);
            if (error) throw error;
        }
    }

    async archiveProductionSite(id: string): Promise<void> {
        const { error } = await supabase.from('production_sites').update({ entry_status: 'archived' }).eq('id', id);
        if (error) throw error;
    }

    async restoreProductionSite(id: string): Promise<void> {
        const { error } = await supabase.from('production_sites').update({ entry_status: 'active' }).eq('id', id);
        if (error) throw error;
    }

    async createMaterialType(type: string): Promise<MaterialTypeDefinition> {
        const { error } = await supabase.from('material_type_definitions').insert({ name: type });
        if (error) throw error;
        return { name: type, entryStatus: 'active' };
    }

    async deleteMaterialType(type: string): Promise<void> {
        const { error } = await supabase.from('material_type_definitions').delete().eq('name', type);
        if (error) throw error;
    }

    // --- Specifications ---

    async getSpecifications(entityId: string, entityType: 'material' | 'layup' | 'assembly' = 'material'): Promise<MaterialSpecification[]> {
        let query = supabase.from('material_specifications').select('*');

        if (entityType === 'material') query = query.eq('material_id', entityId);
        else if (entityType === 'layup') query = query.eq('layup_id', entityId);
        else if (entityType === 'assembly') query = query.eq('assembly_id', entityId);

        const { data, error } = await query;
        if (error) throw error;

        return data.map((s: any) => ({
            id: s.id,
            materialId: s.material_id,
            layupId: s.layup_id,
            assemblyId: s.assembly_id,
            name: s.name,
            code: s.code,
            description: s.description,
            revision: s.revision,
            status: s.status,
            validFrom: s.valid_from,
            documentUrl: s.document_url,
            createdAt: s.created_at,
            requirementProfileId: s.requirement_profile_id,
            properties: s.properties || []
        }));
    }

    async createSpecification(spec: Omit<MaterialSpecification, 'createdAt' | 'id'> & { id?: string }): Promise<void> {
        const payload = {
            id: spec.id || uuidv4(),
            name: spec.name,
            material_id: spec.materialId,
            layup_id: spec.layupId,
            assembly_id: spec.assemblyId,
            code: spec.code,
            description: spec.description,
            revision: spec.revision,
            status: spec.status,
            valid_from: spec.validFrom,
            document_url: spec.documentUrl,
            requirement_profile_id: spec.requirementProfileId,
            properties: spec.properties || []
        };
        const { error } = await supabase.from('material_specifications').insert(payload);
        if (error) throw error;
    }

    async deleteSpecification(id: string): Promise<void> {
        const { error } = await supabase.from('material_specifications').delete().eq('id', id);
        if (error) throw error;
    }

    // --- Allowables ---

    async addAllowable(allowable: Omit<Allowable, 'id'>): Promise<string> {
        const id = uuidv4();
        const newAllowable = { ...allowable, id };
        let tableName = 'materials';
        if (allowable.parentType === 'layup') tableName = 'layups';
        if (allowable.parentType === 'assembly') tableName = 'assemblies';

        const { data, error: fetchError } = await supabase.from(tableName).select('properties').eq('id', allowable.parentId).single();
        if (fetchError) throw fetchError;

        let props = data.properties || {};
        const currentAllowables = props._allowables || [];
        const updatedAllowables = [...currentAllowables, newAllowable];

        const { error } = await supabase.from(tableName).update({
            properties: { ...props, _allowables: updatedAllowables }
        }).eq('id', allowable.parentId);

        if (error) throw error;

        return id;
    }

    async deleteAllowable(id: string, parentId: string, parentType: 'material' | 'layup' | 'assembly'): Promise<void> {
        let tableName = 'materials';
        if (parentType === 'layup') tableName = 'layups';
        if (parentType === 'assembly') tableName = 'assemblies';

        const { data, error: fetchError } = await supabase.from(tableName).select('properties').eq('id', parentId).single();
        if (fetchError) throw fetchError;

        let props = data.properties || {};
        const currentAllowables = props._allowables || [];
        const updatedAllowables = currentAllowables.filter((a: any) => a.id !== id);

        const { error } = await supabase.from(tableName).update({
            properties: { ...props, _allowables: updatedAllowables }
        }).eq('id', parentId);

        if (error) throw error;
    }

    // --- History ---

    async getHistory(entityId: string, entityType: 'material' | 'layup' | 'assembly'): Promise<EntityHistory[]> {
        const { data, error } = await supabase
            .from('entity_history')
            .select('*')
            .eq('entity_id', entityId)
            .eq('entity_type', entityType)
            .order('created_at', { ascending: false });

        if (error) {
            if (error.code === '42P01') return [];
            throw error;
        }

        return data.map((h: any) => ({
            id: h.id,
            entityType: h.entity_type,
            entityId: h.entity_id,
            content: h.content,
            createdAt: h.created_at,
            createdBy: h.created_by
        }));
    }

    async createHistoryEntry(entry: Omit<EntityHistory, 'id' | 'createdAt' | 'createdBy'>): Promise<EntityHistory> {
        const { data: { user } } = await supabase.auth.getUser();

        const payload = {
            entity_id: entry.entityId,
            entity_type: entry.entityType,
            content: entry.content,
            created_by: user?.id
        };
        const { data, error } = await supabase.from('entity_history').insert(payload).select().single();
        if (error) throw error;

        return {
            id: data.id,
            entityType: data.entity_type,
            entityId: data.entity_id,
            content: data.content,
            createdAt: data.created_at,
            createdBy: data.created_by
        };
    }

    async deleteHistoryEntry(id: string): Promise<void> {
        const { error } = await supabase.from('entity_history').delete().eq('id', id);
        if (error) throw error;
    }

    // --- Standard Parts ---

    async getStandardParts(): Promise<StandardPart[]> {
        const { data, error } = await supabase.from('standard_parts').select('*').order('name');
        if (error) {
            if (error.code === '42P01') return [];
            throw error;
        }
        return data.map((p: any) => ({
            id: p.id,
            name: p.name,
            manufacturer: p.manufacturer,
            supplier: p.supplier,
            status: p.status,
            createdAt: p.created_at
        }));
    }

    async createStandardPart(part: Omit<StandardPart, 'id' | 'createdAt'>): Promise<StandardPart> {
        const payload = {
            name: part.name,
            manufacturer: part.manufacturer,
            supplier: part.supplier,
            status: part.status
        };
        const { data, error } = await supabase.from('standard_parts').insert(payload).select().single();
        if (error) throw error;
        return {
            id: data.id,
            name: data.name,
            manufacturer: data.manufacturer,
            supplier: data.supplier,
            status: data.status,
            createdAt: data.created_at
        };
    }

    async updateStandardPart(id: string, updates: Partial<StandardPart>): Promise<void> {
        const payload: any = {};
        if (updates.name !== undefined) payload.name = updates.name;
        if (updates.manufacturer !== undefined) payload.manufacturer = updates.manufacturer;
        if (updates.supplier !== undefined) payload.supplier = updates.supplier;
        if (updates.status !== undefined) payload.status = updates.status;

        const { error } = await supabase.from('standard_parts').update(payload).eq('id', id);
        if (error) throw error;
    }

    async deleteStandardPart(id: string): Promise<void> {
        const { error } = await supabase.from('standard_parts').delete().eq('id', id);
        if (error) throw error;
    }

    // --- Storage / Files ---

    async uploadFile(bucket: string, path: string, file: File): Promise<string> {
        const { data, error } = await supabase.storage
            .from(bucket)
            .upload(path, file, {
                cacheControl: '3600',
                upsert: true
            });

        if (error) throw error;

        const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(data.path);
        return publicUrl;
    }

    // --- Queries ---

    async getMaterialUsage(materialId: string): Promise<MaterialUsageRecord[]> {
        const { data, error } = await supabase
            .from('project_material_lists')
            .select(`
                id,
                name,
                revision,
                status,
                project_id,
                projects (
                    name,
                    status
                )
            `)
            .contains('items', `[{"materialId": "${materialId}"}]`);

        if (error) {
            console.error("Error fetching material usage:", error);
            // It's possible the `contains` operator is finicky with arrays of objects in some Supabase versions if not cast correctly.
            // If it fails, fallback to fetching all lists and filtering in memory, but let's try this first.
            return [];
        }

        return (data || []).map((row: any) => ({
            projectId: row.project_id,
            projectName: row.projects?.name || 'Unknown Project',
            projectStatus: row.projects?.status || 'Unknown',
            listId: row.id,
            listName: row.name,
            listRevision: row.revision,
            listStatus: row.status
        }));
    }

    async getLayupProjectUsage(layupId: string): Promise<MaterialUsageRecord[]> {
        const { data, error } = await supabase
            .from('work_packages')
            .select(`
                id,
                name,
                layup_list_revision,
                layup_list_status,
                project_id,
                projects (
                    name,
                    status
                )
            `)
            .contains('assigned_layups', `["${layupId}"]`);

        if (error) {
            console.error("Error fetching layup project usage:", error);
            return [];
        }

        return (data || []).map((row: any) => ({
            projectId: row.project_id,
            projectName: row.projects?.name || 'Unknown Project',
            projectStatus: row.projects?.status || 'Unknown',
            listId: row.id,
            listName: row.name,
            listRevision: row.layup_list_revision || '1.0.0',
            listStatus: row.layup_list_status || 'open'
        }));
    }

    async getAssemblyProjectUsage(assemblyId: string): Promise<MaterialUsageRecord[]> {
        const { data, error } = await supabase
            .from('work_packages')
            .select(`
                id,
                name,
                assembly_list_revision,
                assembly_list_status,
                project_id,
                projects (
                    name,
                    status
                )
            `)
            .contains('assigned_assemblies', `["${assemblyId}"]`);

        if (error) {
            console.error("Error fetching assembly project usage:", error);
            return [];
        }

        return (data || []).map((row: any) => ({
            projectId: row.project_id,
            projectName: row.projects?.name || 'Unknown Project',
            projectStatus: row.projects?.status || 'Unknown',
            listId: row.id,
            listName: row.name,
            listRevision: row.assembly_list_revision || '1.0.0',
            listStatus: row.assembly_list_status || 'open'
        }));
    }

    // --- Lab Test Requests ---

    async getTestRequests(): Promise<import('@/types/domain').TestRequest[]> {
        const { data, error } = await supabase
            .from('test_requests')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        return data.map((row: any) => ({
            id: row.id,
            entityType: row.entity_type,
            entityId: row.entity_id,
            entityName: row.entity_name,
            requesterName: row.requester_name,
            status: row.status,
            orderNumber: row.order_number,
            propertyId: row.property_id,
            propertyName: row.property_name,
            testMethodId: row.test_method_id,
            testMethodName: row.test_method_name,
            numVariants: row.num_variants,
            numSpecimens: row.num_specimens,
            variantDescription: row.variant_description,
            assigneeId: row.assignee_id,
            startDate: row.start_date,
            targetDate: row.target_date,
            createdAt: row.created_at
        }));
    }

    async createTestRequest(request: Omit<import('@/types/domain').TestRequest, 'id' | 'createdAt'>): Promise<import('@/types/domain').TestRequest> {
        const { data, error } = await supabase
            .from('test_requests')
            .insert({
                entity_type: request.entityType,
                entity_id: request.entityId,
                entity_name: request.entityName,
                requester_name: request.requesterName,
                status: request.status,
                order_number: request.orderNumber,
                property_id: request.propertyId,
                property_name: request.propertyName,
                test_method_id: request.testMethodId,
                test_method_name: request.testMethodName,
                num_variants: request.numVariants,
                num_specimens: request.numSpecimens,
                variant_description: request.variantDescription,
                assignee_id: request.assigneeId || null,
                start_date: request.startDate || null,
                target_date: request.targetDate || null
            })
            .select()
            .single();

        if (error) throw error;

        return {
            id: data.id,
            entityType: data.entity_type,
            entityId: data.entity_id,
            entityName: data.entity_name,
            requesterName: data.requester_name,
            status: data.status,
            orderNumber: data.order_number,
            propertyId: data.property_id,
            propertyName: data.property_name,
            testMethodId: data.test_method_id,
            testMethodName: data.test_method_name,
            numVariants: data.num_variants,
            numSpecimens: data.num_specimens,
            variantDescription: data.variant_description,
            assigneeId: data.assignee_id,
            startDate: data.start_date,
            targetDate: data.target_date,
            createdAt: data.created_at
        };
    }

    async updateTestRequest(id: string, updates: Partial<import('@/types/domain').TestRequest>): Promise<void> {
        const payload: any = {};
        if (updates.status !== undefined) payload.status = updates.status;
        if (updates.orderNumber !== undefined) payload.order_number = updates.orderNumber;
        if (updates.assigneeId !== undefined) payload.assignee_id = updates.assigneeId;
        if (updates.startDate !== undefined) payload.start_date = updates.startDate;
        if (updates.targetDate !== undefined) payload.target_date = updates.targetDate;
        if (updates.status !== undefined) payload.status = updates.status;
        if (updates.orderNumber !== undefined) payload.order_number = updates.orderNumber;
        if (updates.variantDescription !== undefined) payload.variant_description = updates.variantDescription;

        // Allowing updates to properties if needed, though usually just status/orderNumber
        if (updates.numVariants !== undefined) payload.num_variants = updates.numVariants;
        if (updates.numSpecimens !== undefined) payload.num_specimens = updates.numSpecimens;
        if (updates.testMethodId !== undefined) payload.test_method_id = updates.testMethodId;
        if (updates.testMethodName !== undefined) payload.test_method_name = updates.testMethodName;

        if (Object.keys(payload).length > 0) {
            const { error } = await supabase
                .from('test_requests')
                .update(payload)
                .eq('id', id);

            if (error) throw error;
        }
    }

    // Lab Technicians
    async getLabTechnicians(): Promise<import('@/types/domain').LabTechnician[]> {
        const { data, error } = await supabase
            .from('lab_technicians')
            .select('*')
            .order('name');
        if (error) throw error;
        return data.map(row => ({
            id: row.id,
            name: row.name,
            createdAt: row.created_at
        }));
    }

    async createLabTechnician(name: string): Promise<import('@/types/domain').LabTechnician> {
        const { data, error } = await supabase
            .from('lab_technicians')
            .insert({ name })
            .select()
            .single();
        if (error) throw error;
        return {
            id: data.id,
            name: data.name,
            createdAt: data.created_at
        };
    }

    async deleteLabTechnician(id: string): Promise<void> {
        const { error } = await supabase.from('lab_technicians').delete().eq('id', id);
        if (error) throw error;
    }

    // Test Tasks
    async getTestTasks(testRequestId: string): Promise<import('@/types/domain').TestTask[]> {
        const { data, error } = await supabase
            .from('test_tasks')
            .select('*')
            .eq('test_request_id', testRequestId)
            .order('created_at');
        if (error) throw error;
        return data.map(row => ({
            id: row.id,
            testRequestId: row.test_request_id,
            name: row.name,
            durationHours: Number(row.duration_hours),
            startDate: row.start_date,
            targetDate: row.target_date,
            status: row.status,
            assigneeId: row.assignee_id,
            dependsOnTaskId: row.depends_on_task_id,
            dependencyOffsetDays: Number(row.dependency_offset_days) || 0,
            orderIndex: row.order_index,
            phase: row.phase,
            standardDurationHours: row.standard_duration_hours ? Number(row.standard_duration_hours) : undefined,
            createdAt: row.created_at,
            updatedAt: row.updated_at
        }));
    }

    async getAllTestTasks(): Promise<import('@/types/domain').TestTask[]> {
        const { data, error } = await supabase
            .from('test_tasks')
            .select('*')
            .order('created_at');
        if (error) throw error;
        return data.map(row => ({
            id: row.id,
            testRequestId: row.test_request_id,
            name: row.name,
            durationHours: Number(row.duration_hours),
            startDate: row.start_date,
            targetDate: row.target_date,
            status: row.status,
            assigneeId: row.assignee_id,
            dependsOnTaskId: row.depends_on_task_id,
            dependencyOffsetDays: Number(row.dependency_offset_days) || 0,
            orderIndex: row.order_index,
            phase: row.phase,
            standardDurationHours: row.standard_duration_hours ? Number(row.standard_duration_hours) : undefined,
            createdAt: row.created_at,
            updatedAt: row.updated_at
        }));
    }

    async createTestTask(task: Omit<import('@/types/domain').TestTask, 'id' | 'createdAt' | 'updatedAt'>): Promise<import('@/types/domain').TestTask> {
        const { data, error } = await supabase
            .from('test_tasks')
            .insert({
                test_request_id: task.testRequestId,
                name: task.name,
                duration_hours: task.durationHours,
                start_date: task.startDate || null,
                target_date: task.targetDate || null,
                status: task.status,
                assignee_id: task.assigneeId || null,
                depends_on_task_id: task.dependsOnTaskId || null,
                dependency_offset_days: task.dependencyOffsetDays || 0,
                order_index: task.orderIndex || 0,
                phase: task.phase || null,
                standard_duration_hours: task.standardDurationHours || null
            })
            .select()
            .single();

        if (error) throw error;

        return {
            id: data.id,
            testRequestId: data.test_request_id,
            name: data.name,
            durationHours: Number(data.duration_hours),
            startDate: data.start_date,
            targetDate: data.target_date,
            status: data.status,
            assigneeId: data.assignee_id,
            dependsOnTaskId: data.depends_on_task_id,
            dependencyOffsetDays: Number(data.dependency_offset_days) || 0,
            orderIndex: data.order_index,
            phase: data.phase,
            standardDurationHours: data.standard_duration_hours ? Number(data.standard_duration_hours) : undefined,
            createdAt: data.created_at,
            updatedAt: data.updated_at
        };
    }

    async updateTestTask(id: string, updates: Partial<import('@/types/domain').TestTask>): Promise<void> {
        const payload: any = {};
        if (updates.name !== undefined) payload.name = updates.name;
        if (updates.durationHours !== undefined) payload.duration_hours = updates.durationHours;
        if (updates.startDate !== undefined) payload.start_date = updates.startDate;
        if (updates.targetDate !== undefined) payload.target_date = updates.targetDate;
        if (updates.status !== undefined) payload.status = updates.status;
        if (updates.assigneeId !== undefined) payload.assignee_id = updates.assigneeId;
        if (updates.dependsOnTaskId !== undefined) payload.depends_on_task_id = updates.dependsOnTaskId;
        if (updates.dependencyOffsetDays !== undefined) payload.dependency_offset_days = updates.dependencyOffsetDays;
        if (updates.orderIndex !== undefined) payload.order_index = updates.orderIndex;
        if (updates.phase !== undefined) payload.phase = updates.phase;
        if (updates.standardDurationHours !== undefined) payload.standard_duration_hours = updates.standardDurationHours;

        if (Object.keys(payload).length === 0) return;

        const { error } = await supabase
            .from('test_tasks')
            .update(payload)
            .eq('id', id);

        if (error) throw error;
    }

    async deleteTestTask(id: string): Promise<void> {
        const { error } = await supabase.from('test_tasks').delete().eq('id', id);
        if (error) throw error;
    }

    // --- Task Templates ---
    async getTaskTemplates(): Promise<import('@/types/domain').TestTaskTemplate[]> {
        const { data, error } = await supabase.from('test_task_templates').select('*').order('name');
        if (error) throw error;
        return data.map(row => ({
            id: row.id,
            name: row.name,
            description: row.description,
            phase: row.phase,
            createdAt: row.created_at
        }));
    }

    async createTaskTemplate(template: Omit<import('@/types/domain').TestTaskTemplate, 'id' | 'createdAt'>): Promise<import('@/types/domain').TestTaskTemplate> {
        const { data, error } = await supabase
            .from('test_task_templates')
            .insert({
                name: template.name,
                description: template.description || null,
                phase: template.phase
            })
            .select()
            .single();

        if (error) throw error;
        return {
            id: data.id,
            name: data.name,
            description: data.description,
            phase: data.phase,
            createdAt: data.created_at
        };
    }

    async updateTaskTemplate(id: string, updates: Partial<import('@/types/domain').TestTaskTemplate>): Promise<void> {
        const payload: any = {};
        if (updates.name !== undefined) payload.name = updates.name;
        if (updates.description !== undefined) payload.description = updates.description;
        if (updates.phase !== undefined) payload.phase = updates.phase;

        if (Object.keys(payload).length > 0) {
            const { error } = await supabase.from('test_task_templates').update(payload).eq('id', id);
            if (error) throw error;
        }
    }

    async deleteTaskTemplate(id: string): Promise<void> {
        const { error } = await supabase.from('test_task_templates').delete().eq('id', id);
        if (error) throw error;
    }

    // --- Task Template Items ---
    async getTaskTemplateItems(templateId: string): Promise<import('@/types/domain').TestTaskTemplateItem[]> {
        const { data, error } = await supabase
            .from('test_task_template_items')
            .select('*')
            .eq('template_id', templateId)
            .order('order_index');

        if (error) throw error;
        return data.map(row => ({
            id: row.id,
            templateId: row.template_id,
            name: row.name,
            durationHours: Number(row.duration_hours),
            dependsOnItemIndex: row.depends_on_item_index !== null ? Number(row.depends_on_item_index) : undefined,
            dependencyOffsetDays: Number(row.dependency_offset_days) || 0,
            orderIndex: Number(row.order_index)
        }));
    }

    async createTaskTemplateItem(item: Omit<import('@/types/domain').TestTaskTemplateItem, 'id'>): Promise<import('@/types/domain').TestTaskTemplateItem> {
        const { data, error } = await supabase
            .from('test_task_template_items')
            .insert({
                template_id: item.templateId,
                name: item.name,
                duration_hours: item.durationHours,
                depends_on_item_index: item.dependsOnItemIndex ?? null,
                dependency_offset_days: item.dependencyOffsetDays || 0,
                order_index: item.orderIndex
            })
            .select()
            .single();

        if (error) throw error;
        return {
            id: data.id,
            templateId: data.template_id,
            name: data.name,
            durationHours: Number(data.duration_hours),
            dependsOnItemIndex: data.depends_on_item_index !== null ? Number(data.depends_on_item_index) : undefined,
            dependencyOffsetDays: Number(data.dependency_offset_days) || 0,
            orderIndex: Number(data.order_index)
        };
    }

    async updateTaskTemplateItem(id: string, updates: Partial<import('@/types/domain').TestTaskTemplateItem>): Promise<void> {
        const payload: any = {};
        if (updates.name !== undefined) payload.name = updates.name;
        if (updates.durationHours !== undefined) payload.duration_hours = updates.durationHours;
        if (updates.dependsOnItemIndex !== undefined) payload.depends_on_item_index = updates.dependsOnItemIndex;
        if (updates.dependencyOffsetDays !== undefined) payload.dependency_offset_days = updates.dependencyOffsetDays;
        if (updates.orderIndex !== undefined) payload.order_index = updates.orderIndex;

        if (Object.keys(payload).length > 0) {
            const { error } = await supabase.from('test_task_template_items').update(payload).eq('id', id);
            if (error) throw error;
        }
    }

    async deleteTaskTemplateItem(id: string): Promise<void> {
        const { error } = await supabase.from('test_task_template_items').delete().eq('id', id);
        if (error) throw error;
    }
}
