export type EntityStatus = "standard" | "blocked" | "in_review" | "obsolete" | "restricted" | "archived" | "active" | "approved";

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
}

export interface Laboratory {
    id: string;
    name: string;
    authorizedMethods: string[]; // List of Test Method names or IDs
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
    materialId?: string; // Optional because it might not be linked yet
    layupId?: string;    // Link to Layup
    propertyDefinitionId: string; // Made mandatory

    values: number[];
    resultValue: number;
    statistics?: {
        mean: number;
        stdDev: number;
        cv: number;
        min: number;
        max: number;
        n: number;
        bBasis?: number;
        aBasis?: number;
        warnings?: string[];
    };

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
    specification: string; // The context (e.g. "Airbus A350 Spec", "Datasheet 2024")
}

export interface Allowable {
    id: string;
    parentId: string; // Material ID or Layup ID
    parentType: 'material' | 'layup';
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

    version: number; // Incremented on "edit" (which creates new ID actually, but tracks lineage)
    previousVersionId?: string;

    createdAt: string;
    createdBy: string;
}

export interface AssemblyComponent {
    componentType: "layup" | "sub-assembly" | "standard-part";
    componentId: string;
    quantity: number;
    position?: string;
}

export interface Assembly {
    id: string;
    name: string;
    description: string;
    components: AssemblyComponent[];
    status: EntityStatus;
    measurements: Measurement[];
    createdAt: string;
    version: number;
}
