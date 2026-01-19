import { useEffect } from 'react';
import { useAppStore } from '@/lib/store';
// import { Button } from '@/components/ui/button';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
// import { Trash2 } from 'lucide-react';
import { MeasurementUploadDialog } from './MeasurementUploadDialog';

interface MeasurementEntryProps {
    parentId: string;
    parentType: 'material' | 'layup';
}

export function MeasurementEntry({ parentId, parentType }: MeasurementEntryProps) {
    const {
        properties,
        measurements,
        fetchMeasurements,
    } = useAppStore();

    // Ensure data is loaded
    useEffect(() => {
        fetchMeasurements();
    }, [fetchMeasurements]);

    // Filter measurements
    const relevantMeasurements = measurements.filter(m =>
        parentType === 'material'
            ? m.materialId === parentId
            : m.layupId === parentId
    );

    // Sort by date desc
    const sortedMeasurements = [...relevantMeasurements].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h3 className="text-lg font-medium">Measurements</h3>
                    <p className="text-sm text-muted-foreground">Manage test reports and data points for this {parentType}.</p>
                </div>
                <MeasurementUploadDialog
                    parentId={parentId}
                    parentType={parentType}
                />
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Recorded Data</CardTitle>
                    <CardDescription>
                        {relevantMeasurements.length} measurements found.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Property</TableHead>
                                <TableHead>Value</TableHead>
                                <TableHead>Lab</TableHead>
                                <TableHead>Method</TableHead>
                                <TableHead>Source</TableHead>
                                {/* <TableHead className="text-right">Action</TableHead> */}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {sortedMeasurements.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center text-muted-foreground h-24">
                                        No measurements recorded yet.
                                    </TableCell>
                                </TableRow>
                            )}
                            {sortedMeasurements.map((m) => {
                                const prop = properties.find(p => p.id === m.propertyDefinitionId);
                                return (
                                    <TableRow key={m.id}>
                                        <TableCell>{new Date(m.date).toLocaleDateString()}</TableCell>
                                        <TableCell className="font-medium">
                                            {prop?.name || m.propertyDefinitionId}
                                            <span className="text-muted-foreground text-xs ml-2">
                                                {prop?.unit ? `(${prop.unit})` : ''}
                                            </span>
                                        </TableCell>
                                        <TableCell>{m.resultValue}</TableCell>
                                        <TableCell>{m.laboratoryId}</TableCell>
                                        <TableCell>{m.testMethod || '-'}</TableCell>
                                        <TableCell>
                                            {m.sourceType === 'pdf' ? (
                                                <span className="text-blue-600 underline cursor-pointer text-sm">
                                                    {m.sourceFilename || "Report"}
                                                </span>
                                            ) : (
                                                <span className="text-muted-foreground text-xs">Manual</span>
                                            )}
                                        </TableCell>
                                        {/* 
                                        <TableCell className="text-right">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="text-destructive hover:text-destructive"
                                                onClick={() => handleDelete(m.id)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </TableCell> 
                                        */}
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
