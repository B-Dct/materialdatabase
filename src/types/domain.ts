export type EntityStatus = "active" | "standard" | "restricted" | "obsolete" | "engineering";

export interface StandardPart {
    id: string;
    name: string; // Designation
    manufacturer: string;
    supplier: string;
    status: EntityStatus;
    createdAt: string;
}

export interface ProcessParameter {
    key: string;
    value: string | number;
    unit?: string;
}

export interface ManufacturingProcess {
    id: string;
    name: string;
    description?: string;
    defaultParams?: Record<string, any>;
    // New fields
    subProcess?: string;
    processNumber?: string;
    entryStatus?: 'active' | 'archived';
}

export interface TestMethodPropertyConfig {
    propertyId: string;
    statsTypes: ('mean' | 'range' | 'design')[]; // mean, range (min/max), design (A/B)
}

export interface TestMethod {
    id: string;
    name: string; // Short ID e.g. "ISO 527-4"
    title?: string; // Descriptive title e.g. "Tensile Properties"
    category?: 'mechanical' | 'physical' | 'chemical';
    description?: string;
    properties: TestMethodPropertyConfig[]; // Ordered list with config
}

export interface PropertyDefinition {
    id: string;
    name: string; // e.g. "Tensile Strength"
    unit: string; // e.g. "MPa"
    dataType: "numeric" | "text" | "range";
    testMethods?: string[]; // e.g. ["ISO 527-4", "ASTM D3039"]
    options?: string[]; // Allowable values for text/enum types
    category: "mechanical" | "chemical" | "physical";
    scope?: "material" | "layup" | "assembly"; // Default 'material'
    statsConfig?: {
        calculateBasic: boolean;
        calculateBBasis: boolean;
        calculateABasis: boolean;
    };
    inputStructure?: "single" | "min-mean-max"; // UI configuration for input fields
}

export interface MeasurementStatistics {
    mean: number;
    min: number;
    max: number;
    stdDev: number;
    cv: number; // Coefficient of Variation
    n: number;
    // New fields for Design Values
    aValue?: number;
    bValue?: number;
    kFactor?: number; // Store the k-factor used?
}

export interface RequirementRule {
    propertyId: string;
    min?: number;
    max?: number;
    target?: number | string;
    unit?: string;
    method?: string; // e.g. "ISO 527-4"
    scope?: 'material' | 'layup'; // Default 'material'
    referenceArchitectureId?: string; // ID of ReferenceLayupArchitecture
    referenceLayupId?: string; // For backward compatibility / specific layup instance
    requirementProfileId?: string; // Link back to Profile
}

export interface ReferenceLayupArchitecture {
    id: string; // UUID
    name: string; // e.g. "Type 1"
    description: string; // e.g. "Monolithic 2-layer"
    layerCount: number;
    thickness: number; // in mm
    processId?: string; // Link to ManufacturingProcess
    stackSequence?: string; // Text description
}

export interface RequirementProfile {
    id: string;
    name: string; // e.g. "Airbus A350 Interior Spec"
    description: string;
    rules: RequirementRule[];
    applicability?: string[]; // tags: 'layup', 'material:<type>'
    document?: MaterialDocument; // Linked PDF
    layupArchitectures?: ReferenceLayupArchitecture[]; // New field
}

export interface Laboratory {
    id: string;
    name: string;
    description?: string;
    authorizedMethods: string[]; // List of Test Method names or IDs
    city?: string;
    country?: string;
    entryStatus?: 'active' | 'archived';
}

export interface MaterialDocument {
    id: string;
    name: string;
    category: string;
    url: string;
    uploadedAt: string;
}

export interface Measurement {
    id: string;
    isActive?: boolean; // Default true if undefined
    materialId?: string; // Optional because it might not be linked yet
    layupId?: string;    // Link to Layup (Physical Instance)
    referenceLayupId?: string; // Link to Reference Layup (Standard Definition)
    assemblyId?: string; // Link to Assembly
    propertyDefinitionId: string; // Made mandatory
    orderNumber: string; // Mandatory Order Number
    referenceNumber?: string; // Optional Reference Number (e.g. Coupon ID)
    comment?: string; // Optional Comment

    values: number[];
    resultValue: number;
    statistics?: MeasurementStatistics;

    unit: string;
    laboratoryId?: string;

    // Process parameters are mandatory for context
    processParams: Record<string, any>;
    date: string;
    sourceType: "manual" | "import" | "pdf";
    sourceRef?: string; // Link to file (URL)
    sourceFilename?: string; // Display name

    // QC Fields
    reliability?: "allowable" | "engineering" | "feasibility";
    testMethod?: string; // Snapshot of method used

    attachments?: MaterialDocument[];
    createdAt?: string;
}

export interface MaterialProperty {
    id: string;
    name: string; // or link to PropertyDefinition
    value: string | number;
    unit: string;
    method?: string; // Selected test method (e.g. ISO 527-4)
    referenceLayupId?: string; // Context: Reference Layup used (Concrete)
    referenceArchitectureId?: string; // Context: Reference Architecture (Abstract, from Profile)
    specification: string; // DEPRECATED: Use specificationId
    specificationId?: string; // Link to MaterialSpecification
    requirementProfileId?: string; // Link to specific RequirementProfile

    // Optional statistical values if property uses "min-mean-max" structure
    vMin?: number;
    vMax?: number;
    vMean?: number;
}

export interface MaterialTypeDefinition {
    name: string;
    entryStatus: 'active' | 'archived';
}

export interface MaterialSpecification {
    id: string;
    materialId?: string; // Link to Material
    layupId?: string;    // Link to Layup
    assemblyId?: string; // Link to Assembly
    name: string; // e.g. "Datasheet V1", "ABS 5006"
    code?: string; // Specification Code e.g. "BMS 8-124"
    revision?: string;
    status?: string; // "Draft", "Active", "Obsolete"
    validFrom?: string; // ISO Date
    documentUrl?: string;
    description?: string;
    createdAt?: string;

    // Optional: aggregated properties if loaded
    properties?: any[]; // MaterialProperty[] but simplified for now to avoid circular deps if any

    // New: Link to Requirement Profile (Standard)
    requirementProfileId?: string;
}

export interface Allowable {
    id: string;
    parentId: string; // Material ID or Layup ID
    parentType: 'material' | 'layup' | 'assembly';
    name: string;
    value: string;
    unit: string;
    basis?: string; // e.g. "A-Basis", "Mean"
    sourceMeasurementId: string; // Link to supporting measurement
}

export interface Material {
    id: string; // Base Material ID
    materialId: string; // User defined ID (e.g. "MAT-001")
    materialListNumber: string;
    name: string;
    description: string;
    status: EntityStatus;
    manufacturer: string;
    manufacturerAddress: string;
    supplier?: string;
    type: string; // e.g. "Prepreg", "Resin"
    reachStatus: 'reach_compliant' | 'svhc_contained' | 'restricted';
    maturityLevel: 1 | 2 | 3;

    assignedProfileIds?: string[]; // IDs of RequirementProfiles (Standards)
    assignedReferenceLayupIds?: string[]; // New: Contexts
    assignedReferenceAssemblyIds?: string[]; // New: Contexts
    measurements?: Measurement[]; // Actual lab results
    documents?: MaterialDocument[]; // Replaces simple datasheets
    variants?: MaterialVariant[];
    createdAt: string;
    updatedAt: string;

    properties?: MaterialProperty[]; // Specific properties with context
    allowables?: Allowable[]; // Derived allowables backed by measurements
}

export interface MaterialVariant extends Material {
    variantId: string;
    baseMaterialId: string;
    variantName: string; // e.g. "Type 1", "Grade A"
    // properties is inherited from Material, but could be overridden or extended
}

export interface LayupLayer {
    id: string;
    materialVariantId: string;
    orientation: number; // e.g. 0, 45, 90
    sequence: number; // Order in stack
}

export interface Layup {
    id: string; // Unique Immutable ID (UUID)
    name: string;
    description?: string;
    layers: LayupLayer[];
    totalThickness: number; // Calculated
    totalWeight: number; // Calculated
    status: EntityStatus;

    // New Fields
    productionSite?: string;
    restrictionReason?: string;

    // Explicit Reference Definition
    isReference?: boolean;
    materialId?: string; // If this layup is a reference layup FOR a specific material
    architectureTypeId?: string; // Link to ReferenceLayupArchitecture.id

    // A layup is defined by its process (e.g. Curing Cycle)
    processId?: string; // Link to ManufacturingProcess
    processParams: Record<string, string | number>;

    assignedProfileIds?: string[]; // IDs of RequirementProfiles (Standards)
    measurements: Measurement[];
    allowables?: Allowable[];
    properties?: MaterialProperty[]; // Manual properties specific to this layup

    version: number; // Incremented on "edit" (which creates new ID actually, but tracks lineage)
    previousVersionId?: string;

    createdAt: string;
    createdBy: string;
}

export interface ComponentConfig {
    coatingThickness?: {
        min: number;
        max: number;
        unit: 'µm';
    };
    adhesiveGrammage?: {
        min: number;
        max: number;
        unit: 'g/m²';
    };
}

export interface AssemblyComponent {
    id: string; // Unique instance ID
    componentType: "layup" | "material" | "standard_part"; // Removed sub-assembly for now
    componentId: string; // ID of the Layup or Material(Variant)
    componentName: string; // Snapshot name
    quantity: number;
    sequence: number; // Order in stack
    // Position removed or kept optional? Let's keep it simple for stack logic
    position?: string;
    config?: ComponentConfig;
}

export interface Assembly {
    id: string;
    name: string;
    description: string;

    // Stack
    components: AssemblyComponent[];

    // Process
    processIds: string[]; // Multiple processes

    // Status
    status: EntityStatus;

    // Quality & Integrity
    properties: MaterialProperty[]; // Assembly-specific properties
    assignedProfileIds?: string[]; // IDs of RequirementProfiles
    measurements: Measurement[];
    allowables?: Allowable[]; // Derived allowables

    createdAt: string;
    version: number;

    // Manual Fields
    totalWeight?: number;
    totalThickness?: number;
}

export interface EntityHistory {
    id: string;
    entityType: 'material' | 'layup' | 'assembly';
    entityId: string;
    content: string;
    createdAt: string;
    createdBy?: string; // User ID
}

export type ProjectStatus = 'Active' | 'On Hold' | 'Completed' | 'Archived';
export type ListStatus = 'draft' | 'frozen' | 'obsolete';

export interface ProjectMaterialListItem {
    id: string; // generated UUID for the list item itself
    materialId: string;
    variantId: string;
    quantity: number;
    unit?: string;
    notes?: string;
    // Snapshot data (captured at time of freeze/add)
    materialName?: string;
    variantName?: string;
    materialNumber?: string;
}

export interface ProjectProcessListItem {
    id: string;
    processId: string;
    notes?: string;
    // Snapshot data
    processName?: string;
}

export interface ProjectMaterialList {
    id: string;
    projectId: string;
    name: string;
    revision: string;
    status: ListStatus;
    items: ProjectMaterialListItem[];
    createdAt: string;
    updatedAt: string;
    createdBy?: string;
}

export interface ProjectProcessList {
    id: string;
    projectId: string;
    name: string;
    revision: string;
    status: ListStatus;
    items: ProjectProcessListItem[];
    createdAt: string;
    updatedAt: string;
    createdBy?: string;
}

export interface Project {
    id: string;
    projectNumber: string;
    name: string;
    description?: string;
    status: ProjectStatus;
    revision: string;
    createdAt: string;
    updatedAt: string;
    createdBy?: string;

    // Optional loaded lists
    materialLists?: ProjectMaterialList[];
    processLists?: ProjectProcessList[];
}
