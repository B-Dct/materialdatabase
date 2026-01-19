import type { Material, Layup, Assembly, PropertyDefinition, Measurement } from "@/types/domain";

export interface NormalizedEntity {
    id: string;
    name: string;
    type: 'material' | 'layup' | 'assembly';
    metrics: Record<string, number | null>; // KPI key -> Value
    properties: Record<string, { value: number; unit: string }>; // Prop ID -> Value
}

export function calculateDelta(baseline: number | null, current: number | null): number | null {
    if (baseline === null || current === null || baseline === 0) return null;
    return ((current - baseline) / baseline) * 100;
}

/**
 * Normalizes different entity types into a single structure for comparison.
 */
export function normalizeEntityData(
    entity: Material | Layup | Assembly,
    type: 'material' | 'layup' | 'assembly',
    measurements: Measurement[] = [],
    properties: PropertyDefinition[] = [],
    sourceStrategy: 'auto' | 'properties' | 'measurements' = 'auto'
): NormalizedEntity {
    const normalized: NormalizedEntity = {
        id: entity.id,
        name: entity.name,
        type,
        metrics: {},
        properties: {}
    };

    if (type === 'material') {
        const mat = entity as Material;

        // 2. Properties (Aggregated from Measurements)
        properties.forEach(prop => {
            // Find measurements for this material and property
            const relevantmeasures = measurements.filter(m =>
                m.materialId === mat.id &&
                m.propertyDefinitionId === prop.id
            );

            const cleanPropName = prop.name.trim().toLowerCase();

            // AUTO Strategy: Prefer Measurements, Fallback to Properties
            if (sourceStrategy === 'auto') {
                if (relevantmeasures.length > 0) {
                    const sum = relevantmeasures.reduce((acc, m) => acc + (Number(m.resultValue) || 0), 0);
                    const avg = sum / relevantmeasures.length;
                    normalized.properties[prop.id] = { value: avg, unit: prop.unit };
                } else if (mat.properties && mat.properties.length > 0) {
                    const manualProp = mat.properties.find(p => p.name.trim().toLowerCase() === cleanPropName);
                    if (manualProp) {
                        const valStr = String(manualProp.value).replace(',', '.');
                        normalized.properties[prop.id] = { value: Number(valStr) || 0, unit: manualProp.unit };
                    } else {
                        normalized.properties[prop.id] = { value: 0, unit: prop.unit };
                    }
                } else {
                    normalized.properties[prop.id] = { value: 0, unit: prop.unit };
                }
            }
            // PROPERTIES Strategy: Strictly use Material Properties
            else if (sourceStrategy === 'properties') {
                let val = 0;
                if (mat.properties && mat.properties.length > 0) {
                    const manualProp = mat.properties.find(p => p.name.trim().toLowerCase() === cleanPropName);
                    if (manualProp) {
                        const valStr = String(manualProp.value).replace(',', '.');
                        val = Number(valStr) || 0;
                    }
                }
                normalized.properties[prop.id] = { value: val, unit: prop.unit };
            }
            // MEASUREMENTS Strategy: Strictly use Measurements
            else if (sourceStrategy === 'measurements') {
                if (relevantmeasures.length > 0) {
                    const sum = relevantmeasures.reduce((acc, m) => acc + (Number(m.resultValue) || 0), 0);
                    const avg = sum / relevantmeasures.length;
                    normalized.properties[prop.id] = { value: avg, unit: prop.unit };
                } else {
                    normalized.properties[prop.id] = { value: 0, unit: prop.unit };
                }
            }
        });
    } else if (type === 'layup') {
        const layup = entity as Layup;
        normalized.metrics['total_weight'] = layup.totalWeight || null;
        normalized.metrics['total_thickness'] = layup.totalThickness || null;
        normalized.metrics['total_weight'] = null;
    }

    return normalized;
}

export const formatDelta = (val: number | null) => {
    if (val === null) return "-";
    const sign = val > 0 ? "+" : "";
    return `${sign}${val.toFixed(1)}%`;
};

export const getDeltaColor = (val: number | null, inverse: boolean = false) => {
    if (val === null) return "text-muted-foreground";
    if (val === 0) return "text-muted-foreground";

    // Default: Higher is Green (Good), Lower is Red (Bad)
    // Inverse (e.g. Weight, Cost): Lower is Green (Good), Higher is Red (Bad)
    const isPositive = val > 0;

    if (inverse) {
        return isPositive ? "text-rose-500" : "text-emerald-500";
    }
    return isPositive ? "text-emerald-500" : "text-rose-500";
};

export interface SubstitutionConstraint {
    propertyId: string;
    min?: number;
    max?: number;
}

export interface SimilarityResult {
    entity: NormalizedEntity;
    score: number; // 0-100 match score
    matchDetails: string[]; // Reasons for match
}

export function findSimilarEntities(
    target: NormalizedEntity,
    candidates: NormalizedEntity[],
    constraints: SubstitutionConstraint[]
): SimilarityResult[] {
    return candidates
        .filter(c => c.id !== target.id) // Exclude self
        .map(candidate => {
            // 1. Check Hard Constraints
            for (const constr of constraints) {
                const val = candidate.properties[constr.propertyId]?.value ?? candidate.metrics[constr.propertyId];
                if (val === undefined || val === null) return null; // Missing data = Fail constraint? Or skip? Let's fail for now.
                if (constr.min !== undefined && val < constr.min) return null;
                if (constr.max !== undefined && val > constr.max) return null;
            }

            // 2. Calculate Similarity Score
            // Simple approach: Euclidean distance on key normalized props?
            // Or weighted scoring of improvements.
            // Let's do a simple "Property Match" score for now.
            // Compare shared available properties.

            let totalDev = 0;
            let count = 0;
            const reasons: string[] = [];

            // Metrics
            Object.keys(target.metrics).forEach(key => {
                const tv = target.metrics[key];
                const cv = candidate.metrics[key];
                if (tv && cv) {
                    const dev = Math.abs((cv - tv) / tv);
                    totalDev += dev;
                    count++;
                    if (dev < 0.1) reasons.push(`Similiar ${key.replace('_', ' ')}`);
                }
            });

            // Properties
            Object.keys(target.properties).forEach(key => {
                const tv = target.properties[key]?.value;
                const cv = candidate.properties[key]?.value;
                if (tv && cv) {
                    const dev = Math.abs((cv - tv) / tv);
                    totalDev += dev;
                    count++;
                }
            });

            if (count === 0) return { entity: candidate, score: 0, matchDetails: [] };

            const avgDev = totalDev / count;
            const score = Math.max(0, 100 - (avgDev * 100)); // 0 deviation = 100 score

            return {
                entity: candidate,
                score,
                matchDetails: reasons
            };
        })
        .filter(Boolean) as SimilarityResult[]; // Remove nulls (failed constraints)
}

export interface HistoryPoint {
    date: string;
    value: number;
    labId?: string;
    id: string; // Measurement ID
}

export function getHistoryData(
    measurements: Measurement[],
    entityId: string,
    propertyId: string,
    limitType: 'count' | 'date',
    limitValue: number | { start: Date, end: Date }
): HistoryPoint[] {
    // 1. Filter by Entity and Property
    let relevant = measurements.filter(m =>
        (m.materialId === entityId || m.layupId === entityId) &&
        m.propertyDefinitionId === propertyId
    );

    // 2. Sort by Date (Ascending)
    relevant.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // 3. Apply Limits
    if (limitType === 'count' && typeof limitValue === 'number') {
        // Take last N
        return relevant.slice(-limitValue).map(m => ({
            date: m.date,
            value: m.resultValue,
            labId: m.laboratoryId,
            id: m.id
        }));
    } else if (limitType === 'date' && typeof limitValue === 'object') {
        const { start, end } = limitValue;
        return relevant.filter(m => {
            const d = new Date(m.date);
            return d >= start && d <= end;
        }).map(m => ({
            date: m.date,
            value: m.resultValue,
            labId: m.laboratoryId,
            id: m.id
        }));
    }

    return [];
}
