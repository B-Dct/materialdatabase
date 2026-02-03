import { useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAppStore } from "@/lib/store";
import { Badge } from "@/components/ui/badge";
import { FileText, Power, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import type { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";

export function MeasurementsPage() {
    const { measurements, fetchMeasurements, materials, properties, fetchMaterials, fetchProperties, updateMeasurement } = useAppStore();
    const navigate = useNavigate();

    useEffect(() => {
        fetchMeasurements();
        fetchMaterials();
        fetchProperties();
    }, [fetchMeasurements, fetchMaterials, fetchProperties]);

    const data = useMemo(() => {
        return measurements.map(m => {
            const prop = properties.find(p => p.id === m.propertyDefinitionId);
            const mat = materials.find(mat => mat.id === m.materialId);
            return {
                ...m,
                _materialName: mat?.name || "Unlinked",
                _propertyName: prop?.name || m.propertyDefinitionId,
                _isActive: m.isActive !== false
            };
        });
    }, [measurements, properties, materials]);

    const columns: ColumnDef<any>[] = [
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
                // value is array of strings e.g. ["active", "inactive"]
                if (value.includes("active") && isActive) return true;
                if (value.includes("inactive") && !isActive) return true;
                return false;
            }
        },
        {
            accessorKey: "date",
            header: "Date",
            cell: ({ row }) => format(new Date(row.getValue("date")), "dd.MM.yyyy"),
            sortingFn: "datetime",
        },
        {
            accessorKey: "_materialName",
            header: "Material",
            cell: ({ row }) => (
                row.original.materialId ? (
                    <Badge variant="outline" className="font-mono">
                        {row.getValue("_materialName")}
                    </Badge>
                ) : <span className="text-muted-foreground italic text-sm">Unlinked</span>
            ),
        },
        {
            accessorKey: "_propertyName",
            header: "Property",
            cell: ({ row }) => <span className="font-medium">{row.getValue("_propertyName")}</span>,
        },
        {
            accessorKey: "resultValue",
            header: "Value",
            cell: ({ row }) => (
                <span>
                    {Number(row.getValue("resultValue")).toFixed(2)} <span className="text-muted-foreground text-xs">{row.original.unit}</span>
                </span>
            ),
        },
        {
            accessorKey: "testMethod",
            header: "Method",
            cell: ({ row }) => row.getValue("testMethod") || "-",
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
            accessorKey: "laboratoryId",
            header: "Lab",
            cell: ({ row }) => <span className="text-muted-foreground text-sm">{row.getValue("laboratoryId")}</span>,
        },
        // Hidden search column
        {
            id: "_search",
            accessorFn: (row) => `${row._materialName} ${row._propertyName} ${row.sourceFilename || ''} ${row.testMethod || ''} ${row.laboratoryId || ''}`.toLowerCase(),
            header: () => null,
            cell: () => null,
            enableHiding: true,
        },

    ];

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
                    data={data}
                    enableGlobalFilter={true}
                    filterPlaceholder="Search measurements..."
                    facetedFilters={[
                        {
                            column: "_isActive",
                            title: "Status",
                            options: [
                                { label: "Active", value: "active" },
                                { label: "Inactive", value: "inactive" }
                            ]
                        }
                    ]}
                />
            </div>
        </div>
    );
}
