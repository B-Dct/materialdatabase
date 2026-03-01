import { useEffect, useState } from 'react';
import { useAppStore } from '@/lib/store';
import { DataTable } from '@/components/ui/data-table';
import { DataTableColumnHeader } from '@/components/ui/data-table-column-header'; // Added import
import type { ColumnDef } from '@tanstack/react-table';
import type { Layup } from '@/types/domain';
import { Button } from '@/components/ui/button';
import { Plus, Eye, Archive, Activity, Check, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { StatusBadge } from "@/components/ui/StatusBadge";
import { format } from 'date-fns';

export function LayupListPage() {
    const { layups, fetchLayups, processes, fetchProcesses, materials, fetchMaterials } = useAppStore();
    const navigate = useNavigate();
    const [showArchived, setShowArchived] = useState(false);

    useEffect(() => {
        fetchLayups();
        fetchProcesses();
        fetchMaterials();
    }, [fetchLayups, fetchProcesses, fetchMaterials]);

    // enrich layups with searchable text
    const layupsWithSearch = layups.map(l => {
        const process = processes.find(p => p.id === l.processId);

        // aggregate material names
        const materialNames = l.layers.map(layer => {
            const mat = materials.find(m => m.variants?.some(v => v.id === layer.materialVariantId));
            const variant = mat?.variants?.find(v => v.id === layer.materialVariantId);
            return `${mat?.name} ${variant?.variantName} ${mat?.manufacturer}`;
        }).join(" ");

        return {
            ...l,
            _search: `${l.name} ${l.status} ${process?.name || ''} ${materialNames}`.toLowerCase()
        }
    });

    // Filter out archived items unless toggle is on
    const filteredLayups = layupsWithSearch.filter(l =>
        showArchived ? l.status === 'obsolete' : l.status !== 'obsolete'
    );

    // Default Sort: Newest First
    const sortedLayups = [...filteredLayups].sort((a, b) => {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    const columns: ColumnDef<Layup>[] = [
        {
            accessorKey: "name",
            header: ({ column }) => <DataTableColumnHeader column={column} title="Name" />,
            cell: ({ row }) => <div className="font-medium">{row.getValue("name")}</div>,
            enableSorting: true,
        },
        {
            accessorKey: "status",
            header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
            cell: ({ row }) => {
                const status = row.getValue("status") as string;
                return <StatusBadge status={status} />;
            },
            enableSorting: true,
            filterFn: (row, id, value) => {
                return value.includes(row.getValue(id))
            },
        },

        {
            accessorKey: "processId",
            header: ({ column }) => <DataTableColumnHeader column={column} title="Process" />,
            cell: ({ row }) => {
                const pid = row.getValue("processId") as string;
                const process = processes.find(p => p.id === pid);
                return process ? process.name : <span className="text-muted-foreground">-</span>;
            },
            enableSorting: true,
            filterFn: (row, id, value) => {
                return value.includes(row.getValue(id))
            },
        },
        {
            accessorKey: "totalThickness",
            header: ({ column }) => <DataTableColumnHeader column={column} title="Thickness (mm)" />,
            cell: ({ row }) => {
                const val = row.getValue("totalThickness") as number;
                return val ? val.toFixed(2) : '-';
            },
            enableSorting: true,
        },
        {
            accessorKey: "totalWeight",
            header: ({ column }) => <DataTableColumnHeader column={column} title="Weight (g)" />,
            cell: ({ row }) => {
                const val = row.getValue("totalWeight") as number;
                return val ? val.toFixed(0) : '-';
            },
            enableSorting: true,
        },
        {
            accessorKey: "createdAt",
            header: ({ column }) => <DataTableColumnHeader column={column} title="Created" />,
            cell: ({ row }) => {
                const date = row.getValue("createdAt") as string;
                if (!date) return '-';
                return format(new Date(date), 'dd.MM.yyyy');
            },
            enableSorting: true,
        },
        {
            id: "measurements",
            accessorFn: (row) => row.measurements?.length || 0,
            header: ({ column }) => <DataTableColumnHeader column={column} title="Measurements" />,
            cell: ({ row }) => {
                const count = row.getValue("measurements") as number;
                return (
                    <div className="flex items-center gap-2">
                        <Activity className="h-4 w-4 text-muted-foreground" />
                        <span>{count}</span>
                    </div>
                );
            },
            enableSorting: true,
        },
        {
            id: "allowables",
            accessorFn: (row) => (row.allowables?.length || 0) > 0,
            header: ({ column }) => <DataTableColumnHeader column={column} title="Allowables" />,
            cell: ({ row }) => {
                const hasAllowables = row.getValue("allowables") as boolean;
                return hasAllowables ? (
                    <div className="flex items-center text-green-600">
                        <Check className="h-4 w-4 mr-1" />
                        <span className="text-xs font-medium">Yes</span>
                    </div>
                ) : (
                    <div className="flex items-center text-muted-foreground/30">
                        <X className="h-4 w-4 mr-1" />
                        <span className="text-xs">No</span>
                    </div>
                );
            },
            enableSorting: true,
        },
        // Hidden column for search
        {
            id: "_search",
            accessorKey: "_search",
            header: () => null,
            cell: () => null,
            enableHiding: true,
        },
        {
            id: "actions",
            cell: ({ row }) => {
                return (
                    <div className="flex justify-end">
                        <Button variant="ghost" size="icon" onClick={() => navigate(`/layups/${row.original.id}`)}>
                            <Eye className="h-4 w-4" />
                        </Button>
                    </div>
                );
            },
        },
    ];

    const processOptions = processes.map(p => ({ label: p.name, value: p.id }));

    return (
        <div className="h-full flex flex-col p-8 space-y-6 animate-in fade-in duration-500">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Layups</h1>
                    <p className="text-muted-foreground">Manage composite stackups and laminates.</p>
                </div>
                <div className="flex gap-2">
                    <Button
                        variant={showArchived ? "secondary" : "outline"}
                        onClick={() => setShowArchived(!showArchived)}
                        className="gap-2"
                    >
                        <Archive className="h-4 w-4" />
                        {showArchived ? "Hide Archived" : "Show Archived"}
                    </Button>
                    <Button onClick={() => navigate('/layups/new')}>
                        <Plus className="mr-2 h-4 w-4" /> Add Layup
                    </Button>
                </div>
            </div>

            <div className="flex-1 overflow-hidden border rounded-md p-4">
                <DataTable
                    columns={columns}
                    data={sortedLayups}
                    enableGlobalFilter={true}
                    filterPlaceholder="Search layups, materials..."
                    facetedFilters={[
                        {
                            column: "status",
                            title: "Status",
                            options: [
                                { label: "Active", value: "active" },
                                { label: "Standard", value: "standard" },
                                { label: "Engineering", value: "engineering" },
                                { label: "Restricted", value: "restricted" },
                                { label: "Obsolete", value: "obsolete" }
                            ]
                        },
                        {
                            column: "processId",
                            title: "Process",
                            options: processOptions
                        }
                    ]}
                />
            </div>
        </div>
    );
}
