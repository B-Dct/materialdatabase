import type { Material, MaterialVariant, EntityStatus } from '@/types/domain';
// Helper for realistic data
const manufacturers = ["Hexcel", "Toray", "Solvay", "Mitsubishi", "Gurit"];
const types = ["Prepreg", "Resin", "Adhesive", "Core", "Fiber"];
const statuses: EntityStatus[] = ["active", "standard", "restricted", "obsolete", "engineering"];

// Mock Materials
export const generateMockMaterials = (count: number): Material[] => {
    return Array.from({ length: count }).map((_, i) => {
        const type = types[Math.floor(Math.random() * types.length)];
        const manufacturer = manufacturers[Math.floor(Math.random() * manufacturers.length)];

        const reachStatuses: Array<'reach_compliant' | 'svhc_contained' | 'restricted'> = ['reach_compliant', 'svhc_contained', 'restricted'];
        const listNumber = Math.floor(Math.random() * 90000) + 10000;

        return {
            id: `mat-${i + 1}`,
            materialId: `MAT-${String(i + 1).padStart(3, '0')}`,
            materialListNumber: `L-${listNumber}`,
            name: `${manufacturer} ${type} ${Math.floor(Math.random() * 1000)}`,
            description: `High performance ${type.toLowerCase()} for aerospace applications.`,
            manufacturer,
            manufacturerAddress: "Aerospace Blvd 123, 8000 Zurich, Switzerland",
            supplier: Math.random() > 0.5 ? "Direct" : "Composites Distribution Inc.",
            type,
            reachStatus: reachStatuses[Math.floor(Math.random() * reachStatuses.length)],
            maturityLevel: Math.floor(Math.random() * 3) + 1 as 1 | 2 | 3,
            status: statuses[Math.floor(Math.random() * statuses.length)],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
    });
};

// Mock Variants
export const generateMockVariants = (materials: Material[]): MaterialVariant[] => {
    const variants: MaterialVariant[] = [];

    materials.forEach(mat => {
        // Create 1-3 variants per material
        const variantCount = Math.floor(Math.random() * 3) + 1;

        for (let i = 0; i < variantCount; i++) {
            variants.push({
                ...mat,
                variantId: `${mat.id}-v${i + 1}`,
                baseMaterialId: mat.id,
                variantName: i === 0 ? "Standard Grade" : i === 1 ? "High Tg" : "Low Flow",
                properties: [] // Use empty array to satisfy new MaterialProperty[] type
            });
        }
    });

    return variants;
};
