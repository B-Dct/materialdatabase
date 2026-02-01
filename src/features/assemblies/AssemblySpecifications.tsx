import { useState, useEffect } from "react";
import { Plus, Trash2, FileText, Calendar, Download, Eye, ChevronRight, ChevronDown } from "lucide-react";
import { useAppStore } from "@/lib/store";
import type { Assembly, MaterialSpecification, MaterialProperty } from "@/types/domain";
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

import { AssemblyPropertyManagerDialog } from './AssemblyPropertyManagerDialog';
import { Check, X } from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { sortPropertiesByCategory } from "@/lib/propertyUtils";

interface AssemblySpecificationsProps {
    assembly: Assembly;
}

export function AssemblySpecifications({ assembly }: AssemblySpecificationsProps) {
    const { specifications, fetchSpecifications, addSpecification, deleteSpecification, updateAssembly, properties } = useAppStore();
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [manageSpecId, setManageSpecId] = useState<string | null>(null);
    const [expandedSpecs, setExpandedSpecs] = useState<Set<string>>(new Set());

    // Inline editing state
    const [addingToSpecId, setAddingToSpecId] = useState<string | null>(null);
    const [newInlineProp, setNewInlineProp] = useState<Partial<MaterialProperty>>({
        name: "",
        value: "",
        unit: "",
        method: "",
        specificationId: ""
    });

    const [newSpec, setNewSpec] = useState<Partial<MaterialSpecification>>({
        name: "",
        code: "",
        description: "",
        revision: "A",
        status: "Draft",
        validFrom: new Date().toISOString().split('T')[0]
    });

    // Fetch specifications when assembly changes
    useEffect(() => {
        if (assembly?.id) {
            fetchSpecifications(assembly.id, 'assembly');
        }
    }, [assembly?.id, fetchSpecifications]);

    const assemblySpecs = specifications.filter(s => s.assemblyId === assembly.id);

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
                assemblyId: assembly.id, // Linked to Assembly
                name: newSpec.name,
                code: newSpec.code,
                description: newSpec.description || "",
                revision: newSpec.revision || "A",
                status: (newSpec.status as any) || "Draft",
                validFrom: newSpec.validFrom || new Date().toISOString(),
                documentUrl: newSpec.documentUrl
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

    const handleDeleteSpecification = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (confirm("Are you sure you want to delete this specification?")) {
            await deleteSpecification(id);
        }
    };

    const handleDeleteProperty = async (propId: string) => {
        const updatedProperties = (assembly.properties || []).filter(p => p.id !== propId);
        await updateAssembly(assembly.id, { properties: updatedProperties });
    };

    const handleInlinePropSelect = (propName: string) => {
        const def = properties.find(p => p.name === propName);
        setNewInlineProp(prev => ({
            ...prev,
            name: propName,
            unit: def?.unit || prev.unit || "",
            method: ""
        }));
    };

    const handleInlineSave = async () => {
        if (!addingToSpecId || !newInlineProp.name) return;

        // Resolve specification name
        const specName = specifications.find(s => s.id === addingToSpecId)?.name || "";

        const property: MaterialProperty = {
            id: uuidv4(),
            name: newInlineProp.name || "",
            value: newInlineProp.value || "",
            unit: newInlineProp.unit || "",
            method: newInlineProp.method,
            specificationId: addingToSpecId,
            specification: specName, // Legacy persistence
            vMin: newInlineProp.vMin,
            vMax: newInlineProp.vMax,
            vMean: newInlineProp.vMean
        };

        const updatedProperties = [...(assembly.properties || []), property];

        try {
            await updateAssembly(assembly.id, { properties: updatedProperties });
            setNewInlineProp({
                name: "",
                value: "",
                unit: "",
                method: "",
                specificationId: ""
            });
            // Keep addingToSpecId
        } catch (error) {
            console.error("Failed to save inline property:", error);
        }
    };

    const cancelInlineAdd = () => {
        setAddingToSpecId(null);
        setNewInlineProp({});
    };


    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-medium">Assembly Specifications</h3>
                    <p className="text-sm text-muted-foreground">
                        Manage technical specifications and documents associated with this assembly.
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
                            {assemblySpecs.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">
                                        No specifications found. Add one to get started.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                assemblySpecs.map((spec) => {
                                    const isExpanded = expandedSpecs.has(spec.id);
                                    const specProperties = (assembly.properties || []).filter(p => p.specificationId === spec.id);
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
                                                            onClick={(e) => handleDeleteSpecification(spec.id, e)}
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
                                                                            <TableHead className="h-8">Value</TableHead>
                                                                            <TableHead className="h-8">Unit</TableHead>
                                                                            <TableHead className="h-8">Range/Stats</TableHead>
                                                                            <TableHead className="h-8 w-[80px]"></TableHead>
                                                                        </TableRow>
                                                                    </TableHeader>
                                                                    <TableBody>
                                                                        {specProperties.length === 0 && !isAdding ? (
                                                                            <TableRow>
                                                                                <TableCell colSpan={5} className="text-center h-16 text-muted-foreground text-sm">
                                                                                    No values defined for this specification.
                                                                                </TableCell>
                                                                            </TableRow>
                                                                        ) : (
                                                                            <>
                                                                                {specProperties.map(prop => (
                                                                                    <TableRow key={prop.id} className="hover:bg-muted/50">
                                                                                        <TableCell className="font-medium py-2">{prop.name}</TableCell>
                                                                                        <TableCell className="py-2">{prop.value}</TableCell>
                                                                                        <TableCell className="text-muted-foreground py-2">{prop.unit}</TableCell>
                                                                                        <TableCell className="text-muted-foreground text-xs py-2">
                                                                                            {(prop.vMin !== undefined || prop.vMax !== undefined) ?
                                                                                                `${prop.vMin ?? '*'} - ${prop.vMax ?? '*'} (Mean: ${prop.vMean ?? prop.value})` :
                                                                                                '-'
                                                                                            }
                                                                                        </TableCell>
                                                                                        <TableCell className="py-2 text-right">
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
                                                                                        </TableCell>
                                                                                    </TableRow>
                                                                                ))}

                                                                                {/* INLINE ADD ROW */}
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
            <AssemblyPropertyManagerDialog
                open={!!manageSpecId}
                onOpenChange={(open) => !open && setManageSpecId(null)}
                assembly={assembly}
                initialSpecificationId={manageSpecId || undefined}
            />
        </div>
    );
}
