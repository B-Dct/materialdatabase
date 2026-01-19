import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAppStore } from "@/lib/store";
import type { RequirementRule } from "@/types/domain";
import { Plus, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface RequirementEditorDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    // profileId removed as unused
    initialRules: RequirementRule[];
    onSave: (rules: RequirementRule[]) => Promise<void>;
}

export function RequirementEditorDialog({ open, onOpenChange, initialRules, onSave }: RequirementEditorDialogProps) {
    const { properties, fetchProperties } = useAppStore();

    // rules state

    const [rules, setRules] = useState<RequirementRule[]>(initialRules);
    const [selectedPropId, setSelectedPropId] = useState<string>("");

    // Ensure properties loaded
    useEffect(() => {
        if (properties.length === 0) fetchProperties();
    }, [fetchProperties, properties.length]);

    // Update local state when prop changes
    useEffect(() => {
        setRules(initialRules);
    }, [initialRules]);

    const handleAddRule = () => {
        if (!selectedPropId) return;
        const propDef = properties.find(p => p.id === selectedPropId);
        if (!propDef) return;

        // Check if already exists
        if (rules.some(r => r.propertyId === selectedPropId)) {
            alert("This property is already added.");
            return;
        }

        // Auto-fill logic
        const defaultMethod = propDef.testMethods && propDef.testMethods.length > 0
            ? propDef.testMethods[0]
            : "";

        const newRule: RequirementRule = {
            propertyId: selectedPropId,
            unit: propDef.unit,
            target: "", // Default empty
            min: undefined,
            max: undefined,
            method: defaultMethod // Auto-filled from property definition
        };

        setRules([...rules, newRule]);
        setSelectedPropId("");
    };

    const handleRemoveRule = (index: number) => {
        const newRules = [...rules];
        newRules.splice(index, 1);
        setRules(newRules);
    };

    const handleUpdateRule = (index: number, field: keyof RequirementRule, value: any) => {
        const newRules = [...rules];
        newRules[index] = { ...newRules[index], [field]: value };
        setRules(newRules);
    };

    const handleSave = async () => {
        await onSave(rules);
        onOpenChange(false);
    };

    // Filter available properties (exclude already added)
    const availableProperties = properties.filter(p => !rules.some(r => r.propertyId === p.id));

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Mange Requirements</DialogTitle>
                    <DialogDescription>
                        Define the properties and target values for this standard.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-auto py-4 space-y-6">
                    {/* Add New Section */}
                    <div className="flex gap-4 items-end border-b pb-4">
                        <div className="flex-1 space-y-2">
                            <Label>Add Property</Label>
                            <Select value={selectedPropId} onValueChange={setSelectedPropId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a property definition..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {availableProperties.map(p => (
                                        <SelectItem key={p.id} value={p.id}>
                                            {p.name} ({p.unit})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <Button onClick={handleAddRule} disabled={!selectedPropId}>
                            <Plus className="h-4 w-4 mr-2" /> Add
                        </Button>
                    </div>

                    {/* Rules List */}
                    <div className="space-y-4">
                        {rules.map((rule, index) => {
                            const propDef = properties.find(p => p.id === rule.propertyId);
                            if (!propDef) return null;

                            return (
                                <Card key={rule.propertyId}>
                                    <CardContent className="p-4 grid grid-cols-12 gap-4 items-center">
                                        <div className="col-span-3">
                                            <div className="font-medium text-sm">{propDef.name}</div>
                                            <div className="text-xs text-muted-foreground">{propDef.category}</div>
                                        </div>

                                        {/* Inputs */}
                                        <div className="col-span-8 grid grid-cols-4 gap-2">
                                            <div className="space-y-1">
                                                <Label className="text-[10px] text-muted-foreground">Min</Label>
                                                <Input
                                                    type="number"
                                                    className="h-8 text-xs"
                                                    value={rule.min ?? ""}
                                                    onChange={e => handleUpdateRule(index, 'min', e.target.value ? parseFloat(e.target.value) : undefined)}
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <Label className="text-[10px] text-muted-foreground">Target</Label>
                                                <Input
                                                    className="h-8 text-xs"
                                                    value={rule.target ?? ""}
                                                    onChange={e => handleUpdateRule(index, 'target', e.target.value)}
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <Label className="text-[10px] text-muted-foreground">Max</Label>
                                                <Input
                                                    type="number"
                                                    className="h-8 text-xs"
                                                    value={rule.max ?? ""}
                                                    onChange={e => handleUpdateRule(index, 'max', e.target.value ? parseFloat(e.target.value) : undefined)}
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <Label className="text-[10px] text-muted-foreground">Unit</Label>
                                                <Input
                                                    className="h-8 text-xs"
                                                    value={rule.unit || propDef.unit}
                                                    onChange={e => handleUpdateRule(index, 'unit', e.target.value)}
                                                />
                                            </div>
                                            {/* Method Row - Optional if we want it compact, or separate line? 
                                                User wants "Test Method" too. Let's squeeze it or make this 2 rows.
                                                Let's make it 2 rows.
                                             */}
                                        </div>

                                        <div className="col-span-1 flex justify-end">
                                            <Button variant="ghost" size="icon" onClick={() => handleRemoveRule(index)}>
                                                <Trash2 className="h-4 w-4 text-destructive" />
                                            </Button>
                                        </div>

                                        {/* Row 2: Method & Notes? */}
                                        <div className="col-span-3"></div>
                                        <div className="col-span-8">
                                            <div className="flex gap-2 items-center">
                                                <Label className="text-[10px] text-muted-foreground w-12 shrink-0">Method:</Label>
                                                <Input
                                                    placeholder="Test Method (e.g. ISO 527)"
                                                    className="h-7 text-xs flex-1"
                                                    value={rule.method ?? ""}
                                                    onChange={e => handleUpdateRule(index, 'method', e.target.value)}
                                                />
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                        {rules.length === 0 && (
                            <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
                                No requirements defined. Add a property above.
                            </div>
                        )}
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={handleSave}>Save Requirements</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
