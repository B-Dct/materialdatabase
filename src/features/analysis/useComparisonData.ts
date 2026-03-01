import { useMemo, useEffect } from 'react';
import { useAppStore } from '@/lib/store';
import type { AnalysisCartItem, RequirementProfile } from '@/types/domain';

export interface ComparisonValue {
    entityId: string;
    requirement?: { min?: number; max?: number; target?: number | string; testMethodId?: string; testMethodName?: string };
    specification?: { min?: number; max?: number; nominal?: number; testMethodId?: string; testMethodName?: string };
    actual?: { value: number; count: number; testMethodId?: string; testMethodName?: string };
}

export interface ComparisonPropertyRow {
    key: string;
    propertyId: string;
    propertyName: string;
    propertyUnit: string;
    propertyCategory: string;

    // Context mapping
    requirementProfileId?: string;
    requirementProfileName?: string;
    referenceArchitectureId?: string;
    referenceArchitectureName?: string;
    testMethodId?: string;
    testMethodName?: string;

    values: ComparisonValue[];
}

export function useComparisonData(cart: AnalysisCartItem[]) {
    const {
        materials,
        layups,
        assemblies,
        properties,
        requirementProfiles,
        specifications,
        measurements, // Added measurements
        testMethods, // Added to resolve names
        fetchSpecificationsForEntities
    } = useAppStore();

    // Fetch specifications for whatever is in the cart
    useEffect(() => {
        if (cart.length > 0) {
            fetchSpecificationsForEntities(cart.map(c => ({ id: c.id, type: c.type })));
        }
    }, [cart, fetchSpecificationsForEntities]);

    const data = useMemo(() => {
        if (cart.length === 0) return [];

        const rowsMap = new Map<string, ComparisonPropertyRow>();

        // Pre-build architecture to profile map for quick lookup
        const archToProfile = new Map<string, RequirementProfile>();
        const archToArch = new Map<string, any>();
        requirementProfiles.forEach(p => {
            p.layupArchitectures?.forEach(a => {
                archToProfile.set(a.id, p);
                archToArch.set(a.id, a);
            });
        });

        const getEntity = (item: AnalysisCartItem) => {
            if (item.type === 'material') return materials.find(m => m.id === item.id);
            if (item.type === 'layup') return layups.find(l => l.id === item.id);
            if (item.type === 'assembly') return assemblies.find(a => a.id === item.id);
            return undefined;
        };

        // Helper to ensure a row exists
        const ensureRow = (propId: string, archId: string, testMethodId?: string, fallbackTmName?: string) => {
            const tmId = testMethodId || 'base';
            const rowKey = `${propId}_${archId}_${tmId}`;
            if (!rowsMap.has(rowKey)) {
                const def = properties.find(p => p.id === propId);
                const tm = testMethods.find(t => t.id === testMethodId);

                let profName;
                let profId;
                let archName;

                if (archId !== 'base') {
                    const prof = archToProfile.get(archId);
                    const arch = archToArch.get(archId);

                    if (prof && arch) {
                        profName = prof.name;
                        profId = prof.id;
                        archName = arch.name;
                    } else {
                        // Fallback: Concrete layup ID used as archId
                        const fallback = layups.find(l => l.id === archId);
                        if (fallback) {
                            archName = fallback.name;
                        }
                    }
                }

                rowsMap.set(rowKey, {
                    key: rowKey,
                    propertyId: propId,
                    propertyName: def?.name || 'Unknown Property',
                    propertyUnit: def?.unit || '',
                    propertyCategory: def?.category || 'Uncategorized',
                    requirementProfileId: profId,
                    requirementProfileName: profName,
                    referenceArchitectureId: archId !== 'base' ? archId : undefined,
                    referenceArchitectureName: archName,
                    testMethodId: testMethodId,
                    testMethodName: tm?.name || fallbackTmName || def?.testMethods?.[0],
                    values: cart.map(c => ({ entityId: c.id }))
                });
            }
            return rowsMap.get(rowKey)!;
        };

        // Process each entity in the cart
        cart.forEach((item, index) => {
            const entity = getEntity(item);
            if (!entity) return;

            // Determine allowed architectures if a standard is selected
            let allowedArchIds: Set<string> | null = null;
            if (item.selectedStandardId) {
                const selectedProfile = requirementProfiles.find(rp => rp.id === item.selectedStandardId);
                if (selectedProfile && selectedProfile.layupArchitectures) {
                    allowedArchIds = new Set(selectedProfile.layupArchitectures.map(a => a.id));
                }
            }

            // 1. Requirements (from Standards/Profiles)
            if (entity.assignedProfileIds && entity.assignedProfileIds.length > 0) {
                // Filter profile IDs based on selection
                let profileIdsToProcess = entity.assignedProfileIds!;
                if (item.selectedStandardId) {
                    profileIdsToProcess = profileIdsToProcess.filter(id => id === item.selectedStandardId);
                }

                // Find rules from the chosen profiles
                const profiles = requirementProfiles.filter(rp => profileIdsToProcess.includes(rp.id));
                profiles.forEach(profile => {
                    profile.rules.forEach(rule => {
                        const archId = rule.referenceArchitectureId || 'base';
                        // Ideally requirements have testMethodId, fallback to property default
                        const propertyDef = properties.find(p => p.id === rule.propertyId);
                        const tmId = rule.testMethodId || propertyDef?.defaultTestMethodId;

                        const tmName = testMethods.find(t => t.id === tmId)?.name || rule.method || propertyDef?.testMethods?.[0];

                        const row = ensureRow(rule.propertyId, archId, tmId, tmName);
                        row.values[index].requirement = {
                            min: rule.min !== undefined ? rule.min : undefined,
                            max: rule.max !== undefined ? rule.max : undefined,
                            target: rule.target !== undefined ? rule.target : undefined,
                            testMethodId: tmId,
                            testMethodName: tmName
                        };
                    });
                });
            }

            // 2. Specifications
            const entitySpecs = specifications.filter(s =>
                s.materialId === item.id || s.layupId === item.id || s.assemblyId === item.id
            );

            let specsToProcess = entitySpecs;
            if (item.selectedSpecificationId) {
                specsToProcess = entitySpecs.filter(s => s.id === item.selectedSpecificationId);
            }

            // Retrieve properties from the current entity (Material, Layup, or Assembly)
            const itemProperties = entity.properties || [];

            specsToProcess.forEach(spec => {
                const specProperties = itemProperties.filter((p: any) => p.specificationId === spec.id);

                specProperties.forEach((sp: any) => {
                    // Resolve property definition ID by name (MaterialProperty only stores name)
                    const propDef = properties.find(p => p.name === sp.name);
                    const propId = propDef?.id;

                    if (!propId) return; // Skip if it doesn't map to a known property definition

                    let archId = sp.referenceArchitectureId || 'base';

                    // Align Architecture: If a standard is selected and we have a requirement for this property
                    // that uses a specific architecture, map our 'base' specification to that row so they display together.
                    if (item.selectedStandardId && archId === 'base') {
                        const standardProfile = requirementProfiles.find(rp => rp.id === item.selectedStandardId);
                        if (standardProfile) {
                            const relatedReqs = standardProfile.rules.filter((r: any) => r.propertyId === propId);
                            if (relatedReqs.length > 0) {
                                // Map to the first requirement's architecture
                                archId = relatedReqs[0].referenceArchitectureId || 'base';
                            }
                        }
                    }

                    // If a standard is selected, only restrict specs if they explicitly define a DIFFERENT architecture
                    // If spec is 'base' (overall material property), allow it to show up.
                    if (allowedArchIds && archId !== 'base' && !allowedArchIds.has(archId)) return;

                    const tmId = sp.testMethodId;
                    const tmName = testMethods.find(t => t.id === tmId)?.name || sp.method;
                    const row = ensureRow(propId, archId, tmId, tmName);
                    row.values[index].specification = {
                        min: sp.vMin !== undefined ? sp.vMin : undefined,
                        max: sp.vMax !== undefined ? sp.vMax : undefined,
                        nominal: typeof sp.value === 'number' ? sp.value : parseFloat(sp.value as string) || undefined,
                        testMethodId: tmId,
                        testMethodName: tmName
                    };
                });
            });

            // 3. Actual Measurements (From global store)
            // Filter measurements belonging to this entity
            const entityMeasurements = measurements.filter(m => {
                if (item.type === 'material') {
                    if (m.materialId === item.id) return true;
                    if (m.layupId) {
                        const layup = layups.find(l => l.id === m.layupId);
                        if (layup && layup.materialId === item.id) return true;
                    }
                    return false;
                }
                if (item.type === 'layup') return m.layupId === item.id;
                if (item.type === 'assembly') return m.assemblyId === item.id;
                return false;
            });

            if (entityMeasurements.length > 0) {
                // Group measurements by property ID AND Architecture AND Test Method
                const grouped = entityMeasurements.reduce((acc, m) => {
                    let archId = 'base';
                    if (m.referenceLayupId) {
                        const refLayup = layups.find(l => l.id === m.referenceLayupId);
                        if (refLayup && refLayup.architectureTypeId) {
                            archId = refLayup.architectureTypeId;
                        } else {
                            archId = m.referenceLayupId; // Concrete fallback
                        }
                    }
                    const tmId = m.testMethodId;
                    const tmKey = tmId || m.testMethod || 'base';

                    const key = `${m.propertyDefinitionId}_${archId}_${tmKey}`;
                    if (!acc[key]) acc[key] = { propId: m.propertyDefinitionId, archId, tmId, fallbackTmName: m.testMethod, measures: [] };
                    acc[key].measures.push(m);
                    return acc;
                }, {} as Record<string, { propId: string, archId: string, tmId?: string, fallbackTmName?: string, measures: any[] }>);

                Object.values(grouped).forEach(({ propId, archId, tmId, fallbackTmName, measures }) => {
                    // Filter out architectures not in the selected standard
                    if (allowedArchIds && archId !== 'base' && !allowedArchIds.has(archId)) {
                        return; // Skip this actual measurement group
                    }

                    const validMeasures = measures.filter(m => m.isActive !== false && typeof m.resultValue === 'number' && !Number.isNaN(m.resultValue));
                    if (validMeasures.length === 0) return;

                    const sum = validMeasures.reduce((s, m) => s + m.resultValue, 0);
                    const avg = sum / validMeasures.length;

                    const tmName = testMethods.find(t => t.id === tmId)?.name || fallbackTmName;

                    // Align Architecture: If a standard is selected and we have a requirement for this property
                    // that uses a specific architecture, map our 'base' measurement to that row so they display together.
                    if (item.selectedStandardId && archId === 'base') {
                        const standardProfile = requirementProfiles.find(rp => rp.id === item.selectedStandardId);
                        if (standardProfile) {
                            const relatedReqs = standardProfile.rules.filter((r: any) => r.propertyId === propId);
                            if (relatedReqs.length > 0) {
                                // Map to the first requirement's architecture
                                archId = relatedReqs[0].referenceArchitectureId || 'base';
                            }
                        }
                    }

                    const row = ensureRow(propId, archId, tmId, tmName);
                    row.values[index].actual = {
                        value: avg,
                        count: validMeasures.length,
                        testMethodId: tmId,
                        testMethodName: tmName
                    };
                });
            }
        });

        // Convert map to array and sort by category then name
        return Array.from(rowsMap.values()).sort((a, b) => {
            if (a.propertyCategory !== b.propertyCategory) {
                return a.propertyCategory.localeCompare(b.propertyCategory);
            }
            return a.propertyName.localeCompare(b.propertyName);
        });
    }, [cart, materials, layups, assemblies, properties, requirementProfiles, specifications]);

    return data;
}
