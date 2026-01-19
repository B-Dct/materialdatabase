import { useEffect, useState, useMemo } from 'react';
import { useAppStore } from '@/lib/store';
import { getHistoryData, type HistoryPoint } from './analysis-utils';
import { motion } from 'framer-motion';

import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from "@/components/ui/card";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { CalendarIcon } from "lucide-react";

function SimpleLineChart({ data }: { data: HistoryPoint[] }) {
    const width = 600;
    const height = 300;
    const padding = 40;

    if (data.length < 2) {
        return <div className="h-[300px] flex items-center justify-center text-muted-foreground">Not enough data points for a trend line.</div>;
    }

    const values = data.map(d => d.value);
    const minVal = Math.min(...values);
    const maxVal = Math.max(...values);
    const range = maxVal - minVal || 1; // Avoid divide by zero

    // Scale Y with some padding
    const domainMin = minVal - (range * 0.1);
    const domainMax = maxVal + (range * 0.1);
    const domainRange = domainMax - domainMin;

    const xScale = (index: number) => padding + (index / (data.length - 1)) * (width - 2 * padding);
    const yScale = (val: number) => height - padding - ((val - domainMin) / domainRange) * (height - 2 * padding);

    const points = data.map((d, i) => `${xScale(i)},${yScale(d.value)}`).join(' ');

    const avg = values.reduce((a, b) => a + b, 0) / values.length;

    return (
        <div className="flex justify-center overflow-x-auto py-4">
            <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
                {/* Axes */}
                <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="currentColor" strokeWidth="1" />
                <line x1={padding} y1={padding} x2={padding} y2={height - padding} stroke="currentColor" strokeWidth="1" />

                {/* Average Line */}
                <line
                    x1={padding} y1={yScale(avg)}
                    x2={width - padding} y2={yScale(avg)}
                    stroke="#10b981" strokeWidth="1" strokeDasharray="5,5"
                />
                <text x={width - padding + 5} y={yScale(avg)} className="text-[10px] fill-green-500" dominantBaseline="middle"> Avg: {avg.toFixed(2)}</text>

                {/* Data Line */}
                <motion.polyline
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 1.5, ease: "easeInOut" }}
                    points={points}
                    fill="none"
                    stroke="#2563eb"
                    strokeWidth="2"
                />

                {/* Points */}
                {data.map((d, i) => (
                    <g key={i} className="group">
                        <circle cx={xScale(i)} cy={yScale(d.value)} r="4" fill="white" stroke="#2563eb" strokeWidth="2" />

                        {/* Tooltip (Simple SVG hover) */}
                        <g className="opacity-0 group-hover:opacity-100 transition-opacity">
                            <rect x={xScale(i) - 40} y={yScale(d.value) - 35} width="80" height="25" rx="4" fill="black" fillOpacity="0.8" />
                            <text x={xScale(i)} y={yScale(d.value) - 18} textAnchor="middle" fill="white" className="text-[10px]">
                                {d.value.toFixed(2)} ({new Date(d.date).toLocaleDateString()})
                            </text>
                        </g>

                        {/* X Axis Labels (Sparse) */}
                        {i % Math.ceil(data.length / 5) === 0 && (
                            <text x={xScale(i)} y={height - padding + 15} textAnchor="middle" className="text-[10px] fill-muted-foreground">
                                {new Date(d.date).toLocaleDateString(undefined, { month: 'short', year: '2-digit' })}
                            </text>
                        )}
                    </g>
                ))}
            </svg>
        </div>
    );
}

interface HistoryViewProps {
    selectedIds: string[];
}

export function HistoryView({ selectedIds }: HistoryViewProps) {
    const {
        materials,
        properties,
        measurements,
        fetchMaterials,
        fetchProperties,
        fetchMeasurements
    } = useAppStore();

    const [selectedPropId, setSelectedPropId] = useState<string>('');

    // Filter State
    const [filterMode, setFilterMode] = useState<'count' | 'date'>('count');
    const [countLimit, setCountLimit] = useState<number>(10);
    const [excludedIds, setExcludedIds] = useState<string[]>([]);

    useEffect(() => {
        fetchMaterials();
        fetchProperties();
        fetchMeasurements();
    }, []);

    // Derived Selection
    // For now, History View strictly analyzes the FIRST selected material in the list (Primary).
    // Future: Support multi-line comparison for same property across materials.
    const selectedEntityId = selectedIds.length > 0 ? selectedIds[0] : '';

    // Data Calculation
    const historyData = useMemo(() => {
        if (!selectedEntityId || !selectedPropId) return [];
        const raw = getHistoryData(
            measurements,
            selectedEntityId,
            selectedPropId,
            filterMode,
            countLimit
        );
        return raw.filter(d => !excludedIds.includes(d.id));
    }, [selectedEntityId, selectedPropId, filterMode, countLimit, measurements, excludedIds]);

    // Derived Stats
    const stats = useMemo(() => {
        if (historyData.length === 0) return null;
        const vals = historyData.map(d => d.value);
        const min = Math.min(...vals);
        const max = Math.max(...vals);
        const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
        // Std Dev
        const variance = vals.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / vals.length;
        const stdDev = Math.sqrt(variance);

        return { min, max, avg, stdDev, count: vals.length };
    }, [historyData]);

    const currentProperty = properties.find(p => p.id === selectedPropId);
    const currentMaterial = materials.find(m => m.id === selectedEntityId);

    return (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 animate-in fade-in duration-500">
            <Card className="lg:col-span-1 h-fit">
                <CardHeader>
                    <CardTitle>History Config</CardTitle>
                    <CardDescription>Analyze trend of the primary selected material.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {!selectedEntityId ? (
                        <div className="text-sm text-yellow-600 bg-yellow-50 p-2 rounded">
                            Please select a material in the dashboard header.
                        </div>
                    ) : (
                        <div className="text-sm font-medium mb-4 p-2 bg-muted rounded">
                            Analyzing: <span className="text-primary">{currentMaterial?.name}</span>
                        </div>
                    )}

                    <div className="space-y-2">
                        <label className="text-sm font-medium">Select Property</label>
                        <Select value={selectedPropId} onValueChange={setSelectedPropId}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select Property..." />
                            </SelectTrigger>
                            <SelectContent>
                                {properties.map(p => (
                                    <SelectItem key={p.id} value={p.id}>{p.name} ({p.unit})</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="pt-4 border-t space-y-4">
                        <label className="text-sm font-medium">Analysis Range</label>
                        <Tabs value={filterMode} onValueChange={(v: any) => setFilterMode(v)} className="w-full">
                            <TabsList className="grid w-full grid-cols-2">
                                <TabsTrigger value="count">Count</TabsTrigger>
                                <TabsTrigger value="date">Period</TabsTrigger>
                            </TabsList>
                        </Tabs>

                        {filterMode === 'count' && (
                            <div className="space-y-2">
                                <label className="text-xs text-muted-foreground">Last N Measurements</label>
                                <Input
                                    type="number"
                                    value={countLimit}
                                    onChange={e => setCountLimit(Number(e.target.value))}
                                    min={2}
                                    max={100}
                                />
                            </div>
                        )}
                        {filterMode === 'date' && (
                            <div className="p-4 bg-muted/20 rounded text-center text-xs text-muted-foreground">
                                <CalendarIcon className="mx-auto h-6 w-6 mb-2 opacity-50" />
                                Date Range Picker not implemented in prototype. Defaulting to all.
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            <div className="lg:col-span-3 space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Measurement Trend</CardTitle>
                        <CardDescription>
                            {selectedEntityId && currentProperty
                                ? `${currentProperty.name} evolution for ${currentMaterial?.name}`
                                : "Select parameters to view trend."}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {historyData.length > 0 ? (
                            <SimpleLineChart data={historyData} />
                        ) : (
                            <div className="h-[300px] flex items-center justify-center text-muted-foreground bg-muted/5 rounded border border-dashed">
                                No data found for selected criteria.
                            </div>
                        )}
                    </CardContent>
                </Card>

                {stats && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <Card>
                            <CardContent className="pt-6 text-center">
                                <div className="text-2xl font-bold">{stats.min.toFixed(2)}</div>
                                <div className="text-xs text-muted-foreground uppercase mt-1">Minimum</div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="pt-6 text-center">
                                <div className="text-2xl font-bold">{stats.max.toFixed(2)}</div>
                                <div className="text-xs text-muted-foreground uppercase mt-1">Maximum</div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="pt-6 text-center">
                                <div className="text-2xl font-bold text-primary">{stats.avg.toFixed(2)}</div>
                                <div className="text-xs text-muted-foreground uppercase mt-1">Average</div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="pt-6 text-center">
                                <div className="text-2xl font-bold">{stats.stdDev.toFixed(3)}</div>
                                <div className="text-xs text-muted-foreground uppercase mt-1">Std Dev (σ)</div>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {historyData.length > 0 && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Data Points</CardTitle>
                            <CardDescription>Uncheck to exclude from analysis (e.g. outliers).</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2 h-[200px] overflow-y-auto border rounded p-2">
                                {/* We need ALL data for the list, not just filtered */}
                                {getHistoryData(measurements, selectedEntityId, selectedPropId, filterMode, countLimit).map(point => (
                                    <div key={point.id} className="flex items-center space-x-2 text-sm">
                                        <Checkbox
                                            checked={!excludedIds.includes(point.id)}
                                            onCheckedChange={(checked) => {
                                                if (checked) {
                                                    setExcludedIds(prev => prev.filter(id => id !== point.id));
                                                } else {
                                                    setExcludedIds(prev => [...prev, point.id]);
                                                }
                                            }}
                                        />
                                        <span className="font-mono w-[80px]">{point.value.toFixed(2)}</span>
                                        <span className="text-muted-foreground w-[100px]">
                                            {new Date(point.date).toLocaleDateString()}
                                        </span>
                                        <span className="text-muted-foreground truncate flex-1">
                                            {point.labId || "Unknown Lab"}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}
