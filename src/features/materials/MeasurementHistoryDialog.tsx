import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList } from 'recharts';
import { Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Measurement } from '@/types/domain';

interface MeasurementHistoryDialogProps {
    isOpen: boolean;
    onClose: () => void;
    propertyName: string;
    contextName: string;
    unit?: string;
    testMethod?: string;
    data: { value: number; date: string; measurement?: Measurement }[];
}

import { useState } from 'react';

export function MeasurementHistoryDialog({
    isOpen,
    onClose,
    propertyName,
    contextName,
    unit,
    testMethod,
    data
}: MeasurementHistoryDialogProps) {
    const [disabledIds, setDisabledIds] = useState<Set<string>>(new Set());

    if (!data || data.length === 0) return null;

    const toggleMeasurement = (id: string) => {
        setDisabledIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    // Use a reversed copy of data for the chart, so it shows left-to-right from oldest to newest
    // Filter out disabled measurements
    const chartData = [...data]
        .filter(d => d.measurement ? !disabledIds.has(d.measurement.id) : true)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .map(d => ({
            ...d,
            formattedDate: new Date(d.date).toLocaleDateString()
        }));

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>
                        Measurement History: {propertyName}
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Chart Section */}
                    <div className="h-72 border rounded-md p-4 bg-muted/10 flex flex-col">
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-sm font-semibold">{contextName}</span>
                            {testMethod && (
                                <span className="text-xs font-medium bg-background px-2 py-1 rounded border text-muted-foreground shadow-sm">
                                    Method: {testMethod}
                                </span>
                            )}
                        </div>
                        <div className="flex-1 min-h-0">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={chartData} margin={{ top: 10, right: 20, bottom: 5, left: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted-foreground)/0.2)" />
                                    <XAxis
                                        dataKey="formattedDate"
                                        tick={{ fontSize: 12 }}
                                        tickMargin={10}
                                        stroke="hsl(var(--muted-foreground))"
                                    />
                                    <YAxis
                                        domain={[0, (dataMax: number) => Math.ceil(dataMax * 1.15)]}
                                        tick={{ fontSize: 12 }}
                                        stroke="hsl(var(--muted-foreground))"
                                        label={unit ? { value: unit, angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fill: 'hsl(var(--muted-foreground))', fontSize: 12 } } : undefined}
                                    />
                                    <Tooltip
                                        contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))' }}
                                        labelStyle={{ fontWeight: 'bold' }}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="value"
                                        stroke="hsl(var(--primary))"
                                        strokeWidth={2}
                                        dot={{ r: 4, fill: "hsl(var(--primary))" }}
                                        activeDot={{ r: 6 }}
                                        name="Value"
                                    >
                                        {data.length <= 10 && (
                                            <LabelList
                                                dataKey="value"
                                                position="top"
                                                offset={10}
                                                style={{ fontSize: '11px', fontWeight: 500, fill: 'hsl(var(--foreground))' }}
                                            />
                                        )}
                                    </Line>
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Table Section */}
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <h4 className="text-sm font-medium">Individual Measurements ({data.length})</h4>
                            {disabledIds.size > 0 && (
                                <span className="text-xs text-muted-foreground">
                                    {disabledIds.size} excluded from chart
                                </span>
                            )}
                        </div>
                        <div className="border rounded-md">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Value</TableHead>
                                        <TableHead>Order Number</TableHead>
                                        <TableHead className="w-[80px] text-right">Visible</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {data.map((item, i) => {
                                        const measId = item.measurement?.id || `idx-${i}`;
                                        const isActive = !disabledIds.has(measId);
                                        return (
                                            <TableRow key={measId} className={!isActive ? "opacity-50" : ""}>
                                                <TableCell className="font-medium">
                                                    {new Date(item.date).toLocaleDateString()}
                                                </TableCell>
                                                <TableCell>{item.value} {unit}</TableCell>
                                                <TableCell className="text-muted-foreground max-w-[200px] truncate">
                                                    {item.measurement?.orderNumber || "Unknown"}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="w-6 h-6 hover:bg-transparent"
                                                        onClick={() => toggleMeasurement(measId)}
                                                    >
                                                        {isActive ? (
                                                            <Eye className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                                                        ) : (
                                                            <EyeOff className="w-4 h-4 text-muted-foreground/30 hover:text-foreground" />
                                                        )}
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
