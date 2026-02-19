import { useState, useEffect } from "react";
import { useAppStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogDescription,
    DialogFooter
} from "@/components/ui/dialog";
import { Plus, Settings, Trash2, Archive, ArchiveRestore } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
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

export function ProcessManager() {
    const { processes, addProcess, updateProcess, fetchProcesses, archiveProcess, deleteProcess } = useAppStore();
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [formData, setFormData] = useState({
        name: "",
        description: "",
        subProcess: "",
        processNumber: "",
        // Simple Params as text for prototype
        params: ""
    });

    const [processToArchive, setProcessToArchive] = useState<string | null>(null);
    const [processToDelete, setProcessToDelete] = useState<string | null>(null);

    // Archive State
    const [showArchived, setShowArchived] = useState(false);

    useEffect(() => {
        fetchProcesses(showArchived);
    }, [fetchProcesses, showArchived]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            // Mock parsing param string to object
            let defaultParams = {};
            try {
                if (formData.params) defaultParams = JSON.parse(formData.params);
            } catch {
                defaultParams = { note: formData.params };
            }

            await addProcess({
                name: formData.name,
                description: formData.description,
                subProcess: formData.subProcess,
                processNumber: formData.processNumber,
                defaultParams
            });
            setFormData({ name: "", description: "", subProcess: "", processNumber: "", params: "" });
            setIsDialogOpen(false);
        } catch (error) {
            // Store handles error state
        }
    };

    const handleArchiveClick = (id: string) => {
        setProcessToArchive(id);
    };

    const confirmArchive = async () => {
        if (processToArchive) {
            await archiveProcess(processToArchive);
            setProcessToArchive(null);
        }
    };

    const handleRestore = async (id: string) => {
        await updateProcess(id, { entryStatus: 'active' });
    };

    const handleDeleteClick = (id: string) => {
        setProcessToDelete(id);
    };

    const confirmDelete = async () => {
        if (processToDelete) {
            await deleteProcess(processToDelete);
            setProcessToDelete(null);
        }
    };

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Manufacturing Processes</h1>
                    <p className="text-muted-foreground">Define standard processes (e.g., Curing Cycles, Bonding).</p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex items-center space-x-2">
                        <Switch id="show-archived-proc" checked={showArchived} onCheckedChange={setShowArchived} />
                        <Label htmlFor="show-archived-proc">Show Archived</Label>
                    </div>
                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                        <DialogTrigger asChild>
                            <Button>
                                <Plus className="mr-2 h-4 w-4" /> Add Process
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-xl">
                            <DialogHeader>
                                <DialogTitle>New Process</DialogTitle>
                                <DialogDescription> Define a new standard manufacturing process.</DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Name *</label>
                                        <Input
                                            value={formData.name}
                                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                                            placeholder="e.g. Autoclave 180°C"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Process Number</label>
                                        <Input
                                            value={formData.processNumber}
                                            onChange={e => setFormData({ ...formData, processNumber: e.target.value })}
                                            placeholder="e.g. P-100"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Sub-Process</label>
                                    <Input
                                        value={formData.subProcess}
                                        onChange={e => setFormData({ ...formData, subProcess: e.target.value })}
                                        placeholder="e.g. Cycle 1"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Description</label>
                                    <Textarea
                                        value={formData.description}
                                        onChange={e => setFormData({ ...formData, description: e.target.value })}
                                        placeholder="Standard cure cycle..."
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Default Parameters (JSON)</label>
                                    <Textarea
                                        className="font-mono text-xs"
                                        value={formData.params}
                                        onChange={e => setFormData({ ...formData, params: e.target.value })}
                                        placeholder='{ "temp": 180, "pressure": 6 }'
                                    />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button onClick={handleSubmit}>Save Process</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Number</TableHead>
                                <TableHead>Name</TableHead>
                                <TableHead>Sub-Process</TableHead>
                                <TableHead>Description</TableHead>
                                <TableHead>Default Params</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {processes.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">
                                        No processes defined.
                                    </TableCell>
                                </TableRow>
                            )}
                            {processes.map((p) => (
                                <TableRow key={p.id} className={(p as any).entryStatus === 'archived' ? 'opacity-60 bg-muted/20' : ''}>
                                    <TableCell className="font-mono text-sm">
                                        {p.processNumber || "-"}
                                    </TableCell>
                                    <TableCell className="font-medium flex items-center gap-2">
                                        <Settings className="h-4 w-4 text-muted-foreground" />
                                        {p.name}
                                        {(p as any).entryStatus === 'archived' && (
                                            <Badge variant="outline" className="text-muted-foreground text-[10px] h-5">Archived</Badge>
                                        )}
                                    </TableCell>
                                    <TableCell>{p.subProcess || "-"}</TableCell>
                                    <TableCell>{p.description}</TableCell>
                                    <TableCell className="font-mono text-xs text-muted-foreground">
                                        {p.defaultParams ? JSON.stringify(p.defaultParams).substring(0, 50) + "..." : "-"}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            {(p as any).entryStatus !== 'archived' ? (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleArchiveClick(p.id)}
                                                    className="text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                                                    title="Archive"
                                                >
                                                    <Archive className="h-4 w-4" />
                                                </Button>
                                            ) : (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                                                    onClick={() => handleRestore(p.id)}
                                                    title="Restore"
                                                >
                                                    <ArchiveRestore className="h-4 w-4" />
                                                </Button>
                                            )}
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                                title="Delete Permanently"
                                                onClick={() => handleDeleteClick(p.id)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
            <AlertDialog open={!!processToArchive} onOpenChange={(open) => !open && setProcessToArchive(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Archive Process?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to archive this process? It will be hidden from selection lists but preserved.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmArchive} className="bg-amber-600 hover:bg-amber-700">Archive</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            <AlertDialog open={!!processToDelete} onOpenChange={(open) => !open && setProcessToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Process?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to PERMANENTLY delete this process? This cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
