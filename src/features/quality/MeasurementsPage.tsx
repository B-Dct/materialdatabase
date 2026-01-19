import { useEffect, useState } from "react";
import { useAppStore } from "@/lib/store";
import { Input } from "@/components/ui/input";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText } from "lucide-react";
import { MeasurementUploadDialog } from "./MeasurementUploadDialog";

export function MeasurementsPage() {
    const { measurements, fetchMeasurements, materials, properties, fetchMaterials, fetchProperties } = useAppStore();
    const [searchTerm, setSearchTerm] = useState("");

    useEffect(() => {
        fetchMeasurements();
        fetchMaterials();
        fetchProperties();
    }, [fetchMeasurements, fetchMaterials, fetchProperties]);

    const filtered = measurements.filter(m => {
        const prop = properties.find(p => p.id === m.propertyDefinitionId);
        const mat = materials.find(mat => mat.id === m.materialId);
        const search = searchTerm.toLowerCase();

        return (
            prop?.name.toLowerCase().includes(search) ||
            mat?.name.toLowerCase().includes(search) ||
            m.sourceFilename?.toLowerCase().includes(search) ||
            m.testMethod?.toLowerCase().includes(search)
        );
    });

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Measurements</h1>
                    <p className="text-muted-foreground">Manage laboratory test reports and data points.</p>
                </div>
                <MeasurementUploadDialog />
            </div>

            <Card>
                <CardHeader className="pb-3">
                    <CardTitle>All Reports</CardTitle>
                    <CardDescription>
                        Total {filtered.length} measurements found.
                    </CardDescription>
                    <div className="pt-2">
                        <Input
                            placeholder="Search by property, material, or file..."
                            className="max-w-sm"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Material</TableHead>
                                <TableHead>Property</TableHead>
                                <TableHead>Value</TableHead>
                                <TableHead>Method</TableHead>
                                <TableHead>Source</TableHead>
                                <TableHead>Lab</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filtered.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center h-24 text-muted-foreground">
                                        No measurements found.
                                    </TableCell>
                                </TableRow>
                            )}
                            {filtered.map((m) => {
                                const prop = properties.find(p => p.id === m.propertyDefinitionId);
                                const mat = materials.find(mat => mat.id === m.materialId);

                                return (
                                    <TableRow key={m.id}>
                                        <TableCell>{new Date(m.date).toLocaleDateString()}</TableCell>
                                        <TableCell>
                                            {mat ? (
                                                <Badge variant="outline" className="font-mono">
                                                    {mat.name}
                                                </Badge>
                                            ) : (
                                                <span className="text-muted-foreground italic text-sm">Unlinked</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="font-medium">
                                            {prop?.name || m.propertyDefinitionId}
                                        </TableCell>
                                        <TableCell>
                                            {m.resultValue} <span className="text-muted-foreground text-xs">{m.unit}</span>
                                        </TableCell>
                                        <TableCell>{m.testMethod || "-"}</TableCell>
                                        <TableCell>
                                            {m.sourceType === "pdf" ? (
                                                <div className="flex items-center gap-1 text-blue-600 hover:underline cursor-pointer">
                                                    <FileText className="h-4 w-4" />
                                                    <span className="truncate max-w-[100px]">{m.sourceFilename || "Report.pdf"}</span>
                                                </div>
                                            ) : (
                                                <span className="text-muted-foreground text-xs">Manual Entry</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-muted-foreground text-sm">
                                            {m.laboratoryId}
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
