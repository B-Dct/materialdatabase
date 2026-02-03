import { useEffect, useMemo } from 'react';
import { useAppStore } from '@/lib/store';
import { DataTable } from '@/components/ui/data-table';
import type { ColumnDef } from '@tanstack/react-table';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Plus, MessageSquare, Power, Undo2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { format } from 'date-fns';

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

    useEffect(() => {
        fetchMeasurements();
    }, [fetchMeasurements]);

    const data = useMemo(() => {
        return measurements
            .filter(m =>
                parentType === 'material'
                    ? m.materialId === parentId
                    : parentType === 'layup'
                        ? m.layupId === parentId
                        : m.assemblyId === parentId
            )
            .map(m => {
                const prop = properties.find(p => p.id === m.propertyDefinitionId);
                return {
                    ...m,
                    _propertyName: prop?.name || m.propertyDefinitionId,
                    _isActive: m.isActive !== false,
                    _unit: prop?.unit || m.unit
                };
            })
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [measurements, parentId, parentType, properties]);

    const toggleActive = async (e: React.MouseEvent, id: string, currentState: boolean) => {
        e.stopPropagation();
        await updateMeasurement(id, { isActive: !currentState });
    };

    const columns: ColumnDef<any>[] = [
        {
            accessorKey: "referenceNumber",
            header: "Ref #",
            cell: ({ row }) => (
                <div className="font-mono text-xs text-muted-foreground flex items-center gap-2">
                    {row.getValue("referenceNumber") || "-"}
                    {!row.original._isActive && <Badge variant="outline" className="text-[10px] h-4">Inactive</Badge>}
                </div>
            )
        },
        {
            accessorKey: "orderNumber",
            header: "Order #",
            cell: ({ row }) => (
                <div className="font-mono text-xs flex items-center gap-2">
                    {row.getValue("orderNumber") || "N/A"}
                    {row.original.comment && (
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <div className="text-primary/70">
                                        <MessageSquare className="h-3 w-3" />
                                    </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>{row.original.comment}</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    )}
                </div>
            )
        },
        {
            accessorKey: "date",
            header: "Date",
            cell: ({ row }) => format(new Date(row.getValue("date")), "dd.MM.yyyy"),
            sortingFn: "datetime",
        },
        {
            accessorKey: "_propertyName",
            header: "Property",
            cell: ({ row }) => (
                <span className="font-medium">
                    {row.getValue("_propertyName")}
                    <span className="text-muted-foreground text-xs ml-2">
                        {row.original._unit ? `(${row.original._unit})` : ''}
                    </span>
                </span>
            ),
        },
        {
            accessorKey: "resultValue",
            header: "Value",
            cell: ({ row }) => (
                <span className={!row.original._isActive ? "line-through text-muted-foreground" : ""}>
                    {Number(row.getValue("resultValue")).toFixed(2)}
                </span>
            ),
        },
        {
            accessorKey: "laboratoryId",
            header: "Lab",
            cell: ({ row }) => row.getValue("laboratoryId"),
        },
        {
            accessorKey: "testMethod",
            header: "Method",
            cell: ({ row }) => row.getValue("testMethod") || '-',
        },
        {
            accessorKey: "sourceFilename",
            header: "Source",
            cell: ({ row }) => {
                const m = row.original;
                return m.sourceType === 'pdf' ? (
                    <span className="text-blue-600 underline text-sm cursor-pointer hover:text-blue-800" onClick={() => {
                        // e.stopPropagation(); // managed by row click? DataTable row click usually navigates if configured? 
                        // But here we might want to open PDF. For now just text.
                    }}>
                        {m.sourceFilename || "Report"}
                    </span>
                ) : (
                    <span className="text-muted-foreground text-xs">Manual</span>
                );
            }
        },
        {
            id: "actions",
            cell: ({ row }) => {
                const isActive = row.original._isActive;
                return (
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                    onClick={(e) => toggleActive(e, row.original.id, isActive)}
                                >
                                    {isActive ? <Power className="h-4 w-4" /> : <Undo2 className="h-4 w-4" />}
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>{isActive ? "Deactivate Measurement" : "Reactivate Measurement"}</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                );
            }
        },
        // Hidden search column
        {
            id: "_search",
            accessorFn: (row) => `${row.referenceNumber} ${row.orderNumber} ${row._propertyName} ${row.laboratoryId} ${row.testMethod}`.toLowerCase(),
            header: () => null,
            cell: () => null,
            enableHiding: true,
        },
    ];

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
                        {data.filter(m => m._isActive).length} active measurements found.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <DataTable
                        columns={columns}
                        data={data}
                        enableGlobalFilter={true}
                        filterPlaceholder="Search internal records..."
                        onRowClick={(row) => navigate(`/measurements/${row.id}`)}
                    />
                </CardContent>
            </Card>
        </div>
    );
}
