import { useMemo, useState, useEffect } from 'react';
import { useAppStore } from '@/lib/store';
import { FileText, Layers, AlertCircle, Settings2, Filter } from 'lucide-react';
import type { Material, Measurement, RequirementRule, MaterialProperty, RequirementProfile, ReferenceLayupArchitecture } from '@/types/domain';
import { CATEGORY_ORDER } from "@/lib/propertyUtils";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

interface MaterialPropertiesViewProps {
    material: Material;
    measurements: Measurement[];
}

type ContextType = 'base' | 'layup' | 'assembly';

interface PropertyContext {
    id: string;
    name: string;
    type: ContextType;
    obj?: any; // The Layup or Assembly object
}

interface CellData {
    rules: RequirementRule[]; // From Standards
    specs: Record<string, MaterialProperty>; // From Specifications (Key: specificationId)
    manual?: MaterialProperty; // From Layup/Assembly manual properties
    stats?: { mean: number, min: number, max: number, count: number }; // From Measurements
}

export function MaterialPropertiesView({ material, measurements }: MaterialPropertiesViewProps) {
    const { requirementProfiles, specifications, properties: globalProperties, layups, assemblies } = useAppStore();

    // 1. Define Contexts (Actual Data Sources)
    const contexts = useMemo<PropertyContext[]>(() => {
        const list: PropertyContext[] = [{ id: 'base', name: 'Base Material Properties', type: 'base' }];

        // Derive linked layups (Direct, Variant-based, or Assigned)
        // 1. Variant IDs for this material
        const variantIds = new Set((material.variants || []).map(v => v.variantId));
        // Add base material variant ID if not present? (Usually 'Standard' variant covers it, or variantId might be empty?)

        // 2. Find layups
        const relevantLayups = layups.filter(l => {
            // Direct link
            if (l.materialId === material.id) return true;
            // Assigned link
            if (material.assignedReferenceLayupIds?.includes(l.id)) return true;
            // Variant link (via layers)
            if (l.layers?.some(layer => variantIds.has(layer.materialVariantId))) return true;
            return false;
        });

        relevantLayups.forEach(l => {
            // Avoid duplicates if multiple conditions match (relevantLayups filter handles it per item, but if logic was separate arrays...)
            // Since filter iterates once, duplicates in 'relevantLayups' are impossible.
            // Check if already in list? (contexts list)
            if (!list.some(c => c.id === l.id && c.type === 'layup')) {
                list.push({ id: l.id, name: `Reference Layup: ${l.name}`, type: 'layup', obj: l });
            }
        });

        (material.assignedReferenceAssemblyIds || []).forEach(id => {
            const a = assemblies.find(x => x.id === id);
            if (a) list.push({ id: a.id, name: `Reference Assembly: ${a.name}`, type: 'assembly', obj: a });
        });

        return list;
    }, [material, layups, assemblies]);

    // 2. Resolve Active Profiles & Architectures
    const { activeProfiles, definedArchitectures } = useMemo(() => {
        const list: { profile: RequirementProfile, contextId: string }[] = [];
        const archs = new Map<string, ReferenceLayupArchitecture>();

        // For Base Context (Material Level)
        (material.assignedProfileIds || []).forEach(pid => {
            const p = requirementProfiles.find(rp => rp.id === pid);
            if (p) {
                list.push({ profile: p, contextId: 'base' });
                // Collect Architectures defined in this profile
                p.layupArchitectures?.forEach(arch => {
                    archs.set(arch.id, arch);
                });
            }
        });

        // For Reference Contexts
        contexts.forEach(ctx => {
            if (ctx.type === 'base') return;
            const entity = ctx.obj;
            // If the entity itself has assigned profiles, add them
            if (entity && entity.assignedProfileIds) {
                entity.assignedProfileIds.forEach((pid: string) => {
                    const p = requirementProfiles.find(rp => rp.id === pid);
                    if (p) {
                        list.push({ profile: p, contextId: ctx.id });
                    }
                });
            }

            // [FIX] Ensure the Context's Architecture is included even if no profile is active
            if (ctx.type === 'layup' && entity.architectureTypeId) {
                if (!archs.has(entity.architectureTypeId)) {
                    // Try to find definition in ANY RequirementProfile (Global lookup)
                    for (const rp of requirementProfiles) {
                        const found = rp.layupArchitectures?.find(a => a.id === entity.architectureTypeId);
                        if (found) {
                            archs.set(found.id, found);
                            break;
                        }
                    }
                }
            }
        });

        return { activeProfiles: list, definedArchitectures: Array.from(archs.values()) };
    }, [requirementProfiles, material, contexts]);

    // 3. Resolve Specifications
    const materialSpecs = useMemo(() => {
        // Only include specifications explicitly linked to this material
        // Filtering by contexts might be too broad if contexts include Reference Layups that have their own unrelated specs?
        // Actually, a Specification is usually defined For a Material.
        // If it's linked to a Layup, it might be a Process Spec?
        // Let's stick to Material ID matching for now to be safe, as requested by user ("Phenolic Prepreg" appearing might be due to Layup context).
        // User said "Standard appearing... I only assigned DSM 0001".
        // DSM 0001 is a Profile. "Phenolic Prepreg" is likely a Layup Name being picked up as a Context, and maybe there's a Spec named that?
        // Or maybe my 'contexts' derivation is adding Layups as contexts, and then I look for specs for those layups?
        // The user wants to see specs for THIS material.

        const base = specifications.filter(s => s.materialId === material.id);
        return base;
    }, [specifications, material.id]);

    // 4. Statistics Calculation
    const [measurementFilter, setMeasurementFilter] = useState<{ type: 'all' | 'last_n' | 'time', value: number | string }>({ type: 'all', value: 0 });
    const [selectedStandardIds, setSelectedStandardIds] = useState<string[]>([]);

    // Initialize selected standard IDs once
    useEffect(() => {
        const baseIds = new Set<string>();
        // Only select profiles that are directly assigned to the material (contextId === 'base')
        activeProfiles.forEach(p => {
            if (p.contextId === 'base') {
                baseIds.add(p.profile.id);
            }
        });

        if (selectedStandardIds.length === 0 && baseIds.size > 0) {
            setSelectedStandardIds(Array.from(baseIds));
        }
    }, [activeProfiles]); // Run only when activeProfiles changes

    const statsMap = useMemo(() => {
        const map = new Map<string, { mean: number, min: number, max: number, count: number }>();
        const grouped = new Map<string, { value: number, date: string }[]>();

        // Filter measurements (Active only)
        const activeMeasurements = measurements.filter(m => m.isActive !== false);

        activeMeasurements.forEach(m => {
            const propDef = globalProperties.find(pd => pd.id === m.propertyDefinitionId);
            if (!propDef) return;
            const contextId = m.referenceLayupId || 'base';

            const key = `${contextId}|${propDef.id}`;
            if (!grouped.has(key)) grouped.set(key, []);
            grouped.get(key)!.push({ value: m.resultValue, date: m.date });
        });

        grouped.forEach((items, key) => {
            // Apply Filters (Per Property Group)
            let filteredItems = items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()); // Sort Descending by Date

            if (measurementFilter.type === 'last_n') {
                filteredItems = filteredItems.slice(0, Number(measurementFilter.value));
            } else if (measurementFilter.type === 'time') {
                const cutoff = new Date();
                if (measurementFilter.value === '6m') cutoff.setMonth(cutoff.getMonth() - 6);
                if (measurementFilter.value === '1y') cutoff.setFullYear(cutoff.getFullYear() - 1);
                filteredItems = filteredItems.filter(item => new Date(item.date) >= cutoff);
            }

            const validValues = filteredItems.map(i => i.value).filter(v => !isNaN(v));

            if (validValues.length > 0) {
                const sum = validValues.reduce((a, b) => a + b, 0);
                map.set(key, {
                    mean: sum / validValues.length,
                    min: Math.min(...validValues),
                    max: Math.max(...validValues),
                    count: validValues.length
                });
            }
        });
        return map;
    }, [measurements, globalProperties, measurementFilter]);


    // Helper: Build Row Data including Specs
    const buildRowData = (rule: RequirementRule | null, propDef: any, contextId: string) => {
        const cell: CellData = { rules: rule ? [rule] : [], specs: {} };

        // 1. Manual Value from Context Object
        const ctx = contexts.find(c => c.id === contextId);
        if (ctx && ctx.obj) {
            const props = Array.isArray(ctx.obj.properties) ? ctx.obj.properties : Object.values(ctx.obj.properties || {});
            const manual = props.find((p: any) => p.name === propDef.name);
            if (manual) cell.manual = manual;
        } else if (contextId === 'base') {
            const props = material.properties || [];
            const manual = props.find(p => p.name === propDef.name);
            if (manual) cell.manual = manual;
        }

        // 2. Stats
        const statsKey = `${contextId}|${propDef.id}`;
        if (statsMap.has(statsKey)) {
            cell.stats = statsMap.get(statsKey);
        }

        // 3. Specs
        // Check if any active spec has a value for this property
        materialSpecs.forEach(spec => {
            // Check for property match regardless of context (Base or Layup)
            // If the spec defines "Cured Ply Thickness" (Layup Prop), it should show up.
            const props = Array.isArray(spec.properties) ? spec.properties : Object.values(spec.properties || {});
            const match = props.find((p: any) => p.name === propDef.name); // Match by name
            if (match) {
                cell.specs[spec.id] = match;
            }
        });

        return cell;
    };

    const renderActualCell = (cell: CellData) => {
        if (cell.stats) {
            return (
                <div className="flex flex-col items-center">
                    <span className="font-bold text-green-700">{cell.stats.mean.toFixed(2)}</span>
                    <span className="text-[10px] text-muted-foreground">n={cell.stats.count}</span>
                </div>
            );
        }
        if (cell.manual) {
            return (
                <div className="flex flex-col items-center">
                    <span className="font-medium">{cell.manual.value}</span>
                    <span className="text-[10px] text-muted-foreground">{cell.manual.unit}</span>
                </div>
            );
        }
        return <span className="text-muted-foreground/30">-</span>;
    };




    // --- RENDER SECTIONS ---

    // SECTION 1: Base Material Properties
    const renderBaseProperties = () => {
        const ruleMap = new Map<string, Map<string, RequirementRule>>(); // PropertyId -> ProfileId -> Rule

        activeProfiles.forEach(({ profile }) => {
            profile.rules.forEach(r => {
                if (r.scope === 'material' || !r.scope) {
                    if (!ruleMap.has(r.propertyId)) ruleMap.set(r.propertyId, new Map());
                    ruleMap.get(r.propertyId)!.set(profile.id, r);
                }
            });
        });

        const propertyIds = new Set(ruleMap.keys());
        (material.properties || []).forEach(p => {
            const def = globalProperties.find(gp => gp.name === p.name);
            if (def) propertyIds.add(def.id);
        });
        materialSpecs.forEach(s => {
            const props = Array.isArray(s.properties) ? s.properties : Object.values(s.properties || {});
            props.forEach((p: any) => {
                const def = globalProperties.find(gp => gp.name === p.name);
                if (def) propertyIds.add(def.id);
            });
        });

        // Create a unique list of ALL available profiles for the Popover (Selection Control)
        const availableProfiles = Array.from(new Set(activeProfiles.map(p => p.profile)));

        // Filter profiles for the Table (Columns) based on selection AND rules existence
        const visibleProfiles = availableProfiles.filter(profile => {
            // Must be selected
            if (!selectedStandardIds.includes(profile.id)) return false;
            return profile.rules.some(r => r.scope === 'material' || !r.scope);
        });

        // Filter specs for the Table (Columns) based on selection
        const visibleSpecs = materialSpecs.filter(spec => selectedStandardIds.includes(spec.id));

        const rows = Array.from(propertyIds).map(pid => {
            const def = globalProperties.find(gp => gp.id === pid);
            if (!def) return null;

            const profileRules = ruleMap.get(pid) || new Map();
            // Pick a representative rule for Method/Unit if available, or finding in manual/specs
            const firstRule = Array.from(profileRules.values())[0];

            // Build cells for each profile
            const profileCells: { [key: string]: RequirementRule | undefined } = {};
            visibleProfiles.forEach(p => {
                profileCells[p.id] = profileRules.get(p.id);
            });

            const cell = buildRowData(firstRule || null, def, 'base');
            return { def, firstRule, profileCells, cell };
        }).filter((r): r is { def: any, firstRule: RequirementRule | undefined, profileCells: any, cell: CellData } => !!r)
            .sort((a, b) => {
                const idxA = CATEGORY_ORDER.indexOf(a.def.category?.toLowerCase() || "");
                const idxB = CATEGORY_ORDER.indexOf(b.def.category?.toLowerCase() || "");
                if (idxA !== -1 && idxB !== -1 && idxA !== idxB) return idxA - idxB;
                if (idxA !== -1) return -1;
                if (idxB !== -1) return 1;
                return (a.def.name || "").localeCompare(b.def.name || "");
            });

        if (rows.length === 0) return null;

        return (
            <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between py-2 px-3 rounded-md font-semibold text-sm bg-slate-100">
                    <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Base Material Properties
                    </div>
                    <div className="flex items-center gap-2">
                        {/* Data Basis Filter */}
                        <div className="flex items-center gap-2 mr-4">
                            <Filter className="h-3 w-3 text-muted-foreground" />
                            <Select
                                value={measurementFilter.type === 'all' ? 'all' : `${measurementFilter.type}-${measurementFilter.value}`}
                                onValueChange={(val) => {
                                    if (val === 'all') setMeasurementFilter({ type: 'all', value: 0 });
                                    else if (val.startsWith('last_n-')) setMeasurementFilter({ type: 'last_n', value: Number(val.split('-')[1]) });
                                    else if (val.startsWith('time-')) setMeasurementFilter({ type: 'time', value: val.split('-')[1] });
                                }}
                            >
                                <SelectTrigger className="h-7 w-[160px] text-xs">
                                    <SelectValue placeholder="Data Basis" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Measurements</SelectItem>
                                    <SelectItem value="last_n-5">Last 5 Measured</SelectItem>
                                    <SelectItem value="last_n-10">Last 10 Measured</SelectItem>
                                    <SelectItem value="time-6m">Last 6 Months</SelectItem>
                                    <SelectItem value="time-1y">Last 1 Year</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Standard Selector */}
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="outline" size="sm" className="h-7 gap-1 text-xs">
                                    <Settings2 className="h-3 w-3" />
                                    Columns
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent align="end" className="w-[200px] p-3">
                                <div className="flex flex-col gap-2">
                                    <span className="font-semibold text-xs border-b pb-1 mb-1">Standards & Specs</span>
                                    {availableProfiles.map((profile) => (
                                        <div key={profile.id} className="flex items-center gap-2">
                                            <Checkbox
                                                id={`chk-${profile.id}`}
                                                checked={selectedStandardIds.includes(profile.id)}
                                                onCheckedChange={(checked) => {
                                                    if (checked) setSelectedStandardIds([...selectedStandardIds, profile.id]);
                                                    else setSelectedStandardIds(selectedStandardIds.filter(id => id !== profile.id));
                                                }}
                                            />
                                            <Label htmlFor={`chk-${profile.id}`} className="text-xs truncate" title={profile.name}>{profile.name}</Label>
                                        </div>
                                    ))}
                                    {/* Deduplicate specs just in case */}
                                    {Array.from(new Set(materialSpecs.map(s => s.id))).map(sid => {
                                        const spec = materialSpecs.find(s => s.id === sid);
                                        if (!spec) return null;
                                        return (
                                            <div key={spec.id} className="flex items-center gap-2">
                                                <Checkbox
                                                    id={`chk-${spec.id}`}
                                                    checked={selectedStandardIds.includes(spec.id)}
                                                    onCheckedChange={(checked) => {
                                                        if (checked) setSelectedStandardIds([...selectedStandardIds, spec.id]);
                                                        else setSelectedStandardIds(selectedStandardIds.filter(id => id !== spec.id));
                                                    }}
                                                />
                                                <Label htmlFor={`chk-${spec.id}`} className="text-xs text-purple-700 truncate" title={spec.name}>Spec: {spec.name}</Label>
                                            </div>
                                        );
                                    })}
                                    {(activeProfiles.length === 0 && materialSpecs.length === 0) && (
                                        <span className="text-xs text-muted-foreground italic">No Active Standards</span>
                                    )}
                                </div>
                            </PopoverContent>
                        </Popover>
                    </div>
                </div>
                <div className="border rounded-md bg-card overflow-hidden">
                    <Table>
                        <TableHeader className="bg-muted/10">
                            <TableRow>
                                <TableHead className="w-[250px]">Property</TableHead>
                                <TableHead className="w-[120px]">Method</TableHead>
                                <TableHead className="w-[80px]">Unit</TableHead>
                                {visibleProfiles.map((profile) => (
                                    <TableHead key={profile.id} className="w-[120px] text-center">{profile.name}</TableHead>
                                ))}
                                {/* Render Individual Specification Columns */}
                                {visibleSpecs.length > 0 && visibleSpecs.map(spec => (
                                    <TableHead key={spec.id} className="w-[120px] text-center text-purple-700 font-bold bg-purple-50/20">
                                        {spec.name}
                                    </TableHead>
                                ))}
                                <TableHead className="w-[120px] text-center">Actual ({measurementFilter.type === 'all' ? 'All' : measurementFilter.type === 'last_n' ? `Last ${measurementFilter.value}` : measurementFilter.value})</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {rows.map((row) => (
                                <TableRow key={row.def.id}>
                                    <TableCell>
                                        <span className="font-medium">{row.def.name}</span>
                                    </TableCell>
                                    <TableCell>
                                        <span className="text-xs text-muted-foreground">{row.firstRule?.method || row.cell.manual?.method || "-"}</span>
                                    </TableCell>
                                    <TableCell>
                                        <span className="text-xs text-muted-foreground">{row.firstRule?.unit || row.cell.manual?.unit || row.def.unit || "-"}</span>
                                    </TableCell>

                                    {/* Per-Profile Standard Values */}
                                    {visibleProfiles.map((profile) => {
                                        const rule = row.profileCells[profile.id];
                                        return (
                                            <TableCell key={profile.id} className="text-center">
                                                {rule ? (
                                                    <div className="flex flex-col items-center text-xs">
                                                        {(rule.min !== undefined || rule.max !== undefined) && (
                                                            <span className="font-medium">{rule.min ?? '?'} - {rule.max ?? '?'}</span>
                                                        )}
                                                        {rule.target !== undefined && (
                                                            <span className="font-medium text-blue-600 font-bold">{rule.target}</span> // Display Value Only
                                                        )}
                                                        {(rule.min === undefined && rule.max === undefined && rule.target === undefined) && (
                                                            <span>-</span>
                                                        )}
                                                    </div>
                                                ) : <span className="text-muted-foreground/20">-</span>}
                                            </TableCell>
                                        );
                                    })}

                                    {/* Per-Specification Values */}
                                    {visibleSpecs.map(spec => {
                                        const prop = row.cell.specs[spec.id];
                                        return (
                                            <TableCell key={spec.id} className="text-center">
                                                {prop ? (
                                                    <div className="flex flex-col items-center text-xs text-purple-700 bg-purple-50 px-2 py-0.5 rounded">
                                                        <span className="font-medium">{prop.value}</span>
                                                        {/* <span className="text-[9px] opacity-70">{prop.unit}</span> Unit is redundant if in dedicated column or row, but good for safety */}
                                                    </div>
                                                ) : <span className="text-muted-foreground/30">-</span>}
                                            </TableCell>
                                        );
                                    })}

                                    <TableCell className="text-center">
                                        {renderActualCell(row.cell)}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </div>
        );

    };


    // SECTION 2: Reference Layup Properties
    const renderLayupProperties = () => {
        if (definedArchitectures.length === 0) return null;

        // Filter specs for the Table (Columns) based on selection
        // Identical to renderBaseProperties to ensure consistency
        const visibleSpecs = materialSpecs.filter(spec => selectedStandardIds.includes(spec.id));

        return (
            <div className="flex flex-col gap-4">
                {definedArchitectures.map(arch => {
                    const matchingContexts = contexts.filter(ctx =>
                        ctx.type === 'layup' && ctx.obj && ctx.obj.architectureTypeId === arch.id
                    );

                    // Map Arch Rules per Profile
                    const ruleMap = new Map<string, Map<string, RequirementRule>>(); // PropertyId -> ProfileId -> Rule
                    activeProfiles.forEach(({ profile }) => {
                        profile.rules.forEach(r => {
                            if (r.scope === 'layup' && r.referenceArchitectureId === arch.id) {
                                if (!ruleMap.has(r.propertyId)) ruleMap.set(r.propertyId, new Map());
                                ruleMap.get(r.propertyId)!.set(profile.id, r);
                            }
                        });
                    });

                    // Filter profiles that have rules for THIS architecture
                    const relevantProfilesRaw = activeProfiles.filter(({ profile }) =>
                        selectedStandardIds.includes(profile.id) &&
                        profile.rules.some(r => r.scope === 'layup' && r.referenceArchitectureId === arch.id)
                    );

                    // Deduplicate profiles (A profile might be active via multiple contexts, but we only want one column)
                    const relevantProfiles = Array.from(
                        new Map(relevantProfilesRaw.map(item => [item.profile.id, item])).values()
                    );

                    const profileNames = relevantProfiles.map(p => p.profile.name).join(', ');
                    const headerText = `${arch.name}${profileNames ? ` - ${profileNames}` : ''}`;

                    // Collect all properties: Rules + Manual + Specs
                    const propIds = new Set(ruleMap.keys());

                    // Add property definition IDs from manual properties/contexts
                    matchingContexts.forEach(ctx => {
                        if (ctx.obj && ctx.obj.properties) {
                            const props = Array.isArray(ctx.obj.properties) ? ctx.obj.properties : Object.values(ctx.obj.properties);
                            props.forEach((p: any) => {
                                const def = globalProperties.find(gp => gp.name === p.name);
                                if (def) propIds.add(def.id);
                            });
                        }
                    });


                    const sortedPropIds = Array.from(propIds).sort((a, b) => {
                        const defA = globalProperties.find(gp => gp.id === a);
                        const defB = globalProperties.find(gp => gp.id === b);
                        return (defA?.name || "").localeCompare(defB?.name || "");
                    });

                    if (sortedPropIds.length === 0 && matchingContexts.length === 0) return null;

                    return (
                        <div key={arch.id} className="flex flex-col gap-2">
                            <div className="py-2 px-3 rounded-md font-semibold text-sm bg-blue-50/50 border border-blue-100 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Layers className="h-4 w-4 text-blue-600" />
                                    <span>{headerText}</span>
                                    <span className="font-normal text-muted-foreground ml-2 text-xs">({arch.description})</span>
                                </div>
                                {matchingContexts.length === 0 && (
                                    <div className="text-amber-600 text-xs flex items-center gap-1">
                                        <AlertCircle className="h-3 w-3" /> No Linked Layup
                                    </div>
                                )}
                            </div>

                            <div className="border rounded-md bg-card overflow-hidden">
                                <Table>
                                    <TableHeader className="bg-muted/10">
                                        <TableRow>
                                            <TableHead className="w-[250px]">Property</TableHead>
                                            <TableHead className="w-[120px]">Method</TableHead>
                                            <TableHead className="w-[80px]">Unit</TableHead>

                                            {/* Profile Columns (Specific to this Arch) */}
                                            {relevantProfiles.map(({ profile }) => (
                                                <TableHead key={profile.id} className="w-[120px] text-center">{profile.name}</TableHead>
                                            ))}

                                            {/* Specification Columns (Consistent with Base) */}
                                            {visibleSpecs.map(spec => (
                                                <TableHead key={spec.id} className="w-[120px] text-center text-purple-700">{spec.name}</TableHead>
                                            ))}

                                            {matchingContexts.map(ctx => (
                                                <TableHead key={ctx.id} className="w-[120px] text-center text-blue-700">
                                                    {ctx.obj?.name || "Actual"}
                                                </TableHead>
                                            ))}
                                            {matchingContexts.length === 0 && <TableHead className="w-[120px] text-center text-muted-foreground">Actual ({measurementFilter.type === 'all' ? 'All' : measurementFilter.value})</TableHead>}
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {sortedPropIds.map(pid => {
                                            const def = globalProperties.find(gp => gp.id === pid);
                                            if (!def) return null;

                                            const profileRules = ruleMap.get(pid)!;
                                            const firstRule = profileRules ? Array.from(profileRules.values())[0] : undefined;

                                            return (
                                                <TableRow key={pid}>
                                                    <TableCell>
                                                        <span className="font-medium">{def.name}</span>
                                                    </TableCell>
                                                    <TableCell>
                                                        <span className="text-xs text-muted-foreground">{firstRule?.method || "-"}</span>
                                                    </TableCell>
                                                    <TableCell>
                                                        <span className="text-xs text-muted-foreground">{firstRule?.unit || def.unit || "-"}</span>
                                                    </TableCell>

                                                    {/* Profile Values */}
                                                    {relevantProfiles.map(({ profile }) => {
                                                        const rule = profileRules ? profileRules.get(profile.id) : undefined;

                                                        return (
                                                            <TableCell key={profile.id} className="text-center">
                                                                {rule ? (
                                                                    <div className="flex flex-col items-center text-xs">
                                                                        {(rule.min !== undefined || rule.max !== undefined) && (
                                                                            <span className="font-medium">{rule.min ?? '?'} - {rule.max ?? '?'}</span>
                                                                        )}
                                                                        {rule.target !== undefined && (
                                                                            <span className="font-medium text-blue-600 font-bold">{rule.target}</span>
                                                                        )}
                                                                        {(rule.min === undefined && rule.max === undefined && rule.target === undefined) && (
                                                                            <span>-</span>
                                                                        )}
                                                                    </div>
                                                                ) : <span className="text-muted-foreground/20">-</span>}
                                                            </TableCell>
                                                        );
                                                    })}

                                                    {/* Per-Specification Values */}
                                                    {visibleSpecs.map(spec => {
                                                        // We need to build a cell here or just look up the property.
                                                        // Since 'renderActualCell' logic is not needed for Specs (simple lookup), we can just find it.
                                                        // But wait, buildRowData does it. Let's use it for consistency?
                                                        // buildRowData takes a contextId.
                                                        // Spec lookup in buildRowData is independent of contextId NOW.
                                                        // But we just need the value.
                                                        const props = Array.isArray(spec.properties) ? spec.properties : Object.values(spec.properties || {});
                                                        const match = props.find((p: any) => p.name === def.name);

                                                        return (
                                                            <TableCell key={spec.id} className="text-center">
                                                                {match ? (
                                                                    <div className="flex flex-col items-center text-xs text-purple-700 bg-purple-50 px-2 py-0.5 rounded">
                                                                        <span className="font-medium">{match.value}</span>
                                                                    </div>
                                                                ) : <span className="text-muted-foreground/30">-</span>}
                                                            </TableCell>
                                                        );
                                                    })}

                                                    {matchingContexts.length > 0 ? matchingContexts.map(ctx => {
                                                        const cell = buildRowData(firstRule || null, def, ctx.id);
                                                        return (
                                                            <TableCell key={ctx.id} className="text-center">
                                                                {renderActualCell(cell)}
                                                            </TableCell>
                                                        );
                                                    }) : (
                                                        <TableCell className="text-center text-muted-foreground/30">-</TableCell>
                                                    )}

                                                </TableRow>
                                            );
                                        })}
                                        {sortedPropIds.length === 0 && (
                                            <TableRow>
                                                <TableCell colSpan={4 + relevantProfiles.length + visibleSpecs.length + (matchingContexts.length || 1)} className="text-center py-4 text-muted-foreground italic">
                                                    No rules defined for this architecture type.
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    };

    return (
        <div className="flex h-full flex-col gap-6 overflow-auto pb-12">
            {renderBaseProperties()}
            {renderLayupProperties()}
        </div>
    );
}
