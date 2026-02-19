import { supabase } from '../supabase';
import type { StorageRepository } from './types';
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
    StandardPart
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
                allowables: m.properties?._allowables || []
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
            allowables,
            measurements, // Exclude
            documents, // Exclude
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
            _allowables: material.allowables || []
        };

        const dbPayload = {
            ...baseMaterial,
            properties: packedProperties
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
            variants: varData ? [{
                ...varData,
                id: varData.variant_id,
                variantId: varData.properties?.code || varData.variant_name,
                baseMaterialId: varData.base_material_id,
                variantName: varData.variant_name,
                description: varData.properties?.description,
                properties: varData.properties || {}
            } as MaterialVariant] : [],
            allowables: material.allowables || []
        } as Material;
    }

    async updateMaterial(id: string, updates: Partial<Material>): Promise<void> {
        const {
            assignedProfileIds,
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
            _allowables: allowables !== undefined ? allowables : (current._allowables || [])
        };

        (dbUpdates as any).properties = packedProperties;

        if (assignedProfileIds) {
            (dbUpdates as any).assigned_profile_ids = assignedProfileIds;
        }

        if (Object.keys(dbUpdates).length > 0) {
            const { error } = await supabase.from('materials').update(dbUpdates).eq('id', id);
            if (error) throw error;
        }
    }

    async deleteMaterial(id: string): Promise<void> {
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

            // Extract Allowables from properties if present
            const allowables = l.properties?._allowables || [];

            return {
                ...l,
                processId: l.process_id,
                totalThickness: l.total_thickness,
                totalWeight: l.total_weight,
                restrictionReason: l.restriction_reason,
                properties: l.properties || [],
                previousVersionId: l.previous_version_id,
                createdBy: l.created_by,
                createdAt: l.created_at,
                measurements: associatedMeasurements as unknown as Measurement[], // Partial objects, mainly for count
                allowables: allowables,
                layers: associatedLayers.map((layer: any) => ({
                    id: layer.id,
                    layupId: layer.layup_id,
                    materialVariantId: layer.material_variant_id,
                    orientation: layer.orientation,
                    sequence: layer.sequence
                })).sort((a: any, b: any) => a.sequence - b.sequence)
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

        // Fetch measurements? Might be overkill for "Used In" view, but consistenct is good.
        // For now, let's skip measurements for "Used In" to keep it light, unless requested.
        // But getLayupsByVariant returns Layup[], so users might expect it.
        // Let's leave it as is for now, or fetch if easy.

        return data.map((l: any) => ({
            ...l,
            processId: l.process_id,
            totalThickness: l.total_thickness,
            totalWeight: l.total_weight,
            restrictionReason: l.restriction_reason,
            previousVersionId: l.previous_version_id,
            createdBy: l.created_by,
            createdAt: l.created_at,
            measurements: [], // Empty for now in this view
            allowables: l.properties?._allowables || []
        })) as Layup[];
    }

    async createLayup(layup: Omit<Layup, 'id' | 'createdAt' | 'version'>): Promise<Layup> {
        const { layers, measurements, ...rest } = layup;

        const dbLayup = {
            name: rest.name,
            status: rest.status,
            process_id: rest.processId,
            process_params: rest.processParams,
            total_thickness: rest.totalThickness,
            total_weight: rest.totalWeight,
            created_by: rest.createdBy,
            previous_version_id: rest.previousVersionId,
            restriction_reason: rest.restrictionReason,
            properties: {
                ...rest.properties,
                _allowables: layup.allowables // Persist allowables
            }
        };

        const { data: layupData, error: layupError } = await supabase.from('layups').insert(dbLayup).select().single();
        if (layupError) throw layupError;

        if (layers && layers.length > 0) {
            const dbLayers = layers.map((l, index) => ({
                layup_id: layupData.id,
                material_variant_id: l.materialVariantId,
                orientation: l.orientation,
                sequence: l.sequence ?? (index + 1)
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
        const { assignedProfileIds, allowables, ...rest } = updates;
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

        // Merge properties and allowables
        if (rest.properties !== undefined || allowables !== undefined) {
            dbUpdates.properties = {
                ...(rest.properties || currentProps),
                _allowables: allowables !== undefined ? allowables : (currentProps._allowables || [])
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

    async deleteLayup(id: string): Promise<void> {
        const { error } = await supabase.from('layups').delete().eq('id', id);
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
                measurements: associatedMeasurements as unknown as Measurement[],
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
        const { processIds, properties, assignedProfileIds, allowables, ...rest } = assembly;

        const dbPayload = {
            name: rest.name,
            description: rest.description,
            status: rest.status,
            version: rest.version,
            process_ids: processIds,
            properties: properties,
            assigned_profile_ids: assignedProfileIds,
            allowables: allowables,
            total_weight: rest.totalWeight,
            total_thickness: rest.totalThickness
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
        if (rest.totalWeight !== undefined) dbUpdates.total_weight = rest.totalWeight;
        if (rest.totalThickness !== undefined) dbUpdates.total_thickness = rest.totalThickness;

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
            document: p.document
        }));
    }

    async createRequirementProfile(profile: Omit<RequirementProfile, 'id'>): Promise<RequirementProfile> {
        const { data, error } = await supabase.from('requirement_profiles').insert({
            name: profile.name,
            description: profile.description,
            rules: profile.rules,
            applicability: profile.applicability,
            document: profile.document
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

        const { error } = await supabase.from('requirement_profiles').update(dbUpdates).eq('id', id);
        if (error) throw error;
    }

    // --- Generic / Simple ---

    async getLaboratories(): Promise<Laboratory[]> {
        return [];
    }

    async createLaboratory(lab: Omit<Laboratory, 'id'>): Promise<Laboratory> {
        return { ...lab, id: uuidv4() };
    }

    async updateLaboratory(_id: string, _updates: Partial<Laboratory>): Promise<void> {
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
            createdAt:created_at
        `);
        if (error) throw error;

        return data.map((m: any) => {
            const params = m.processParams || {};
            const rawValues = params._raw_values || (m.value ? [m.value] : []);
            return {
                ...m,
                orderNumber: params.orderNumber || "",
                referenceNumber: params.referenceNumber || "",
                comment: params.comment || "",
                layupId: m.layup_id || params.layupId,
                assemblyId: params.assemblyId,
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
            orderNumber: measurement.orderNumber,
            referenceNumber: measurement.referenceNumber,
            comment: measurement.comment,
            layupId: measurement.layupId,
            assemblyId: measurement.assemblyId,
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
            assembly_id: measurement.assemblyId
        };

        const { data, error } = await supabase.from('measurements').insert(dbPayload).select().single();
        if (error) throw error;

        return { ...measurement, id: data.id, createdAt: data.created_at } as Measurement;
    }

    async updateMeasurement(id: string, updates: Partial<Measurement>): Promise<void> {
        let currentParams = {};
        if (updates.isActive !== undefined || updates.resultValue !== undefined) {
            const { data } = await supabase.from('measurements').select('process_params').eq('id', id).single();
            currentParams = data?.process_params || {};
        }

        const newParams = { ...currentParams } as any;
        if (updates.isActive !== undefined) newParams.isActive = updates.isActive;

        const dbUpdates: any = {};
        if (updates.resultValue !== undefined) dbUpdates.value = updates.resultValue;
        if (updates.unit !== undefined) dbUpdates.unit = updates.unit;
        if (updates.testMethod !== undefined) dbUpdates.test_method = updates.testMethod;
        if (updates.layupId !== undefined) dbUpdates.layup_id = updates.layupId;
        if (updates.assemblyId !== undefined) dbUpdates.assembly_id = updates.assemblyId;
        if (updates.materialId !== undefined) dbUpdates.material_id = updates.materialId;

        dbUpdates.process_params = newParams;

        const { error } = await supabase.from('measurements').update(dbUpdates).eq('id', id);
        if (error) throw error;
    }

    async getProcesses(): Promise<ManufacturingProcess[]> {
        const { data, error } = await supabase.from('manufacturing_processes').select(`
            id, name, description, defaultParams:default_params
        `);
        if (error) throw error;
        return data as ManufacturingProcess[];
    }

    async createProcess(process: Omit<ManufacturingProcess, 'id'>): Promise<ManufacturingProcess> {
        const { data, error } = await supabase.from('manufacturing_processes').insert({
            name: process.name,
            description: process.description,
            default_params: process.defaultParams
        }).select(`id, name, description, defaultParams:default_params`).single();
        if (error) throw error;
        return data as ManufacturingProcess;
    }

    async getTestMethods(): Promise<TestMethod[]> {
        const { data, error } = await supabase.from('test_methods').select('*');
        if (error) throw error;
        return data.map((m: any) => ({
            id: m.id,
            name: m.name,
            description: m.description,
            properties: (m.properties && Array.isArray(m.properties) && m.properties.length > 0)
                ? m.properties
                : (m.property_ids || []).map((id: string) => ({ propertyId: id, statsTypes: ['mean', 'range'] }))
        }));
    }

    async createTestMethod(method: Omit<TestMethod, 'id'>): Promise<TestMethod> {
        const id = uuidv4();
        const { error } = await supabase.from('test_methods').insert({
            id,
            name: method.name,
            description: method.description,
            properties: method.properties
        });
        if (error) throw error;
        return { ...method, id };
    }

    async updateTestMethod(id: string, updates: Partial<TestMethod>): Promise<void> {
        const dbUpdates: any = {};
        if (updates.name) dbUpdates.name = updates.name;
        if (updates.description) dbUpdates.description = updates.description;
        if (updates.properties) dbUpdates.properties = updates.properties;
        const { error } = await supabase.from('test_methods').update(dbUpdates).eq('id', id);
        if (error) throw error;
    }

    async deleteTestMethod(id: string): Promise<void> {
        const { error } = await supabase.from('test_methods').delete().eq('id', id);
        if (error) throw error;
    }

    async getMaterialTypes(): Promise<string[]> {
        const { data, error } = await supabase.from('material_type_definitions').select('name');
        if (error) throw error;
        return data.map((d: any) => d.name);
    }

    async createMaterialType(type: string): Promise<string> {
        const { error } = await supabase.from('material_type_definitions').insert({ name: type });
        if (error) throw error;
        return type;
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
            createdAt: s.created_at
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
            document_url: spec.documentUrl
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
}
