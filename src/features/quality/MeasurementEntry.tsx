import { useEffect, useMemo, useState } from 'react';
import { useAppStore } from '@/lib/store';
import { useAuth } from '@/lib/auth';
import { DataTable } from '@/components/ui/data-table';
import type { ColumnDef } from '@tanstack/react-table';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Plus, MessageSquare, Power, ArrowUpDown, FileText, Paperclip, Trash2 } from 'lucide-react';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
        updateMeasurement,
        deleteMeasurement
    } = useAppStore();
    const { user } = useAuth();
    const navigate = useNavigate();

    // Local state for delete dialog
    const [measurementToDelete, setMeasurementToDelete] = useState<string | null>(null);

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

    const confirmDelete = async () => {
        if (measurementToDelete) {
            await deleteMeasurement(measurementToDelete);
            setMeasurementToDelete(null);
        }
    };

    const columns: ColumnDef<any>[] = [
        {
            accessorKey: "date",
            header: ({ column }) => (
                <Button variant="ghost" className="-ml-4" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
                    Date
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
            ),
            cell: ({ row }) => format(new Date(row.getValue("date")), "dd.MM.yyyy"),
            sortingFn: "datetime",
        },
        {
            accessorKey: "orderNumber",
            header: ({ column }) => (
                <Button variant="ghost" className="-ml-4" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
                    Order #
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
            ),
            cell: ({ row }) => (
                <div className="font-mono text-xs flex items-center gap-2">
                    {row.getValue("orderNumber") || "N/A"}
                    {row.original.comment && (
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <div className="text-primary/70 cursor-help">
                                        <MessageSquare className="h-3 w-3" />
                                    </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p className="max-w-xs text-xs">{row.original.comment}</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    )}
                </div>
            )
        },
        {
            accessorKey: "referenceNumber",
            header: ({ column }) => (
                <Button variant="ghost" className="-ml-4" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
                    Ref #
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
            ),
            cell: ({ row }) => (
                <div className="font-mono text-xs text-muted-foreground flex items-center gap-2">
                    {row.getValue("referenceNumber") || "-"}
                </div>
            )
        },
        {
            accessorKey: "_propertyName",
            header: ({ column }) => (
                <Button variant="ghost" className="-ml-4" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
                    Property
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
            ),
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
            header: ({ column }) => (
                <Button variant="ghost" className="-ml-4" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
                    Value
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
            ),
            cell: ({ row }) => (
                <span className={!row.original._isActive ? "line-through text-muted-foreground" : ""}>
                    {Number(row.getValue("resultValue")).toFixed(2)}
                </span>
            ),
        },
        {
            accessorKey: "testMethod",
            header: "Method",
            cell: ({ row }) => row.getValue("testMethod") || "-",
        },
        // Source / Attachments
        {
            id: "attachments",
            header: "Files",
            cell: ({ row }) => {
                const m = row.original;
                const hasPdf = m.sourceType === "pdf";
                const hasAttachments = m.attachments && m.attachments.length > 0;

                if (!hasPdf && !hasAttachments) return <span className="text-muted-foreground text-xs">-</span>;

                return (
                    <div className="flex items-center gap-2">
                        {hasPdf && (
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <FileText className="h-4 w-4 text-blue-500" />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>Source PDF: {m.sourceFilename || "Report.pdf"}</p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        )}
                        {hasAttachments && (
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <div className="flex items-center text-muted-foreground">
                                            <Paperclip className="h-4 w-4" />
                                            <span className="text-xs ml-0.5">{m.attachments.length}</span>
                                        </div>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>{m.attachments.length} attachment(s)</p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        )}
                    </div>
                );
            }
        },
        {
            id: "actions",
            header: "Actions",
            cell: ({ row }) => {
                const isActive = row.original._isActive;
                return (
                    <div className="flex items-center gap-1">
                        <Button
                            variant="ghost"
                            size="sm"
                            className={`h-8 w-8 p-0 rounded-full ${isActive ? "text-green-600 hover:bg-green-100" : "text-gray-400 hover:text-green-600"}`}
                            onClick={(e) => toggleActive(e, row.original.id, !!isActive)}
                            title={isActive ? "Deactivate" : "Activate"}
                        >
                            <Power className="h-4 w-4" />
                        </Button>

                        {user?.role === 'admin' && (
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setMeasurementToDelete(row.original.id);
                                }}
                                title="Delete Measurement"
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        )}
                    </div>
                );
            },
        },
        // Hidden search column
        {
            id: "_search",
            accessorFn: (row) => `${row.referenceNumber || ''} ${row.orderNumber || ''} ${row._propertyName || ''} ${row.laboratoryId || ''} ${row.testMethod || ''}`.toLowerCase(),
            header: () => null,
            cell: () => null,
            enableHiding: true,
        },
    ];

    const [globalFilter, setGlobalFilter] = useState("");

    const searchableData = useMemo(() => {
        return data.map(item => ({
            ...item,
            _searchString: `${item.referenceNumber || ''} ${item.orderNumber || ''} ${item._propertyName || ''} ${item.laboratoryId || ''} ${item.testMethod || ''}`.toLowerCase()
        }));
    }, [data]);

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
                        data={searchableData}
                        enableGlobalFilter={true}
                        globalFilter={globalFilter}
                        onGlobalFilterChange={setGlobalFilter}
                        filterPlaceholder="Search internal records..."

                        onRowClick={(row) => navigate(`/measurements/${row.id}`)}
                        getRowClassName={(row) => !row._isActive ? "opacity-60 bg-muted/40 data-[state=selected]:bg-muted grayscale-[0.8]" : ""}
                    />
                </CardContent>
            </Card>

            <AlertDialog open={!!measurementToDelete} onOpenChange={() => setMeasurementToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the measurement result.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
