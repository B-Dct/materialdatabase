import { useEffect, useMemo, useState } from 'react';
import { useAppStore } from '@/lib/store';
import { DataTable } from '@/components/ui/data-table';
import type { ColumnDef } from '@tanstack/react-table';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Plus, MessageSquare, Power, ArrowUpDown, FileText } from 'lucide-react';
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
        {
            accessorKey: "laboratoryId",
            header: "Lab",
            cell: ({ row }) => row.getValue("laboratoryId"),
        },
        {
            accessorKey: "sourceType", // For filtering
            header: "Source",
            cell: ({ row }) => {
                const m = row.original;
                return m.sourceType === "pdf" ? (
                    <div className="flex items-center gap-1 text-blue-600 hover:underline cursor-pointer">
                        <FileText className="h-4 w-4" />
                        <span className="truncate max-w-[100px]">{m.sourceFilename || "Report.pdf"}</span>
                    </div>
                ) : (
                    <span className="text-muted-foreground text-xs">Manual Entry</span>
                );
            }
        },
        {
            accessorKey: "_isActive",
            header: "Status",
            cell: ({ row }) => {
                const isActive = row.original._isActive;
                return (
                    <Button
                        variant="ghost"
                        size="sm"
                        className={`h-6 w-6 p-0 rounded-full ${isActive ? "text-green-600 hover:text-green-700 hover:bg-green-100" : "text-muted-foreground hover:text-foreground"}`}
                        onClick={(e) => toggleActive(e, row.original.id, !!isActive)}
                        title={isActive ? "Deactivate Measurement" : "Activate Measurement"}
                    >
                        <Power className="h-3.5 w-3.5" />
                    </Button>
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

    const filteredData = useMemo(() => {
        if (!globalFilter) return searchableData;
        const lowerFilter = globalFilter.toLowerCase();
        return searchableData.filter(item => item._searchString.includes(lowerFilter));
    }, [searchableData, globalFilter]);

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
                        {filteredData.filter(m => m._isActive).length} active measurements found.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <DataTable
                        columns={columns}
                        data={filteredData}
                        enableGlobalFilter={true}
                        globalFilter={globalFilter}
                        onGlobalFilterChange={setGlobalFilter}
                        filterPlaceholder="Search internal records..."
                        onRowClick={(row) => navigate(`/measurements/${row.id}`)}
                    />
                </CardContent>
            </Card>
        </div>
    );
}
