import { useEffect, useState } from 'react';
import { useAppStore } from '@/lib/store';
import { DataTable } from '@/components/ui/data-table';
import type { ColumnDef } from '@tanstack/react-table';
import type { Layup } from '@/types/domain';
import { Button } from '@/components/ui/button';
import { Plus, Eye, Archive } from 'lucide-react'; // Import Archive icon
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
            // Find variant? We have variant ID.
            // We need to look up in materials? 
            // Ideally store should help, but let's do safe lookup
            // This might be slow if huge data, but fine for now
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

    const columns: ColumnDef<Layup>[] = [
        {
            accessorKey: "name",
            header: "Name",
            cell: ({ row }) => <div className="font-medium">{row.getValue("name")}</div>,
        },
        {
            accessorKey: "status",
            header: "Status",
            cell: ({ row }) => {
                const status = row.getValue("status") as string;
                return <StatusBadge status={status} />;
            },
        },

        {
            accessorKey: "processId",
            header: "Process",
            cell: ({ row }) => {
                const pid = row.getValue("processId") as string;
                const process = processes.find(p => p.id === pid);
                return process ? process.name : <span className="text-muted-foreground">-</span>;
            },
            filterFn: (row, id, value) => {
                return value.includes(row.getValue(id))
            },
        },
        {
            accessorKey: "totalThickness",
            header: "Thickness (mm)",
            cell: ({ row }) => {
                const val = row.getValue("totalThickness") as number;
                return val ? val.toFixed(2) : '-';
            }
        },
        {
            accessorKey: "totalWeight",
            header: "Weight (g)",
            cell: ({ row }) => {
                const val = row.getValue("totalWeight") as number;
                return val ? val.toFixed(0) : '-';
            }
        },
        {
            accessorKey: "createdAt",
            header: "Created",
            cell: ({ row }) => {
                const date = row.getValue("createdAt") as string;
                if (!date) return '-';
                return format(new Date(date), 'dd.MM.yyyy');
            }
        },
        // Hidden column for search
        {
            id: "_search",
            accessorKey: "_search",
            header: () => null,
            cell: () => null,
            enableHiding: true, // Allow it to be hidden? It is hidden from view by returning null cell effectively, but we might want `enableHiding: false` so user can't toggle it? 
            // Better: just don't display it. 
            // Actually, for global filter to work, the default behavior searches all columns.
            // But we want to explicitly use this column?
            // "Global filtering creates a search string from all columns..."
            // If we have a dedicated `_search` column, it will be included.
            // BUT, visual noise. 
            // In TanStack Table v8, we can customize `globalFilterFn`.
            // For now, let's just keep it in data but NOT in columns? 
            // If it's not in columns, it won't be searched by default.
            // So we MUST have it in columns. We hide it via visibility.
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
        <div className="h-full flex flex-col p-8 space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Layups</h2>
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

            <div className="flex-1 overflow-hidden">
                <DataTable
                    columns={columns}
                    data={filteredLayups}
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
