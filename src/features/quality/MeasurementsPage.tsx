import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppStore } from "@/lib/store";
import { FileText, Power, Plus, ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import type { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";

export function MeasurementsPage() {
    const { measurements, fetchMeasurements, materials, layups, assemblies, properties, fetchMaterials, fetchLayups, fetchAssemblies, fetchProperties, updateMeasurement } = useAppStore();
    const navigate = useNavigate();

    useEffect(() => {
        fetchMeasurements();
        fetchMaterials();
        fetchLayups();
        fetchAssemblies();
        fetchProperties();
    }, [fetchMeasurements, fetchMaterials, fetchLayups, fetchAssemblies, fetchProperties]);

    const data = useMemo(() => {
        return measurements.map(m => {
            const prop = properties.find(p => p.id === m.propertyDefinitionId);

            let parentName = "Unlinked";
            let parentType = "Unknown";

            if (m.materialId) {
                const mat = materials.find(x => x.id === m.materialId);
                parentName = mat?.name || "Unknown Material";
                parentType = "Material";
            } else if (m.layupId) {
                const l = layups.find(x => x.id === m.layupId);
                parentName = l?.name || "Unknown Layup";
                parentType = "Layup";
            } else if (m.assemblyId) {
                const a = assemblies.find(x => x.id === m.assemblyId);
                parentName = a?.name || "Unknown Assembly";
                parentType = "Assembly";
            }

            return {
                ...m,
                _parentName: parentName,
                _parentType: parentType,
                _propertyName: prop?.name || m.propertyDefinitionId,
                _isActive: m.isActive !== false
            };
        });
    }, [measurements, properties, materials, layups, assemblies]);

    const columns: ColumnDef<any>[] = [
        {
            accessorKey: "date",
            header: ({ column }) => (
                <Button
                    variant="ghost"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    className="-ml-4"
                >
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
            cell: ({ row }) => <span className="font-mono text-xs">{row.getValue("orderNumber")}</span>,
        },
        {
            accessorKey: "referenceNumber",
            header: ({ column }) => (
                <Button variant="ghost" className="-ml-4" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
                    Ref #
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
            ),
            cell: ({ row }) => <span className="font-mono text-xs">{row.getValue("referenceNumber") || "-"}</span>,
        },
        {
            accessorKey: "_parentName",
            header: ({ column }) => (
                <Button
                    variant="ghost"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    className="-ml-4"
                >
                    Parent
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
            ),
            cell: ({ row }) => (
                <div className="flex flex-col">
                    <span className="font-medium text-sm">{row.original._parentName}</span>
                    <span className="text-[10px] text-muted-foreground uppercase">{row.original._parentType}</span>
                </div>
            ),
        },
        {
            accessorKey: "_propertyName",
            header: ({ column }) => (
                <Button
                    variant="ghost"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    className="-ml-4"
                >
                    Property
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
            ),
            cell: ({ row }) => <span className="font-medium">{row.getValue("_propertyName")}</span>,
        },
        {
            accessorKey: "resultValue",
            header: ({ column }) => (
                <Button
                    variant="ghost"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    className="-ml-4"
                >
                    Value
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
            ),
            cell: ({ row }) => (
                <span>
                    {Number(row.getValue("resultValue")).toFixed(2)} <span className="text-muted-foreground text-xs">{row.original.unit}</span>
                </span>
            ),
        },
        {
            accessorKey: "testMethod",
            header: ({ column }) => {
                const isFiltered = column.getIsFiltered();
                return (
                    <div className="flex items-center">
                        Method
                        {isFiltered && <div className="h-2 w-2 rounded-full bg-primary ml-2" title="Filtered" />}
                    </div>
                );
            },
            cell: ({ row }) => row.getValue("testMethod") || "-",
            filterFn: (row, id, value) => {
                return value.includes(row.getValue(id))
            },
        },
        {
            accessorKey: "laboratoryId",
            header: ({ column }) => {
                const isFiltered = column.getIsFiltered();
                return (
                    <div className="flex items-center">
                        Lab
                        {isFiltered && <div className="h-2 w-2 rounded-full bg-primary ml-2" title="Filtered" />}
                    </div>
                );
            },
            cell: ({ row }) => <span className="text-muted-foreground text-sm">{row.getValue("laboratoryId")}</span>,
            filterFn: (row, id, value) => {
                return value.includes(row.getValue(id))
            },
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
            header: ({ column }) => {
                const isFiltered = column.getIsFiltered();
                return (
                    <div className="flex items-center">
                        Status
                        {isFiltered && <div className="h-2 w-2 rounded-full bg-primary ml-2" title="Filtered" />}
                    </div>
                );
            },
            cell: ({ row }) => {
                const isActive = row.original._isActive;
                return (
                    <Button
                        variant="ghost"
                        size="sm"
                        className={`h-6 w-6 p-0 rounded-full ${isActive ? "text-green-600 hover:text-green-700 hover:bg-green-100" : "text-muted-foreground hover:text-foreground"}`}
                        onClick={(e) => {
                            e.stopPropagation();
                            updateMeasurement(row.original.id, { isActive: !isActive });
                        }}
                        title={isActive ? "Deactivate Measurement" : "Activate Measurement"}
                    >
                        <Power className="h-3.5 w-3.5" />
                    </Button>
                );
            },
            filterFn: (row, id, value) => {
                const isActive = row.getValue(id) as boolean;
                if (value.includes("active") && isActive) return true;
                if (value.includes("inactive") && !isActive) return true;
                return false;
            }
        },
        // Hidden search column
        {
            id: "_search",
            accessorFn: (row) => `${row.referenceNumber || ''} ${row.orderNumber || ''} ${row._parentName} ${row._propertyName} ${row.sourceFilename || ''} ${row.testMethod || ''} ${row.laboratoryId || ''}`.toLowerCase(),
            header: () => null,
            cell: () => null,
            enableHiding: true,
        },
    ];

    // Filter logic
    const [globalFilter, setGlobalFilter] = useState("");

    const filteredData = useMemo(() => {
        if (!globalFilter) return data;
        const lowerFilter = globalFilter.toLowerCase();
        return data.filter(item => {
            const searchString = `${item._parentName || ''} ${item._propertyName || ''} ${item.sourceFilename || ''} ${item.testMethod || ''} ${item.laboratoryId || ''}`.toLowerCase();
            return searchString.includes(lowerFilter);
        });
    }, [data, globalFilter]);

    return (
        <div className="h-full flex flex-col p-8 space-y-8 animate-in fade-in duration-500">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Measurements</h1>
                    <p className="text-muted-foreground">Manage laboratory test reports and data points.</p>
                </div>
                <Button onClick={() => navigate("/measurements/new")}>
                    <Plus className="mr-2 h-4 w-4" /> Add Measurement
                </Button>
            </div>

            <div className="flex-1 overflow-hidden border rounded-md p-4">
                <DataTable
                    columns={columns}
                    data={filteredData}
                    enableGlobalFilter={true}
                    globalFilter={globalFilter}
                    onGlobalFilterChange={setGlobalFilter}
                    filterPlaceholder="Search measurements..."
                    onRowClick={(item) => navigate(`/measurements/${item.id}`)}
                    facetedFilters={[
                        {
                            column: "_isActive",
                            title: "Status",
                            options: [
                                { label: "Active", value: "active" },
                                { label: "Inactive", value: "inactive" }
                            ]
                        },
                        {
                            column: "testMethod",
                            title: "Method",
                            options: Array.from(new Set(data.map(m => m.testMethod).filter((m): m is string => !!m))).map(method => ({
                                label: method,
                                value: method
                            }))
                        },
                        {
                            column: "laboratoryId",
                            title: "Lab",
                            options: Array.from(new Set(data.map(m => m.laboratoryId).filter((m): m is string => !!m))).map(lab => ({
                                label: lab,
                                value: lab
                            }))
                        }
                    ]}
                />
            </div>
        </div>
    );
}
