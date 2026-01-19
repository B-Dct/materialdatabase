export interface StatsResult {
    mean: number;
    stdDev: number;
    cv: number; // Coefficient of Variation in %
    min: number;
    max: number;
    n: number;
    bBasis?: number;
    aBasis?: number;
    warnings: string[];
}

/**
 * Approximate k-factor lookup for Normal Distribution One-Sided Tolerance Limit
 * References: DOT/FAA/AR-03/19, CMH-17-1G
 */

// B-Basis: 90% Probability, 95% Confidence
// Sample Size n -> kB
// For n > 100, approximation is typically used.
const K_FACTOR_B: Record<number, number> = {
    2: 20.581, 3: 6.155, 4: 4.162, 5: 3.407, 6: 3.006, 7: 2.755, 8: 2.582, 9: 2.454,
    10: 2.355, 11: 2.275, 12: 2.210, 13: 2.155, 14: 2.109, 15: 2.068, 16: 2.031,
    17: 1.999, 18: 1.970, 19: 1.944, 20: 1.920, 21: 1.898, 22: 1.878, 23: 1.859,
    24: 1.842, 25: 1.826, 26: 1.810, 27: 1.796, 28: 1.783, 29: 1.770, 30: 1.758,
    35: 1.708, 40: 1.671, 45: 1.643, 50: 1.621, 60: 1.587, 70: 1.562, 80: 1.543,
    90: 1.528, 100: 1.515
};

// A-Basis: 99% Probability, 95% Confidence
const K_FACTOR_A: Record<number, number> = {
    2: 37.094, 3: 10.553, 4: 7.042, 5: 5.741, 6: 5.062, 7: 4.642, 8: 4.354, 9: 4.143,
    10: 3.981, 11: 3.852, 12: 3.747, 13: 3.659, 14: 3.585, 15: 3.520, 16: 3.464,
    17: 3.414, 18: 3.370, 19: 3.331, 20: 3.295, 21: 3.263, 22: 3.233, 23: 3.206,
    24: 3.181, 25: 3.158, 26: 3.136, 27: 3.116, 28: 3.098, 29: 3.080, 30: 3.064,
    35: 2.995, 40: 2.943, 45: 2.904, 50: 2.873, 60: 2.825, 70: 2.789, 80: 2.762,
    90: 2.741, 100: 2.723
};

function getKFactor(n: number, type: 'A' | 'B'): number {
    const table = type === 'A' ? K_FACTOR_A : K_FACTOR_B;

    // Direct lookup
    if (table[n]) return table[n];

    // Simple fallback for n > 100 or missing intermediate values (Linear Interpolation or Approximation)
    // For this MVP, we use the closest lower n key or 1.282 (z-score 90%) / 2.326 (z-score 99%) for infinity
    // But safely, let's find the closest defined key <= n
    const distinctKeys = Object.keys(table).map(Number).sort((a, b) => a - b);
    const closest = distinctKeys.reverse().find(k => k <= n);

    if (closest) return table[closest];

    // Fallback for n < 2 (should not happen)
    return 0;
}

export function calculateStats(values: number[]): StatsResult {
    const validValues = values.filter(v => v !== null && v !== undefined && !isNaN(v));
    const cleanN = validValues.length;
    const warnings: string[] = [];

    if (cleanN === 0) {
        return { mean: 0, stdDev: 0, cv: 0, min: 0, max: 0, n: 0, warnings: ["No valid data provided"] };
    }

    // 1. Basic Stats
    const sum = validValues.reduce((a, b) => a + b, 0);
    const mean = sum / cleanN;
    const min = Math.min(...validValues);
    const max = Math.max(...validValues);

    // 2. Std Dev
    let variance = 0;
    if (cleanN > 1) {
        const sumSqDiff = validValues.reduce((a, b) => a + Math.pow(b - mean, 2), 0);
        variance = sumSqDiff / (cleanN - 1); // Sample Variance
    }
    const stdDev = Math.sqrt(variance);
    const cv = mean !== 0 ? (stdDev / mean) * 100 : 0;

    // Warnings
    if (cleanN < 5) warnings.push("Low reliability (n<5).");
    if (cleanN < 30) warnings.push("Vorsicht: Geringe Stichprobengröße. Statistische Signifikanz für Zertifizierung nicht ausreichend.");
    if (cv > 10) warnings.push("High variability (CV > 10%).");

    // 3. Basis Values
    // B-Basis = Mean - kB * StdDev
    // A-Basis = Mean - kA * StdDev
    // Only calculate if n >= 2 (technically possible, but k is huge)
    let bBasis: number | undefined;
    let aBasis: number | undefined;

    if (cleanN >= 2) {
        const kB = getKFactor(cleanN, 'B');
        bBasis = mean - (kB * stdDev);

        const kA = getKFactor(cleanN, 'A');
        aBasis = mean - (kA * stdDev);
    }

    return {
        mean,
        stdDev,
        cv,
        min,
        max,
        n: cleanN,
        bBasis,
        aBasis,
        warnings
    };
}
