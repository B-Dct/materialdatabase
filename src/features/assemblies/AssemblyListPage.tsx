import { useEffect } from 'react';
import { useAppStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Plus, Eye, Activity, Check, X } from 'lucide-react';
import { StatusBadge } from "@/components/ui/StatusBadge";
import { DataTable } from '@/components/ui/data-table';
import { DataTableColumnHeader } from '@/components/ui/data-table-column-header'; // Added import
import { type ColumnDef } from '@tanstack/react-table';
import { type Assembly } from '@/types/domain';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';

export function AssemblyListPage() {
    const navigate = useNavigate();
    const { assemblies, layups, fetchAssemblies, fetchLayups } = useAppStore();

    useEffect(() => {
        fetchAssemblies();
        fetchLayups();
    }, [fetchAssemblies, fetchLayups]);

    // Enrich assemblies for search
    const assembliesWithSearch = assemblies.map(a => {
        const componentNames = a.components.map(c => {
            const layup = layups.find(l => l.id === c.componentId);
            return layup ? layup.name : '';
        }).join(" ");

        return {
            ...a,
            _search: `${a.name} ${a.status} ${componentNames}`.toLowerCase()
        };
    });

    // Default Sort: Newest First
    const sortedAssemblies = [...assembliesWithSearch].sort((a, b) => {
        // Validation: Some assemblies might not have createdAt if migrated poorly? 
        // Assembly interface should have it. fallback to 0.
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
    });

    const columns: ColumnDef<Assembly>[] = [
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
            accessorKey: "description",
            header: ({ column }) => <DataTableColumnHeader column={column} title="Description" />,
            cell: ({ row }) => <div className="text-muted-foreground truncate max-w-[300px]">{row.getValue("description")}</div>,
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
        // Hidden Search Column
        {
            id: "_search",
            accessorKey: "_search",
            header: () => null,
            enableHiding: true,
        },
        {
            id: "actions",
            cell: ({ row }) => {
                const assembly = row.original;
                return (
                    <div className="flex justify-end">
                        <Button variant="ghost" size="icon" onClick={() => navigate(`/assemblies/${assembly.id}`)}>
                            <Eye className="h-4 w-4" />
                        </Button>
                    </div>
                );
            },
        }
    ];

    return (
        <div className="h-full flex flex-col p-8 space-y-8 animate-in fade-in duration-500">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Assemblies</h1>
                    <p className="text-muted-foreground">Manage complex assemblies composed of multiple layups.</p>
                </div>

                <Button onClick={() => navigate('/assemblies/new')}><Plus className="mr-2 h-4 w-4" /> Add Assembly</Button>
            </div>

            <div className="flex-1 overflow-hidden border rounded-md p-4">
                <DataTable
                    columns={columns}
                    data={sortedAssemblies}
                    enableGlobalFilter={true}
                    filterPlaceholder="Search assemblies, sub-components..."
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
                        }
                    ]}
                />
            </div>
        </div>
    );
}
