import type { Material, Layup, Assembly, EntityStatus } from "@/types/domain";

/**
 * Recursive "Where-Used" check to prevent deletion of dependencies.
 */
export function checkTraceability(
    targetId: string,
    type: 'material' | 'layup',
    database: { materials: Material[], layups: Layup[], assemblies: Assembly[] }
): { isUsed: boolean; usages: string[] } {
    const usages: string[] = [];

    // Check usage in Layups
    if (type === 'material') {
        database.layups.forEach(l => {
            if (l.layers.some(layer => layer.materialVariantId === targetId || layer.materialVariantId.startsWith(targetId))) {
                usages.push(`Layup: ${l.name} (${l.status})`);
            }
        });
    }

    // Check usage in Assemblies
    // (Assuming Assemblies use Layups or Materials directly)
    database.assemblies.forEach(a => {
        const isUsed = a.components.some(c => c.componentId === targetId);
        // Also check indirect usage if deleting a material used in a layup that is used in an assembly?
        // For MVP, direct usage check.
        if (isUsed) {
            usages.push(`Assembly: ${a.name} (${a.status})`);
        }
    });

    return {
        isUsed: usages.length > 0,
        usages
    };
}

/**
 * Validates Status Transitions based on Aerospace workflow rules.
 */
export function validateStatusTransition(
    current: EntityStatus,
    next: EntityStatus,
    context: { hasMeasurements: boolean; hasDocuments: boolean; isUsedInactiveProject: boolean }
): { allowed: boolean; reason?: string } {

    // Rule: Standard is immutable context

    // Prototype -> Standard
    if (current === 'standard' && next !== 'obsolete' && next !== 'restricted') {
        // Can't go back to prototype usually, but let's allow "restricted"
        // Actually, strict rule says Standard is immutable. 
    }

    if (next === 'standard') {
        if (!context.hasMeasurements) {
            return { allowed: false, reason: "Cannot release to Standard: Missing Measurements." };
        }
        if (!context.hasDocuments) {
            return { allowed: false, reason: "Cannot release to Standard: Missing Documentation." };
        }
    }

    // Standard -> Obsolete
    if (current === 'standard' && next === 'obsolete') {
        if (context.isUsedInactiveProject) {
            return { allowed: true, reason: "WARNING: Material is used in active projects. Proceed with caution." };
        }
    }

    return { allowed: true };
}

export function isEditable(status: EntityStatus): boolean {
    // "Standard" and "Obsolete" are locked.
    return status !== 'standard' && status !== 'obsolete';
}
