import { useState, useMemo } from 'react';
import { useAppStore } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    ScatterChart,
    Scatter,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Label
} from 'recharts';

export function CorrelationView() {
    const { materials, properties } = useAppStore();
    const [xAxisPropId, setXAxisPropId] = useState<string>('');
    const [yAxisPropId, setYAxisPropId] = useState<string>('');

    // Prepare Data for Scatter Chart
    const scatterData = useMemo(() => {
        if (!xAxisPropId || !yAxisPropId) return [];

        const xProp = properties.find(p => p.id === xAxisPropId);
        const yProp = properties.find(p => p.id === yAxisPropId);

        if (!xProp || !yProp) return [];

        return materials.map(mat => {
            const xVal = mat.properties?.find(p => p.id === xProp.id || p.name === xProp.name)?.value;
            const yVal = mat.properties?.find(p => p.id === yProp.id || p.name === yProp.name)?.value;

            if (xVal === undefined || yVal === undefined) return null;

            return {
                name: mat.name,
                x: typeof xVal === 'number' ? xVal : parseFloat(xVal as string) || 0,
                y: typeof yVal === 'number' ? yVal : parseFloat(yVal as string) || 0,
                status: mat.status
            };
        }).filter(Boolean);
    }, [materials, xAxisPropId, yAxisPropId, properties]);

    return (
        <div className="p-8 space-y-8 animate-in fade-in duration-500 max-w-[1600px] mx-auto">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Correlation Analysis</h1>
                <p className="text-muted-foreground">Identify trends and trade-offs (e.g. Strength vs. Density).</p>
            </div>

            <div className="grid grid-cols-4 gap-6">
                <Card className="col-span-1">
                    <CardHeader>
                        <CardTitle>Axis Configuration</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">X-Axis Property</label>
                            <Select value={xAxisPropId} onValueChange={setXAxisPropId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select X Property..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {properties.filter(p => p.dataType === 'numeric').map(p => (
                                        <SelectItem key={p.id} value={p.id}>{p.name} ({p.unit})</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Y-Axis Property</label>
                            <Select value={yAxisPropId} onValueChange={setYAxisPropId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select Y Property..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {properties.filter(p => p.dataType === 'numeric').map(p => (
                                        <SelectItem key={p.id} value={p.id}>{p.name} ({p.unit})</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </CardContent>
                </Card>

                <Card className="col-span-3 h-[600px]">
                    <CardHeader>
                        <CardTitle>Scatter Plot</CardTitle>
                    </CardHeader>
                    <CardContent className="h-[500px]">
                        {scatterData.length === 0 ? (
                            <div className="h-full flex items-center justify-center text-muted-foreground">
                                Select X and Y axes to generate plot.
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                                    <CartesianGrid />
                                    <XAxis type="number" dataKey="x" name="X" unit="">
                                        <Label value={properties.find(p => p.id === xAxisPropId)?.name} offset={-10} position="insideBottom" />
                                    </XAxis>
                                    <YAxis type="number" dataKey="y" name="Y" unit="">
                                        <Label value={properties.find(p => p.id === yAxisPropId)?.name} angle={-90} position="insideLeft" />
                                    </YAxis>
                                    <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                                    <Scatter name="Materials" data={scatterData} fill="#8884d8" />
                                </ScatterChart>
                            </ResponsiveContainer>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
