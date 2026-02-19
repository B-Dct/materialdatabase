import { useState, useEffect } from 'react';
import { useAppStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Plus, FlaskConical, MapPin, Edit, Save, Trash2, Archive, ArchiveRestore } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
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
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export function LaboratoryManager() {
    const { laboratories, testMethods, addLaboratory, updateLaboratory, fetchLaboratories, archiveLaboratory, deleteLaboratory } = useAppStore();

    // New Lab State
    const [isCreating, setIsCreating] = useState(false);
    const [newLabName, setNewLabName] = useState("");
    const [newLabCity, setNewLabCity] = useState("");
    const [newLabCountry, setNewLabCountry] = useState("");

    // Archive State
    const [showArchived, setShowArchived] = useState(false);

    // Initial Fetch (and on toggle)
    useEffect(() => {
        fetchLaboratories(showArchived);
    }, [showArchived]);


    // Editing State (Methods)
    const [editingMethodsLabId, setEditingMethodsLabId] = useState<string | null>(null);

    // Editing State (Details)
    const [editDetailsOpen, setEditDetailsOpen] = useState(false);

    const [editingLab, setEditingLab] = useState<{ id: string, name: string, city: string, country: string } | null>(null);

    const [labToArchive, setLabToArchive] = useState<string | null>(null);
    const [labToDelete, setLabToDelete] = useState<string | null>(null);

    const handleCreate = async () => {
        if (!newLabName.trim()) return;
        await addLaboratory({
            name: newLabName,
            city: newLabCity,
            country: newLabCountry,
            authorizedMethods: []
        });
        setNewLabName("");
        setNewLabCity("");
        setNewLabCountry("");
        setIsCreating(false);
    };

    const toggleMethod = (lab: any, methodId: string) => {
        const currentmethods = lab.authorizedMethods || [];
        const methodObj = testMethods.find(m => m.id === methodId);
        const methodVal = methodObj ? methodObj.name : methodId;

        const exists = currentmethods.includes(methodVal);
        const newMethods = exists
            ? currentmethods.filter((m: string) => m !== methodVal)
            : [...currentmethods, methodVal];

        updateLaboratory(lab.id, { authorizedMethods: newMethods });
    };

    const openEditDetails = (lab: any) => {
        setEditingLab({
            id: lab.id,
            name: lab.name,
            city: lab.city || "",
            country: lab.country || ""
        });
        setEditDetailsOpen(true);
    };

    const saveDetails = async () => {
        if (!editingLab) return;
        await updateLaboratory(editingLab.id, {
            name: editingLab.name,
            city: editingLab.city,
            country: editingLab.country
        });
        setEditDetailsOpen(false);
        setEditingLab(null);
    };

    const handleArchiveClick = (id: string) => {
        setLabToArchive(id);
    };

    const confirmArchive = async () => {
        if (labToArchive) {
            await archiveLaboratory(labToArchive);
            setLabToArchive(null);
        }
    };

    const handleDeleteClick = (id: string) => {
        setLabToDelete(id);
    };

    const confirmDelete = async () => {
        if (labToDelete) {
            await deleteLaboratory(labToDelete);
            setLabToDelete(null);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-medium">Laboratories</h3>
                    <p className="text-sm text-muted-foreground">
                        Manage internal and external testing facilities and their capabilities.
                    </p>
                </div>
                {!isCreating && (
                    <div className="flex items-center gap-4">
                        <div className="flex items-center space-x-2">
                            <Switch id="show-archived" checked={showArchived} onCheckedChange={setShowArchived} />
                            <Label htmlFor="show-archived">Show Archived</Label>
                        </div>
                        <Button onClick={() => setIsCreating(true)} size="sm">
                            <Plus className="mr-2 h-4 w-4" /> Add Laboratory
                        </Button>
                    </div>
                )}
            </div>

            {isCreating && (
                <Card className="border-dashed">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base">New Laboratory</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label>Name</Label>
                                <Input
                                    placeholder="Laboratory Name..."
                                    value={newLabName}
                                    onChange={(e) => setNewLabName(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>City</Label>
                                <Input
                                    placeholder="City..."
                                    value={newLabCity}
                                    onChange={(e) => setNewLabCity(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Country</Label>
                                <Input
                                    placeholder="Country..."
                                    value={newLabCountry}
                                    onChange={(e) => setNewLabCountry(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="flex justify-end gap-2">
                            <Button variant="ghost" onClick={() => setIsCreating(false)}>Cancel</Button>
                            <Button onClick={handleCreate}>Save Laboratory</Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            <div className="grid gap-4">
                {laboratories.map(lab => (
                    <Card key={lab.id} className={(lab as any).entryStatus === 'archived' ? 'opacity-60 bg-muted/20' : ''}>
                        <CardHeader className="pb-3">
                            <div className="flex items-start justify-between">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <CardTitle className="text-base flex items-center gap-2">
                                            <FlaskConical className="h-4 w-4 text-muted-foreground" />
                                            {lab.name}
                                            {(lab as any).entryStatus === 'archived' && (
                                                <Badge variant="outline" className="text-muted-foreground text-[10px] h-5">Archived</Badge>
                                            )}
                                        </CardTitle>
                                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openEditDetails(lab)}>
                                            <Edit className="h-3 w-3" />
                                        </Button>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                        <MapPin className="h-3 w-3" />
                                        {lab.city || "Unknown City"}, {lab.country || "Unknown Country"}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {/* Action Buttons */}
                                    <Button
                                        variant={editingMethodsLabId === lab.id ? "secondary" : "outline"}
                                        size="sm"
                                        onClick={() => setEditingMethodsLabId(editingMethodsLabId === lab.id ? null : lab.id)}
                                    >
                                        {editingMethodsLabId === lab.id ? "Done" : "Manage Methods"}
                                    </Button>

                                    {(lab as any).entryStatus !== 'archived' ? (
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                                            onClick={() => handleArchiveClick(lab.id)}
                                            title="Archive (Hide from lists)"
                                        >
                                            <Archive className="h-4 w-4" />
                                        </Button>
                                    ) : (
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                                            onClick={() => updateLaboratory(lab.id, { entryStatus: 'active' })}
                                            title="Restore (Unarchive)"
                                        >
                                            <ArchiveRestore className="h-4 w-4" />
                                        </Button>
                                    )}

                                    {/* Delete Button (Optional for now, or Restricted) */}
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                        title="Delete Permanently"
                                        onClick={() => handleDeleteClick(lab.id)}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>

                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {editingMethodsLabId === lab.id ? (
                                <div className="space-y-4 animate-in fade-in duration-300">
                                    <div className="p-4 border rounded-md bg-muted/30">
                                        <p className="text-sm font-medium mb-3">Authorized Test Methods</p>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                                            {testMethods.map(method => (
                                                <div key={method.id} className="flex items-center space-x-2">
                                                    <Checkbox
                                                        id={`${lab.id}-${method.id}`}
                                                        checked={(lab.authorizedMethods || []).includes(method.name)}
                                                        onCheckedChange={() => toggleMethod(lab, method.id)}
                                                    />
                                                    <label
                                                        htmlFor={`${lab.id}-${method.id}`}
                                                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                                    >
                                                        {method.name}
                                                    </label>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-wrap gap-2">
                                    {lab.authorizedMethods && lab.authorizedMethods.length > 0 ? (
                                        lab.authorizedMethods.map((m: string) => (
                                            <Badge key={m} variant="secondary" className="font-normal">
                                                {m}
                                            </Badge>
                                        ))
                                    ) : (
                                        <span className="text-muted-foreground text-sm italic">No methods authorized.</span>
                                    )}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                ))}
            </div>
            {/* Edit Details Dialog */}
            <Dialog open={editDetailsOpen} onOpenChange={setEditDetailsOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Laboratory</DialogTitle>
                        <DialogDescription>
                            Update the location and contact details for this facility.
                        </DialogDescription>
                    </DialogHeader>
                    {editingLab && (
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="name" className="text-right">Name</Label>
                                <Input id="name" value={editingLab.name} onChange={(e) => setEditingLab({ ...editingLab, name: e.target.value })} className="col-span-3" />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="city" className="text-right">City</Label>
                                <Input id="city" value={editingLab.city} onChange={(e) => setEditingLab({ ...editingLab, city: e.target.value })} className="col-span-3" />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="country" className="text-right">Country</Label>
                                <Input id="country" value={editingLab.country} onChange={(e) => setEditingLab({ ...editingLab, country: e.target.value })} className="col-span-3" />
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditDetailsOpen(false)}>Cancel</Button>
                        <Button onClick={saveDetails}>
                            <Save className="mr-2 h-4 w-4" /> Save Changes
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <AlertDialog open={!!labToArchive} onOpenChange={(open) => !open && setLabToArchive(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Archive Laboratory?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to archive this laboratory? It will be hidden from selection lists but preserved.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmArchive} className="bg-amber-600 hover:bg-amber-700">Archive</AlertDialogAction>
                    </AlertDialogFooter>

                </AlertDialogContent>
            </AlertDialog >

            <AlertDialog open={!!labToDelete} onOpenChange={(open) => !open && setLabToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Laboratory?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to PERMANENTLY delete this laboratory? This cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div >
    );
}
