import { useState, useMemo, useEffect } from 'react';
import { useAppStore } from '@/lib/store';
import type { Layup, MaterialProperty, Measurement } from '@/types/domain';
import { Button } from '@/components/ui/button';
import { Card } from "@/components/ui/card";
import { Columns } from 'lucide-react';
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
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Badge } from '@/components/ui/badge';


interface LayupPropertiesViewProps {
    layup: Layup;
    measurements: Measurement[];
}

export function LayupPropertiesView({ layup, measurements }: LayupPropertiesViewProps) {
    const { requirementProfiles, specifications, properties: globalProperties } = useAppStore();

    // 1. Data Prep
    const assignedProfiles = useMemo(() => {
        return requirementProfiles.filter(p => (layup.assignedProfileIds || []).includes(p.id));
    }, [requirementProfiles, layup.assignedProfileIds]);

    const layupSpecs = useMemo(() => {
        return specifications.filter(s => s.layupId === layup.id);
    }, [specifications, layup.id]);

    // 2. State for Columns
    // IDs of Specs/Standards that are visible. Default to all.
    const [visibleColumnIds, setVisibleColumnIds] = useState<string[]>([]);

    // Test Data Filters
    const [timeFilter, setTimeFilter] = useState<string>("all");
    const [limitFilter, setLimitFilter] = useState<string>("all");

    // Initialize open columns when data is loaded
    useEffect(() => {
        const allIds = [
            ...assignedProfiles.map(p => p.id),
            ...layupSpecs.map(s => s.id)
        ];
        if (visibleColumnIds.length === 0 && allIds.length > 0) {
            setVisibleColumnIds(allIds);
        }
    }, [assignedProfiles.length, layupSpecs.length]);


    // 3. Filtered Measurements (Stats)
    const filteredMeasurements = useMemo(() => {
        // Filter measurements relevant to this LAYUP?
        // Measurements passed in prop are supposedly ALL measurements or Layup specific?
        // The calling component should pass only relevant measurements or we filter here if `measurements` is global.
        // Assuming `measurements` prop CONTAINS only relevant ones or checking `layupId`.
        // Let's filter by `layupId` just in case.
        let filtered = measurements.filter(m => m.layupId === layup.id && m.isActive !== false);

        filtered = filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        // Time Filter
        if (timeFilter !== 'all') {
            const now = new Date();
            const cutoff = new Date();
            if (timeFilter === '1m') cutoff.setMonth(now.getMonth() - 1);
            if (timeFilter === '6m') cutoff.setMonth(now.getMonth() - 6);
            if (timeFilter === '1y') cutoff.setFullYear(now.getFullYear() - 1);
            filtered = filtered.filter(m => new Date(m.date) >= cutoff);
        }

        // Limit Filter
        if (limitFilter !== 'all') {
            const limit = parseInt(limitFilter);
            if (!isNaN(limit)) {
                filtered = filtered.slice(0, limit);
            }
        }

        return filtered;
    }, [measurements, timeFilter, limitFilter, layup.id]);

    const statsMap = useMemo(() => {
        const map = new Map<string, { mean: number, min: number, max: number, count: number }>();
        const grouped = new Map<string, number[]>();

        filteredMeasurements.forEach(m => {
            const propDef = globalProperties.find(pd => pd.id === m.propertyDefinitionId);
            if (!propDef) return;
            const name = propDef.name;
            // Normalize method to match row ID logic
            const method = m.testMethod ? m.testMethod.toLowerCase().replace(/[^a-z0-9]/g, "") : "";

            // Keying by Name + Method
            const key = `${name}|${method}`;
            if (!grouped.has(key)) grouped.set(key, []);
            grouped.get(key)!.push(m.resultValue);
        });

        grouped.forEach((vals, key) => {
            const valid = vals.filter(v => !isNaN(v));
            if (valid.length > 0) {
                const sum = valid.reduce((a, b) => a + b, 0);
                map.set(key, {
                    mean: sum / valid.length,
                    min: Math.min(...valid),
                    max: Math.max(...valid),
                    count: valid.length
                });
            }
        });
        return map;
    }, [filteredMeasurements, globalProperties]);

    // 4. Matrix Calculation
    const matrixRows = useMemo(() => {
        // Key: Property Name + Method. Value: Row Data
        const rows = new Map<string, {
            id: string, // Composite key
            name: string,
            method: string,
            unit: string,
            stdValues: Record<string, { min?: number, max?: number, target?: number | string }>, // ProfileID -> Rules
            specValues: Record<string, MaterialProperty>, // SpecID -> Value
            stats?: { mean: number, min: number, max: number, count: number }
        }>();

        // Helper: Aggressive normalization for method matching (e.g. "ISO-1183" == "ISO 1183")
        const normalizeMethodString = (s: string) => {
            if (!s) return "";
            try {
                return s.toLowerCase().replace(/[^a-z0-9]/g, "");
            } catch (e) {
                console.error("Error normalizing method:", s, e);
                return "";
            }
        };

        // Helper to get/init row
        const getRow = (name: string, unit: string, method: string = "") => {
            const rawMethod = (method || "").trim();
            const normalizedMethodKey = normalizeMethodString(rawMethod);
            const rawName = (name || "").trim(); // Safety check
            if (!rawName) return null; // Skip invalid rows

            const normalizedName = rawName;

            // Try to align name with global definition to handle faint mismatches
            const propDef = globalProperties.find(p => p.name && p.name.toLowerCase() === normalizedName.toLowerCase());
            const finalName = propDef ? propDef.name : normalizedName;

            const key = `${finalName}|${normalizedMethodKey}`;

            if (!rows.has(key)) {
                rows.set(key, { id: key, name: finalName, method: rawMethod, unit: unit || "", stdValues: {}, specValues: {} });
            }
            return rows.get(key)!;
        };

        // A. Process Standards (Requirement Profiles)
        assignedProfiles.forEach(prof => {
            if (!visibleColumnIds.includes(prof.id)) return;
            if (!prof.rules) {
                console.warn("Profile has no rules:", prof.id);
                return;
            }
            prof.rules.forEach(rule => {
                // propDef lookup
                const propDef = globalProperties.find(pd => pd.id === rule.propertyId);
                const name = propDef?.name || rule.propertyId; // Fallback
                const unit = rule.unit || propDef?.unit || '';
                const method = rule.method || "";

                const row = getRow(name, unit, method);
                if (row) {
                    row.stdValues[prof.id] = { min: rule.min, max: rule.max, target: rule.target };
                }
            });
        });

        // B. Process Specification Values (Layup Properties)
        const properties = Array.isArray(layup.properties) ? layup.properties : [];


        properties.filter(p => !!p.specificationId).forEach(p => {
            if (p.specificationId && !visibleColumnIds.includes(p.specificationId)) return;

            // MaterialProperty uses 'method' field
            const method = p.method || "";
            const row = getRow(p.name, p.unit, method);

            if (row) {
                // Ensure unit consistency warning? For now assume matching or overwrite
                if (!row.unit) row.unit = p.unit;

                if (p.specificationId) {
                    row.specValues[p.specificationId] = p;
                }
            }
        });

        // C. Process Measurements (ensure rows exist for actual data even if no spec/std)
        statsMap.forEach((_, key) => {
            if (!rows.has(key)) {
                const [name, method] = key.split('|');
                const propDef = globalProperties.find(pd => pd.name === name);
                const unit = propDef?.unit || "";
                getRow(name, unit, method);
            }
        });

        const rawRows = Array.from(rows.values());

        // Post-Processing: Merge duplicate rows based on Method compatibility
        // 1. Group by Name
        const byName = new Map<string, typeof rawRows>();
        rawRows.forEach(r => {
            if (!byName.has(r.name)) byName.set(r.name, []);
            byName.get(r.name)!.push(r);
        });

        const finalRows: typeof rawRows = [];

        byName.forEach((groupRows) => {
            const mergedGroup: typeof rawRows = [];
            const processedIndices = new Set<number>();

            // Sort group to prioritize rows with Definitions (Standards/Specs) as targets
            groupRows.sort((a, b) => {
                const aHasDef = Object.keys(a.stdValues).length > 0 || Object.keys(a.specValues).length > 0;
                const bHasDef = Object.keys(b.stdValues).length > 0 || Object.keys(b.specValues).length > 0;
                return (bHasDef ? 1 : 0) - (aHasDef ? 1 : 0);
            });

            for (let i = 0; i < groupRows.length; i++) {
                if (processedIndices.has(i)) continue;
                const target = groupRows[i];
                const targetMethodNorm = normalizeMethodString(target.method);

                for (let j = i + 1; j < groupRows.length; j++) {
                    if (processedIndices.has(j)) continue;
                    const source = groupRows[j];
                    const sourceMethodNorm = normalizeMethodString(source.method);

                    // Check Compatibility
                    let isCompatible = false;

                    // 1. One is empty -> Match
                    if (!targetMethodNorm || !sourceMethodNorm) {
                        isCompatible = true;
                    }
                    // 2. Substring Match (Bidirectional)
                    else if (targetMethodNorm.includes(sourceMethodNorm) || sourceMethodNorm.includes(targetMethodNorm)) {
                        isCompatible = true;
                    }

                    if (isCompatible) {
                        // MERGE source into target
                        processedIndices.add(j);

                        // Merge Standard Values
                        Object.entries(source.stdValues).forEach(([profileId, rule]) => {
                            if (!target.stdValues[profileId]) target.stdValues[profileId] = rule;
                        });

                        // Merge Spec Values
                        Object.entries(source.specValues).forEach(([specId, val]) => {
                            if (!target.specValues[specId]) target.specValues[specId] = val;
                        });

                        // Merge Unit
                        if (!target.unit && source.unit) target.unit = source.unit;

                        // Merge Stats
                        const sourceStats = source.stats || statsMap.get(source.id);
                        if (sourceStats) {
                            if (!target.stats) target.stats = statsMap.get(target.id); // Ensure init
                            const targetStats = target.stats;

                            if (!targetStats) {
                                target.stats = sourceStats;
                            } else {
                                // Aggregate
                                const combinedCount = targetStats.count + sourceStats.count;
                                const combinedMean = ((targetStats.mean * targetStats.count) + (sourceStats.mean * sourceStats.count)) / combinedCount;
                                const combinedMin = Math.min(targetStats.min, sourceStats.min);
                                const combinedMax = Math.max(targetStats.max, sourceStats.max);

                                target.stats = {
                                    mean: combinedMean,
                                    min: combinedMin,
                                    max: combinedMax,
                                    count: combinedCount
                                };
                            }
                        }
                    }
                }
                mergedGroup.push(target);
            }

            mergedGroup.forEach(r => finalRows.push(r));
        });

        return finalRows.sort((a, b) => {
            // 1. Sort by Category
            const catA = globalProperties.find(p => p.name === a.name)?.category || 'other';
            const catB = globalProperties.find(p => p.name === b.name)?.category || 'other';

            const idxA = CATEGORY_ORDER.indexOf(catA.toLowerCase());
            const idxB = CATEGORY_ORDER.indexOf(catB.toLowerCase());

            if (idxA !== -1 && idxB !== -1) {
                if (idxA !== idxB) return idxA - idxB;
            } else if (idxA !== -1) return -1;
            else if (idxB !== -1) return 1;

            const nameCompare = a.name.localeCompare(b.name);
            if (nameCompare !== 0) return nameCompare;
            return a.method.localeCompare(b.method);
        });
    }, [assignedProfiles, layupSpecs, layup.properties, globalProperties, visibleColumnIds, statsMap]);


    // Columns Definition for UI
    const visibleProfiles = assignedProfiles.filter(p => visibleColumnIds.includes(p.id));
    const visibleSpecs = layupSpecs.filter(s => visibleColumnIds.includes(s.id));

    // 4. Return UI Structure (Filter Bar + Table Header)
    return (
        <div className="flex h-full flex-col gap-4">
            {/* Toolbar */}
            <div className="flex items-center justify-between gap-4 p-1 border-b pb-4 shrink-0">
                <div className="flex items-center gap-2">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="h-8">
                                <Columns className="mr-2 h-4 w-4" /> Attributes & Specs
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-[300px]">
                            <DropdownMenuLabel>Visible Specs & Standards</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            {assignedProfiles.length > 0 && (
                                <>
                                    <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Standards</div>
                                    {assignedProfiles.map(p => (
                                        <DropdownMenuCheckboxItem
                                            key={p.id}
                                            checked={visibleColumnIds.includes(p.id)}
                                            onCheckedChange={(checked) => {
                                                setVisibleColumnIds(prev =>
                                                    checked ? [...prev, p.id] : prev.filter(id => id !== p.id)
                                                );
                                            }}
                                        >
                                            <span className="truncate">{p.name}</span>
                                        </DropdownMenuCheckboxItem>
                                    ))}
                                    <DropdownMenuSeparator />
                                </>
                            )}
                            {layupSpecs.length > 0 && (
                                <>
                                    <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Specifications</div>
                                    {layupSpecs.map(s => (
                                        <DropdownMenuCheckboxItem
                                            key={s.id}
                                            checked={visibleColumnIds.includes(s.id)}
                                            onCheckedChange={(checked) => {
                                                setVisibleColumnIds(prev =>
                                                    checked ? [...prev, s.id] : prev.filter(id => id !== s.id)
                                                );
                                            }}
                                        >
                                            <div className="flex flex-col">
                                                <span className="font-medium">{s.code || s.name}</span>
                                                {s.code && s.name && <span className="text-xs text-muted-foreground">{s.name}</span>}
                                            </div>
                                        </DropdownMenuCheckboxItem>
                                    ))}
                                </>
                            )}
                            {assignedProfiles.length === 0 && layupSpecs.length === 0 && (
                                <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                                    No data attributes found.
                                </div>
                            )}
                        </DropdownMenuContent>
                    </DropdownMenu>

                    <div className="h-6 w-px bg-border mx-2" />

                    {/* Test Data Filters */}
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-muted-foreground">Test Data:</span>
                        <Select value={timeFilter} onValueChange={setTimeFilter}>
                            <SelectTrigger className="w-[130px] h-8 text-xs">
                                <SelectValue placeholder="Time Period" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Time</SelectItem>
                                <SelectItem value="1m">Last Month</SelectItem>
                                <SelectItem value="6m">Last 6 Months</SelectItem>
                                <SelectItem value="1y">Last Year</SelectItem>
                            </SelectContent>
                        </Select>
                        <span className="text-xs text-muted-foreground">or</span>
                        <Select value={limitFilter} onValueChange={setLimitFilter}>
                            <SelectTrigger className="w-[130px] h-8 text-xs">
                                <SelectValue placeholder="Count Limit" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Measurements</SelectItem>
                                <SelectItem value="5">Last 5</SelectItem>
                                <SelectItem value="10">Last 10</SelectItem>
                                <SelectItem value="25">Last 25</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                </div>
            </div>

            {/* Matrix View */}
            <Card className="flex-1 border-none shadow-none bg-transparent overflow-hidden flex flex-col">
                <div className="border rounded-md bg-card overflow-hidden flex flex-col flex-1 relative">
                    <div className="h-full overflow-auto">
                        <Table>
                            <TableHeader className="sticky top-0 bg-background z-20 shadow-sm">
                                <TableRow>
                                    <TableHead className="w-[20px] bg-background"></TableHead>
                                    <TableHead className="w-[200px] bg-background font-bold">Property</TableHead>
                                    <TableHead className="w-[150px] bg-background font-bold border-r">Method</TableHead>

                                    {/* Profiles (Standards) */}
                                    {visibleProfiles.map(p => (
                                        <TableHead key={p.id} className="min-w-[180px] border-l bg-blue-50/50 text-center relative group">
                                            <div className="flex flex-col items-center py-2">
                                                <Badge variant="secondary" className="mb-1 text-[10px] bg-blue-100/50 text-blue-700 hover:bg-blue-100 border-none px-1 py-0 h-4">STANDARD</Badge>
                                                <span className="truncate w-full block font-semibold text-blue-900">{p.name}</span>
                                            </div>
                                        </TableHead>
                                    ))}

                                    {/* Specifications */}
                                    {visibleSpecs.map(s => (
                                        <TableHead key={s.id} className="min-w-[150px] border-l bg-purple-50/50 text-center relative group">
                                            <div className="flex flex-col items-center py-2">
                                                <Badge variant="secondary" className="mb-1 text-[10px] bg-purple-100/50 text-purple-700 hover:bg-purple-100 border-none px-1 py-0 h-4">SPEC</Badge>
                                                <span className="truncate w-full block font-semibold text-purple-900">{s.code || s.name}</span>
                                                {s.code && s.name && <span className="truncate w-full block text-[10px] text-purple-700/70 font-normal">{s.name}</span>}
                                            </div>
                                        </TableHead>
                                    ))}

                                    <TableHead className="min-w-[150px] border-l bg-green-50/50 text-center">
                                        Tests (Actual)
                                    </TableHead>
                                    <TableHead className="w-[20px] bg-background"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {matrixRows.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={5 + visibleProfiles.length + visibleSpecs.length} className="text-center h-40 text-muted-foreground">
                                            No properties to display. Add specifications or assigns standards to see comparison.
                                        </TableCell>
                                    </TableRow>
                                )}
                                {matrixRows.map((row) => {
                                    const stats = row.stats || statsMap.get(row.id);
                                    return (
                                        <TableRow key={row.id} className="hover:bg-muted/30">
                                            <TableCell></TableCell>
                                            <TableCell className="font-medium align-top py-4">
                                                <div className="flex flex-col">
                                                    <span>{row.name}</span>
                                                    <span className="text-xs text-muted-foreground mt-0.5">{row.unit}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="align-top py-4 border-r">
                                                {row.method ? (
                                                    <span className="font-mono text-sm text-muted-foreground">{row.method}</span>
                                                ) : (
                                                    <span className="text-xs text-muted-foreground/30">-</span>
                                                )}
                                            </TableCell>

                                            {/* Standard Values */}
                                            {visibleProfiles.map(p => {
                                                const rule = row.stdValues[p.id];
                                                return (
                                                    <TableCell key={p.id} className="border-l p-2 align-middle text-center bg-blue-50/20">
                                                        {rule ? (
                                                            <div className="flex flex-col items-center justify-center gap-0.5">
                                                                {rule.target !== undefined && (
                                                                    <span className="font-bold text-base text-blue-900">{rule.target}</span>
                                                                )}

                                                                {(rule.min !== undefined || rule.max !== undefined) && (
                                                                    <div className="text-[11px] text-muted-foreground font-mono px-1">
                                                                        {rule.min ?? '*'} - {rule.max ?? '*'}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ) : <span className="text-muted-foreground/20 text-xs">-</span>}
                                                    </TableCell>
                                                )
                                            })}

                                            {/* Spec Values */}
                                            {visibleSpecs.map(s => {
                                                const prop = row.specValues[s.id];
                                                return (
                                                    <TableCell key={s.id} className="border-l p-2 align-middle text-center bg-purple-50/20 group relative">
                                                        {prop ? (
                                                            <div className="flex flex-col items-center gap-0.5 group/cell">
                                                                <span className="font-bold text-base text-purple-900">{prop.value}</span>
                                                            </div>
                                                        ) : (
                                                            <div className="h-full w-full flex items-center justify-center opacity-0 transition-opacity">
                                                                <span className="text-muted-foreground/20 text-xs">-</span>
                                                            </div>
                                                        )}
                                                    </TableCell>
                                                )
                                            })}

                                            {/* Test Stats */}
                                            <TableCell className="border-l bg-green-50/20 p-2 align-middle text-center">
                                                {stats ? (
                                                    <div className="flex flex-col items-center justify-center gap-0.5">
                                                        <span className="font-bold text-base text-green-900">{stats.mean.toFixed(2)}</span>
                                                        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground/80">
                                                            <div className="font-mono px-1">
                                                                {stats.min.toFixed(1)} - {stats.max.toFixed(1)}
                                                            </div>
                                                            <span>(n={stats.count})</span>
                                                        </div>
                                                    </div>
                                                ) : <span className="text-muted-foreground/20 text-xs">-</span>}
                                            </TableCell>
                                            <TableCell></TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </div>
                </div>
            </Card>
        </div>
    );
}
