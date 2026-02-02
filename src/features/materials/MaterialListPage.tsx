import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAppStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/StatusBadge";

import { Plus, CheckCircle2, XCircle, HelpCircle, Archive } from 'lucide-react';
import { Protect } from '@/components/auth/Protect';
import { DataTable } from '@/components/ui/data-table';
import { DataTableColumnHeader } from '@/components/ui/data-table-column-header';
import { type ColumnDef } from '@tanstack/react-table';
import { type Material } from '@/types/domain';
import { useNavigate } from 'react-router-dom';

export function MaterialListPage() {
    const { materials, fetchMaterials } = useAppStore();
    const navigate = useNavigate();
    const [showArchived, setShowArchived] = useState(false);

    // Enrich with search data
    const materialsWithSearch = materials.map(m => ({
        ...m,
        _search: `${m.name} ${m.manufacturer} ${m.type} ${m.variants?.map(v => v.variantName).join(" ")}`.toLowerCase()
    }));

    // Filter out archived items unless toggle is on
    const filteredMaterials = materialsWithSearch.filter(m =>
        showArchived ? m.status === 'obsolete' : m.status !== 'obsolete'
    );

    // Load data on mount
    useEffect(() => {
        fetchMaterials();
    }, [fetchMaterials]);

    const columns: ColumnDef<Material>[] = [
        {
            accessorKey: "materialListNumber",
            header: ({ column }) => <DataTableColumnHeader column={column} title="List #" />,
            cell: ({ row }) => <span className="font-mono font-medium text-xs">{row.getValue("materialListNumber")}</span>,
            enableSorting: true,
        },
        {
            accessorKey: "name",
            header: ({ column }) => <DataTableColumnHeader column={column} title="Material Name" />,
            cell: ({ row }) => <span className="font-semibold text-base">{row.getValue("name")}</span>,
            enableSorting: true,
        },
        {
            accessorKey: "type",
            header: ({ column }) => <DataTableColumnHeader column={column} title="Type" />,
            cell: ({ row }) => <Badge variant="secondary" className="font-normal">{row.getValue("type")}</Badge>,
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
            accessorKey: "reachStatus",
            header: ({ column }) => <DataTableColumnHeader column={column} title="Reach" />,
            cell: ({ row }) => {
                const status = row.getValue("reachStatus") as string;
                let colorClass = "text-muted-foreground border-muted-foreground/30";
                let label = status;

                switch (status) {
                    case 'reach_compliant':
                        colorClass = "text-green-700 bg-green-50 border-green-200";
                        label = "Compliant";
                        break;
                    case 'svhc_contained':
                        colorClass = "text-amber-700 bg-amber-50 border-amber-200";
                        label = "SVHC";
                        break;
                    case 'restricted':
                        colorClass = "text-red-700 bg-red-50 border-red-200";
                        label = "Restricted";
                        break;
                }

                return (
                    <Badge variant="outline" className={`${colorClass} whitespace-nowrap font-normal`}>
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
                    <div className="flex items-center justify-center">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${level === 3 ? 'bg-green-50 text-green-700 border-green-200' : level === 1 ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>
                            L{level}
                        </span>
                    </div>
                )
            },
            enableSorting: true,
        },

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
                        <Button onClick={() => navigate('/materials/new')}>
                            <Plus className="mr-2 h-4 w-4" /> Add Material
                        </Button>
                    </div>
                </Protect>
            </div>



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
                                { label: "Active", value: "active", icon: CheckCircle2 },
                                { label: "Standard", value: "standard", icon: CheckCircle2 },
                                { label: "Restricted", value: "restricted", icon: XCircle },
                                { label: "Obsolete", value: "obsolete", icon: Archive },
                                { label: "Engineering", value: "engineering", icon: HelpCircle },
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
