import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAppStore } from "@/lib/store";
import type { RequirementRule } from "@/types/domain";
import { Trash2 } from "lucide-react";

interface RequirementRuleDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    initialRule?: RequirementRule; // If provided, we are editing
    propertyId: string; // The property being added (relevant if initialRule is undefined)
    onSave: (rule: RequirementRule) => void;
    onDelete?: () => void; // Only allowed if editing
}

export function RequirementRuleDialog({
    open,
    onOpenChange,
    initialRule,
    propertyId,
    onSave,
    onDelete
}: RequirementRuleDialogProps) {
    const { properties } = useAppStore();

    // Determine the active property definition
    // If editing, use rule's propId. If adding, use passed propertyId.
    const activePropId = initialRule?.propertyId || propertyId;
    const propDef = properties.find(p => p.id === activePropId);

    const [min, setMin] = useState<number | undefined>(initialRule?.min);
    const [max, setMax] = useState<number | undefined>(initialRule?.max);
    const [target, setTarget] = useState<string>(initialRule?.target?.toString() || "");
    const [unit, setUnit] = useState<string>(initialRule?.unit || "");
    const [method, setMethod] = useState<string>(initialRule?.method || "");

    // Reset/Init state when dialog opens or props change
    useEffect(() => {
        if (open && propDef) {
            if (initialRule) {
                // Editing
                setMin(initialRule.min);
                setMax(initialRule.max);
                setTarget(initialRule.target?.toString() || "");
                setUnit(initialRule.unit || propDef.unit || "");
                setMethod(initialRule.method || "");
            } else {
                // Adding new
                setMin(undefined);
                setMax(undefined);
                setTarget("");
                setUnit(propDef.unit || "");
                // Auto-select first method if available
                setMethod(propDef.testMethods?.[0] || "");
            }
        }
    }, [open, initialRule, propDef]);

    const handleSave = () => {
        if (!propDef) return;

        const newRule: RequirementRule = {
            propertyId: propDef.id,
            min,
            max,
            target: target || undefined,
            unit: unit || undefined,
            method: method || undefined
        };
        onSave(newRule);
        onOpenChange(false);
    };

    if (!propDef) return null;

    const availableMethods = propDef.testMethods || [];

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>{initialRule ? "Edit Requirement" : "Add Requirement"}</DialogTitle>
                    <DialogDescription>
                        {propDef.name} ({propDef.category})
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    {/* Test Method - NOW A SELECT */}
                    <div className="grid gap-2">
                        <Label>Test Method</Label>
                        {availableMethods.length > 0 ? (
                            <Select value={method} onValueChange={setMethod}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select Method..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {availableMethods.map(m => (
                                        <SelectItem key={m} value={m}>{m}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        ) : (
                            <div className="text-sm text-muted-foreground italic border p-2 rounded bg-muted/50">
                                No test methods defined for this property.
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label>Min</Label>
                            <Input
                                type="number"
                                value={min ?? ""}
                                onChange={e => setMin(e.target.value ? parseFloat(e.target.value) : undefined)}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label>Max</Label>
                            <Input
                                type="number"
                                value={max ?? ""}
                                onChange={e => setMax(e.target.value ? parseFloat(e.target.value) : undefined)}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label>Target</Label>
                            <Input
                                value={target}
                                onChange={e => setTarget(e.target.value)}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label>Unit</Label>
                            <Input
                                value={unit}
                                onChange={e => setUnit(e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                <DialogFooter className="flex justify-between sm:justify-between">
                    {initialRule && onDelete ? (
                        <Button variant="destructive" size="icon" onClick={() => { onDelete(); onOpenChange(false); }}>
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    ) : <div></div>}

                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                        <Button onClick={handleSave}>Save</Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
