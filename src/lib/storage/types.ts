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
    AssignableEntityType
} from '@/types/domain';

export interface MaterialUsageRecord {
    projectId: string;
    projectName: string;
    projectStatus: string;
    listId: string;
    listName: string;
    listRevision: string;
    listStatus: string;
}

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
    archiveLayup(id: string): Promise<void>;
    getLayupUsage(layupId: string): Promise<{ assemblyId: string, assemblyName: string }[]>;

    // Assemblies
    getAssemblies(): Promise<Assembly[]>;
    createAssembly(assembly: Omit<Assembly, 'id' | 'createdAt' | 'components'>, components: Omit<AssemblyComponent, 'id' | 'sequence'>[]): Promise<Assembly>;
    updateAssembly(id: string, updates: Partial<Assembly>): Promise<void>;
    deleteAssembly(id: string): Promise<void>;
    archiveAssembly(id: string): Promise<void>;
    getAssemblyUsage(assemblyId: string): Promise<{ assemblyId: string, assemblyName: string }[]>;
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
    deleteRequirementProfile(id: string): Promise<void>;

    getLaboratories(includeArchived?: boolean): Promise<Laboratory[]>;
    createLaboratory(lab: Omit<Laboratory, 'id'>): Promise<Laboratory>;
    updateLaboratory(id: string, updates: Partial<Laboratory>): Promise<void>;
    archiveLaboratory(id: string): Promise<void>;
    deleteLaboratory(id: string): Promise<void>;

    getMeasurements(): Promise<Measurement[]>;
    createMeasurement(measurement: Omit<Measurement, 'id' | 'createdAt'>): Promise<Measurement>;
    updateMeasurement(id: string, updates: Partial<Measurement>): Promise<void>;
    deleteMeasurement(id: string): Promise<void>;

    getProcesses(includeArchived?: boolean): Promise<ManufacturingProcess[]>;
    createProcess(process: Omit<ManufacturingProcess, 'id'>): Promise<ManufacturingProcess>;
    updateProcess(id: string, updates: Partial<ManufacturingProcess>): Promise<void>;
    archiveProcess(id: string): Promise<void>;
    deleteProcess(id: string): Promise<void>;

    getTestMethods(): Promise<TestMethod[]>;
    createTestMethod(method: Omit<TestMethod, 'id'>): Promise<TestMethod>;
    updateTestMethod(id: string, updates: Partial<TestMethod>): Promise<void>;
    deleteTestMethod(id: string): Promise<void>;

    getMaterialTypes(includeArchived?: boolean): Promise<MaterialTypeDefinition[]>;
    createMaterialType(type: string): Promise<MaterialTypeDefinition>;
    deleteMaterialType(type: string): Promise<void>;
    archiveMaterialType(type: string): Promise<void>;
    restoreMaterialType(type: string): Promise<void>;

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

    // Storage / Files
    uploadFile(bucket: string, path: string, file: File): Promise<string>;

    // Projects
    getProjects(): Promise<Project[]>;
    createProject(project: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>): Promise<Project>;
    updateProject(id: string, updates: Partial<Project>): Promise<void>;
    deleteProject(id: string): Promise<void>;

    // Project Work Packages
    getProjectWorkPackages(projectId: string): Promise<ProjectWorkPackage[]>;
    createProjectWorkPackage(wp: Omit<ProjectWorkPackage, 'id' | 'createdAt' | 'updatedAt'>): Promise<ProjectWorkPackage>;
    updateProjectWorkPackage(id: string, updates: Partial<ProjectWorkPackage>): Promise<void>;
    deleteProjectWorkPackage(id: string): Promise<void>;
    closeProjectWorkPackageList(id: string, listType: AssignableEntityType, changelog: string, snapshot: any): Promise<void>;
    reopenProjectWorkPackageList(id: string, listType: AssignableEntityType, currentRevision: string): Promise<string>;
    getWorkPackageRevisions(workPackageId: string, listType?: AssignableEntityType): Promise<WorkPackageRevision[]>;

    // Project Lists (Deprecated but kept for compat)
    getProjectLists(projectId: string): Promise<{ materialLists: ProjectMaterialList[], processLists: ProjectProcessList[] }>;

    // Material Lists
    createMaterialList(list: Omit<ProjectMaterialList, 'id' | 'createdAt' | 'updatedAt'>): Promise<ProjectMaterialList>;
    updateMaterialList(id: string, updates: Partial<ProjectMaterialList>): Promise<void>;
    deleteMaterialList(id: string): Promise<void>;

    // Process Lists
    createProcessList(list: Omit<ProjectProcessList, 'id' | 'createdAt' | 'updatedAt'>): Promise<ProjectProcessList>;
    updateProcessList(id: string, updates: Partial<ProjectProcessList>): Promise<void>;
    deleteProcessList(id: string): Promise<void>;

    // Queries
    getMaterialUsage(materialId: string): Promise<MaterialUsageRecord[]>;
}
