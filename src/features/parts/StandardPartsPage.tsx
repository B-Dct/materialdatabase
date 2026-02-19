import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAppStore } from '@/lib/store';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, Edit, CheckCircle2, Archive, HelpCircle, Layers } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import type { StandardPart } from '@/types/domain';
import { DataTable } from '@/components/ui/data-table';
import { DataTableColumnHeader } from '@/components/ui/data-table-column-header';
import { type ColumnDef } from '@tanstack/react-table';
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Protect } from '@/components/auth/Protect';

export default function StandardPartsPage() {
    const {
        standardParts,
        assemblies,
        fetchStandardParts,
        fetchAssemblies,
        addStandardPart,
        updateStandardPart,
        deleteStandardPart
    } = useAppStore();

    const { can } = useAuth();

    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [selectedPart, setSelectedPart] = useState<StandardPart | null>(null);

    // Load data on mount
    useEffect(() => {
        fetchStandardParts();
        fetchAssemblies();
    }, [fetchStandardParts, fetchAssemblies]);

    const handleDelete = async (id: string) => {
        console.log("Attempting to delete part with ID:", id);
        if (confirm("Are you sure you want to delete this standard part?")) {
            try {
                await deleteStandardPart(id);
                console.log("Deletion successful, refetching...");
                // Force refresh to ensure UI is in sync
                await fetchStandardParts();
            } catch (error: any) {
                console.error("Delete failed:", error);
                alert(`Failed to delete part: ${error.message}`);
            }
        }
    };

    const handleEditClick = (part: StandardPart) => {
        setSelectedPart(part);
        setIsEditOpen(true);
    };

    // Enrich with search data
    const partsWithSearch = standardParts.map(p => ({
        ...p,
        _search: `${p.name} ${p.manufacturer} ${p.supplier}`.toLowerCase()
    }));

    const columns: ColumnDef<StandardPart>[] = [
        {
            accessorKey: "name",
            header: ({ column }) => <DataTableColumnHeader column={column} title="Designation / Name" />,
            cell: ({ row }) => <span className="font-medium">{row.getValue("name")}</span>,
            enableSorting: true,
        },
        {
            accessorKey: "manufacturer",
            header: ({ column }) => <DataTableColumnHeader column={column} title="Manufacturer" />,
            enableSorting: true,
        },
        {
            accessorKey: "supplier",
            header: ({ column }) => <DataTableColumnHeader column={column} title="Supplier" />,
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
            id: "_search",
            accessorKey: "_search",
            header: () => null,
            cell: () => null,
            enableHiding: true,
        },
        {
            id: "usedIn",
            header: ({ column }) => <DataTableColumnHeader column={column} title="Used In" />,
            cell: ({ row }) => {
                const partId = row.original.id;
                const usedIn = assemblies.filter(a =>
                    a.components?.some(c => c.componentType === 'standard_part' && c.componentId === partId)
                );

                if (usedIn.length === 0) return <span className="text-muted-foreground text-xs">-</span>;

                return (
                    <Popover>
                        <PopoverTrigger asChild>
                            <Badge variant="outline" className="cursor-pointer hover:bg-muted">
                                <Layers className="h-3 w-3 mr-1" />
                                {usedIn.length} Assemblies
                            </Badge>
                        </PopoverTrigger>
                        <PopoverContent className="w-64 p-3">
                            <div className="space-y-2">
                                <h4 className="font-medium text-xs text-muted-foreground uppercase">Used in Assemblies</h4>
                                <div className="max-h-[200px] overflow-auto space-y-1">
                                    {usedIn.map(a => (
                                        <Link
                                            key={a.id}
                                            to={`/assemblies?id=${a.id}`} // Assuming assembly page supports query param or we just link to list
                                            className="block text-sm hover:underline text-blue-600 dark:text-blue-400 truncate"
                                        >
                                            {a.name}
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        </PopoverContent>
                    </Popover>
                );
            }
        },
        {
            id: "actions",
            cell: ({ row }) => {
                const part = row.original;
                return (
                    <div className="text-right flex justify-end gap-2">
                        {can('create:material') && (
                            <>
                                <Button variant="ghost" size="icon" onClick={() => handleEditClick(part)}>
                                    <Edit className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600" onClick={() => handleDelete(part.id)}>
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </>
                        )}
                    </div>
                )
            },
        },
    ];

    return (
        <div className="h-full flex flex-col p-6 space-y-6 animate-in fade-in duration-500">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Standard Parts</h1>
                    <p className="text-muted-foreground">Manage standard parts (Normteile), manufacturers, and suppliers.</p>
                </div>
                <Protect permission="create:material">
                    <Button onClick={() => setIsCreateOpen(true)}>
                        <Plus className="mr-2 h-4 w-4" /> Add Part
                    </Button>
                </Protect>
            </div>

            <div className="border rounded-md p-4 bg-background">
                <DataTable
                    columns={columns}
                    data={partsWithSearch}
                    enableGlobalFilter={true}
                    filterPlaceholder="Search parts..."
                    facetedFilters={[
                        {
                            column: "status",
                            title: "Status",
                            options: [
                                { label: "Standard", value: "standard", icon: CheckCircle2 },
                                { label: "Active", value: "active", icon: CheckCircle2 },
                                { label: "Restricted", value: "restricted", icon: HelpCircle },
                                { label: "Obsolete", value: "obsolete", icon: Archive },
                            ]
                        }
                    ]}
                />
            </div>

            <PartDialog
                open={isCreateOpen}
                onOpenChange={setIsCreateOpen}
                onSubmit={addStandardPart}
                title="Add New Standard Part"
            />

            <PartDialog
                open={isEditOpen}
                onOpenChange={setIsEditOpen}
                initialData={selectedPart}
                onSubmit={async (data: Partial<StandardPart>) => {
                    if (selectedPart) {
                        await updateStandardPart(selectedPart.id, data);
                    }
                }}
                title="Edit Standard Part"
            />
        </div>
    );
}

function PartDialog({ open, onOpenChange, onSubmit, initialData, title }: any) {
    const [formData, setFormData] = useState({
        name: '',
        manufacturer: '',
        supplier: '',
        status: 'standard'
    });

    useEffect(() => {
        if (open) {
            if (initialData) {
                setFormData({
                    name: initialData.name,
                    manufacturer: initialData.manufacturer,
                    supplier: initialData.supplier,
                    status: initialData.status
                });
            } else {
                setFormData({
                    name: '',
                    manufacturer: '',
                    supplier: '',
                    status: 'standard'
                });
            }
        }
    }, [open, initialData]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await onSubmit(formData);
            onOpenChange(false);
        } catch (error: any) {
            console.error("Failed to save part:", error);
            alert(`Failed to save part: ${error.message || JSON.stringify(error)}`);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label>Designation / Name</Label>
                        <Input
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                            required
                            placeholder="e.g. M6x20 Bolt"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Manufacturer</Label>
                            <Input
                                value={formData.manufacturer}
                                onChange={e => setFormData({ ...formData, manufacturer: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Supplier</Label>
                            <Input
                                value={formData.supplier}
                                onChange={e => setFormData({ ...formData, supplier: e.target.value })}
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label>Status</Label>
                        <Select
                            value={formData.status}
                            onValueChange={val => setFormData({ ...formData, status: val })}
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="standard">Standard</SelectItem>
                                <SelectItem value="active">Active</SelectItem>
                                <SelectItem value="restricted">Restricted</SelectItem>
                                <SelectItem value="obsolete">Obsolete</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                        <Button type="submit">Save</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
