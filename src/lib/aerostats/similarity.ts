/**
 * AeroStats Similarity Engine
 * Calculates fuzzy similarity between materials/entities.
 */

export interface SimilarityCriteria {
    propertyId: string;
    weight: number; // 0.0 to 1.0
    critical?: boolean; // If true, requires hard tolerance check
    tolerance?: number; // +/- percentage allowed (e.g. 0.10 for 10%)
}

export interface SimilarityResult {
    score: number; // 0 - 100
    isViable: boolean; // True if no critical requirements failed
    details: {
        propertyId: string;
        score: number;
        delta: number; // % difference
        status: 'MATCH' | 'MARGINAL' | 'FAIL' | 'MISSING';
    }[];
}

/**
 * Calculates similarity between a candidate and a reference target.
 * Formula: SS = Sum(w_i * Match_i)
 */
export function calculateSimilarity(
    targetValues: Record<string, number>,
    candidateValues: Record<string, number>,
    criteria: SimilarityCriteria[]
): SimilarityResult {
    let totalScore = 0;
    let totalWeight = 0;
    let isViable = true;
    const details: SimilarityResult['details'] = [];

    for (const c of criteria) {
        const tVal = targetValues[c.propertyId];
        const cVal = candidateValues[c.propertyId];

        // Handle Missing Data
        if (tVal === undefined || cVal === undefined) {
            details.push({
                propertyId: c.propertyId,
                score: 0,
                delta: 0,
                status: 'MISSING'
            });
            if (c.critical) isViable = false;
            continue;
        }

        // Calculate Delta
        const delta = tVal !== 0 ? (cVal - tVal) / tVal : 0;
        const absDelta = Math.abs(delta);

        // Calculate Score component (Linear decay: 0% delta = 100 score, 50% delta = 0 score)
        // Tuneable parameter: "Zero Score Threshold" = 50% deviation
        const zeroScoreThreshold = 0.5;
        const rawScore = Math.max(0, 100 * (1 - (absDelta / zeroScoreThreshold)));

        // Check Criticality
        let status: 'MATCH' | 'MARGINAL' | 'FAIL' = 'MATCH';

        if (c.tolerance) {
            if (absDelta > c.tolerance) {
                status = 'FAIL';
                if (c.critical) isViable = false;
            } else if (absDelta > c.tolerance * 0.8) {
                status = 'MARGINAL';
            }
        }

        // Add to totals
        totalScore += rawScore * c.weight;
        totalWeight += c.weight;

        details.push({
            propertyId: c.propertyId,
            score: rawScore,
            delta: delta * 100,
            status
        });
    }

    // Normalize Final Score
    const finalScore = totalWeight > 0 ? totalScore / totalWeight : 0;

    return {
        score: Math.round(finalScore),
        isViable,
        details
    };
}
