import { useEffect } from 'react';
import { useAppStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Plus, Eye } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { DataTable } from '@/components/ui/data-table';
import { type ColumnDef } from '@tanstack/react-table';
import { type Assembly } from '@/types/domain';
import { useNavigate } from 'react-router-dom';

export function AssemblyListPage() {
    const navigate = useNavigate();
    const { assemblies, layups, fetchAssemblies, fetchLayups } = useAppStore();


    // Removing old state vars


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

    const columns: ColumnDef<Assembly>[] = [
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
            accessorKey: "version",
            header: "Version",
            cell: ({ row }) => <Badge variant="outline">v{row.getValue("version")}</Badge>,
        },
        {
            accessorKey: "description",
            header: "Description",
            cell: ({ row }) => <div className="text-muted-foreground truncate max-w-[300px]">{row.getValue("description")}</div>,
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

                <Button onClick={() => navigate('/assemblies/new')}><Plus className="mr-2 h-4 w-4" /> Create Assembly</Button>
            </div>

            <div className="flex-1 overflow-hidden border rounded-md p-4">
                <DataTable
                    columns={columns}
                    data={assembliesWithSearch}
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
