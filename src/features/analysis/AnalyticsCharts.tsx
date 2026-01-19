import { useMemo, useState, useEffect } from 'react';
import { useAppStore } from '@/lib/store';
import { normalizeEntityData } from './analysis-utils';
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


// --- Components for Charts ---

const COLORS = ['#2563eb', '#16a34a', '#dc2626', '#d97706']; // Blue, Green, Red, Amber

function RadarChart({ data, keys, labels }: { data: any[], keys: string[], labels: string[] }) {
    // Responsive viewbox
    const viewBoxSize = 500;
    const center = viewBoxSize / 2;
    const radius = 180; // Increased radius relative to viewBox
    const angleStep = (Math.PI * 2) / keys.length;

    const getCoordinates = (value: number, index: number) => {
        const angle = index * angleStep - Math.PI / 2;
        const r = (value / 100) * radius;
        return {
            x: center + r * Math.cos(angle),
            y: center + r * Math.sin(angle)
        };
    };

    return (
        <div className="w-full h-full min-h-[400px] flex items-center justify-center">
            <svg viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`} className="w-full h-full overflow-visible max-h-[600px]">
                {/* Background Grid */}
                {[25, 50, 75, 100].map(r => (
                    <circle key={r} cx={center} cy={center} r={(r / 100) * radius} fill="none" stroke="currentColor" strokeOpacity="0.1" />
                ))}

                {/* Axes */}
                {keys.map((key, i) => {
                    const labelPos = getCoordinates(115, i);
                    return (
                        <g key={key}>
                            <line
                                x1={center} y1={center}
                                x2={getCoordinates(100, i).x} y2={getCoordinates(100, i).y}
                                stroke="currentColor" strokeOpacity="0.2"
                            />
                            <text
                                x={labelPos.x} y={labelPos.y}
                                textAnchor="middle"
                                dominantBaseline="middle"
                                className="text-[12px] fill-muted-foreground font-semibold"
                            >
                                {labels[i]}
                            </text>
                        </g>
                    );
                })}

                {/* Data Polygons */}
                {data.map((item, idx) => {
                    const points = keys.map((k, i) => {
                        const val = item[k] || 0;
                        const { x, y } = getCoordinates(Math.min(100, Math.max(0, val)), i);
                        return `${x},${y}`;
                    }).join(' ');

                    return (
                        <g key={idx}>
                            <motion.polygon
                                initial={{ opacity: 0, scale: 0 }}
                                animate={{ opacity: 0.5, scale: 1 }}
                                transition={{ duration: 0.5, delay: idx * 0.1 }}
                                points={points}
                                fill={COLORS[idx % COLORS.length]}
                                stroke={COLORS[idx % COLORS.length]}
                                strokeWidth={2}
                                className="hover:opacity-80 transition-opacity"
                            />
                            {/* Value Labels for points */}
                            {keys.map((k, i) => {
                                const val = item[k] || 0;
                                const { x, y } = getCoordinates(Math.min(100, Math.max(0, val)), i);
                                return (
                                    <text
                                        key={i}
                                        x={x}
                                        y={y}
                                        dy={-5}
                                        textAnchor="middle"
                                        className="text-[10px] fill-foreground font-bold opacity-0 hover:opacity-100 transition-opacity"
                                        style={{ opacity: 1 }} // Force visible as requested
                                    >
                                        {Math.round(val)}%
                                    </text>
                                );
                            })}
                        </g>
                    );
                })}
            </svg>
        </div>
    );
}

function ScatterPlot({ data, xKey, yKey, labelKey }: { data: any[], xKey: string, yKey: string, labelKey: string }) {
    const viewBoxWidth = 800;
    const viewBoxHeight = 500;
    const padding = 60;

    // Find Min/Max
    const xVals = data.map(d => d[xKey] as number);
    const yVals = data.map(d => d[yKey] as number);
    const minX = Math.min(...xVals, 0);
    const maxX = Math.max(...xVals);
    const minY = Math.min(...yVals, 0);
    const maxY = Math.max(...yVals);

    const xScale = (val: number) => padding + ((val - minX) / (maxX - minX || 1)) * (viewBoxWidth - 2 * padding);
    const yScale = (val: number) => viewBoxHeight - padding - ((val - minY) / (maxY - minY || 1)) * (viewBoxHeight - 2 * padding);

    return (
        <div className="w-full h-full min-h-[400px] flex items-center justify-center">
            <svg viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`} className="w-full h-full overflow-visible max-h-[600px]">
                {/* Axes */}
                <line x1={padding} y1={viewBoxHeight - padding} x2={viewBoxWidth - padding} y2={viewBoxHeight - padding} stroke="currentColor" strokeWidth="1" />
                <line x1={padding} y1={padding} x2={padding} y2={viewBoxHeight - padding} stroke="currentColor" strokeWidth="1" />

                {/* Data Points */}
                {data.map((d, i) => (
                    <g key={i}>
                        <motion.circle
                            initial={{ cx: padding, cy: viewBoxHeight - padding, r: 0 }}
                            animate={{ cx: xScale(d[xKey]), cy: yScale(d[yKey]), r: 8 }}
                            transition={{ type: "spring", stiffness: 100 }}
                            fill={COLORS[i % COLORS.length]}
                            className="text-foreground"
                            stroke="currentColor"
                            strokeWidth="1"
                        />
                        <text x={xScale(d[xKey])} y={yScale(d[yKey]) - 15} textAnchor="middle" className="text-[12px] fill-foreground font-medium">
                            {d[labelKey]}
                        </text>
                        <text x={xScale(d[xKey])} y={yScale(d[yKey]) + 20} textAnchor="middle" className="text-[10px] fill-muted-foreground">
                            {Number(d[xKey]).toFixed(1)} / {Number(d[yKey]).toFixed(1)}
                        </text>
                    </g>
                ))}
            </svg>
        </div>
    );
}

// --- Main Component ---

interface AnalyticsChartsProps {
    selectedIds: string[];
}

export function AnalyticsCharts({ selectedIds }: AnalyticsChartsProps) {
    const { materials, properties, measurements, fetchMaterials, fetchProperties, fetchMeasurements } = useAppStore();
    const [selectedPropertyIds, setSelectedPropertyIds] = useState<string[]>([]);
    const [chartType, setChartType] = useState<'radar' | 'scatter'>('radar');

    const [sourceMode, setSourceMode] = useState<'auto' | 'properties' | 'measurements'>('auto');

    useEffect(() => {
        fetchMaterials();
        fetchProperties();
        fetchMeasurements();
    }, []);

    useEffect(() => {
        if (properties.length > 0 && selectedPropertyIds.length === 0) {
            setSelectedPropertyIds(properties.slice(0, 5).map(p => p.id));
        }
    }, [properties]);

    const togglePropertySelection = (id: string) => {
        if (selectedPropertyIds.includes(id)) {
            setSelectedPropertyIds(prev => prev.filter(i => i !== id));
        } else {
            setSelectedPropertyIds(prev => [...prev, id]);
        }
    };

    // Prepare Data
    const chartData = useMemo(() => {
        return selectedIds.map(id => {
            const mat = materials.find(m => m.id === id);
            if (!mat) return null;
            const norm = normalizeEntityData(mat, 'material', measurements, properties, sourceMode);

            // Flatten for chart
            const flat: any = { name: norm.name };

            // For Radar: Normalize specific props to 0-100 scale?
            // Heuristic: Find max value across ALL selected for each prop to scale.

            // For Scatter: Keep raw values.

            properties.forEach(p => {
                flat[p.id] = norm.properties[p.id]?.value || 0;
            });

            return flat;
        }).filter(Boolean);
    }, [selectedIds, materials, measurements, properties, sourceMode]);

    // Scaling for Radar
    const radarData = useMemo(() => {
        if (chartData.length === 0) return [];
        return chartData.map(d => {
            const scaled: any = { name: d.name };
            selectedPropertyIds.forEach(pid => {
                // Find Max
                const max = Math.max(...chartData.map(i => i[pid] || 0));
                const val = d[pid] || 0;
                scaled[pid] = max === 0 ? 0 : (val / max) * 100;
            });
            return scaled;
        });
    }, [chartData, selectedPropertyIds]);

    const activeKeys = selectedPropertyIds;
    const activeLabels = selectedPropertyIds.map(id => properties.find(p => p.id === id)?.name || id);

    return (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 h-full animate-in fade-in duration-500">
            <Card className="col-span-1 border-r">
                <CardHeader>
                    <CardTitle>Visualization Options</CardTitle>
                    <CardDescription>Configure chart type and metrics.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Chart Type</label>
                        <Select value={chartType} onValueChange={(v: any) => setChartType(v)}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="radar">Profile Radar</SelectItem>
                                <SelectItem value="scatter">Trade-off Scatter</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">Data Source</label>
                        <Select value={sourceMode} onValueChange={(v: any) => setSourceMode(v)}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="auto">Auto (Best Available)</SelectItem>
                                <SelectItem value="properties">Properties Only</SelectItem>
                                <SelectItem value="measurements">Measurements Only</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Properties ({selectedPropertyIds.length})</label>
                            <div className="space-y-1 h-[250px] overflow-y-auto border rounded p-2">
                                {properties.map(p => (
                                    <div key={p.id} className="flex items-center space-x-2">
                                        <input
                                            type="checkbox"
                                            checked={selectedPropertyIds.includes(p.id)}
                                            onChange={() => togglePropertySelection(p.id)}
                                            className="h-4 w-4 rounded border-gray-300"
                                        />
                                        <span className="text-sm truncate" title={p.name}>{p.name}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <div className="col-span-3 flex flex-col items-center p-6 bg-card rounded-lg border h-full overflow-hidden">
                {selectedIds.length < 2 ? (
                    <div className="flex-1 flex items-center justify-center text-muted-foreground text-center">
                        Select at least 2 materials in the dashboard header to visualize.
                    </div>
                ) : (
                    <>
                        <div className="w-full flex justify-between items-center mb-4 border-b pb-4">
                            <div>
                                <h3 className="text-xl font-bold">{chartType === 'radar' ? "Property Profile Comparison" : "Performance Trade-off"}</h3>
                                <p className="text-sm text-muted-foreground">
                                    {chartType === 'radar' ? "Normalized comparison of selected properties (0-100% scale)" : "Scatter plot relationship between two properties"}
                                </p>
                            </div>
                            <div className="text-xs text-muted-foreground flex gap-4">
                                <span>X: {activeLabels[0]}</span>
                                {chartType === 'scatter' && <span>Y: {activeLabels[1]}</span>}
                            </div>
                        </div>

                        <div className="flex-1 w-full flex items-center justify-center min-h-0">
                            {chartType === 'radar' && (
                                <RadarChart
                                    data={radarData}
                                    keys={activeKeys}
                                    labels={activeLabels}
                                />
                            )}

                            {chartType === 'scatter' && (
                                <div className="w-full h-full">
                                    {selectedPropertyIds.length >= 2 ? (
                                        <ScatterPlot
                                            data={chartData}
                                            xKey={selectedPropertyIds[0]}
                                            yKey={selectedPropertyIds[1]}
                                            labelKey="name"
                                        />
                                    ) : (
                                        <div className="flex items-center justify-center h-full text-red-500">
                                            Select at least 2 properties for Scatter Plot
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
