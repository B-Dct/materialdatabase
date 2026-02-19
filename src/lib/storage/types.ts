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

export interface StorageRepository {
    // Materials
    getMaterials(): Promise<Material[]>;
    createMaterial(material: Omit<Material, 'id' | 'createdAt' | 'updatedAt'>): Promise<Material>;
    updateMaterial(id: string, updates: Partial<Material>): Promise<void>;
    deleteMaterial(id: string): Promise<void>;

    // Material Variants
    // Note: In Supabase these are closely tied to materials, but we might want explicit actions
    createVariant(materialId: string, variant: Omit<MaterialVariant, 'createdAt' | 'updatedAt' | 'baseMaterialId'>): Promise<MaterialVariant>;
    updateVariant(materialId: string, variantId: string, updates: Partial<MaterialVariant>): Promise<void>;
    deleteVariant(materialId: string, variantId: string): Promise<void>;

    // Layups
    getLayups(): Promise<Layup[]>;
    getLayupsByVariant(variantId: string): Promise<Layup[]>;
    createLayup(layup: Omit<Layup, 'id' | 'createdAt' | 'version'>): Promise<Layup>;
    updateLayup(id: string, updates: Partial<Layup>): Promise<void>;
    deleteLayup(id: string): Promise<void>;

    // Assemblies
    getAssemblies(): Promise<Assembly[]>;
    createAssembly(assembly: Omit<Assembly, 'id' | 'createdAt' | 'components'>, components: Omit<AssemblyComponent, 'id' | 'sequence'>[]): Promise<Assembly>;
    updateAssembly(id: string, updates: Partial<Assembly>): Promise<void>;
    // Note: Assembly components might need specific methods if updated separately, 
    // but typically they are updated with the assembly or generic update logic.

    // Global Properties / Definitions
    getProperties(): Promise<PropertyDefinition[]>;
    createProperty(property: Omit<PropertyDefinition, 'id'>): Promise<PropertyDefinition>;
    updateProperty(id: string, updates: Partial<PropertyDefinition>): Promise<void>;
    deleteProperty(id: string): Promise<void>;

    getRequirementProfiles(): Promise<RequirementProfile[]>;
    createRequirementProfile(profile: Omit<RequirementProfile, 'id'>): Promise<RequirementProfile>;
    updateRequirementProfile(id: string, updates: Partial<RequirementProfile>): Promise<void>;

    getLaboratories(): Promise<Laboratory[]>;
    createLaboratory(lab: Omit<Laboratory, 'id'>): Promise<Laboratory>;
    updateLaboratory(id: string, updates: Partial<Laboratory>): Promise<void>;

    getMeasurements(): Promise<Measurement[]>;
    createMeasurement(measurement: Omit<Measurement, 'id' | 'createdAt'>): Promise<Measurement>;
    updateMeasurement(id: string, updates: Partial<Measurement>): Promise<void>;

    getProcesses(): Promise<ManufacturingProcess[]>;
    createProcess(process: Omit<ManufacturingProcess, 'id'>): Promise<ManufacturingProcess>;

    getTestMethods(): Promise<TestMethod[]>;
    createTestMethod(method: Omit<TestMethod, 'id'>): Promise<TestMethod>;
    updateTestMethod(id: string, updates: Partial<TestMethod>): Promise<void>;
    deleteTestMethod(id: string): Promise<void>;

    getMaterialTypes(): Promise<string[]>;
    createMaterialType(type: string): Promise<string>;
    deleteMaterialType(type: string): Promise<void>;

    // Specifications
    getSpecifications(entityId: string, entityType?: 'material' | 'layup' | 'assembly'): Promise<MaterialSpecification[]>;
    createSpecification(spec: Omit<MaterialSpecification, 'createdAt' | 'id'> & { id?: string }): Promise<void>;
    deleteSpecification(id: string): Promise<void>;

    // Allowables
    // Note: Allowables are often packed into the entity JSONB in Supabase. 
    // The repository should abstract this. If we treat them as sub-entities:
    addAllowable(allowable: Omit<Allowable, 'id'>): Promise<string>;
    deleteAllowable(id: string, parentId: string, parentType: 'material' | 'layup' | 'assembly'): Promise<void>;

    // History
    getHistory(entityId: string, entityType: 'material' | 'layup' | 'assembly'): Promise<EntityHistory[]>;
    createHistoryEntry(entry: Omit<EntityHistory, 'id' | 'createdAt' | 'createdBy'>): Promise<EntityHistory>;
    deleteHistoryEntry(id: string): Promise<void>;

    // Standard Parts
    getStandardParts(): Promise<StandardPart[]>;
    createStandardPart(part: Omit<StandardPart, 'id' | 'createdAt'>): Promise<StandardPart>;
    updateStandardPart(id: string, updates: Partial<StandardPart>): Promise<void>;
    deleteStandardPart(id: string): Promise<void>;
}
