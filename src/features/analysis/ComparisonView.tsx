import { useState, useMemo } from 'react';
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
    Radar,
    RadarChart,
    PolarGrid,
    PolarAngleAxis,
    PolarRadiusAxis,
    ResponsiveContainer,
    Legend,
    Tooltip
} from 'recharts';

interface ComparisonViewProps {
    selectedIds: string[];
}

export function ComparisonView({ selectedIds }: ComparisonViewProps) {
    const { materials, properties } = useAppStore();
    const [hideEmpty, setHideEmpty] = useState(false);

    // Prepare Data for Radar Chart
    const comparisonData = useMemo(() => {
        if (selectedIds.length === 0) return [];
        const baseMat = materials.find(m => m.id === selectedIds[0]);
        if (!baseMat) return [];

        const relevantProps = properties.filter(n => (n.category as string) === 'mechanical' || (n.category as string) === 'thermal').slice(0, 6);

        return relevantProps.map(prop => {
            const row: any = {
                subject: prop.name,
                fullMark: 100
            };

            selectedIds.forEach((id) => {
                const mat = materials.find(m => m.id === id);
                if (!mat) return;
                const pVal = mat.properties?.find(p => p.id === prop.id || p.name === prop.name)?.value;
                const numVal = typeof pVal === 'number' ? pVal : parseFloat(pVal as string) || 0;
                row[mat.name] = numVal;
            });
            return row;
        });
    }, [selectedIds, materials, properties]);

    const colors = ["#8884d8", "#82ca9d", "#ffc658", "#ff7300"];

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="grid grid-cols-12 gap-6">
                {/* Visual Chart */}
                <div className="col-span-12 lg:col-span-5 h-[500px]">
                    <Card className="h-full">
                        <CardHeader>
                            <CardTitle>Property Radar</CardTitle>
                            <CardDescription>Relative performance overview.</CardDescription>
                        </CardHeader>
                        <CardContent className="h-[400px]">
                            {selectedIds.length < 1 ? (
                                <div className="h-full flex items-center justify-center text-muted-foreground">
                                    Select materials above to compare.
                                </div>
                            ) : (
                                <ResponsiveContainer width="100%" height="100%">
                                    <RadarChart cx="50%" cy="50%" outerRadius="80%" data={comparisonData}>
                                        <PolarGrid />
                                        <PolarAngleAxis dataKey="subject" />
                                        <PolarRadiusAxis angle={30} domain={[0, 'auto']} />

                                        {selectedIds.map((id, idx) => {
                                            const mat = materials.find(m => m.id === id);
                                            if (!mat) return null;
                                            return (
                                                <Radar
                                                    key={id}
                                                    name={mat.name}
                                                    dataKey={mat.name}
                                                    stroke={colors[idx % colors.length]}
                                                    fill={colors[idx % colors.length]}
                                                    fillOpacity={0.4}
                                                />
                                            );
                                        })}
                                        <Legend />
                                        <Tooltip />
                                    </RadarChart>
                                </ResponsiveContainer>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Data Table */}
                <div className="col-span-12 lg:col-span-7">
                    <Card className="h-full">
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle>Direct Comparison</CardTitle>
                                <CardDescription>
                                    {selectedIds.length} materials selected.
                                </CardDescription>
                            </div>
                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id="hide-empty"
                                    checked={hideEmpty}
                                    onCheckedChange={(c) => setHideEmpty(!!c)}
                                />
                                <label
                                    htmlFor="hide-empty"
                                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                >
                                    Common Properties Only
                                </label>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-[200px]">Property</TableHead>
                                            {selectedIds.map((id, idx) => {
                                                const mat = materials.find(m => m.id === id);
                                                return (
                                                    <TableHead key={id} className={`min-w-[150px] ${idx === 0 ? 'bg-muted/10' : ''}`}>
                                                        <span style={{ color: colors[idx % colors.length] }}>{mat?.name}</span>
                                                        {idx === 0 && <span className="block text-[10px] text-muted-foreground font-normal">(Baseline)</span>}
                                                    </TableHead>
                                                );
                                            })}
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {/* Metadata Rows */}
                                        <TableRow className="bg-muted/50">
                                            <TableCell className="font-medium">Status</TableCell>
                                            {selectedIds.map(id => {
                                                const mat = materials.find(m => m.id === id);
                                                return (
                                                    <TableCell key={id}>
                                                        <Badge variant={mat?.status === 'standard' ? 'default' : 'secondary'}>
                                                            {mat?.status}
                                                        </Badge>
                                                    </TableCell>
                                                );
                                            })}
                                        </TableRow>

                                        {/* Property Rows */}
                                        {properties.map(prop => {
                                            // 1. Gather values for this property
                                            const values = selectedIds.map(id => {
                                                const mat = materials.find(m => m.id === id);
                                                // Try normalized props or raw
                                                // For now raw simple check
                                                const pVal = mat?.properties?.find(p => p.id === prop.id || p.name === prop.name)?.value;
                                                return typeof pVal === 'number' ? pVal : parseFloat(pVal as string) || 0;
                                            });

                                            // 2. Filter logic: If hideEmpty is true, and ANY value is 0/missing, skip?
                                            // Or if ALL are missing?
                                            // "Show Common Only" implies show only if ALL have it.
                                            // "Hide Empty Rows" implies show if AT LEAST ONE has it.
                                            // Let's go with "Show Common Only" (Strict) if checked
                                            const missingCount = values.filter(v => !v || v === 0).length;
                                            const hasAllData = missingCount === 0;

                                            // If checked, require ALL data. If invalid/empty, skip.
                                            if (hideEmpty && !hasAllData) return null;

                                            // If not checked, hide only if ALL are empty (useless row)
                                            const hasAnyData = values.some(v => v !== 0);
                                            if (!hasAnyData) return null;

                                            return (
                                                <TableRow key={prop.id}>
                                                    <TableCell className="font-medium">
                                                        {prop.name}
                                                        <span className="text-muted-foreground text-xs block">{prop.unit}</span>
                                                    </TableCell>
                                                    {selectedIds.map((id, idx) => {
                                                        const numVal = values[idx];
                                                        const baseVal = values[0];

                                                        // Highlighting
                                                        const max = Math.max(...values);
                                                        const isBest = numVal === max && max > 0;

                                                        // Delta
                                                        const delta = idx > 0 && baseVal > 0 ? ((numVal - baseVal) / baseVal) * 100 : 0;

                                                        return (
                                                            <TableCell key={id} className={isBest ? "font-bold bg-green-50/50" : ""}>
                                                                {numVal.toFixed(2)}
                                                                {idx > 0 && Math.abs(delta) > 1 && (
                                                                    <span className={`text-xs ml-2 ${delta > 0 ? 'text-green-600' : 'text-red-500'}`}>
                                                                        {delta > 0 ? '+' : ''}{delta.toFixed(0)}%
                                                                    </span>
                                                                )}
                                                            </TableCell>
                                                        );
                                                    })}
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
