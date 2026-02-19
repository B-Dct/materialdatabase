import { useState, useEffect } from "react";
import { Plus, Trash2, FileText, Calendar, Download, Eye, ChevronRight, ChevronDown, Pencil } from "lucide-react";
import { useAppStore } from "@/lib/store";
import type { Material, MaterialSpecification, MaterialProperty } from "@/types/domain";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
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
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";


import { PropertyManagerDialog } from './PropertyManagerDialog';
import { Check, X } from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
    SelectGroup,
    SelectLabel
} from "@/components/ui/select";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { sortPropertiesByCategory } from "@/lib/propertyUtils";


interface MaterialSpecificationsProps {
    material: Material;
}

export function MaterialSpecifications({ material }: MaterialSpecificationsProps) {
    const {
        specifications,
        fetchSpecifications,
        addSpecification,
        deleteSpecification,
        updateMaterial,
        properties,
        layups,
        fetchLayups,
        requirementProfiles,
        fetchRequirementProfiles
    } = useAppStore();

    const linkedProfileIds = specifications.map(s => s.requirementProfileId);
    console.log("DEBUG: Spec IDs:", linkedProfileIds);
    console.log("DEBUG: Profiles:", requirementProfiles.map(p => ({ id: p.id, archs: p.layupArchitectures?.length })));



    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [manageSpecId, setManageSpecId] = useState<string | null>(null);
    const [expandedSpecs, setExpandedSpecs] = useState<Set<string>>(new Set());

    // Inline editing state
    const [addingToSpecId, setAddingToSpecId] = useState<string | null>(null);
    const [editingPropId, setEditingPropId] = useState<string | null>(null);
    const [newInlineProp, setNewInlineProp] = useState<Partial<MaterialProperty>>({
        name: "",
        value: "",
        unit: "",
        method: "",
        specificationId: "",
        referenceLayupId: ""
    });

    const [newSpec, setNewSpec] = useState<Partial<MaterialSpecification>>({
        name: "",
        code: "",
        description: "",
        revision: "A",
        status: "Draft",
        validFrom: new Date().toISOString().split('T')[0]
    });

    // Fetch specifications and layups
    // Fetch specifications, layups, and profiles
    useEffect(() => {
        if (material?.id) {
            fetchSpecifications(material.id);
        }
        fetchLayups();
        fetchRequirementProfiles();
    }, [material?.id, fetchSpecifications, fetchLayups, fetchRequirementProfiles]);

    const materialSpecs = specifications.filter(s => s.materialId === material.id);

    const toggleSpecExpansion = (specId: string) => {
        const newSet = new Set(expandedSpecs);
        if (newSet.has(specId)) {
            newSet.delete(specId);
        } else {
            newSet.add(specId);
        }
        setExpandedSpecs(newSet);
    };

    const handleAddSpecification = async () => {
        if (!newSpec.name || !newSpec.code) return;

        try {
            await addSpecification({
                materialId: material.id,
                name: newSpec.name,
                code: newSpec.code,
                description: newSpec.description || "",
                revision: newSpec.revision || "A",
                status: (newSpec.status as any) || "Draft",
                validFrom: newSpec.validFrom || new Date().toISOString(),
                documentUrl: newSpec.documentUrl,
                requirementProfileId: newSpec.requirementProfileId
            });
            setIsAddDialogOpen(false);
            setNewSpec({
                name: "",
                code: "",
                description: "",
                revision: "A",
                status: "Draft",
                validFrom: new Date().toISOString().split('T')[0]
            });
        } catch (error) {
            console.error("Failed to add specification:", error);
        }
    };

    const [specToDelete, setSpecToDelete] = useState<string | null>(null);

    const handleDeleteClick = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setSpecToDelete(id);
    };

    const confirmDelete = async () => {
        if (!specToDelete) return;
        try {
            await deleteSpecification(specToDelete);
            toast.success("Specification deleted");
        } catch (error: any) {
            console.error("Failed to delete specification:", error);
            toast.error("Failed to delete specification: " + (error.message || "Unknown error"));
        } finally {
            setSpecToDelete(null);
        }
    };

    const handleDeleteProperty = async (propId: string) => {
        // ... (existing logic)

        const updatedProperties = (material.properties || []).filter(p => p.id !== propId);
        await updateMaterial(material.id, { properties: updatedProperties });
    };

    const handleInlinePropSelect = (propName: string) => {
        const def = properties.find(p => p.name === propName);
        const methods = def?.testMethods || [];

        setNewInlineProp(prev => ({
            ...prev,
            name: propName,
            unit: def?.unit || prev.unit || "",
            method: methods.length === 1 ? methods[0] : "" // Auto-select if only one
        }));
    };

    const handleInlineSave = async () => {
        if ((!addingToSpecId && !editingPropId) || !newInlineProp.name) return;

        // Validation: If property has defined methods, one must be selected
        const def = properties.find(p => p.name === newInlineProp.name);
        const definedMethods = def?.testMethods || [];
        if (definedMethods.length > 0 && !newInlineProp.method) {
            alert(`Please select a Test Method for ${newInlineProp.name}`);
            return;
        }

        // Resolve specification name
        const targetSpecId = addingToSpecId || (material.properties || []).find(p => p.id === editingPropId)?.specificationId;
        const specName = specifications.find(s => s.id === targetSpecId)?.name || "";

        // If editing, preserve ID, otherwise new UUID
        const propertyId = editingPropId || uuidv4();

        const property: MaterialProperty = {
            id: propertyId,
            name: newInlineProp.name || "",
            value: newInlineProp.value || "",
            unit: newInlineProp.unit || "",
            method: newInlineProp.method,
            specificationId: targetSpecId || "",
            referenceLayupId: newInlineProp.referenceLayupId || undefined,
            referenceArchitectureId: newInlineProp.referenceArchitectureId || undefined,
            specification: specName,
            vMin: newInlineProp.vMin,
            vMax: newInlineProp.vMax,
            vMean: newInlineProp.vMean
        };

        let updatedProperties;
        if (editingPropId) {
            updatedProperties = (material.properties || []).map(p => p.id === editingPropId ? property : p);
        } else {
            updatedProperties = [...(material.properties || []), property];
        }

        try {
            await updateMaterial(material.id, { properties: updatedProperties });

            // Reset
            setNewInlineProp({
                name: "",
                value: "",
                unit: "",
                method: "",
                specificationId: "",
                referenceLayupId: ""
            });
            setEditingPropId(null);
            if (editingPropId) setAddingToSpecId(null); // Just cleanup, though not strictly needed if we check editingPropId first
        } catch (error) {
            console.error("Failed to save inline property:", error);
        }
    };

    const cancelInlineAdd = () => {
        setAddingToSpecId(null);
        setEditingPropId(null);
        setNewInlineProp({});
    };

    const handleEditProperty = (prop: MaterialProperty) => {
        setEditingPropId(prop.id);
        setNewInlineProp({
            name: prop.name,
            value: prop.value,
            unit: prop.unit,
            method: prop.method,
            vMin: prop.vMin,
            vMax: prop.vMax,
            vMean: prop.vMean,
            specificationId: prop.specificationId,
            referenceLayupId: prop.referenceLayupId,
            referenceArchitectureId: prop.referenceArchitectureId
        });
        setAddingToSpecId(null); // Close add mode if open
    };


    return (
        <div className="space-y-6">

            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-medium">Material Specifications</h3>
                    <p className="text-sm text-muted-foreground">
                        Manage technical specifications and documents associated with this material.
                    </p>
                </div>
                <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="mr-2 h-4 w-4" /> Add Specification
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Add Specification</DialogTitle>
                            <DialogDescription>
                                Add a new technical specification document reference.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="code" className="text-right">Code</Label>
                                <Input
                                    id="code"
                                    value={newSpec.code}
                                    onChange={(e) => setNewSpec({ ...newSpec, code: e.target.value })}
                                    className="col-span-3"
                                    placeholder="e.g. BMS 8-124"
                                />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="name" className="text-right">Name</Label>
                                <Input
                                    id="name"
                                    value={newSpec.name}
                                    onChange={(e) => setNewSpec({ ...newSpec, name: e.target.value })}
                                    className="col-span-3"
                                    placeholder="Specification Title"
                                />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="revision" className="text-right">Rev</Label>
                                <Input
                                    id="revision"
                                    value={newSpec.revision}
                                    onChange={(e) => setNewSpec({ ...newSpec, revision: e.target.value })}
                                    className="col-span-3"
                                />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="description" className="text-right">Desc</Label>
                                <Textarea
                                    id="description"
                                    value={newSpec.description}
                                    onChange={(e) => setNewSpec({ ...newSpec, description: e.target.value })}
                                    className="col-span-3"
                                />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label className="text-right">Standard</Label>
                                <Select
                                    value={newSpec.requirementProfileId || "none"}
                                    onValueChange={(val) => setNewSpec({ ...newSpec, requirementProfileId: val === "none" ? undefined : val })}
                                >
                                    <SelectTrigger className="col-span-3">
                                        <SelectValue placeholder="Link to Standard (Optional)" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">None</SelectItem>
                                        {requirementProfiles.map(p => (
                                            <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <span tabIndex={0}>
                                            <Button
                                                onClick={handleAddSpecification}
                                                disabled={!newSpec.name || !newSpec.code}
                                            >
                                                Add Specification
                                            </Button>
                                        </span>
                                    </TooltipTrigger>
                                    {(!newSpec.name || !newSpec.code) && (
                                        <TooltipContent>
                                            <p>Code and Name are required</p>
                                        </TooltipContent>
                                    )}
                                </Tooltip>
                            </TooltipProvider>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Attached Specifications</CardTitle>
                    <CardDescription>Click on a specification row to view or edit its property values.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[30px]"></TableHead>
                                <TableHead>Specification</TableHead>
                                <TableHead>Revision</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {materialSpecs.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">
                                        No specifications found. Add one to get started.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                materialSpecs.map((spec) => {
                                    const isExpanded = expandedSpecs.has(spec.id);
                                    const specProperties = (material.properties || []).filter(p => p.specificationId === spec.id);
                                    const isAdding = addingToSpecId === spec.id;

                                    return (
                                        <>
                                            <TableRow
                                                key={spec.id}
                                                className="cursor-pointer hover:bg-muted/50 transition-colors"
                                                onClick={() => toggleSpecExpansion(spec.id)}
                                            >
                                                <TableCell>
                                                    {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex flex-col">
                                                        <span className="font-medium flex items-center gap-2">
                                                            <FileText className="h-4 w-4 text-blue-500" />
                                                            {spec.code}
                                                        </span>
                                                        <span className="text-xs text-muted-foreground ml-6">{spec.name}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="outline">{spec.revision}</Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant={spec.status === 'Active' ? 'default' : 'secondary'}>
                                                        {spec.status}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                        <Calendar className="h-3 w-3" />
                                                        {new Date(spec.validFrom || new Date()).toLocaleDateString()}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex justify-end gap-2" onClick={e => e.stopPropagation()}>
                                                        <Button variant="ghost" size="icon" disabled>
                                                            <Eye className="h-4 w-4" />
                                                        </Button>
                                                        <Button variant="ghost" size="icon" disabled>
                                                            <Download className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                                            onClick={(e) => handleDeleteClick(spec.id, e)}
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>

                                            {/* Expandable Content Row */}
                                            {isExpanded && (
                                                <TableRow className="bg-muted/30 hover:bg-muted/30">
                                                    <TableCell colSpan={6} className="p-0 border-b">
                                                        <div className="p-4 pl-12 space-y-4">
                                                            <div className="flex items-center justify-between">
                                                                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                                                                    Specification Values ({specProperties.length})
                                                                </h4>
                                                                {!isAdding && (
                                                                    <Button
                                                                        size="sm"
                                                                        variant="outline"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setAddingToSpecId(spec.id);
                                                                            setNewInlineProp({});
                                                                        }}
                                                                    >
                                                                        <Plus className="h-3 w-3 mr-2" /> Add Value
                                                                    </Button>
                                                                )}
                                                            </div>

                                                            <div className="rounded-md border bg-background">
                                                                <Table>
                                                                    <TableHeader>
                                                                        <TableRow className="hover:bg-transparent">
                                                                            <TableHead className="h-8">Property</TableHead>
                                                                            <TableHead className="h-8">Ref. Layup</TableHead>
                                                                            <TableHead className="h-8">Method</TableHead>
                                                                            <TableHead className="h-8">Value</TableHead>
                                                                            <TableHead className="h-8">Unit</TableHead>
                                                                            <TableHead className="h-8">Range/Stats</TableHead>
                                                                            <TableHead className="h-8 w-[80px]"></TableHead>
                                                                        </TableRow>
                                                                    </TableHeader>
                                                                    <TableBody>
                                                                        {specProperties.length === 0 && !isAdding ? (
                                                                            <TableRow>
                                                                                <TableCell colSpan={7} className="text-center h-16 text-muted-foreground text-sm">
                                                                                    No values defined for this specification.
                                                                                </TableCell>
                                                                            </TableRow>
                                                                        ) : (
                                                                            <>
                                                                                {[...specProperties]
                                                                                    .sort((a, b) => {
                                                                                        // 1. Base Material First (No Reference)
                                                                                        const isBaseA = !a.referenceLayupId && !a.referenceArchitectureId;
                                                                                        const isBaseB = !b.referenceLayupId && !b.referenceArchitectureId;
                                                                                        if (isBaseA && !isBaseB) return -1;
                                                                                        if (!isBaseA && isBaseB) return 1;

                                                                                        // 2. Sort by Category & Name
                                                                                        const defA = properties.find(p => p.name === a.name);
                                                                                        const defB = properties.find(p => p.name === b.name);

                                                                                        // Use category order if available (manual check vs imported list)
                                                                                        // Since we don't have the imported list here, we rely on Name simple sort 
                                                                                        // OR we can assume properties are somewhat ordered.
                                                                                        // Let's just sort by Name for secondary sort.
                                                                                        return (defA?.name || a.name).localeCompare(defB?.name || b.name);
                                                                                    })
                                                                                    .map(prop => {
                                                                                        if (editingPropId === prop.id) {
                                                                                            return (
                                                                                                <TableRow key={prop.id} className="bg-blue-50/50">
                                                                                                    <TableCell className="py-2 align-top">
                                                                                                        <Select
                                                                                                            value={newInlineProp.name}
                                                                                                            onValueChange={handleInlinePropSelect}
                                                                                                            disabled
                                                                                                        >
                                                                                                            <SelectTrigger className="h-8 w-full min-w-[140px]">
                                                                                                                <SelectValue placeholder="Property" />
                                                                                                            </SelectTrigger>
                                                                                                            <SelectContent>
                                                                                                                {sortPropertiesByCategory(properties, properties).map(p => (
                                                                                                                    <SelectItem key={p.id} value={p.name}>
                                                                                                                        {p.name}
                                                                                                                    </SelectItem>
                                                                                                                ))}
                                                                                                            </SelectContent>
                                                                                                        </Select>
                                                                                                    </TableCell>
                                                                                                    <TableCell className="py-2 align-top">
                                                                                                        <Select
                                                                                                            value={
                                                                                                                newInlineProp.referenceLayupId ||
                                                                                                                (newInlineProp.referenceArchitectureId ? `arch:${newInlineProp.referenceArchitectureId}` : "none")
                                                                                                            }
                                                                                                            onValueChange={(val) => {
                                                                                                                if (val === "none") {
                                                                                                                    setNewInlineProp(prev => ({ ...prev, referenceLayupId: "", referenceArchitectureId: undefined }));
                                                                                                                } else if (val.startsWith("arch:")) {
                                                                                                                    const archId = val.split(":")[1];
                                                                                                                    setNewInlineProp(prev => ({ ...prev, referenceLayupId: "", referenceArchitectureId: archId }));
                                                                                                                } else {
                                                                                                                    setNewInlineProp(prev => ({ ...prev, referenceLayupId: val, referenceArchitectureId: undefined }));
                                                                                                                }
                                                                                                            }}
                                                                                                        >
                                                                                                            <SelectTrigger className="h-8 w-full min-w-[100px]">
                                                                                                                <SelectValue placeholder="None" />
                                                                                                            </SelectTrigger>
                                                                                                            <SelectContent>
                                                                                                                <SelectItem value="none">None</SelectItem>
                                                                                                                {(() => {
                                                                                                                    // Get linked architectures if spec is linked
                                                                                                                    const linkedProfile = requirementProfiles.find(p => p.id === spec.requirementProfileId);
                                                                                                                    const architectures = linkedProfile?.layupArchitectures || [];

                                                                                                                    return (
                                                                                                                        <>
                                                                                                                            {architectures.length > 0 && (
                                                                                                                                <SelectGroup>
                                                                                                                                    <SelectLabel>From Standard ({linkedProfile?.name})</SelectLabel>
                                                                                                                                    {architectures.map(arch => (
                                                                                                                                        <SelectItem key={arch.id} value={`arch:${arch.id}`}>
                                                                                                                                            {arch.name} ({arch.layerCount}L)
                                                                                                                                        </SelectItem>
                                                                                                                                    ))}
                                                                                                                                </SelectGroup>
                                                                                                                            )}
                                                                                                                            <SelectGroup>
                                                                                                                                {architectures.length > 0 && <SelectLabel>Project Layups</SelectLabel>}
                                                                                                                                {layups
                                                                                                                                    .filter(l => l.isReference && l.materialId === material.id)
                                                                                                                                    .map(l => (
                                                                                                                                        <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                                                                                                                                    ))}
                                                                                                                            </SelectGroup>
                                                                                                                        </>
                                                                                                                    );
                                                                                                                })()}
                                                                                                            </SelectContent>
                                                                                                        </Select>
                                                                                                    </TableCell>
                                                                                                    <TableCell className="py-2 align-top">
                                                                                                        {(() => {
                                                                                                            const def = properties.find(p => p.name === newInlineProp.name);
                                                                                                            const methods = def?.testMethods || [];

                                                                                                            if (methods.length > 0) {
                                                                                                                return (
                                                                                                                    <Select
                                                                                                                        value={newInlineProp.method}
                                                                                                                        onValueChange={(val) => setNewInlineProp(prev => ({ ...prev, method: val }))}
                                                                                                                    >
                                                                                                                        <SelectTrigger className="h-8 w-full min-w-[100px]">
                                                                                                                            <SelectValue placeholder="Method" />
                                                                                                                        </SelectTrigger>
                                                                                                                        <SelectContent>
                                                                                                                            {methods.map(m => (
                                                                                                                                <SelectItem key={m} value={m}>{m}</SelectItem>
                                                                                                                            ))}
                                                                                                                        </SelectContent>
                                                                                                                    </Select>
                                                                                                                );
                                                                                                            } else {
                                                                                                                return (
                                                                                                                    <Input
                                                                                                                        className="h-8"
                                                                                                                        placeholder="Method"
                                                                                                                        value={newInlineProp.method || ""}
                                                                                                                        onChange={e => setNewInlineProp(prev => ({ ...prev, method: e.target.value }))}
                                                                                                                    />
                                                                                                                );
                                                                                                            }
                                                                                                        })()}
                                                                                                    </TableCell>
                                                                                                    <TableCell className="py-2 align-top">
                                                                                                        <Input
                                                                                                            className="h-8"
                                                                                                            placeholder="Value/Mean"
                                                                                                            value={newInlineProp.value}
                                                                                                            onChange={(e) => {
                                                                                                                const val = e.target.value;
                                                                                                                setNewInlineProp(prev => ({
                                                                                                                    ...prev,
                                                                                                                    value: val,
                                                                                                                    vMean: !isNaN(parseFloat(val)) ? parseFloat(val) : undefined
                                                                                                                }));
                                                                                                            }}
                                                                                                        />
                                                                                                    </TableCell>
                                                                                                    <TableCell className="py-2 align-top">
                                                                                                        <Input
                                                                                                            className="h-8 w-24"
                                                                                                            placeholder="Unit"
                                                                                                            value={newInlineProp.unit}
                                                                                                            onChange={(e) => setNewInlineProp(prev => ({ ...prev, unit: e.target.value }))}
                                                                                                        />
                                                                                                    </TableCell>
                                                                                                    <TableCell className="py-2 align-top">
                                                                                                        <div className="flex items-center gap-1">
                                                                                                            <Input
                                                                                                                className="h-8 w-16 px-1 text-center"
                                                                                                                placeholder="Min"
                                                                                                                type="number"
                                                                                                                value={newInlineProp.vMin ?? ''}
                                                                                                                onChange={(e) => setNewInlineProp(prev => ({ ...prev, vMin: e.target.value ? parseFloat(e.target.value) : undefined }))}
                                                                                                            />
                                                                                                            <span className="text-muted-foreground">-</span>
                                                                                                            <Input
                                                                                                                className="h-8 w-16 px-1 text-center"
                                                                                                                placeholder="Max"
                                                                                                                type="number"
                                                                                                                value={newInlineProp.vMax ?? ''}
                                                                                                                onChange={(e) => setNewInlineProp(prev => ({ ...prev, vMax: e.target.value ? parseFloat(e.target.value) : undefined }))}
                                                                                                            />
                                                                                                        </div>
                                                                                                    </TableCell>
                                                                                                    <TableCell className="py-2 text-right align-top">
                                                                                                        <div className="flex items-center justify-end gap-1">
                                                                                                            <Button
                                                                                                                size="icon"
                                                                                                                variant="default"
                                                                                                                className="h-8 w-8 bg-green-600 hover:bg-green-700 text-white"
                                                                                                                onClick={handleInlineSave}
                                                                                                                disabled={!newInlineProp.name}
                                                                                                            >
                                                                                                                <Check className="h-4 w-4" />
                                                                                                            </Button>
                                                                                                            <Button
                                                                                                                size="icon"
                                                                                                                variant="ghost"
                                                                                                                className="h-8 w-8"
                                                                                                                onClick={cancelInlineAdd}
                                                                                                            >
                                                                                                                <X className="h-4 w-4" />
                                                                                                            </Button>
                                                                                                        </div>
                                                                                                    </TableCell>
                                                                                                </TableRow>
                                                                                            );
                                                                                        }
                                                                                        return (
                                                                                            <TableRow key={prop.id} className="hover:bg-muted/50">
                                                                                                <TableCell className="font-medium py-2">{prop.name}</TableCell>
                                                                                                <TableCell className="text-muted-foreground py-2 text-xs">
                                                                                                    {prop.referenceArchitectureId
                                                                                                        ? ((() => {
                                                                                                            // Find linked profile and architecture
                                                                                                            const profile = requirementProfiles.find(p => p.id === spec.requirementProfileId);
                                                                                                            const arch = profile?.layupArchitectures?.find(a => a.id === prop.referenceArchitectureId);
                                                                                                            return arch ? `${arch.name} (Std)` : 'Unknown Arch';
                                                                                                        })())
                                                                                                        : (prop.referenceLayupId ? layups.find(l => l.id === prop.referenceLayupId)?.name : '-')
                                                                                                    }
                                                                                                </TableCell>
                                                                                                <TableCell className="text-muted-foreground py-2 text-xs">{prop.method || '-'}</TableCell>
                                                                                                <TableCell className="py-2">{prop.value}</TableCell>
                                                                                                <TableCell className="text-muted-foreground py-2">{prop.unit}</TableCell>
                                                                                                <TableCell className="text-muted-foreground text-xs py-2">
                                                                                                    {(prop.vMin !== undefined || prop.vMax !== undefined) ?
                                                                                                        `${prop.vMin ?? '*'} - ${prop.vMax ?? '*'} (Mean: ${prop.vMean ?? prop.value})` :
                                                                                                        '-'
                                                                                                    }
                                                                                                </TableCell>
                                                                                                <TableCell className="py-2 text-right">
                                                                                                    <div className="flex justify-end gap-1">
                                                                                                        <Button
                                                                                                            variant="ghost"
                                                                                                            size="icon"
                                                                                                            className="h-6 w-6 text-muted-foreground hover:text-primary"
                                                                                                            onClick={(e) => {
                                                                                                                e.stopPropagation();
                                                                                                                handleEditProperty(prop);
                                                                                                            }}
                                                                                                        >
                                                                                                            <Pencil className="h-3 w-3" />
                                                                                                        </Button>
                                                                                                        <Button
                                                                                                            variant="ghost"
                                                                                                            size="icon"
                                                                                                            className="h-6 w-6 text-destructive hover:bg-destructive/10"
                                                                                                            onClick={(e) => {
                                                                                                                e.stopPropagation();
                                                                                                                handleDeleteProperty(prop.id);
                                                                                                            }}
                                                                                                        >
                                                                                                            <Trash2 className="h-3 w-3" />
                                                                                                        </Button>
                                                                                                    </div>
                                                                                                </TableCell>
                                                                                            </TableRow>
                                                                                        );
                                                                                    })}

                                                                                {/* INLINE ROW */}
                                                                                {isAdding && (
                                                                                    <TableRow className="bg-blue-50/50">
                                                                                        <TableCell className="py-2 align-top">
                                                                                            <Select
                                                                                                value={newInlineProp.name}
                                                                                                onValueChange={handleInlinePropSelect}
                                                                                            >
                                                                                                <SelectTrigger className="h-8 w-full min-w-[140px]">
                                                                                                    <SelectValue placeholder="Property" />
                                                                                                </SelectTrigger>
                                                                                                <SelectContent>
                                                                                                    {sortPropertiesByCategory(properties, properties).map(p => (
                                                                                                        <SelectItem key={p.id} value={p.name}>
                                                                                                            {p.name}
                                                                                                        </SelectItem>
                                                                                                    ))}
                                                                                                </SelectContent>
                                                                                            </Select>
                                                                                        </TableCell>
                                                                                        <TableCell className="py-2 align-top">
                                                                                            <Select
                                                                                                value={newInlineProp.referenceLayupId || "none"}
                                                                                                onValueChange={(val) => {
                                                                                                    if (val === "none") {
                                                                                                        setNewInlineProp(prev => ({ ...prev, referenceLayupId: "", referenceArchitectureId: undefined }));
                                                                                                    } else if (val.startsWith("arch:")) {
                                                                                                        const archId = val.split(":")[1];
                                                                                                        setNewInlineProp(prev => ({ ...prev, referenceLayupId: "", referenceArchitectureId: archId }));
                                                                                                    } else {
                                                                                                        setNewInlineProp(prev => ({ ...prev, referenceLayupId: val, referenceArchitectureId: undefined }));
                                                                                                    }
                                                                                                }}
                                                                                            >
                                                                                                <SelectTrigger className="h-8 w-full min-w-[100px]">
                                                                                                    <SelectValue placeholder="None" />
                                                                                                </SelectTrigger>
                                                                                                <SelectContent>
                                                                                                    <SelectItem value="none">None</SelectItem>
                                                                                                    {(() => {
                                                                                                        const linkedProfile = requirementProfiles.find(p => p.id === spec.requirementProfileId);
                                                                                                        const architectures = linkedProfile?.layupArchitectures || [];

                                                                                                        return (
                                                                                                            <>
                                                                                                                {architectures.length > 0 && (
                                                                                                                    <SelectGroup>
                                                                                                                        <SelectLabel>From Standard ({linkedProfile?.name})</SelectLabel>
                                                                                                                        {architectures.map(arch => (
                                                                                                                            <SelectItem key={arch.id} value={`arch:${arch.id}`}>
                                                                                                                                {arch.name} ({arch.layerCount}L)
                                                                                                                            </SelectItem>
                                                                                                                        ))}
                                                                                                                    </SelectGroup>
                                                                                                                )}
                                                                                                                <SelectGroup>
                                                                                                                    {architectures.length > 0 && <SelectLabel>Project Layups</SelectLabel>}
                                                                                                                    {layups
                                                                                                                        .filter(l => l.isReference && l.materialId === material.id)
                                                                                                                        .map(l => (
                                                                                                                            <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                                                                                                                        ))}
                                                                                                                </SelectGroup>
                                                                                                            </>
                                                                                                        );
                                                                                                    })()}
                                                                                                </SelectContent>
                                                                                            </Select>
                                                                                        </TableCell>
                                                                                        <TableCell className="py-2 align-top">

                                                                                            {(() => {
                                                                                                const def = properties.find(p => p.name === newInlineProp.name);
                                                                                                const methods = def?.testMethods || [];

                                                                                                if (methods.length > 0) {
                                                                                                    return (
                                                                                                        <Select
                                                                                                            value={newInlineProp.method}
                                                                                                            onValueChange={(val) => setNewInlineProp(prev => ({ ...prev, method: val }))}
                                                                                                        >
                                                                                                            <SelectTrigger className="h-8 w-full min-w-[100px]">
                                                                                                                <SelectValue placeholder="Method" />
                                                                                                            </SelectTrigger>
                                                                                                            <SelectContent>
                                                                                                                {methods.map(m => (
                                                                                                                    <SelectItem key={m} value={m}>{m}</SelectItem>
                                                                                                                ))}
                                                                                                            </SelectContent>
                                                                                                        </Select>
                                                                                                    );
                                                                                                } else {
                                                                                                    return (
                                                                                                        <Input
                                                                                                            className="h-8"
                                                                                                            placeholder="Method"
                                                                                                            value={newInlineProp.method || ""}
                                                                                                            onChange={e => setNewInlineProp(prev => ({ ...prev, method: e.target.value }))}
                                                                                                        />
                                                                                                    );
                                                                                                }
                                                                                            })()}
                                                                                        </TableCell>
                                                                                        <TableCell className="py-2 align-top">
                                                                                            <Input
                                                                                                className="h-8"
                                                                                                placeholder="Value/Mean"
                                                                                                value={newInlineProp.value}
                                                                                                onChange={(e) => {
                                                                                                    const val = e.target.value;
                                                                                                    setNewInlineProp(prev => ({
                                                                                                        ...prev,
                                                                                                        value: val,
                                                                                                        vMean: !isNaN(parseFloat(val)) ? parseFloat(val) : undefined
                                                                                                    }));
                                                                                                }}
                                                                                            />
                                                                                        </TableCell>
                                                                                        <TableCell className="py-2 align-top">
                                                                                            <Input
                                                                                                className="h-8 w-20"
                                                                                                placeholder="Unit"
                                                                                                value={newInlineProp.unit}
                                                                                                onChange={(e) => setNewInlineProp(prev => ({ ...prev, unit: e.target.value }))}
                                                                                            />
                                                                                        </TableCell>
                                                                                        <TableCell className="py-2 align-top">
                                                                                            <div className="flex items-center gap-1">
                                                                                                <Input
                                                                                                    className="h-8 w-16 px-1 text-center"
                                                                                                    placeholder="Min"
                                                                                                    type="number"
                                                                                                    value={newInlineProp.vMin ?? ''}
                                                                                                    onChange={(e) => setNewInlineProp(prev => ({ ...prev, vMin: e.target.value ? parseFloat(e.target.value) : undefined }))}
                                                                                                />
                                                                                                <span className="text-muted-foreground">-</span>
                                                                                                <Input
                                                                                                    className="h-8 w-16 px-1 text-center"
                                                                                                    placeholder="Max"
                                                                                                    type="number"
                                                                                                    value={newInlineProp.vMax ?? ''}
                                                                                                    onChange={(e) => setNewInlineProp(prev => ({ ...prev, vMax: e.target.value ? parseFloat(e.target.value) : undefined }))}
                                                                                                />
                                                                                            </div>
                                                                                        </TableCell>
                                                                                        <TableCell className="py-2 text-right align-top">
                                                                                            <div className="flex items-center justify-end gap-1">
                                                                                                <Button
                                                                                                    size="icon"
                                                                                                    variant="default"
                                                                                                    className="h-8 w-8 bg-green-600 hover:bg-green-700 text-white"
                                                                                                    onClick={handleInlineSave}
                                                                                                    disabled={!newInlineProp.name}
                                                                                                >
                                                                                                    <Check className="h-4 w-4" />
                                                                                                </Button>
                                                                                                <Button
                                                                                                    size="icon"
                                                                                                    variant="ghost"
                                                                                                    className="h-8 w-8"
                                                                                                    onClick={cancelInlineAdd}
                                                                                                >
                                                                                                    <X className="h-4 w-4" />
                                                                                                </Button>
                                                                                            </div>
                                                                                        </TableCell>
                                                                                    </TableRow>
                                                                                )}
                                                                            </>
                                                                        )}
                                                                    </TableBody>
                                                                </Table>
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Property Manager Dialog for Specific Specification */}
            <PropertyManagerDialog
                open={!!manageSpecId}
                onOpenChange={(open) => !open && setManageSpecId(null)}
                material={material}
                initialSpecificationId={manageSpecId || undefined}
            />

            <AlertDialog open={!!specToDelete} onOpenChange={(open) => !open && setSpecToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the specification
                            referencing code <strong>{specifications.find(s => s.id === specToDelete)?.code}</strong>.
                            Linked property values will remain but lose their specification reference.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
