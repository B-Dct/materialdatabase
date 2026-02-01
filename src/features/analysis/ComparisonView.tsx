import { useState } from 'react';
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

interface ComparisonViewProps {
    selectedIds: string[];
}

export function ComparisonView({ selectedIds }: ComparisonViewProps) {
    const { materials, properties } = useAppStore();
    const [hideEmpty, setHideEmpty] = useState(false);

    const colors = ["#8884d8", "#82ca9d", "#ffc658", "#ff7300"];

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
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
                                        const pVal = mat?.properties?.find(p => p.id === prop.id || p.name === prop.name)?.value;
                                        return typeof pVal === 'number' ? pVal : parseFloat(pVal as string) || 0;
                                    });

                                    // 2. Filter logic
                                    const missingCount = values.filter(v => !v || v === 0).length;
                                    const hasAllData = missingCount === 0;

                                    if (hideEmpty && !hasAllData) return null;

                                    // Hide if all are empty
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
    );
}
