import { useMemo, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAppStore } from '@/lib/store';
import { Eye, FileText, Layers, AlertCircle, Settings2, Filter, CheckCircle2 } from 'lucide-react';
import type { Material, Measurement, RequirementRule, MaterialProperty, RequirementProfile, ReferenceLayupArchitecture } from '@/types/domain';
import { CATEGORY_ORDER } from "@/lib/propertyUtils";
import { MeasurementHistoryDialog } from './MeasurementHistoryDialog';
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
    stats?: { mean: number, min: number, max: number, count: number, rawData?: any[] }; // From Measurements
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
    const [historyDialog, setHistoryDialog] = useState<{ isOpen: boolean, propertyName: string, contextName: string, unit?: string, testMethod?: string, data: any[] }>({
        isOpen: false,
        propertyName: '',
        contextName: '',
        unit: '',
        testMethod: '',
        data: []
    });

    // Initialize selected standard IDs once and auto-select new specs
    useEffect(() => {
        setSelectedStandardIds(prev => {
            const newIds = new Set(prev);
            let changed = false;

            // Auto select profiles for base context if prev was empty
            activeProfiles.forEach(p => {
                if (p.contextId === 'base' && prev.length === 0) {
                    newIds.add(p.profile.id);
                    changed = true;
                }
            });

            // Always ensure all material specs are selected by default so they appear
            materialSpecs.forEach(s => {
                if (!newIds.has(s.id)) {
                    newIds.add(s.id);
                    changed = true;
                }
            });

            if (changed) return Array.from(newIds);
            return prev;
        });
    }, [activeProfiles, materialSpecs]);

    const statsMap = useMemo(() => {
        const map = new Map<string, { mean: number, min: number, max: number, count: number, rawData: any[] }>();
        const grouped = new Map<string, { value: number, date: string, measurement: any }[]>();

        // Filter measurements (Active only)
        const activeMeasurements = measurements.filter(m => m.isActive !== false);

        activeMeasurements.forEach(m => {
            const propDef = globalProperties.find(pd => pd.id === m.propertyDefinitionId);
            if (!propDef) return;
            const contextId = m.referenceLayupId || m.layupId || 'base';

            const key = `${contextId}|${propDef.id}`;
            if (!grouped.has(key)) grouped.set(key, []);
            grouped.get(key)!.push({ value: m.resultValue, date: m.date, measurement: m });
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
                    count: validValues.length,
                    rawData: filteredItems
                });
            }
        });
        return map;
    }, [measurements, globalProperties, measurementFilter]);


    // Helper: Build Row Data including Specs
    const buildRowData = (rule: RequirementRule | null, propDef: any, contextId: string, methodFilter: string | null = null) => {
        const cell: CellData = { rules: rule ? [rule] : [], specs: {} };

        // Helper to normalize method strings for comparison
        const normalizeMethod = (m?: string) => (m || "").toLowerCase().replace(/[^a-z0-9]/g, "");
        const targetMethodNorm = normalizeMethod(methodFilter || rule?.method || "");

        // 1. Manual Value from Context Object
        const ctx = contexts.find(c => c.id === contextId);
        if (ctx && ctx.obj) {
            const props = Array.isArray(ctx.obj.properties) ? ctx.obj.properties : Object.values(ctx.obj.properties || {});
            const manual = props.find((p: any) => p.name === propDef.name && (!targetMethodNorm || normalizeMethod(p.method) === targetMethodNorm));
            if (manual) cell.manual = manual;
        } else if (contextId === 'base') {
            const props = material.properties || [];
            const manual = props.find(p => p.name === propDef.name && (!targetMethodNorm || normalizeMethod(p.method) === targetMethodNorm));
            if (manual) cell.manual = manual;
        }

        // 2. Stats
        // Stats map keys are now likely contextId|propDefId, but we need to match methods if stats contain them.
        // For simplicity, if we have a known stats mapping, grab it. Ideally statsMap should also key by method if possible.
        const statsKey = `${contextId}|${propDef.id}`;
        if (statsMap.has(statsKey)) {
            // In a more robust system, statsMap would be grouped by Method as well. 
            // We'll leave this simple matching for now unless measurements are also method-split.
            cell.stats = statsMap.get(statsKey);
        }

        // 3. Specs
        materialSpecs.forEach(spec => {
            const props = (material.properties || []).filter(p => p.specificationId === spec.id);
            const match = props.find((p: any) => {
                const nameMatches = p.name === propDef.name || p.propertyId === propDef.id;
                // If spec property defines no method, assume it's meant for the row's method
                const methodMatches = !targetMethodNorm || !p.method || normalizeMethod(p.method) === targetMethodNorm;
                return nameMatches && methodMatches;
            });
            if (match) {
                cell.specs[spec.id] = match;
            }
        });

        return cell;
    };

    const renderActualCell = (cell: CellData, propertyName: string, contextName: string, unit?: string, testMethod?: string) => {
        let isOutOfSpec = false;

        // Check against rules
        if (cell.stats && cell.rules.length > 0) {
            for (const rule of cell.rules) {
                if (rule.min !== undefined && cell.stats.mean < rule.min) isOutOfSpec = true;
                if (rule.max !== undefined && cell.stats.mean > rule.max) isOutOfSpec = true;
                if (rule.target !== undefined && rule.min === undefined && rule.max === undefined) {
                    // Exact target match (rare for measurements, but maybe check tolerance)
                    // If target is string, compare string. But stats.mean is number.
                }
            }
        }

        // Also check against specs if needed
        if (cell.stats && Object.keys(cell.specs).length > 0) {
            for (const specId in cell.specs) {
                const specValue = cell.specs[specId].value;
                if (typeof specValue === 'number' && cell.stats.mean !== specValue) {
                    // Naive check. Realistically specs have min/max limits or tolerances. 
                    // But for now, just checking if it deviates.
                }
            }
        }

        if (cell.stats) {
            return (
                <div
                    className="flex flex-col items-center p-1 rounded-md hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => {
                        if (cell.stats?.rawData) {
                            setHistoryDialog({
                                isOpen: true,
                                propertyName,
                                contextName,
                                unit,
                                testMethod,
                                data: cell.stats.rawData
                            });
                        }
                    }}
                >
                    <span className={`font-bold ${isOutOfSpec ? 'text-red-600' : 'text-green-700'}`}>
                        {cell.stats.mean.toFixed(2)}
                    </span>
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                        (n={cell.stats.count}) <Eye className="w-3 h-3 text-primary/50" />
                    </span>
                </div>
            );
        }
        if (cell.manual) {
            return (
                <div className="flex flex-col items-center">
                    <span className="font-medium">{cell.manual.value}</span>
                </div>
            );
        }
        return <span className="text-muted-foreground/30"></span>;
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
            const props = (material.properties || []).filter(p => p.specificationId === s.id);
            props.forEach((p: any) => {
                // Find global definition by name first to ensure merging, then fallback to ID
                const def = globalProperties.find(gp => gp.name === p.name) || globalProperties.find(gp => gp.id === p.propertyId);
                if (def && p.value !== undefined) propertyIds.add(def.id);
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

        // Normalize method helper
        const normalizeMethod = (m?: string) => (m || "").toLowerCase().replace(/[^a-z0-9]/g, "");

        // Flatten all property instances (rules, manuals, specs) into unique rows based on Name + Method
        const uniqueRowsMap = new Map<string, {
            def: any,
            method: string,
            profileRules: Map<string, RequirementRule>
        }>();

        // 1. Add from Rules
        ruleMap.forEach((profRules, pid) => {
            const def = globalProperties.find(gp => gp.id === pid);
            if (!def) return;

            profRules.forEach((rule, profId) => {
                const meth = rule.method || "";
                const key = `${def.id}|${normalizeMethod(meth)}`;
                if (!uniqueRowsMap.has(key)) {
                    uniqueRowsMap.set(key, { def, method: meth, profileRules: new Map() });
                }
                uniqueRowsMap.get(key)!.profileRules.set(profId, rule);
            });
        });

        // 2. Add from Manual Properties
        (material.properties || []).forEach(p => {
            const def = globalProperties.find(gp => gp.name === p.name);
            if (def) {
                const meth = p.method || "";
                const key = `${def.id}|${normalizeMethod(meth)}`;
                if (!uniqueRowsMap.has(key)) {
                    uniqueRowsMap.set(key, { def, method: meth, profileRules: new Map() });
                }
            }
        });

        // 3. Add from Specs
        materialSpecs.forEach(s => {
            const props = (material.properties || []).filter(p => p.specificationId === s.id);
            props.forEach((p: any) => {
                const def = globalProperties.find(gp => gp.name === p.name) || globalProperties.find(gp => gp.id === p.propertyId);
                // Also accept empty strings if they are explicitly part of the spec definition
                if (def && (p.value !== undefined || p.value === "")) {
                    // Method mapping: fallback to trying to find an existing method for this property first
                    let meth = p.method || "";
                    if (!meth && ruleMap.has(def.id)) {
                        // If spec has no method, find an existing corresponding method in the rules to merge nicely
                        const mapRuleEntry = Array.from(ruleMap.get(def.id)!.values())[0];
                        if (mapRuleEntry && mapRuleEntry.method) meth = mapRuleEntry.method;
                    }

                    const key = `${def.id}|${normalizeMethod(meth)}`;
                    if (!uniqueRowsMap.has(key)) {
                        uniqueRowsMap.set(key, { def, method: meth, profileRules: new Map() });
                    }
                }
            });
        });

        const rows = Array.from(uniqueRowsMap.values()).map(rowData => {
            const { def, method, profileRules } = rowData;

            // Pick a representative rule for Unit if available
            const firstRule = Array.from(profileRules.values())[0];

            // Build cells for each profile
            const profileCells: { [key: string]: RequirementRule | undefined } = {};
            visibleProfiles.forEach(p => {
                let rule = profileRules.get(p.id);
                // Try searching by name/method if id failed
                if (!rule) {
                    rule = p.rules?.find((r: any) => {
                        const gp = globalProperties.find(g => g.id === r.propertyId);
                        return gp?.name === def.name && normalizeMethod(r.method) === normalizeMethod(method) && (r.scope === 'material' || !r.scope);
                    });
                }
                profileCells[p.id] = rule;
            });

            // Pass the explicit method to ensure specs and manuals match exactly this row's context
            const cell = buildRowData(firstRule || null, def, 'base', method);

            // Attach method manually since firstRule might be null if it came purely from spec
            if (!firstRule && method) {
                if (!cell.manual) cell.manual = { method } as any; // Mock to carry method down
                else cell.manual.method = method;
            }

            return { def, firstRule, profileCells, cell, explicitMethod: method };
        }).filter((r): r is Pick<typeof r, 'def' | 'firstRule' | 'profileCells' | 'cell' | 'explicitMethod'> => !!r)
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
                                <TableHead className="min-w-[250px] w-[250px] max-w-[250px] font-bold">Property</TableHead>
                                <TableHead className="min-w-[150px] w-[150px] max-w-[150px] font-bold border-r">Method</TableHead>
                                {visibleProfiles.map((profile) => (
                                    <TableHead key={profile.id} className="text-center bg-blue-50/50 border-l relative group">
                                        <div className="flex flex-col items-center py-2 min-w-[120px]">
                                            <span className="text-[10px] text-blue-700 bg-blue-100/50 px-1 py-0 h-4 rounded-sm font-semibold mb-1">STANDARD</span>
                                            <span className="truncate w-full block font-semibold text-blue-900">{profile.name}</span>
                                        </div>
                                    </TableHead>
                                ))}
                                {/* Render Individual Specification Columns */}
                                {visibleSpecs.length > 0 && visibleSpecs.map(spec => (
                                    <TableHead key={spec.id} className="text-center bg-purple-50/50 border-l relative group">
                                        <div className="flex flex-col items-center py-2 min-w-[120px]">
                                            <span className="text-[10px] text-purple-700 bg-purple-100/50 px-1 py-0 h-4 rounded-sm font-semibold mb-1">SPEC</span>
                                            <span className="truncate w-full block font-semibold text-purple-900">{spec.name}</span>
                                        </div>
                                    </TableHead>
                                ))}
                                <TableHead className="text-center bg-green-50/50 border-l font-semibold text-green-900 min-w-[120px]">
                                    Actual ({measurementFilter.type === 'all' ? 'All' : measurementFilter.type === 'last_n' ? `Last ${measurementFilter.value}` : measurementFilter.value})
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {rows.map((row) => (
                                <TableRow key={row.def.id}>
                                    <TableCell className="align-top py-4">
                                        <div className="flex flex-col">
                                            <span className="font-medium">{row.def.name}</span>
                                            <span className="text-xs text-muted-foreground mt-0.5">{row.firstRule?.unit || row.cell.manual?.unit || row.def.unit || "-"}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="align-top py-4 border-r">
                                        <span className="text-xs text-muted-foreground">{row.explicitMethod || row.firstRule?.method || row.cell.manual?.method || "-"}</span>
                                    </TableCell>

                                    {/* Per-Profile Standard Values */}
                                    {visibleProfiles.map((profile) => {
                                        const rule = row.profileCells[profile.id];
                                        return (
                                            <TableCell key={profile.id} className="text-center align-middle bg-blue-50/20 border-l">
                                                {rule ? (
                                                    <div className="flex flex-col items-center justify-center gap-0.5">
                                                        {rule.target !== undefined && (
                                                            <span className="font-bold text-[13px] text-blue-900">{rule.target}</span>
                                                        )}
                                                        {(rule.min !== undefined || rule.max !== undefined) && (
                                                            <div className="text-[11px] text-muted-foreground font-mono px-1 leading-tight">
                                                                {rule.min ?? '*'} - {rule.max ?? '*'}
                                                            </div>
                                                        )}
                                                        {(rule.min === undefined && rule.max === undefined && rule.target === undefined) && (
                                                            <span className="text-muted-foreground/20 text-xs">-</span>
                                                        )}
                                                    </div>
                                                ) : <span className="text-muted-foreground/20 text-xs">-</span>}
                                            </TableCell>
                                        );
                                    })}

                                    {/* Per-Specification Values */}
                                    {visibleSpecs.map(spec => {
                                        const prop = row.cell.specs[spec.id];
                                        return (
                                            <TableCell key={spec.id} className="text-center align-middle bg-purple-50/20 border-l">
                                                {prop ? (
                                                    <div className="flex flex-col items-center text-[13px] text-purple-900 font-bold">
                                                        <span>{prop.value}</span>
                                                    </div>
                                                ) : <span className="text-muted-foreground/30">-</span>}
                                            </TableCell>
                                        );
                                    })}

                                    <TableCell className="text-center align-middle bg-green-50/20 border-l">
                                        {renderActualCell(row.cell, row.def.name, material.name, row.def.unit, row.explicitMethod || row.firstRule?.method || row.cell.manual?.method)}
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

                    const normalizeMethod = (m?: string) => (m || "").toLowerCase().replace(/[^a-z0-9]/g, "");
                    const uniqueRowsMap = new Map<string, {
                        def: any,
                        method: string,
                        profileRules: Map<string, RequirementRule>
                    }>();

                    // 1. Add from Rules
                    ruleMap.forEach((profRules, pid) => {
                        const def = globalProperties.find(gp => gp.id === pid);
                        if (!def) return;
                        profRules.forEach((rule, profId) => {
                            const meth = rule.method || "";
                            const key = `${def.id}|${normalizeMethod(meth)}`;
                            if (!uniqueRowsMap.has(key)) {
                                uniqueRowsMap.set(key, { def, method: meth, profileRules: new Map() });
                            }
                            uniqueRowsMap.get(key)!.profileRules.set(profId, rule);
                        });
                    });

                    // 2. Add from Manual Properties (matching Contexts)
                    matchingContexts.forEach(ctx => {
                        if (ctx.obj && ctx.obj.properties) {
                            const props = Array.isArray(ctx.obj.properties) ? ctx.obj.properties : Object.values(ctx.obj.properties);
                            props.forEach((p: any) => {
                                const def = globalProperties.find(gp => gp.name === p.name);
                                if (def) {
                                    const meth = p.method || "";
                                    const key = `${def.id}|${normalizeMethod(meth)}`;
                                    if (!uniqueRowsMap.has(key)) {
                                        uniqueRowsMap.set(key, { def, method: meth, profileRules: new Map() });
                                    }
                                }
                            });
                        }
                    });

                    // 3. Add from Specs
                    visibleSpecs.forEach(s => {
                        const props = (material.properties || []).filter(p => p.specificationId === s.id);
                        props.forEach((p: any) => {
                            const targetsThisArch = p.referenceArchitectureId === arch.id;
                            const def = globalProperties.find(gp => gp.name === p.name) || globalProperties.find(gp => gp.id === p.propertyId);

                            if (def && (p.value !== undefined || p.value === "")) {
                                // Include if it explicitly targets this arch, OR if it has NO arch specified but the property definition is fundamentally required by this arch's profiles
                                const isArchRequired = ruleMap.has(def.id);
                                if (targetsThisArch || (!p.referenceArchitectureId && isArchRequired)) {
                                    let meth = p.method || "";
                                    if (!meth && ruleMap.has(def.id)) {
                                        const mapRuleEntry = Array.from(ruleMap.get(def.id)!.values())[0];
                                        if (mapRuleEntry && mapRuleEntry.method) meth = mapRuleEntry.method;
                                    }

                                    const key = `${def.id}|${normalizeMethod(meth)}`;
                                    if (!uniqueRowsMap.has(key)) {
                                        uniqueRowsMap.set(key, { def, method: meth, profileRules: new Map() });
                                    }
                                }
                            }
                        });
                    });

                    const rows = Array.from(uniqueRowsMap.values()).map(rowData => {
                        const { def, method, profileRules } = rowData;
                        const firstRule = Array.from(profileRules.values())[0];
                        return { def, method, profileRules, firstRule };
                    }).sort((a, b) => (a.def.name || "").localeCompare(b.def.name || ""));

                    if (rows.length === 0 && matchingContexts.length === 0) return null;

                    return (
                        <div key={arch.id} className="flex flex-col gap-2">
                            <div className="py-2 px-3 rounded-md font-semibold text-sm bg-blue-50/50 border border-blue-100 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Layers className="h-4 w-4 text-blue-600" />
                                    <span>{arch.name}</span>
                                    <span className="font-normal text-muted-foreground ml-2 text-xs">({arch.description})</span>
                                </div>
                                {matchingContexts.length === 0 ? (
                                    <div className="text-amber-600 text-xs flex items-center gap-1">
                                        <AlertCircle className="h-3 w-3" /> No Linked Layup
                                    </div>
                                ) : (
                                    <div className="text-green-600 text-xs flex items-center gap-2">
                                        <CheckCircle2 className="h-3 w-3" />
                                        <div className="flex gap-2">
                                            {matchingContexts.map((ctx, idx) => (
                                                <Link
                                                    key={ctx.id}
                                                    to={`/layups/${ctx.id}`}
                                                    className="hover:underline hover:text-green-800 font-medium"
                                                >
                                                    {matchingContexts.length > 1 ? `Linked Layup (${idx + 1})` : "Linked Layup: " + ctx.name.replace("Reference Layup: ", "").replace("Reference Assembly: ", "")}
                                                </Link>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="border rounded-md bg-card overflow-hidden">
                                <Table>
                                    <TableHeader className="bg-muted/10">
                                        <TableRow>
                                            <TableHead className="min-w-[250px] w-[250px] max-w-[250px] font-bold">Property</TableHead>
                                            <TableHead className="min-w-[150px] w-[150px] max-w-[150px] font-bold border-r">Method</TableHead>

                                            {/* Profile Columns (Specific to this Arch) */}
                                            {relevantProfiles.map(({ profile }) => (
                                                <TableHead key={profile.id} className="text-center bg-blue-50/50 border-l relative group">
                                                    <div className="flex flex-col items-center py-2 min-w-[120px]">
                                                        <span className="text-[10px] text-blue-700 bg-blue-100/50 px-1 py-0 h-4 rounded-sm font-semibold mb-1">STANDARD</span>
                                                        <span className="truncate w-full block font-semibold text-blue-900">{profile.name}</span>
                                                    </div>
                                                </TableHead>
                                            ))}

                                            {/* Specification Columns (Consistent with Base) */}
                                            {visibleSpecs.map(spec => (
                                                <TableHead key={spec.id} className="text-center bg-purple-50/50 border-l relative group">
                                                    <div className="flex flex-col items-center py-2 min-w-[120px]">
                                                        <span className="text-[10px] text-purple-700 bg-purple-100/50 px-1 py-0 h-4 rounded-sm font-semibold mb-1">SPEC</span>
                                                        <span className="truncate w-full block font-semibold text-purple-900">{spec.name}</span>
                                                    </div>
                                                </TableHead>
                                            ))}

                                            {matchingContexts.map(ctx => (
                                                <TableHead key={ctx.id} className="text-center bg-green-50/50 border-l text-green-900 font-semibold min-w-[120px]">
                                                    Actual ({measurementFilter.type === 'all' ? 'All' : measurementFilter.value})
                                                </TableHead>
                                            ))}
                                            {matchingContexts.length === 0 && <TableHead className="text-center bg-green-50/50 border-l text-green-900 font-semibold min-w-[120px]">Actual ({measurementFilter.type === 'all' ? 'All' : measurementFilter.value})</TableHead>}
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {rows.map(row => {
                                            const { def, method, profileRules, firstRule } = row;

                                            return (
                                                <TableRow key={`${def.id}-${method}`}>
                                                    <TableCell className="align-top py-4">
                                                        <div className="flex flex-col">
                                                            <span className="font-medium">{def.name}</span>
                                                            <span className="text-xs text-muted-foreground mt-0.5">{firstRule?.unit || def.unit || "-"}</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="align-top py-4 border-r">
                                                        <span className="text-xs text-muted-foreground">{method || "-"}</span>
                                                    </TableCell>

                                                    {/* Profile Values */}
                                                    {relevantProfiles.map(({ profile }) => {
                                                        const rule = profileRules.get(profile.id);

                                                        return (
                                                            <TableCell key={profile.id} className="text-center align-middle bg-blue-50/20 border-l">
                                                                {rule ? (
                                                                    <div className="flex flex-col items-center justify-center gap-0.5">
                                                                        {rule.target !== undefined && (
                                                                            <span className="font-bold text-[13px] text-blue-900">{rule.target}</span>
                                                                        )}
                                                                        {(rule.min !== undefined || rule.max !== undefined) && (
                                                                            <div className="text-[11px] text-muted-foreground font-mono px-1 leading-tight">
                                                                                {rule.min ?? '*'} - {rule.max ?? '*'}
                                                                            </div>
                                                                        )}
                                                                        {(rule.min === undefined && rule.max === undefined && rule.target === undefined) && (
                                                                            <span className="text-muted-foreground/20 text-xs">-</span>
                                                                        )}
                                                                    </div>
                                                                ) : <span className="text-muted-foreground/20 text-xs">-</span>}
                                                            </TableCell>
                                                        );
                                                    })}

                                                    {/* Per-Specification Values */}
                                                    {visibleSpecs.map(spec => {
                                                        const props = (material.properties || []).filter(p => p.specificationId === spec.id);
                                                        const match = props.find((p: any) => {
                                                            const nameMatch = p.name === def.name || p.propertyId === def.id;
                                                            // If spec property defines no method, assume it's meant for the row's method
                                                            const methodMatch = !method || !p.method || normalizeMethod(p.method) === normalizeMethod(method);
                                                            const isArchRequired = ruleMap.has(def.id);
                                                            const archMatch = p.referenceArchitectureId === arch.id || (!p.referenceArchitectureId && isArchRequired);
                                                            return nameMatch && methodMatch && archMatch;
                                                        });

                                                        return (
                                                            <TableCell key={spec.id} className="text-center align-middle bg-purple-50/20 border-l">
                                                                {match ? (
                                                                    <div className="flex flex-col items-center text-[13px] text-purple-900 font-bold">
                                                                        <span>{match.value}</span>
                                                                    </div>
                                                                ) : <span className="text-muted-foreground/30">-</span>}
                                                            </TableCell>
                                                        );
                                                    })}

                                                    {matchingContexts.length > 0 ? matchingContexts.map(ctx => {
                                                        const cell = buildRowData(firstRule || null, def, ctx.id, method);
                                                        // Ensure manual gets the correct explicit method text if it had one
                                                        if (!firstRule && method) {
                                                            if (!cell.manual) cell.manual = { method } as any;
                                                            else cell.manual.method = method;
                                                        }
                                                        return (
                                                            <TableCell key={ctx.id} className="text-center align-middle bg-green-50/20 border-l">
                                                                {renderActualCell(cell, def.name, ctx.name, def.unit, method)}
                                                            </TableCell>
                                                        );
                                                    }) : (
                                                        <TableCell className="text-center text-muted-foreground/30 align-middle bg-green-50/20 border-l">-</TableCell>
                                                    )}

                                                </TableRow>
                                            );
                                        })}
                                        {rows.length === 0 && (
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

            {/* Dialogs */}
            <MeasurementHistoryDialog
                isOpen={historyDialog.isOpen}
                onClose={() => setHistoryDialog(prev => ({ ...prev, isOpen: false }))}
                propertyName={historyDialog.propertyName}
                contextName={historyDialog.contextName}
                unit={historyDialog.unit}
                testMethod={historyDialog.testMethod}
                data={historyDialog.data}
            />
        </div>
    );
}
