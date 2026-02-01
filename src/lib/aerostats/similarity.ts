/**
 * AeroStats - Similarity Engine
 * 
 * Calculates a weighted similarity score between a Target (Reference) material
 * and a Candidate (Alternative) material.
 */

export interface SimilarityCriteria {
    propertyId: string;
    weight: number; // 1-10
    type: 'numeric' | 'text' | 'range';
    isCritical?: boolean; // If true, finding falls below valid range = Immediate Failure
    tolerance?: number; // Absolute tolerance (+/-) or percentage depending on impl. Let's assume Absolute for now. 
    // Future: min/max specific overrides
}

export interface SimilarityResult {
    score: number; // 0.0 to 1.0
    details: {
        propertyId: string;
        score: number;
        delta: number;
        passed: boolean; // For critical checks
    }[];
    isCriticalFailure: boolean;
}

export function calculateSimilarity(
    targetValues: Record<string, number | string>,
    candidateValues: Record<string, number | string>,
    criteria: SimilarityCriteria[]
): SimilarityResult {

    let totalWeightedScore = 0;
    let totalMaxWeight = 0;
    let criticalFailure = false;
    const details = [];

    for (const criterion of criteria) {
        const targetVal = targetValues[criterion.propertyId];
        const candidateVal = candidateValues[criterion.propertyId];
        const weight = criterion.weight;

        totalMaxWeight += weight;

        // 1. Handle Missing Data
        if (targetVal === undefined || candidateVal === undefined) {
            details.push({
                propertyId: criterion.propertyId,
                score: 0,
                delta: 0,
                passed: !criterion.isCritical // Fail if critical and missing
            });
            if (criterion.isCritical) criticalFailure = true;
            continue;
        }

        let score = 0;
        let delta = 0;

        // 2. Numeric Calculation
        if (criterion.type === 'numeric') {
            const t = Number(targetVal);
            const c = Number(candidateVal);
            delta = Math.abs(t - c);
            const tolerance = criterion.tolerance || 0;

            if (delta <= tolerance) {
                // Perfect score if within tolerance
                score = 1.0;
            } else {
                // Linear penalty outside tolerance
                // How much deviation is 0 score? Let's say 50% deviation from target is 0 score?
                // Or use a classic similarity decay: 1 / (1 + delta) -> normalized?
                // Let's use percentage deviation map:
                // Error = (delta - tolerance) / target 
                // e.g. Target 100, Tol 10, Cand 80. Delta 20. Effective Error = (20-10)/100 = 0.1 (10%)
                // Score = 1 - Error.

                // Avoid division by zero
                const divisor = t === 0 ? 1 : Math.abs(t);
                const errorPct = (delta - tolerance) / divisor; // 0.1

                // Scaling: If error is > 50%, score is 0? Or 100% error is 0?
                // "Hebe signifikante Abweichungen > 10% hervor" implies tight sensitivity.
                // Let's being generous: 100% deviation = 0 score.
                score = Math.max(0, 1 - errorPct);
            }
        }
        // 3. Text/Enum Calculation
        else {
            score = (String(targetVal) === String(candidateVal)) ? 1.0 : 0.0;
        }

        // 4. Critical Check
        const passed = !(criterion.isCritical && score < 1.0); // Strict: Critical must be perfect/within tolerance
        if (!passed) criticalFailure = true;

        totalWeightedScore += (score * weight);

        details.push({
            propertyId: criterion.propertyId,
            score,
            delta,
            passed
        });
    }

    // Normalized Score
    const finalScore = totalMaxWeight === 0 ? 0 : (totalWeightedScore / totalMaxWeight);

    return {
        score: criticalFailure ? 0 : finalScore, // Critical failure zeroes out the match? Or just flags it? SKILL says "FAILED markieren". Usually score 0 is safest to sort to bottom.
        details,
        isCriticalFailure: criticalFailure
    };
}
