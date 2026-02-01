import { useAppStore } from "@/lib/store";
import type { Material, Measurement } from "@/types/domain";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Ruler, FileText } from "lucide-react";

interface MaterialMeasurementsListProps {
    material: Material;
    measurements: Measurement[];
}

export function MaterialMeasurementsList({ measurements }: MaterialMeasurementsListProps) {
    const { properties } = useAppStore();

    const getPropertyName = (defId: string) => {
        return properties.find(p => p.id === defId)?.name || "Unknown Property";
    };

    if (measurements.length === 0) {
        return (
            <Card>
                <CardContent className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                    <Ruler className="h-12 w-12 opacity-50 mb-4" />
                    <h3 className="text-lg font-medium">No Measurements Recorded</h3>
                    <p className="text-sm max-w-sm mt-2">
                        This material has no linked test data or measurements yet.
                        Measurements can be imported or added manually.
                    </p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Measurements & Test Data</CardTitle>
                <CardDescription>
                    Raw measurement data linked to this material.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Property</TableHead>
                                <TableHead>Result</TableHead>
                                <TableHead>Source</TableHead>
                                <TableHead>Method</TableHead>
                                <TableHead className="text-right"># Samples</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {measurements.map((m) => (
                                <TableRow key={m.id}>
                                    <TableCell className="font-medium whitespace-nowrap">
                                        {new Date(m.date).toLocaleDateString()}
                                    </TableCell>
                                    <TableCell>
                                        <span className="font-semibold">{getPropertyName(m.propertyDefinitionId)}</span>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-baseline gap-1">
                                            <span className="font-mono font-medium">{m.resultValue.toFixed(2)}</span>
                                            <span className="text-xs text-muted-foreground">{m.unit}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className="gap-1">
                                            {m.sourceType === 'pdf' ? <FileText className="h-3 w-3" /> : null}
                                            {m.sourceType}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-sm text-muted-foreground">
                                        {m.testMethod || "-"}
                                    </TableCell>
                                    <TableCell className="text-right font-mono">
                                        {m.statistics?.n ?? m.values.length}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
}
