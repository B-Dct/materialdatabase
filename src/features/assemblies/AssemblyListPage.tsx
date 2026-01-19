import { useEffect, useState } from 'react';
import { useAppStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Eye } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from "@/components/ui/dialog";

import { Badge } from "@/components/ui/badge";
import { DataTable } from '@/components/ui/data-table';
import { type ColumnDef } from '@tanstack/react-table';
import { type Assembly } from '@/types/domain';

export function AssemblyListPage() {
    const { assemblies, layups, fetchAssemblies, fetchLayups, addAssembly } = useAppStore();
    const [isCreateOpen, setIsCreateOpen] = useState(false);

    // Form State
    const [newName, setNewName] = useState("");
    const [newDesc, setNewDesc] = useState("");
    const [selectedLayups, setSelectedLayups] = useState<{ layupId: string, quantity: number }[]>([]);

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
                let variant: "default" | "secondary" | "destructive" | "outline" = "secondary";
                if (status === 'approved' || status === 'standard' || status === 'active') variant = 'default';
                if (status === 'blocked' || status === 'restricted') variant = 'destructive';
                if (status === 'obsolete') variant = 'outline';

                return <Badge variant={variant}>{status}</Badge>;
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
            cell: () => null,
            enableHiding: true,
        },
        {
            id: "actions",
            cell: (_) => {
                return (
                    <div className="flex justify-end">
                        {/* Navigate to detail view later */}
                        <Button variant="ghost" size="icon">
                            <Eye className="h-4 w-4" />
                        </Button>
                    </div>
                );
            },
        },
    ];

    const handleAddLayup = (layupId: string) => {
        const existing = selectedLayups.find(s => s.layupId === layupId);
        if (existing) {
            setSelectedLayups(selectedLayups.map(s => s.layupId === layupId ? { ...s, quantity: s.quantity + 1 } : s));
        } else {
            setSelectedLayups([...selectedLayups, { layupId, quantity: 1 }]);
        }
    };

    const handleCreate = async () => {
        if (!newName) return;
        await addAssembly({
            name: newName,
            description: newDesc,
            status: 'in_review',
            version: 1,
            components: [],
            measurements: []
        }, selectedLayups);

        setIsCreateOpen(false);
        setNewName("");
        setNewDesc("");
        setSelectedLayups([]);
    };

    return (
        <div className="h-full flex flex-col p-8 space-y-8 animate-in fade-in duration-500">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Assemblies</h1>
                    <p className="text-muted-foreground">Manage complex assemblies composed of multiple layups.</p>
                </div>

                <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                    <DialogTrigger asChild>
                        <Button><Plus className="mr-2 h-4 w-4" /> Create Assembly</Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                        <DialogHeader>
                            <DialogTitle>Create New Assembly</DialogTitle>
                        </DialogHeader>

                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Name</label>
                                    <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g. Wing Box Structure" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Description</label>
                                    <Input value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Optional description..." />
                                </div>
                            </div>

                            <div className="border rounded-md p-4 bg-muted/20">
                                <h3 className="text-sm font-medium mb-3">Add Components (Layups)</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    {/* Available Layups */}
                                    <div className="border bg-background rounded p-2 h-48 overflow-y-auto">
                                        <div className="text-xs text-muted-foreground mb-2 sticky top-0 bg-background pb-1 border-b">Available Layups</div>
                                        {layups.map(l => (
                                            <div key={l.id} className="flex justify-between items-center p-2 hover:bg-muted rounded text-sm group">
                                                <span>{l.name}</span>
                                                <Button size="icon" variant="ghost" className="h-6 w-6 opacity-0 group-hover:opacity-100" onClick={() => handleAddLayup(l.id)}>
                                                    <Plus className="h-3 w-3" />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Selected Components */}
                                    <div className="border bg-background rounded p-2 h-48 overflow-y-auto">
                                        <div className="text-xs text-muted-foreground mb-2 sticky top-0 bg-background pb-1 border-b">Selected Components</div>
                                        {selectedLayups.length === 0 && <span className="text-xs text-muted-foreground italic p-2 block">No components added.</span>}
                                        {selectedLayups.map(sel => {
                                            const lay = layups.find(l => l.id === sel.layupId);
                                            return (
                                                <div key={sel.layupId} className="flex justify-between items-center p-2 border-b last:border-0 text-sm">
                                                    <span>{lay?.name || 'Unknown'}</span>
                                                    <Badge variant="secondary">x{sel.quantity}</Badge>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <DialogFooter>
                            <Button onClick={handleCreate}>Create Assembly</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
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
                                { label: "In Review", value: "in_review" },
                                { label: "Restricted", value: "restricted" },
                                { label: "Blocked", value: "blocked" },
                                { label: "Obsolete", value: "obsolete" }
                            ]
                        }
                    ]}
                />
            </div>
        </div>
    );
}
