import { useState, Fragment } from 'react';
import { useAppStore } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useComparisonData } from './useComparisonData';
import type { AnalysisCartItem } from '@/types/domain';
import { Beaker, Layers, Box, Settings2 } from 'lucide-react';

interface ComparisonViewProps {
    cart: AnalysisCartItem[];
}

export function ComparisonView({ cart }: ComparisonViewProps) {
    const { materials, layups, assemblies, requirementProfiles, specifications, updateAnalysisCartItemSelection } = useAppStore();
    const [hideEmpty, setHideEmpty] = useState(false);
    const [showReq, setShowReq] = useState(true);
    const [showSpec, setShowSpec] = useState(true);
    const [showActual, setShowActual] = useState(true);

    const data = useComparisonData(cart);

    const getEntityName = (item: AnalysisCartItem) => {
        if (item.type === 'material') return materials.find(m => m.id === item.id)?.name || 'Unknown';
        if (item.type === 'layup') return layups.find(l => l.id === item.id)?.name || 'Unknown';
        if (item.type === 'assembly') return assemblies.find(a => a.id === item.id)?.name || 'Unknown';
        return 'Unknown';
    };

    const getEntityStatus = (item: AnalysisCartItem) => {
        if (item.type === 'material') return materials.find(m => m.id === item.id)?.status;
        if (item.type === 'layup') return layups.find(l => l.id === item.id)?.status;
        if (item.type === 'assembly') return assemblies.find(a => a.id === item.id)?.status;
        return undefined;
    };

    const getEntityIcon = (type: string) => {
        if (type === 'material') return <Beaker className="w-3 h-3 mr-1" />;
        if (type === 'layup') return <Layers className="w-3 h-3 mr-1" />;
        if (type === 'assembly') return <Box className="w-3 h-3 mr-1" />;
        return null;
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <Card className="h-full">
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Direct Comparison</CardTitle>
                        <CardDescription>
                            {cart.length} items selected.
                        </CardDescription>
                    </div>
                    <div className="flex items-center space-x-6">
                        <div className="flex items-center space-x-2">
                            <Checkbox id="hide-empty" checked={hideEmpty} onCheckedChange={(c) => setHideEmpty(!!c)} />
                            <label htmlFor="hide-empty" className="text-sm font-medium leading-none">
                                Common Only
                            </label>
                        </div>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm" className="ml-auto flex h-8">
                                    <Settings2 className="mr-2 h-4 w-4" />
                                    View Options
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-[150px]">
                                <DropdownMenuLabel>Toggle Columns</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuCheckboxItem checked={showReq} onCheckedChange={setShowReq}>
                                    Standard
                                </DropdownMenuCheckboxItem>
                                <DropdownMenuCheckboxItem checked={showSpec} onCheckedChange={setShowSpec}>
                                    Specification
                                </DropdownMenuCheckboxItem>
                                <DropdownMenuCheckboxItem checked={showActual} onCheckedChange={setShowActual}>
                                    Actual
                                </DropdownMenuCheckboxItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[200px] bg-background sticky top-0 z-20 shadow-sm">Property</TableHead>
                                    {cart.map((item, idx) => (
                                        <TableHead key={`${item.type}-${item.id}`} className={`min-w-[280px] bg-background sticky top-0 z-10 shadow-sm border-l border-r`}>
                                            <div className="flex items-center" style={{ color: `var(--${item.color.replace('bg-', '')})` }}>
                                                {/* Fallback to text color if var is missing */}
                                                <div className={`w-3 h-3 rounded-full mr-2 ${item.color}`}></div>
                                                <span className="font-semibold">{getEntityName(item)}</span>
                                            </div>
                                            <div className="flex items-center text-[10px] text-muted-foreground font-normal mt-1">
                                                {getEntityIcon(item.type)} {item.type.toUpperCase()}
                                                {idx === 0 && <span className="ml-2 font-medium">(Baseline)</span>}
                                            </div>
                                        </TableHead>
                                    ))}
                                </TableRow>
                                {/* Nested Sub-Headers */}
                                <TableRow>
                                    <TableHead className="bg-muted/30 sticky top-12 z-20"></TableHead>
                                    {cart.map((item) => {
                                        const entity = item.type === 'material' ? materials.find(m => m.id === item.id)
                                            : item.type === 'layup' ? layups.find(l => l.id === item.id)
                                                : assemblies.find(a => a.id === item.id);

                                        const assignedProfileIds = entity?.assignedProfileIds || [];
                                        const itemStandards = requirementProfiles.filter(rp => assignedProfileIds.includes(rp.id));

                                        const itemSpecs = specifications.filter(s => s.materialId === item.id || s.layupId === item.id || s.assemblyId === item.id);

                                        return (
                                            <TableHead key={`sub-${item.type}-${item.id}`} className="bg-muted/10 p-0 border-l border-r sticky top-12 z-10 text-xs h-9">
                                                <div className="grid h-full divide-x" style={{ gridTemplateColumns: `repeat(${[showReq, showSpec, showActual].filter(Boolean).length || 1}, 1fr)` }}>
                                                    {showReq && (
                                                        <div className="flex items-center justify-center text-muted-foreground/80" title="Standard">
                                                            <Select
                                                                value={item.selectedStandardId || 'all'}
                                                                onValueChange={(val) => updateAnalysisCartItemSelection(item.id, { selectedStandardId: val === 'all' ? null : val })}
                                                            >
                                                                <SelectTrigger className={`h-full w-full border-0 bg-transparent text-xs font-medium focus:ring-0 shadow-none truncate flex items-center justify-center gap-1 ${!item.selectedStandardId ? 'text-primary' : ''}`}>
                                                                    <div className="truncate"><SelectValue placeholder="Standard" /></div>
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    <SelectItem value="all">Select Standard...</SelectItem>
                                                                    {itemStandards.map(rp => (
                                                                        <SelectItem key={rp.id} value={rp.id}>{rp.name}</SelectItem>
                                                                    ))}
                                                                </SelectContent>
                                                            </Select>
                                                        </div>
                                                    )}
                                                    {showSpec && (
                                                        <div className="flex items-center justify-center text-muted-foreground/80" title="Manufacturer Specification">
                                                            <Select
                                                                value={item.selectedSpecificationId || 'all'}
                                                                onValueChange={(val) => updateAnalysisCartItemSelection(item.id, { selectedSpecificationId: val === 'all' ? null : val })}
                                                            >
                                                                <SelectTrigger className={`h-full w-full border-0 bg-transparent text-xs font-medium focus:ring-0 shadow-none truncate flex items-center justify-center gap-1 ${!item.selectedSpecificationId ? 'text-primary' : ''}`}>
                                                                    <div className="truncate"><SelectValue placeholder="Spec." /></div>
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    <SelectItem value="all">Select Spec...</SelectItem>
                                                                    {itemSpecs.map(sp => (
                                                                        <SelectItem key={sp.id} value={sp.id}>{sp.name}</SelectItem>
                                                                    ))}
                                                                </SelectContent>
                                                            </Select>
                                                        </div>
                                                    )}
                                                    {showActual && <div className="flex items-center justify-center font-medium" title="Actual Measurement Average">Actual</div>}
                                                    {!showReq && !showSpec && !showActual && <div></div>}
                                                </div>
                                            </TableHead>
                                        );
                                    })}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {/* Metadata Row */}
                                <TableRow className="bg-muted/30">
                                    <TableCell className="font-medium text-sm">Status</TableCell>
                                    {cart.map(item => (
                                        <TableCell key={`status-${item.type}-${item.id}`} className="p-2 border-l border-r">
                                            <div className="grid grid-cols-3">
                                                <div className="col-span-3 flex justify-center">
                                                    <Badge variant="outline" className={`
                                                        ${getEntityStatus(item) === 'active' || getEntityStatus(item) === 'standard' ? 'bg-green-100/50 text-green-700 border-green-200' : ''}
                                                        ${getEntityStatus(item) === 'obsolete' ? 'bg-red-100/50 text-red-700 border-red-200' : ''}
                                                        ${getEntityStatus(item) === 'draft' ? 'bg-yellow-100/50 text-yellow-700 border-yellow-200' : ''}
                                                    `}>
                                                        {getEntityStatus(item) || 'Unknown'}
                                                    </Badge>
                                                </div>
                                            </div>
                                        </TableCell>
                                    ))}
                                </TableRow>

                                {/* Grouped Property Rows */}
                                {(() => {
                                    // 1. Group data by architecture
                                    const groupedData = data.reduce((acc, row) => {
                                        const groupName = row.referenceArchitectureName
                                            ? `${row.requirementProfileName ? row.requirementProfileName + ' - ' : ''}${row.referenceArchitectureName}`
                                            : 'Base Material / Independent Properties';

                                        if (!acc[groupName]) acc[groupName] = [];
                                        acc[groupName].push(row);
                                        return acc;
                                    }, {} as Record<string, typeof data>);

                                    // 2. Sort groups (Base Material first, then alphabetical)
                                    const sortedGroups = Object.keys(groupedData).sort((a, b) => {
                                        if (a === 'Base Material / Independent Properties') return -1;
                                        if (b === 'Base Material / Independent Properties') return 1;
                                        return a.localeCompare(b);
                                    });

                                    // 3. Render groups
                                    return sortedGroups.map(groupName => {
                                        const rows = groupedData[groupName];

                                        // Filter visible rows in this group
                                        const visibleRows = rows.filter(row => {
                                            const hasData = row.values.some(v =>
                                                (showReq && v.requirement) ||
                                                (showSpec && v.specification) ||
                                                (showActual && v.actual)
                                            );
                                            if (!hasData) return false;

                                            if (hideEmpty) {
                                                const everyItemHasData = row.values.every(v =>
                                                    (showReq && v.requirement) ||
                                                    (showSpec && v.specification) ||
                                                    (showActual && v.actual)
                                                );
                                                if (!everyItemHasData) return false;
                                            }
                                            return true;
                                        });

                                        if (visibleRows.length === 0) return null;

                                        return (
                                            <Fragment key={groupName}>
                                                {/* Group Header */}
                                                <TableRow className="bg-muted/40 hover:bg-muted/40 data-[state=selected]:bg-muted/40">
                                                    <TableCell colSpan={cart.length + 1} className="py-2 px-4 font-semibold text-sm text-foreground/90 border-y">
                                                        {groupName}
                                                    </TableCell>
                                                </TableRow>

                                                {/* Group Rows */}
                                                {visibleRows.map(row => {
                                                    const baselineActual = row.values[0]?.actual?.value;

                                                    return (
                                                        <TableRow key={row.key} className="hover:bg-muted/10">
                                                            <TableCell className="font-medium border-b border-r align-top py-3">
                                                                <div className="flex flex-col">
                                                                    <span>{row.propertyName}</span>
                                                                    {row.testMethodName && (
                                                                        <span className="text-muted-foreground font-normal text-[10px] leading-tight mt-0.5">
                                                                            {row.testMethodName}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <span className="text-muted-foreground text-[10px] block font-normal mt-1">{row.propertyUnit}</span>
                                                            </TableCell>

                                                            {row.values.map((val, idx) => {
                                                                const hasActual = val.actual !== undefined;
                                                                const hasSpec = val.specification?.nominal !== undefined || val.specification?.min !== undefined;
                                                                const hasReq = val.requirement?.min !== undefined || val.requirement?.max !== undefined || val.requirement?.target !== undefined;

                                                                // Calculate Delta
                                                                let delta = 0;
                                                                let deltaColor = '';
                                                                let isHigherBetter = true; // Assume higher is better for now, logic could be refined per property

                                                                if (idx > 0 && hasActual && baselineActual !== undefined && baselineActual !== 0) {
                                                                    delta = ((val.actual!.value - baselineActual) / baselineActual) * 100;
                                                                    if (Math.abs(delta) > 1) { // Only show if > 1% diff
                                                                        if (isHigherBetter) {
                                                                            deltaColor = delta > 0 ? 'text-green-600' : 'text-red-500';
                                                                        } else {
                                                                            deltaColor = delta > 0 ? 'text-red-500' : 'text-green-600';
                                                                        }
                                                                    }
                                                                }

                                                                return (
                                                                    <TableCell key={`val-${val.entityId}`} className="p-0 border-l border-r border-b align-top relative">
                                                                        <div className="grid h-full divide-x min-h-[50px]" style={{ gridTemplateColumns: `repeat(${[showReq, showSpec, showActual].filter(Boolean).length || 1}, 1fr)` }}>

                                                                            {/* Standard Col */}
                                                                            {showReq && (
                                                                                <div className="flex flex-col items-center justify-center p-1 text-xs w-full">
                                                                                    {hasReq ? (
                                                                                        <div className="text-center w-full text-[11px]">
                                                                                            {val.requirement!.target !== undefined && <span className="block font-medium w-full text-center">{val.requirement!.target}</span>}
                                                                                            {val.requirement!.min !== undefined && <span className="block text-muted-foreground w-full text-center">≥ {val.requirement!.min}</span>}
                                                                                            {val.requirement!.max !== undefined && <span className="block text-muted-foreground w-full text-center">≤ {val.requirement!.max}</span>}
                                                                                        </div>
                                                                                    ) : <span className="text-muted-foreground/30 w-full text-center block">-</span>}
                                                                                </div>
                                                                            )}

                                                                            {/* Specification Col */}
                                                                            {showSpec && (
                                                                                <div className="flex flex-col items-center justify-center p-1 text-xs w-full">
                                                                                    {hasSpec ? (
                                                                                        <div className="text-center w-full text-[11px]">
                                                                                            {val.specification!.nominal !== undefined && <span className="block font-medium">{val.specification!.nominal}</span>}
                                                                                            {(val.specification!.min !== undefined || val.specification!.max !== undefined) && (
                                                                                                <span className="block text-muted-foreground text-[10px]">
                                                                                                    [{val.specification!.min ?? ''} - {val.specification!.max ?? ''}]
                                                                                                </span>
                                                                                            )}
                                                                                        </div>
                                                                                    ) : <span className="text-muted-foreground/30 w-full text-center block">-</span>}
                                                                                </div>
                                                                            )}

                                                                            {/* Actual Col */}
                                                                            {showActual && (
                                                                                <div className="flex flex-col items-center justify-center p-1 text-sm bg-blue-50/10 w-full h-full min-h-full">
                                                                                    {hasActual ? (
                                                                                        <div className="text-center w-full text-[11px]">
                                                                                            {(() => {
                                                                                                // Determine color based on requirement
                                                                                                let valueColor = 'text-foreground';
                                                                                                if (hasReq) {
                                                                                                    const min = val.requirement!.min;
                                                                                                    const max = val.requirement!.max;
                                                                                                    const targetAttr = val.requirement!.target;
                                                                                                    const act = val.actual!.value;

                                                                                                    const failsMin = min !== undefined && act < min;
                                                                                                    const failsMax = max !== undefined && act > max;

                                                                                                    // If we only have a target, see if we hit it (approximate or exact, treating it mostly as a reference value)
                                                                                                    // Usually target implies equality, but it's often a reference nominal value.
                                                                                                    const failsTarget = targetAttr !== undefined && min === undefined && max === undefined && act !== parseFloat(targetAttr as string);

                                                                                                    if (failsMin || failsMax || failsTarget) {
                                                                                                        valueColor = 'text-red-600';
                                                                                                    } else if (min !== undefined || max !== undefined || targetAttr !== undefined) {
                                                                                                        // Has reqs and passes them
                                                                                                        valueColor = 'text-green-600';
                                                                                                    }
                                                                                                }
                                                                                                return <span className={`block font-semibold ${valueColor}`}>{val.actual!.value.toFixed(2)}</span>;
                                                                                            })()}

                                                                                            <span className="block text-[9px] text-muted-foreground mt-0.5">(n={val.actual!.count})</span>

                                                                                            {/* Delta against baseline */}
                                                                                            {idx > 0 && Math.abs(delta) > 1 && (
                                                                                                <span className={`block text-[9px] font-medium leading-none mt-1 ${deltaColor}`}>
                                                                                                    {delta > 0 ? '▲' : '▼'} {Math.abs(delta).toFixed(1)}%
                                                                                                </span>
                                                                                            )}

                                                                                        </div>
                                                                                    ) : <span className="text-muted-foreground/30 w-full text-center block">-</span>}
                                                                                </div>
                                                                            )}

                                                                            {!showReq && !showSpec && !showActual && <div></div>}
                                                                        </div>
                                                                    </TableCell>
                                                                );
                                                            })}
                                                        </TableRow>
                                                    );
                                                })}
                                            </Fragment>
                                        );
                                    });
                                })()}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
