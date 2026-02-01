import { useState } from 'react';
import { useAppStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Plus, FlaskConical, MapPin, Edit, Save } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

export function LaboratoryManager() {
    const { laboratories, testMethods, addLaboratory, updateLaboratory } = useAppStore();

    // New Lab State
    const [isCreating, setIsCreating] = useState(false);
    const [newLabName, setNewLabName] = useState("");
    const [newLabCity, setNewLabCity] = useState("");
    const [newLabCountry, setNewLabCountry] = useState("");

    // Editing State (Methods)
    const [editingMethodsLabId, setEditingMethodsLabId] = useState<string | null>(null);

    // Editing State (Details)
    const [editDetailsOpen, setEditDetailsOpen] = useState(false);
    const [editingLab, setEditingLab] = useState<{ id: string, name: string, city: string, country: string } | null>(null);

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
        const currentmethods = lab.authorizedMethods || []; // legacy typo fix: authorizedMethods
        // methodId here should be the method NAME or ID? Domain says string[]. 
        // Existing mock uses names like 'ISO 527-4'.
        // Let's stick to names as per existing mock data if IDs not used.
        // store.ts mock data: authorizedMethods: ['ISO 527-4', 'ISO 1183']
        // So we use method.name

        // Find method name
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
                    <Button onClick={() => setIsCreating(true)} size="sm">
                        <Plus className="mr-2 h-4 w-4" /> Add Laboratory
                    </Button>
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
                    <Card key={lab.id}>
                        <CardHeader className="pb-3">
                            <div className="flex items-start justify-between">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <CardTitle className="text-base flex items-center gap-2">
                                            <FlaskConical className="h-4 w-4 text-muted-foreground" />
                                            {lab.name}
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
                                <Button
                                    variant={editingMethodsLabId === lab.id ? "secondary" : "outline"}
                                    size="sm"
                                    onClick={() => setEditingMethodsLabId(editingMethodsLabId === lab.id ? null : lab.id)}
                                >
                                    {editingMethodsLabId === lab.id ? "Done" : "Manage Methods"}
                                </Button>
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
        </div>
    );
}
