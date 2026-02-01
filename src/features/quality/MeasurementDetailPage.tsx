import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAppStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, FileText } from "lucide-react";
import { Separator } from "@/components/ui/separator";

export function MeasurementDetailPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const {
        measurements,
        fetchMeasurements,
        properties,
        fetchProperties,
        laboratories,
        fetchLaboratories,
        materials,
        fetchMaterials
    } = useAppStore();

    useEffect(() => {
        fetchMeasurements();
        fetchProperties();
        fetchLaboratories();
        fetchMaterials();
    }, [fetchMeasurements, fetchProperties, fetchLaboratories, fetchMaterials]);

    const measurement = measurements.find(m => m.id === id);

    if (!measurement) {
        return (
            <div className="container mx-auto py-12 text-center">
                <h2 className="text-xl font-semibold">Measurement not found</h2>
                <Button variant="link" onClick={() => navigate(-1)}>Go Back</Button>
            </div>
        );
    }

    const propDef = properties.find(p => p.id === measurement.propertyDefinitionId);
    const labName = laboratories.find(l => l.id === measurement.laboratoryId)?.name || measurement.laboratoryId;
    const material = materials.find(m => m.id === measurement.materialId);

    return (
        <div className="container mx-auto py-6 space-y-6 max-w-5xl">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
                    <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="flex-1">
                    <div className="flex items-center gap-2">
                        <h1 className="text-2xl font-bold tracking-tight">Measurement Report</h1>
                        <Badge variant="outline" className="text-base font-normal px-2 py-0.5">
                            {measurement.orderNumber || "No Order #"}
                        </Badge>
                    </div>
                    <div className="flex gap-4 text-muted-foreground text-sm mt-1">
                        <span>Date: {new Date(measurement.date).toLocaleDateString()}</span>
                        <span>•</span>
                        <span>Lab: {labName}</span>
                        {material && (
                            <>
                                <span>•</span>
                                <span className="font-medium text-foreground">Material: {material.name}</span>
                            </>
                        )}
                    </div>
                </div>
                {/* 
                <Button variant="outline">
                    <Download className="mr-2 h-4 w-4" /> Export
                </Button> 
                */}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Statistics / Results */}
                <Card className="col-span-2">
                    <CardHeader>
                        <CardTitle>Results Summary</CardTitle>
                        <CardDescription>
                            Property: <span className="font-semibold text-foreground">{propDef?.name || measurement.propertyDefinitionId}</span>
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                            <div className="bg-muted/20 p-4 rounded-lg text-center border">
                                <div className="text-xs font-semibold uppercase text-muted-foreground mb-1">Mean Value</div>
                                <div className="text-3xl font-bold text-primary">
                                    {measurement.resultValue.toFixed(2)}
                                    <span className="text-sm text-muted-foreground ml-1 font-normal">{measurement.unit}</span>
                                </div>
                            </div>

                            {measurement.statistics && (
                                <>
                                    <div className="bg-muted/20 p-4 rounded-lg text-center border">
                                        <div className="text-xs font-semibold uppercase text-muted-foreground mb-1">Std Dev</div>
                                        <div className="text-xl font-medium">{measurement.statistics.stdDev.toFixed(2)}</div>
                                    </div>
                                    <div className="bg-muted/20 p-4 rounded-lg text-center border">
                                        <div className="text-xs font-semibold uppercase text-muted-foreground mb-1">Min</div>
                                        <div className="text-xl font-medium">{measurement.statistics.min.toFixed(2)}</div>
                                    </div>
                                    <div className="bg-muted/20 p-4 rounded-lg text-center border">
                                        <div className="text-xs font-semibold uppercase text-muted-foreground mb-1">Max</div>
                                        <div className="text-xl font-medium">{measurement.statistics.max.toFixed(2)}</div>
                                    </div>
                                </>
                            )}
                        </div>

                        {measurement.statistics && (
                            <div className="mt-8">
                                <h4 className="text-sm font-semibold mb-3">Design Allowables</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="flex justify-between items-center text-sm bg-blue-50 p-3 rounded border border-blue-100">
                                        <span className="font-medium text-blue-700">B-Basis (90/95)</span>
                                        <span className="font-bold text-blue-700 text-lg">
                                            {measurement.statistics.bValue ? measurement.statistics.bValue.toFixed(2) : '-'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm bg-purple-50 p-3 rounded border border-purple-100">
                                        <span className="font-medium text-purple-700">A-Basis (99/95)</span>
                                        <span className="font-bold text-purple-700 text-lg">
                                            {measurement.statistics.aValue ? measurement.statistics.aValue.toFixed(2) : '-'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Metadata Card */}
                <Card>
                    <CardHeader>
                        <CardTitle>Metadata</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <div className="text-sm font-medium text-muted-foreground">Test Method</div>
                            <div>{measurement.testMethod || "-"}</div>
                        </div>
                        <Separator />
                        <div>
                            <div className="text-sm font-medium text-muted-foreground">Source</div>
                            {measurement.sourceType === 'pdf' ? (
                                <div className="flex items-center gap-2 text-blue-600 mt-1">
                                    <FileText className="h-4 w-4" />
                                    <span className="underline truncate max-w-[200px]" title={measurement.sourceFilename}>
                                        {measurement.sourceFilename || "Report.pdf"}
                                    </span>
                                </div>
                            ) : (
                                <div className="mt-1">Manual Entry</div>
                            )}
                        </div>
                        <Separator />
                        <div>
                            <div className="text-sm font-medium text-muted-foreground">Sample Count (n)</div>
                            <div>{measurement.statistics?.n || measurement.values.length}</div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Detailed Values Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Single Values</CardTitle>
                    <CardDescription>Individual measurements recorded for this test.</CardDescription>
                </CardHeader>
                <CardContent>
                    {measurement.values && measurement.values.length > 0 ? (
                        <div className="border rounded-md max-w-2xl">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[100px]">Sample #</TableHead>
                                        <TableHead>Value</TableHead>
                                        <TableHead className="text-right">Action</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {measurement.values.map((val, idx) => (
                                        <TableRow key={idx}>
                                            <TableCell className="font-medium">{idx + 1}</TableCell>
                                            <TableCell>
                                                {val.toFixed(3)} <span className="text-muted-foreground text-xs ml-1">{measurement.unit}</span>
                                            </TableCell>
                                            <TableCell className="text-right text-muted-foreground text-xs">Valid</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    ) : (
                        <div className="text-center py-8 text-muted-foreground">
                            No individual values stored (Summary only).
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
