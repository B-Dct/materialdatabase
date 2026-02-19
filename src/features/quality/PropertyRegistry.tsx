import { useEffect, useState } from 'react';
import { useAppStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from 'sonner';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Plus, Pencil, ArrowUpDown, Trash } from 'lucide-react';
import { type PropertyDefinition } from '@/types/domain';
import { useAuth } from '@/lib/auth';
import { DataTable } from '@/components/ui/data-table';
import { Badge } from '@/components/ui/badge';
import type { ColumnDef } from '@tanstack/react-table';

export function PropertyRegistry() {
    const { properties, fetchProperties, addProperty, updateProperty, deleteProperty } = useAppStore();
    const { can } = useAuth();
    const [open, setOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [currentId, setCurrentId] = useState<string | null>(null);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [propertyToDelete, setPropertyToDelete] = useState<PropertyDefinition | null>(null);

    const [formData, setFormData] = useState<Omit<PropertyDefinition, 'id'>>({
        name: '',
        unit: '',
        dataType: 'numeric',
        category: 'physical',
        scope: 'material', // Default
        testMethods: []
    });

    const [methodsInput, setMethodsInput] = useState('');

    useEffect(() => {
        fetchProperties();
    }, [fetchProperties]);

    const handleEdit = (prop: PropertyDefinition) => {
        if (!can('manage:properties')) return;
        setFormData({
            name: prop.name,
            unit: prop.unit,
            dataType: prop.dataType,
            category: prop.category,
            scope: prop.scope || 'material',
            testMethods: prop.testMethods || [],
            statsConfig: prop.statsConfig
        });
        setMethodsInput((prop.testMethods || []).join(', '));
        setCurrentId(prop.id);
        setIsEditing(true);
        setOpen(true);
    };

    const handleOpenChange = (val: boolean) => {
        setOpen(val);
        if (!val) {
            setIsEditing(false);
            setCurrentId(null);
            setFormData({ name: '', unit: '', dataType: 'numeric', category: 'physical', scope: 'material', testMethods: [] });
            setMethodsInput('');
        }
    };

    const handleSubmit = async () => {
        if (!formData.name) return;

        const methods = methodsInput.split(',').map(m => m.trim()).filter(Boolean);
        const payload = {
            ...formData,
            testMethods: methods
        };

        try {
            if (isEditing && currentId) {
                await updateProperty(currentId, payload);
            } else {
                await addProperty(payload);
            }
            handleOpenChange(false);
        } catch (e) {
            console.error("Failed to save property:", e);
        }
    };

    const handleDeleteConfirm = async () => {
        if (!propertyToDelete) return;
        try {
            await deleteProperty(propertyToDelete.id);
            setDeleteDialogOpen(false);
            setPropertyToDelete(null);
            toast.success(`Property "${propertyToDelete.name}" deleted`);
        } catch (e: any) {
            console.error("Failed to delete property:", e);
            if (e.message?.includes("foreign key") || e.code === "23503" || e.message?.includes("violate")) {
                toast.error(`Cannot delete "${propertyToDelete.name}" because it is currently in use.`);
            } else {
                toast.error(`Failed to delete property: ${e.message}`);
            }
        }
    };

    const columns: ColumnDef<PropertyDefinition>[] = [
        {
            accessorKey: "name",
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    >
                        Name
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                )
            },
        },
        {
            accessorKey: "category",
            header: "Category",
            cell: ({ row }) => <span className="capitalize">{row.getValue("category")}</span>,
            filterFn: (row, id, value) => {
                return value.includes(row.getValue(id));
            },
        },
        {
            accessorKey: "scope",
            header: "Scope",
            cell: ({ row }) => <Badge variant="outline">{row.getValue("scope") || 'material'}</Badge>,
        },
        {
            accessorKey: "testMethods",
            header: "Test Methods",
            cell: ({ row }) => {
                const methods = row.original.testMethods || [];
                return methods.length ? (
                    <div className="flex flex-wrap gap-1">
                        {methods.map((m, i) => (
                            <span key={i} className="inline-flex items-center rounded-sm bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground ring-1 ring-inset ring-gray-500/10">
                                {m}
                            </span>
                        ))}
                    </div>
                ) : <span className="text-muted-foreground">-</span>;
            }
        },
        {
            accessorKey: "unit",
            header: "Unit",
        },
        {
            accessorKey: "dataType",
            header: "Type",
            cell: ({ row }) => <span className="capitalize">{row.getValue("dataType")}</span>,
        },
        {
            accessorKey: "inputStructure",
            header: "Input Mode",
            cell: ({ row }) => <span className="text-xs uppercase text-muted-foreground">{row.original.inputStructure === 'min-mean-max' ? 'Stat' : 'Simple'}</span>,
        },
        {
            id: "actions",
            cell: ({ row }) => {
                return can('manage:properties') ? (
                    <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(row.original)}>
                            <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            onClick={() => {
                                setPropertyToDelete(row.original);
                                setDeleteDialogOpen(true);
                            }}
                        >
                            <Trash className="h-4 w-4" />
                        </Button>
                    </div >
                ) : null
            },
        },
    ];

    const categoryFilters = [
        {
            column: "category",
            title: "Category",
            options: [
                { label: "Mechanical", value: "mechanical" },
                { label: "Physical", value: "physical" },
                { label: "Chemical", value: "chemical" },
            ]
        }
    ];

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Property Registry</h2>
                    <p className="text-muted-foreground">Define and manage material properties.</p>
                </div>
                {can('manage:properties') && (
                    <Dialog open={open} onOpenChange={handleOpenChange}>
                        <DialogTrigger asChild>
                            <Button onClick={() => { setIsEditing(false); setCurrentId(null); }}>
                                <Plus className="mr-2 h-4 w-4" /> Add Property
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>{isEditing ? 'Edit Property' : 'Add Global Property'}</DialogTitle>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <div className="grid gap-2">
                                    <label>Name</label>
                                    <Input
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        placeholder="e.g. Tensile Strength"
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <label>Category</label>
                                    <Select
                                        value={formData.category}
                                        onValueChange={(val: any) => setFormData({ ...formData, category: val })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="mechanical">Mechanical</SelectItem>
                                            <SelectItem value="chemical">Chemical</SelectItem>
                                            <SelectItem value="physical">Physical</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="grid gap-2">
                                    <label>Test Standards / Methods (comma separated)</label>
                                    <Input
                                        value={methodsInput}
                                        onChange={e => setMethodsInput(e.target.value)}
                                        placeholder="e.g. ISO 527-4, ASTM D3039"
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <label>Unit</label>
                                    <Input
                                        value={formData.unit}
                                        onChange={e => setFormData({ ...formData, unit: e.target.value })}
                                        placeholder="e.g. MPa"
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <label>Data Type</label>
                                    <Select
                                        value={formData.dataType}
                                        onValueChange={(val: any) => setFormData({ ...formData, dataType: val })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="numeric">Numeric</SelectItem>
                                            <SelectItem value="text">Text</SelectItem>
                                            <SelectItem value="range">Range</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="grid gap-2">
                                    <label>Scope / Context</label>
                                    <Select
                                        value={formData.scope}
                                        onValueChange={(val: any) => setFormData({ ...formData, scope: val })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="material">Material (Direct)</SelectItem>
                                            <SelectItem value="layup">Layup Dependent</SelectItem>
                                            <SelectItem value="assembly">Assembly Dependent</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="grid gap-2">
                                    <label>Input Structure</label>
                                    <Select
                                        value={formData.inputStructure || 'single'}
                                        onValueChange={(val: any) => setFormData({ ...formData, inputStructure: val })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="single">Single Value</SelectItem>
                                            <SelectItem value="min-mean-max">Statistical (Min, Mean, Max)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-3 border rounded-md p-4">
                                    <h4 className="font-medium text-sm">Statistical Configuration</h4>
                                    <div className="flex items-center space-x-2">
                                        <input
                                            type="checkbox"
                                            id="calc-basic"
                                            checked={formData.statsConfig?.calculateBasic ?? true}
                                            onChange={e => setFormData({
                                                ...formData,
                                                statsConfig: { ...formData.statsConfig, calculateBasic: e.target.checked } as any
                                            })}
                                            className="h-4 w-4 rounded border-gray-300"
                                        />
                                        <label htmlFor="calc-basic" className="text-sm">Basic Stats (Mean, Min, Max, StdDev)</label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <input
                                            type="checkbox"
                                            id="calc-b-basis"
                                            checked={formData.statsConfig?.calculateBBasis ?? false}
                                            onChange={e => setFormData({
                                                ...formData,
                                                statsConfig: { ...formData.statsConfig, calculateBBasis: e.target.checked } as any
                                            })}
                                            className="h-4 w-4 rounded border-gray-300"
                                        />
                                        <label htmlFor="calc-b-basis" className="text-sm">B-Basis (Aerospace Standard)</label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <input
                                            type="checkbox"
                                            id="calc-a-basis"
                                            checked={formData.statsConfig?.calculateABasis ?? false}
                                            onChange={e => setFormData({
                                                ...formData,
                                                statsConfig: { ...formData.statsConfig, calculateABasis: e.target.checked } as any
                                            })}
                                            className="h-4 w-4 rounded border-gray-300"
                                        />
                                        <label htmlFor="calc-a-basis" className="text-sm">A-Basis (Strict Reliability)</label>
                                    </div>
                                </div>

                                <Button onClick={handleSubmit}>{isEditing ? 'Update Definition' : 'Create Definition'}</Button>
                            </div>
                        </DialogContent>
                    </Dialog>
                )}
            </div>

            <DataTable
                columns={columns}
                data={properties}
                filterColumn="name"
                filterPlaceholder="Filter properties..."
                facetedFilters={categoryFilters}
            />

            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Property?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete <span className="font-semibold text-foreground">{propertyToDelete?.name}</span>?
                            This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setPropertyToDelete(null)}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive hover:bg-destructive/90">
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
