export type EntityStatus = "active" | "standard" | "restricted" | "obsolete" | "engineering";

export interface ProcessParameter {
    key: string;
    value: string | number;
    unit?: string;
}

export interface ManufacturingProcess {
    id: string;
    name: string;
    description: string;
    defaultParams: Record<string, string | number>;
}

export interface TestMethodPropertyConfig {
    propertyId: string;
    statsTypes: ('mean' | 'range' | 'design')[]; // mean, range (min/max), design (A/B)
}

export interface TestMethod {
    id: string;
    name: string;
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
}

export interface RequirementProfile {
    id: string;
    name: string; // e.g. "Airbus A350 Interior Spec"
    description: string;
    rules: RequirementRule[];
    applicability?: string[]; // tags: 'layup', 'material:<type>'
    document?: MaterialDocument; // Linked PDF
}

export interface Laboratory {
    id: string;
    name: string;
    authorizedMethods: string[]; // List of Test Method names or IDs
    city?: string;
    country?: string;
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
    layupId?: string;    // Link to Layup
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
    specification: string; // DEPRECATED: Use specificationId
    specificationId?: string; // Link to MaterialSpecification
    requirementProfileId?: string; // Link to specific RequirementProfile

    // Optional statistical values if property uses "min-mean-max" structure
    vMin?: number;
    vMax?: number;
    vMean?: number;
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
    componentType: "layup" | "material"; // Removed sub-assembly for now
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
}
