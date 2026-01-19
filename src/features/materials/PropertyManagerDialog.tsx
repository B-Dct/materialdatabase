import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import type { Material, MaterialProperty } from "@/types/domain";
import { useAppStore } from "@/lib/store";
import { Plus, Trash2 } from "lucide-react";
import { v4 as uuidv4 } from "uuid";

interface PropertyManagerDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    material: Material;
}

export function PropertyManagerDialog({ open, onOpenChange, material }: PropertyManagerDialogProps) {
    const { updateMaterial, properties, fetchProperties } = useAppStore();
    const [newProp, setNewProp] = useState<Partial<MaterialProperty>>({
        name: "",
        value: "",
        unit: "",
        method: "",
        specification: ""
    });

    // Helper to get definition for currently selected property
    const selectedDef = properties.find(p => p.name === newProp.name);

    useEffect(() => {
        if (open) {
            fetchProperties();
        }
    }, [open, fetchProperties]);

    const handlePropertySelect = (propName: string) => {
        // Find existing definition to auto-fill unit if available
        const def = properties.find(p => p.name === propName);
        setNewProp(prev => ({
            ...prev,
            name: propName,
            unit: def?.unit || prev.unit || "",
            method: "" // Reset method on property change
        }));
    };

    const handleAdd = () => {
        if (!newProp.name || !newProp.value) return;

        const property: MaterialProperty = {
            id: uuidv4(),
            name: newProp.name,
            value: newProp.value,
            unit: newProp.unit || "",
            method: newProp.method,
            specification: newProp.specification || ""
        };

        const updatedProperties = [...(material.properties || []), property];

        updateMaterial(material.id, { properties: updatedProperties });

        // Reset form
        setNewProp({
            name: "",
            value: "",
            unit: "",
            method: "",
            specification: ""
        });
    };

    const handleDelete = (id: string) => {
        const updatedProperties = (material.properties || []).filter(p => p.id !== id);
        updateMaterial(material.id, { properties: updatedProperties });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle>Manage Material Properties</DialogTitle>
                    <DialogDescription>
                        Assign properties defined in the global registry.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Add New Property Form */}
                    <div className="grid gap-4 p-4 border rounded-lg bg-muted/50">
                        <h4 className="font-medium text-sm">Add New Property</h4>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <Label htmlFor="prop-name" className="text-xs">Property Name</Label>
                                <Select
                                    value={newProp.name}
                                    onValueChange={handlePropertySelect}
                                >
                                    <SelectTrigger id="prop-name" className="h-9">
                                        <SelectValue placeholder="Select property..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {properties.length === 0 ? (
                                            <div className="p-2 text-xs text-muted-foreground text-center">No properties defined.</div>
                                        ) : (
                                            properties.map(p => (
                                                <SelectItem key={p.id} value={p.name}>
                                                    {p.name}
                                                </SelectItem>
                                            ))
                                        )}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Conditional Test Method Selection */}
                            {selectedDef?.testMethods && selectedDef.testMethods.length > 0 && (
                                <div className="space-y-1">
                                    <Label htmlFor="prop-method" className="text-xs">Test Method</Label>
                                    <Select
                                        value={newProp.method}
                                        onValueChange={(val) => setNewProp(prev => ({ ...prev, method: val }))}
                                    >
                                        <SelectTrigger id="prop-method" className="h-9">
                                            <SelectValue placeholder="Select method..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {selectedDef.testMethods.map((m, i) => (
                                                <SelectItem key={i} value={m}>
                                                    {m}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}

                            <div className="space-y-1">
                                <Label htmlFor="prop-value" className="text-xs">Value</Label>
                                {selectedDef?.options && selectedDef.options.length > 0 ? (
                                    <Select
                                        value={String(newProp.value)}
                                        onValueChange={val => setNewProp(prev => ({ ...prev, value: val }))}
                                    >
                                        <SelectTrigger id="prop-value" className="h-9">
                                            <SelectValue placeholder="Select value..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {selectedDef.options.map((opt, i) => (
                                                <SelectItem key={i} value={opt}>
                                                    {opt}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                ) : (
                                    <Input
                                        id="prop-value"
                                        className="h-9"
                                        placeholder="e.g. 1.45"
                                        value={newProp.value}
                                        onChange={e => setNewProp(prev => ({ ...prev, value: e.target.value }))}
                                    />
                                )}
                            </div>
                            <div className="space-y-1">
                                <Label htmlFor="prop-unit" className="text-xs">Unit</Label>
                                <Input
                                    id="prop-unit"
                                    className="h-9"
                                    placeholder="e.g. g/cm³"
                                    value={newProp.unit}
                                    onChange={e => setNewProp(prev => ({ ...prev, unit: e.target.value }))}
                                />
                            </div>
                            <div className="space-y-1">
                                <Label htmlFor="prop-spec" className="text-xs">Specification/Source</Label>
                                <Input
                                    id="prop-spec"
                                    className="h-9"
                                    placeholder="e.g. TDS v2"
                                    value={newProp.specification}
                                    onChange={e => setNewProp(prev => ({ ...prev, specification: e.target.value }))}
                                />
                            </div>
                        </div>
                        <Button size="sm" onClick={handleAdd} disabled={!newProp.name || !newProp.value}>
                            <Plus className="h-4 w-4 mr-2" /> Add Property
                        </Button>
                    </div>

                    {/* Existing Properties List */}
                    <div className="space-y-2">
                        <h4 className="font-medium text-sm">Defined Properties</h4>
                        {(!material.properties || material.properties.length === 0) && (
                            <div className="text-sm text-muted-foreground italic text-center py-4">
                                No properties defined yet.
                            </div>
                        )}
                        {material.properties?.map(prop => (
                            <div key={prop.id} className="flex items-center justify-between p-3 border rounded-md bg-white">
                                <div className="grid grid-cols-4 gap-4 flex-1">
                                    <div className="flex flex-col">
                                        <span className="font-medium text-sm">{prop.name}</span>
                                        {prop.method && <span className="text-[10px] text-muted-foreground">{prop.method}</span>}
                                    </div>
                                    <span className="text-sm">{prop.value} <span className="text-muted-foreground text-xs">{prop.unit}</span></span>
                                    <span className="text-xs text-muted-foreground col-span-2">{prop.specification}</span>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-destructive hover:text-destructive"
                                    onClick={() => handleDelete(prop.id)}
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        ))}
                    </div>
                </div>

                <DialogFooter>
                    <Button onClick={() => onOpenChange(false)}>Done</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
