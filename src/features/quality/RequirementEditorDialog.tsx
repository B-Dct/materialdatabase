import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAppStore } from "@/lib/store";
import { Plus, Trash2, FileText } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import type { RequirementRule, RequirementProfile, MaterialDocument } from "@/types/domain";

interface RequirementProfileDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    initialData?: RequirementProfile | null; // If null, create mode
    onSave: (profile: Partial<RequirementProfile>) => Promise<void>;
}

export function RequirementProfileDialog({ open, onOpenChange, initialData, onSave }: RequirementProfileDialogProps) {
    const { properties, fetchProperties, materialTypes, fetchMaterialTypes } = useAppStore();

    // Form State
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [applicability, setApplicability] = useState<string[]>([]);
    const [rules, setRules] = useState<RequirementRule[]>([]);
    const [document, setDocument] = useState<MaterialDocument | undefined>(undefined);

    const [selectedPropId, setSelectedPropId] = useState<string>("");

    // Ensure properties loaded
    useEffect(() => {
        if (properties.length === 0) fetchProperties();
        fetchMaterialTypes();
    }, [fetchProperties, properties.length, fetchMaterialTypes]);

    // Update local state when initialData changes
    useEffect(() => {
        if (initialData) {
            setName(initialData.name);
            setDescription(initialData.description);
            setApplicability(initialData.applicability || []);
            setRules(initialData.rules);
            setDocument(initialData.document);
        } else {
            // Create mode: reset
            setName("");
            setDescription("");
            setApplicability([]);
            setRules([]);
            setDocument(undefined);
        }
    }, [initialData, open]);

    const handleAddRule = () => {
        if (!selectedPropId) return;
        const propDef = properties.find(p => p.id === selectedPropId);
        if (!propDef) return;

        if (rules.some(r => r.propertyId === selectedPropId)) {
            alert("This property is already added.");
            return;
        }

        const defaultMethod = propDef.testMethods && propDef.testMethods.length > 0
            ? propDef.testMethods[0]
            : "";

        const newRule: RequirementRule = {
            propertyId: selectedPropId,
            unit: propDef.unit,
            target: "",
            min: undefined,
            max: undefined,
            method: defaultMethod
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
        if (!name) return;
        await onSave({
            ...(initialData || {}),
            name,
            description,
            applicability,
            rules,
            document
        });
        onOpenChange(false);
    };

    // Filter available properties (exclude already added)
    const availableProperties = properties.filter(p => !rules.some(r => r.propertyId === p.id));

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>{initialData ? "Edit Requirement Profile" : "Create Requirement Profile"}</DialogTitle>
                    <DialogDescription>
                        Define metadata, applicability, and rules for this standard.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-auto py-4 space-y-6">
                    {/* Metadata Section */}
                    <div className="grid grid-cols-2 gap-4 border-b pb-4">
                        <div className="space-y-2">
                            <Label>Profile Name</Label>
                            <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. ISO 527-4" />
                        </div>
                        <div className="space-y-2">
                            <Label>Description</Label>
                            <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="Short description..." />
                        </div>

                        <div className="col-span-2 space-y-3">
                            <Label>Applicability</Label>
                            <div className="border rounded-md p-4 space-y-4">
                                {/* Contexts */}
                                <div className="space-y-2">
                                    <h4 className="text-xs font-semibold text-muted-foreground uppercase">Context</h4>
                                    <div className="flex items-center space-x-2">
                                        <Checkbox
                                            id="edit-app-layup"
                                            checked={applicability.includes('layup')}
                                            onCheckedChange={(checked) => {
                                                if (checked) setApplicability([...applicability, 'layup']);
                                                else setApplicability(applicability.filter(t => t !== 'layup'));
                                            }}
                                        />
                                        <Label htmlFor="edit-app-layup" className="font-normal">Layup Projects</Label>
                                    </div>
                                </div>

                                {/* Materials */}
                                <div className="space-y-2">
                                    <h4 className="text-xs font-semibold text-muted-foreground uppercase">Material Types</h4>
                                    <div className="grid grid-cols-2 gap-2">
                                        {materialTypes.map(type => (
                                            <div key={type} className="flex items-center space-x-2">
                                                <Checkbox
                                                    id={`edit-app-mat-${type}`}
                                                    checked={applicability.includes(`material:${type}`)}
                                                    onCheckedChange={(checked) => {
                                                        const tag = `material:${type}`;
                                                        if (checked) setApplicability([...applicability, tag]);
                                                        else setApplicability(applicability.filter(t => t !== tag));
                                                    }}
                                                />
                                                <Label htmlFor={`edit-app-mat-${type}`} className="font-normal">{type}</Label>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* PDF Attachment Section */}
                    <div className="border-b pb-4 space-y-3">
                        <Label>Specification Document (PDF)</Label>
                        <div className="flex items-center gap-4 border rounded-md p-3 bg-muted/10">
                            {initialData?.document ? (
                                <div className="flex items-center gap-3 flex-1 overflow-hidden">
                                    <div className="bg-red-100 p-2 rounded text-red-600 shrink-0">
                                        <FileText className="h-5 w-5" />
                                    </div>
                                    <div className="grid gap-0.5 truncate">
                                        <span className="text-sm font-medium truncate">{initialData.document.name}</span>
                                        <span className="text-xs text-muted-foreground">{new Date(initialData.document.uploadedAt).toLocaleDateString()}</span>
                                    </div>
                                    <Button variant="ghost" size="icon" className="ml-auto text-destructive" onClick={() => {
                                        // Remove document logic -> pass null/undefined to onSave?
                                        // We need local state for document?
                                        // Currently using initialData directly in UI for this view, need local state.
                                    }}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            ) : (
                                <div className="w-full">
                                    <Input
                                        type="file"
                                        accept="application/pdf"
                                        onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) {
                                                // Create MaterialDocument object
                                                const doc: any = { // Type cast to avoid import usage if strict
                                                    id: Math.random().toString(36).substring(7),
                                                    name: file.name,
                                                    category: 'Specification',
                                                    url: URL.createObjectURL(file),
                                                    uploadedAt: new Date().toISOString()
                                                };
                                                // We need to store this in local state to save it later
                                                setDocument(doc);
                                            }
                                        }}
                                    />
                                </div>
                            )}
                        </div>
                    </div>
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
