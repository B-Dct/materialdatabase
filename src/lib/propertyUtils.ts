import type { PropertyDefinition } from "@/types/domain";

export const CATEGORY_ORDER = ['physical', 'mechanical', 'chemical'];

/**
 * Sorts property definitions or objects containing property names/categories.
 * Prioritizes categories: Physical -> Mechanical -> Chemical -> Others (Alphabetical)
 */
export function sortPropertiesByCategory<T extends { category?: string; name: string }>(
    items: T[],
    definitions: PropertyDefinition[]
): T[] {
    return [...items].sort((a, b) => {
        // Resolve categories
        const catA = a.category || definitions.find(d => d.name === a.name)?.category || 'other';
        const catB = b.category || definitions.find(d => d.name === b.name)?.category || 'other';

        const indexA = CATEGORY_ORDER.indexOf(catA.toLowerCase());
        const indexB = CATEGORY_ORDER.indexOf(catB.toLowerCase());

        // 1. Sort by Category Priority
        if (indexA !== -1 && indexB !== -1) {
            if (indexA !== indexB) return indexA - indexB;
        } else if (indexA !== -1) {
            return -1; // A is in priority list, B is not
        } else if (indexB !== -1) {
            return 1; // B is in priority list, A is not
        }

        // 2. Sort Alphabetically by Name within category (or if both are 'other')
        return a.name.localeCompare(b.name);
    });
}
