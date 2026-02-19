import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAppStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, FileText, Pencil } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine } from "recharts";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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
        fetchMaterials,
        layups,
        fetchLayups,
        assemblies,
        fetchAssemblies,
        updateMeasurement
    } = useAppStore();

    const [isEditOpen, setIsEditOpen] = useState(false);
    const [editForm, setEditForm] = useState({
        orderNumber: "",
        referenceNumber: "",
        parentType: "material", // material | layup | assembly
        parentId: ""
    });

    useEffect(() => {
        fetchMeasurements();
        fetchProperties();
        fetchLaboratories();
        fetchMaterials();
        fetchLayups();
        fetchAssemblies();
    }, [fetchMeasurements, fetchProperties, fetchLaboratories, fetchMaterials, fetchLayups, fetchAssemblies]);

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

    let parentName = "Unlinked";
    if (measurement.materialId) parentName = materials.find(m => m.id === measurement.materialId)?.name || "Unknown Material";
    else if (measurement.layupId) parentName = layups.find(l => l.id === measurement.layupId)?.name || "Unknown Layup";
    else if (measurement.assemblyId) parentName = assemblies.find(a => a.id === measurement.assemblyId)?.name || "Unknown Assembly";

    const handleEditClick = () => {
        setEditForm({
            orderNumber: measurement.orderNumber,
            referenceNumber: measurement.referenceNumber || "",
            parentType: measurement.layupId ? "layup" : measurement.assemblyId ? "assembly" : "material",
            parentId: measurement.layupId || measurement.assemblyId || measurement.materialId || ""
        });
        setIsEditOpen(true);
    };

    const handleSaveEdit = async () => {
        await updateMeasurement(measurement.id, {
            orderNumber: editForm.orderNumber,
            referenceNumber: editForm.referenceNumber,
            // Clear current links
            materialId: null as any,
            layupId: null as any,
            assemblyId: null as any,
            // Set new link
            ...(editForm.parentType === 'material' ? { materialId: editForm.parentId } : {}),
            ...(editForm.parentType === 'layup' ? { layupId: editForm.parentId } : {}),
            ...(editForm.parentType === 'assembly' ? { assemblyId: editForm.parentId } : {})
        });
        setIsEditOpen(false);
        fetchMeasurements(); // Refresh
    };

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
                        {parentName && (
                            <>
                                <span>•</span>
                                <span className="font-medium text-foreground">Parent: {parentName}</span>
                            </>
                        )}
                    </div>
                </div>

                <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                    <DialogTrigger asChild>
                        <Button variant="outline" size="sm" onClick={handleEditClick}>
                            <Pencil className="mr-2 h-4 w-4" /> Edit Metadata
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Edit Measurement Details</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Order Number</Label>
                                    <Input value={editForm.orderNumber} onChange={e => setEditForm({ ...editForm, orderNumber: e.target.value })} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Reference Number</Label>
                                    <Input value={editForm.referenceNumber} onChange={e => setEditForm({ ...editForm, referenceNumber: e.target.value })} />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Parent Entity Type</Label>
                                <Select
                                    value={editForm.parentType}
                                    onValueChange={(v) => setEditForm({ ...editForm, parentType: v, parentId: "" })}
                                >
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="material">Material</SelectItem>
                                        <SelectItem value="layup">Layup</SelectItem>
                                        <SelectItem value="assembly">Assembly</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>Select {editForm.parentType === 'material' ? 'Material' : editForm.parentType === 'layup' ? 'Layup' : 'Assembly'}</Label>
                                <Select
                                    value={editForm.parentId}
                                    onValueChange={(v) => setEditForm({ ...editForm, parentId: v })}
                                >
                                    <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                                    <SelectContent>
                                        {(editForm.parentType === 'material' ? materials : editForm.parentType === 'layup' ? layups : assemblies).map(item => (
                                            <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <Button className="w-full" onClick={handleSaveEdit}>Save Changes</Button>
                        </div>
                    </DialogContent>
                </Dialog>
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
                                <div className="flex justify-center items-baseline gap-1 text-3xl font-bold text-primary">
                                    {measurement.resultValue.toFixed(2)}
                                    <span className="text-sm text-muted-foreground font-normal">{measurement.unit}</span>
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

            {/* Detailed Values Table & Chart */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Single Values</CardTitle>
                        <CardDescription>Individual measurements recorded for this test.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {measurement.values && measurement.values.length > 0 ? (
                            <div className="border rounded-md overflow-hidden">
                                <div className="max-h-[400px] overflow-y-auto">
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
                            </div>
                        ) : (
                            <div className="text-center py-8 text-muted-foreground">
                                No individual values stored (Summary only).
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Visualization</CardTitle>
                        <CardDescription>Scatter plot of measurement values.</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[400px]">
                        {measurement.values && measurement.values.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis type="number" dataKey="index" name="Sample" unit="" tickCount={measurement.values.length} allowDecimals={false} />
                                    <YAxis type="number" dataKey="value" name="Value" unit={measurement.unit} domain={['auto', 'auto']} />
                                    <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                                    <ReferenceLine y={measurement.resultValue} stroke="hsl(var(--primary))" strokeDasharray="3 3" label={{ value: 'Mean', position: 'insideTopRight', fill: "hsl(var(--primary))" }} />
                                    <Scatter name="Values" data={measurement.values.map((v, i) => ({ index: i + 1, value: v }))} fill="hsl(var(--primary))" />
                                </ScatterChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex items-center justify-center text-muted-foreground">
                                No data to visualize.
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

