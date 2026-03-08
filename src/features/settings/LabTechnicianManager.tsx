import { useState, useEffect } from 'react';
import { useAppStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, User, Trash2 } from 'lucide-react';
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
import { Label } from "@/components/ui/label";

export function LabTechnicianManager() {
    const { labTechnicians, fetchLabTechnicians, createLabTechnician, deleteLabTechnician } = useAppStore();

    const [isCreating, setIsCreating] = useState(false);
    const [newName, setNewName] = useState("");
    const [deleteId, setDeleteId] = useState<string | null>(null);

    useEffect(() => {
        fetchLabTechnicians();
    }, []);

    const handleCreate = async () => {
        if (!newName.trim()) return;
        await createLabTechnician(newName);
        setNewName("");
        setIsCreating(false);
    };

    const confirmDelete = async () => {
        if (deleteId) {
            await deleteLabTechnician(deleteId);
            setDeleteId(null);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-medium">Lab Technicians</h3>
                    <p className="text-sm text-muted-foreground">
                        Manage personnel who can be assigned to test tasks.
                    </p>
                </div>
                {!isCreating && (
                    <Button onClick={() => setIsCreating(true)} size="sm">
                        <Plus className="mr-2 h-4 w-4" /> Add Technician
                    </Button>
                )}
            </div>

            {isCreating && (
                <Card className="border-dashed">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base">New Lab Technician</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2 max-w-sm">
                            <Label>Name</Label>
                            <Input
                                placeholder="Technician Name..."
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                            />
                        </div>
                        <div className="flex justify-end gap-2 max-w-sm">
                            <Button variant="ghost" onClick={() => setIsCreating(false)}>Cancel</Button>
                            <Button onClick={handleCreate} disabled={!newName.trim()}>Save Technician</Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {labTechnicians.map(tech => (
                    <Card key={tech.id}>
                        <CardHeader className="pb-3">
                            <div className="flex items-start justify-between">
                                <CardTitle className="text-base flex items-center gap-2">
                                    <User className="h-4 w-4 text-muted-foreground" />
                                    {tech.name}
                                </CardTitle>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                    title="Delete Permanently"
                                    onClick={() => setDeleteId(tech.id)}
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        </CardHeader>
                    </Card>
                ))}
            </div>

            <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Technician?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to permanently remove this lab technician? Tasks assigned to them will lose their assignee.
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
