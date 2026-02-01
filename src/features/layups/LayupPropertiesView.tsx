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
            const method = m.testMethod || "";

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
        }>();

        // Helper to get/init row
        const getRow = (name: string, unit: string, method: string = "") => {
            const key = `${name}|${method}`;
            if (!rows.has(key)) {
                rows.set(key, { id: key, name, method, unit, stdValues: {}, specValues: {} });
            }
            return rows.get(key)!;
        };

        // A. Process Standards (Requirement Profiles)
        assignedProfiles.forEach(prof => {
            if (!visibleColumnIds.includes(prof.id)) return;
            prof.rules.forEach(rule => {
                const propDef = globalProperties.find(pd => pd.id === rule.propertyId);
                const name = propDef?.name || rule.propertyId; // Fallback
                const unit = rule.unit || propDef?.unit || '';
                const method = rule.method || "";

                const row = getRow(name, unit, method);
                row.stdValues[prof.id] = { min: rule.min, max: rule.max, target: rule.target };
            });
        });

        // B. Process Specification Values (Layup Properties)
        // Only include properties that are LINKED to a specification
        (layup.properties || []).filter(p => !!p.specificationId).forEach(p => {
            if (p.specificationId && !visibleColumnIds.includes(p.specificationId)) return;

            // MaterialProperty uses 'method' field
            const method = p.method || "";
            const row = getRow(p.name, p.unit, method);

            // Ensure unit consistency warning? For now assume matching or overwrite
            if (!row.unit) row.unit = p.unit;

            if (p.specificationId) {
                row.specValues[p.specificationId] = p;
            }
        });

        // C. Process Measurements (ensure rows exist for actual data even if no spec/std)
        statsMap.forEach((_, key) => {
            if (!rows.has(key)) {
                const [name, method] = key.split('|');
                // We need to look up Unit... tough if coming from map key only. 
                // We'll try to find any measurement matching this to get unit.
                // Or look up PropDef by name.
                const propDef = globalProperties.find(pd => pd.name === name);
                const unit = propDef?.unit || "";

                getRow(name, unit, method); // Creates row if missing
            }
        });

        return Array.from(rows.values()).sort((a, b) => {
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
                                    const stats = statsMap.get(row.id);
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
