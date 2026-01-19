/**
 * AeroStats Unit Conversion Module
 * Support for standard aerospace conversions.
 */

export type UnitType = 'stress' | 'temperature' | 'density' | 'length' | 'weight';

export const CONVERSION_FACTORS = {
    // Stress: MPa <-> ksi
    mpa_to_ksi: 0.145038,
    ksi_to_mpa: 6.89476,

    // Temperature: C <-> F
    // Special handling needed for formula

    // Density: g/cm3 <-> lb/in3
    gcm3_to_lbin3: 0.0361273,
    lbin3_to_gcm3: 27.6799,

    // Length: mm <-> in
    mm_to_in: 0.0393701,
    in_to_mm: 25.4,

    // Weight: kg <-> lb
    kg_to_lb: 2.20462,
    lb_to_kg: 0.453592
};

export function convertUnit(value: number, type: UnitType, toSystem: 'SI' | 'Imperial'): number {
    if (value === null || value === undefined) return 0;

    switch (type) {
        case 'stress':
            // SI = MPa, Imperial = ksi
            return toSystem === 'Imperial' ? value * CONVERSION_FACTORS.mpa_to_ksi : value * CONVERSION_FACTORS.ksi_to_mpa;

        case 'temperature':
            // SI = C, Imperial = F
            return toSystem === 'Imperial' ? (value * 9 / 5) + 32 : (value - 32) * 5 / 9;

        case 'density':
            // SI = g/cm3, Imperial = lb/in3
            return toSystem === 'Imperial' ? value * CONVERSION_FACTORS.gcm3_to_lbin3 : value * CONVERSION_FACTORS.lbin3_to_gcm3;

        case 'length':
            // SI = mm, Imperial = in
            return toSystem === 'Imperial' ? value * CONVERSION_FACTORS.mm_to_in : value * CONVERSION_FACTORS.in_to_mm;

        case 'weight':
            // SI = kg, Imperial = lb
            return toSystem === 'Imperial' ? value * CONVERSION_FACTORS.kg_to_lb : value * CONVERSION_FACTORS.lb_to_kg;

        default:
            return value;
    }
}

export function formatUnit(value: number, unit: string, type: UnitType, targetSystem: 'SI' | 'Imperial'): string {
    const converted = convertUnit(value, type, targetSystem);
    let targetUnit = unit;

    // Simple label mapping
    if (type === 'stress') targetUnit = targetSystem === 'SI' ? 'MPa' : 'ksi';
    if (type === 'temperature') targetUnit = targetSystem === 'SI' ? '°C' : '°F';
    if (type === 'density') targetUnit = targetSystem === 'SI' ? 'g/cm³' : 'lb/in³';
    if (type === 'length') targetUnit = targetSystem === 'SI' ? 'mm' : 'in';
    if (type === 'weight') targetUnit = targetSystem === 'SI' ? 'kg' : 'lb';

    return `${converted.toFixed(2)} ${targetUnit}`;
}
