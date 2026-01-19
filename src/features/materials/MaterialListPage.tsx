import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAppStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Badge } from "@/components/ui/badge";
import { Plus, CheckCircle2, XCircle, HelpCircle, Archive } from 'lucide-react';
import { MaterialFormDialog } from './MaterialFormDialog';
import { WhereUsedDialog } from './WhereUsedDialog';
import { Protect } from '@/components/auth/Protect';
import { DataTable } from '@/components/ui/data-table';
import { DataTableColumnHeader } from '@/components/ui/data-table-column-header';
import { type ColumnDef } from '@tanstack/react-table';
import { type Material } from '@/types/domain';

export function MaterialListPage() {
    const { materials, fetchMaterials } = useAppStore();
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [showArchived, setShowArchived] = useState(false);

    // Enrich with search data
    const materialsWithSearch = materials.map(m => ({
        ...m,
        _search: `${m.name} ${m.manufacturer} ${m.type} ${m.variants?.map(v => v.variantName).join(" ")}`.toLowerCase()
    }));

    // Filter out archived items unless toggle is on
    const filteredMaterials = materialsWithSearch.filter(m =>
        showArchived ? m.status === 'archived' : m.status !== 'archived'
    );

    // Load data on mount
    useEffect(() => {
        fetchMaterials();
    }, [fetchMaterials]);

    const columns: ColumnDef<Material>[] = [
        {
            accessorKey: "name",
            header: ({ column }) => <DataTableColumnHeader column={column} title="Name" />,
            cell: ({ row }) => <span className="font-medium">{row.getValue("name")}</span>,
            enableSorting: true,
        },
        {
            accessorKey: "type",
            header: ({ column }) => <DataTableColumnHeader column={column} title="Type" />,
            enableSorting: true,
            filterFn: (row, id, value) => {
                return value.includes(row.getValue(id))
            },
        },
        {
            accessorKey: "manufacturer",
            header: ({ column }) => <DataTableColumnHeader column={column} title="Manufacturer" />,
            enableSorting: true,
        },
        {
            accessorKey: "reachStatus",
            header: ({ column }) => <DataTableColumnHeader column={column} title="Reach" />,
            cell: ({ row }) => {
                const status = row.getValue("reachStatus") as string;
                let colorClass = "bg-gray-100 text-gray-800";
                let label = status;

                switch (status) {
                    case 'reach_compliant':
                        colorClass = "bg-green-100 text-green-800 hover:bg-green-200 border-green-200";
                        label = "Compliant";
                        break;
                    case 'svhc_contained':
                        colorClass = "bg-orange-100 text-orange-800 hover:bg-orange-200 border-orange-200";
                        label = "SVHC";
                        break;
                    case 'restricted':
                        colorClass = "bg-red-100 text-red-800 hover:bg-red-200 border-red-200";
                        label = "Restricted";
                        break;
                }

                return (
                    <Badge variant="outline" className={`${colorClass} whitespace-nowrap`}>
                        {label}
                    </Badge>
                )
            },
            enableSorting: true,
            filterFn: (row, id, value) => {
                return value.includes(row.getValue(id))
            },
        },
        {
            accessorKey: "maturityLevel",
            header: ({ column }) => <DataTableColumnHeader column={column} title="Maturity" />,
            cell: ({ row }) => {
                const level = row.getValue("maturityLevel") as number;
                return (
                    <div className="flex items-center pl-4">
                        <span className={`font-bold ${level === 3 ? 'text-green-600' : level === 1 ? 'text-amber-600' : 'text-blue-600'}`}>
                            {level}
                        </span>
                    </div>
                )
            },
            enableSorting: true,
        },
        {
            accessorKey: "status",
            header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
            cell: ({ row }) => {
                const status = row.getValue("status") as string;
                return (
                    <Badge variant={
                        status === 'standard' ? 'default' :
                            status === 'blocked' ? 'destructive' : 'secondary'
                    }>
                        {status}
                    </Badge>
                )
            },
            enableSorting: true,
            filterFn: (row, id, value) => {
                return value.includes(row.getValue(id))
            },
        },
        // Hidden search column
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
                const mat = row.original;
                return (
                    <div className="text-right flex justify-end gap-2">
                        <WhereUsedDialog variantId={mat.id} materialName={mat.name} />
                        <Link to={`/materials/${mat.id}`}>
                            <Button variant="ghost" size="sm">View</Button>
                        </Link>
                    </div>
                )
            },
        },
    ]

    return (
        <div className="p-8 space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Materials</h1>
                    <p className="text-muted-foreground">Manage base materials and their properties.</p>
                </div>
                <Protect permission="create:material">
                    <div className="flex gap-2">
                        <Button
                            variant={showArchived ? "secondary" : "outline"}
                            onClick={() => setShowArchived(!showArchived)}
                            className="gap-2"
                        >
                            <Archive className="h-4 w-4" />
                            {showArchived ? "Hide Archived" : "Show Archived"}
                        </Button>
                        <Button onClick={() => setIsCreateOpen(true)}>
                            <Plus className="mr-2 h-4 w-4" /> Add Material
                        </Button>
                    </div>
                </Protect>
            </div>

            <MaterialFormDialog
                open={isCreateOpen}
                onOpenChange={setIsCreateOpen}
                mode="create"
            />

            <div className="border rounded-md p-4">
                <DataTable
                    columns={columns}
                    data={filteredMaterials}
                    enableGlobalFilter={true}
                    filterPlaceholder="Search materials..."
                    facetedFilters={[
                        {
                            column: "status",
                            title: "Status",
                            options: [
                                { label: "Standard", value: "standard", icon: CheckCircle2 },
                                { label: "In Review", value: "in_review", icon: HelpCircle },
                                { label: "Blocked", value: "blocked", icon: XCircle },
                                { label: "Legacy", value: "legacy", icon: Archive },
                            ]
                        },
                        {
                            column: "type",
                            title: "Material Type",
                            options: [
                                { label: "Prepreg", value: "Prepreg" },
                                { label: "Resin", value: "Resin" },
                                { label: "Fabric", value: "Fabric" },
                                { label: "Core", value: "Core" },
                                { label: "Adhesive", value: "Adhesive" },
                            ]
                        },
                        {
                            column: "reachStatus",
                            title: "Reach",
                            options: [
                                { label: "Compliant", value: "reach_compliant" },
                                { label: "SVHC", value: "svhc_contained" },
                                { label: "Restricted", value: "restricted" },
                            ]
                        }
                    ]}
                />
            </div>
        </div>
    );
}
