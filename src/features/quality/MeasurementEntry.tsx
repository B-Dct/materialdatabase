import { useEffect } from 'react';
import { useAppStore } from '@/lib/store';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Plus, MessageSquare, Power, Undo2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

interface MeasurementEntryProps {
    parentId: string;
    parentType: 'material' | 'layup' | 'assembly';
}

export function MeasurementEntry({ parentId, parentType }: MeasurementEntryProps) {
    const {
        properties,
        measurements,
        fetchMeasurements,
        updateMeasurement
    } = useAppStore();
    const navigate = useNavigate();

    // Ensure data is loaded
    useEffect(() => {
        fetchMeasurements();
    }, [fetchMeasurements]);

    // Filter measurements
    const relevantMeasurements = measurements.filter(m =>
        parentType === 'material'
            ? m.materialId === parentId
            : parentType === 'layup'
                ? m.layupId === parentId
                : m.assemblyId === parentId
    );

    // Sort by date desc
    const sortedMeasurements = [...relevantMeasurements].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const toggleActive = async (e: React.MouseEvent, id: string, currentState: boolean) => {
        e.stopPropagation();
        await updateMeasurement(id, { isActive: !currentState });
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h3 className="text-lg font-medium">Measurements</h3>
                    <p className="text-sm text-muted-foreground">Manage test reports and data points for this {parentType}.</p>
                </div>
                <Button onClick={() => navigate(`/quality/test-run?${parentType}Id=${parentId}`)}>
                    <Plus className="mr-2 h-4 w-4" /> Add Data
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Recorded Data</CardTitle>
                    <CardDescription>
                        {relevantMeasurements.filter(m => m.isActive !== false).length} active measurements found.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[100px]">Ref #</TableHead>
                                <TableHead>Order #</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead>Property</TableHead>
                                <TableHead>Value</TableHead>
                                <TableHead>Lab</TableHead>
                                <TableHead>Method</TableHead>
                                <TableHead>Source</TableHead>
                                <TableHead className="w-[50px]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {sortedMeasurements.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={9} className="text-center text-muted-foreground h-24">
                                        No measurements recorded yet.
                                    </TableCell>
                                </TableRow>
                            )}
                            {sortedMeasurements.map((m) => {
                                const prop = properties.find(p => p.id === m.propertyDefinitionId);
                                const isInactive = m.isActive === false;

                                return (
                                    <TableRow
                                        key={m.id}
                                        className={cn(
                                            "cursor-pointer hover:bg-muted/50 transition-colors",
                                            isInactive && "opacity-50 grayscale bg-muted/20"
                                        )}
                                        onClick={() => navigate(`/measurements/${m.id}`)}
                                    >
                                        <TableCell className="font-mono text-xs text-muted-foreground">
                                            {m.referenceNumber || "-"}
                                            {isInactive && <Badge variant="outline" className="ml-2 text-[10px] h-4">Inactive</Badge>}
                                        </TableCell>
                                        <TableCell className="font-mono text-xs">
                                            <div className="flex items-center gap-2">
                                                {m.orderNumber || "N/A"}
                                                {m.comment && (
                                                    <TooltipProvider>
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <div className="text-primary/70">
                                                                    <MessageSquare className="h-3 w-3" />
                                                                </div>
                                                            </TooltipTrigger>
                                                            <TooltipContent>
                                                                <p>{m.comment}</p>
                                                            </TooltipContent>
                                                        </Tooltip>
                                                    </TooltipProvider>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>{new Date(m.date).toLocaleDateString()}</TableCell>
                                        <TableCell className="font-medium">
                                            {prop?.name || m.propertyDefinitionId}
                                            <span className="text-muted-foreground text-xs ml-2">
                                                {prop?.unit ? `(${prop.unit})` : ''}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            <span className={isInactive ? "line-through text-muted-foreground" : ""}>
                                                {m.resultValue.toFixed(2)}
                                            </span>
                                        </TableCell>
                                        <TableCell>{m.laboratoryId}</TableCell>
                                        <TableCell>{m.testMethod || '-'}</TableCell>
                                        <TableCell>
                                            {m.sourceType === 'pdf' ? (
                                                <span className="text-blue-600 underline text-sm" onClick={(e) => e.stopPropagation()}>
                                                    {m.sourceFilename || "Report"}
                                                </span>
                                            ) : (
                                                <span className="text-muted-foreground text-xs">Manual</span>
                                            )}
                                        </TableCell>
                                        <TableCell onClick={(e) => e.stopPropagation()}>
                                            <TooltipProvider>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                                            onClick={(e) => toggleActive(e, m.id, !isInactive)}
                                                        >
                                                            {isInactive ? <Undo2 className="h-4 w-4" /> : <Power className="h-4 w-4" />}
                                                        </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                        <p>{isInactive ? "Reactivate Measurement" : "Deactivate Measurement"}</p>
                                                    </TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>
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
