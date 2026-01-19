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
import { Plus, Settings } from "lucide-react";

export function ProcessManager() {
    const { processes, fetchProcesses, addProcess } = useAppStore();
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [formData, setFormData] = useState({
        name: "",
        description: "",
        // Simple Params as text for prototype
        params: ""
    });

    useEffect(() => {
        fetchProcesses();
    }, [fetchProcesses]);

    const handleSubmit = async () => {
        if (!formData.name) return;

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
            defaultParams
        });
        setIsDialogOpen(false);
        setFormData({ name: "", description: "", params: "" });
    };

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Manufacturing Processes</h1>
                    <p className="text-muted-foreground">Define standard processes (e.g., Curing Cycles, Bonding).</p>
                </div>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="mr-2 h-4 w-4" /> Add Process
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>New Process</DialogTitle>
                            <DialogDescription> Define a new standard manufacturing process.</DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Name</label>
                                <Input
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="e.g. Autoclave 180°C"
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

            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Description</TableHead>
                                <TableHead>Default Params</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {processes.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={3} className="text-center h-24 text-muted-foreground">
                                        No processes defined.
                                    </TableCell>
                                </TableRow>
                            )}
                            {processes.map((p) => (
                                <TableRow key={p.id}>
                                    <TableCell className="font-medium flex items-center gap-2">
                                        <Settings className="h-4 w-4 text-muted-foreground" />
                                        {p.name}
                                    </TableCell>
                                    <TableCell>{p.description}</TableCell>
                                    <TableCell className="font-mono text-xs text-muted-foreground">
                                        {p.defaultParams ? JSON.stringify(p.defaultParams).substring(0, 50) + "..." : "-"}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
