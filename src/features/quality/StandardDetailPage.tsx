
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAppStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
    ArrowLeft,
    Save,
    Plus,
    Trash2,
    Settings,
    ShieldCheck,
    Pencil,
    ListChecks
} from "lucide-react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import type {
    ReferenceLayupArchitecture,
    RequirementRule
} from "@/types/domain";

export function StandardDetailPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const {
        requirementProfiles,
        fetchRequirementProfiles,
        addRequirementProfile,
        updateRequirementProfile,
        materialTypes,
        fetchMaterialTypes,
        properties,
        fetchProperties,
        processes,
        fetchProcesses,
        materials,
        fetchMaterials
    } = useAppStore();

    const isNew = !id || id === 'new';

    // Edit Mode State
    const [isEditing, setIsEditing] = useState(isNew);

    // Local State
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [applicability, setApplicability] = useState<string[]>([]);
    const [layupArchitectures, setLayupArchitectures] = useState<ReferenceLayupArchitecture[]>([]);
    const [rules, setRules] = useState<RequirementRule[]>([]);

    // Computed State
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

    // Initial Data Load
    useEffect(() => {
        if (requirementProfiles.length === 0) fetchRequirementProfiles();
        if (materialTypes.length === 0) fetchMaterialTypes();
        if (properties.length === 0) fetchProperties();
        if (processes.length === 0) fetchProcesses();
        if (materials.length === 0) fetchMaterials();
    }, []);

    // Load Profile Data
    useEffect(() => {
        if (!isNew && requirementProfiles.length > 0) {
            const profile = requirementProfiles.find(p => p.id === id);
            if (profile) {
                setName(profile.name);
                setDescription(profile.description);
                setApplicability(profile.applicability || []);
                setLayupArchitectures(profile.layupArchitectures || []);
                setRules(profile.rules || []);
                setIsEditing(false); // Default to read-only for existing
            }
        }
    }, [id, requirementProfiles, isNew]);

    const handleSave = async () => {
        try {
            const profileData = {
                name,
                description,
                applicability,
                layupArchitectures,
                rules
            };

            if (isNew) {
                await addRequirementProfile(profileData);
                toast.success("Standard created successfully");
                navigate('/standards');
            } else {
                await updateRequirementProfile(id!, profileData);
                toast.success("Standard updated successfully");
                setIsEditing(false); // Return to read-only after save
            }
            setHasUnsavedChanges(false);
        } catch (error) {
            console.error("Failed to save standard:", error);
            toast.error("Failed to save standard");
        }
    };

    // Architecture Dialog State
    const [isArchDialogOpen, setIsArchDialogOpen] = useState(false);
    const [currentArch, setCurrentArch] = useState<Partial<ReferenceLayupArchitecture>>({});
    const [editingArchIndex, setEditingArchIndex] = useState<number | null>(null);

    // Handlers
    const openAddArch = () => {
        setCurrentArch({
            name: "",
            description: "",
            layerCount: 0,
            thickness: 0,
            processId: ""
        });
        setEditingArchIndex(null);
        setIsArchDialogOpen(true);
    };

    const openEditArch = (arch: ReferenceLayupArchitecture, index: number) => {
        setCurrentArch({ ...arch });
        setEditingArchIndex(index);
        setIsArchDialogOpen(true);
    };

    const saveArchitecture = () => {
        if (!currentArch.name) return; // Validation

        const newArch = currentArch as ReferenceLayupArchitecture;
        // Generate a temp ID if not present
        if (!newArch.id) newArch.id = crypto.randomUUID();

        const newArchitectures = [...layupArchitectures];
        if (editingArchIndex !== null) {
            newArchitectures[editingArchIndex] = newArch;
        } else {
            newArchitectures.push(newArch);
        }

        setLayupArchitectures(newArchitectures);
        setHasUnsavedChanges(true);
        setIsArchDialogOpen(false);
    };

    const handleRemoveArchitecture = (index: number) => {
        if (window.confirm("Are you sure you want to delete this Reference Layup Architecture and all its defined properties?")) {
            const newArchitectures = [...layupArchitectures];
            const removedArchId = newArchitectures[index].id;
            newArchitectures.splice(index, 1);
            setLayupArchitectures(newArchitectures);

            // Also clean up any rules associated with this architecture
            if (removedArchId) {
                const newRules = rules.filter(r => r.referenceArchitectureId !== removedArchId);
                if (newRules.length !== rules.length) {
                    setRules(newRules);
                }
            }
            setHasUnsavedChanges(true);
        }
    };

    const handleUpdateRule = (index: number, updatedRule: RequirementRule) => {
        const newRules = [...rules];
        newRules[index] = updatedRule;
        setRules(newRules);
        setHasUnsavedChanges(true);
    };

    const handleRemoveRule = (index: number) => {
        const newRules = [...rules];
        newRules.splice(index, 1);
        setRules(newRules);
        setHasUnsavedChanges(true);
    };

    return (
        <div className="flex flex-col h-full bg-background animate-in fade-in">
            {/* Header */}
            <div className="border-b px-6 py-4 flex items-center justify-between bg-card text-card-foreground shadow-sm">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => navigate('/standards')}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">
                            {isNew ? "Create New Standard" : name || "Edit Standard"}
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            {isNew ? "Define a new requirement profile" : "Manage requirements and architectures"}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {!isNew && !isEditing && (
                        <Button onClick={() => setIsEditing(true)} variant="secondary">
                            <Pencil className="h-4 w-4 mr-2" /> Edit Details
                        </Button>
                    )}
                    {isEditing && !isNew && (
                        <Button variant="ghost" onClick={() => {
                            // Reset changes (reload from store or just toggle off if no changes? simpler to just reload)
                            // For now just toggle off, assuming user navigates away or undoes manually if needed. 
                            // Ideally reload. 
                            setIsEditing(false);
                        }}>
                            Cancel
                        </Button>
                    )}

                    {isEditing && !isNew && (
                        <Button variant="destructive" size="icon" onClick={async () => {
                            if (confirm("Are you sure you want to delete this standard? This action cannot be undone.")) {
                                try {
                                    const { deleteRequirementProfile } = useAppStore.getState();
                                    await deleteRequirementProfile(id!);
                                    toast.success("Standard deleted successfully");
                                    navigate('/standards');
                                } catch (e: any) {
                                    toast.error(e.message || "Failed to delete standard");
                                }
                            }
                        }}>
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    )}
                    {isEditing && (
                        <Button onClick={handleSave} disabled={!hasUnsavedChanges && !isNew}>
                            <Save className="h-4 w-4 mr-2" />
                            Save Standard
                        </Button>
                    )}
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden">
                <Tabs defaultValue="overview" className="h-full flex flex-col">
                    <div className="px-4 border-b shrink-0 bg-muted/20">
                        <TabsList className="bg-transparent h-12 w-full justify-start gap-6">
                            <TabsTrigger value="overview" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full px-0">
                                <Settings className="h-4 w-4 mr-2" /> Overview & Applicability
                            </TabsTrigger>
                            <TabsTrigger value="properties" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full px-0">
                                <ShieldCheck className="h-4 w-4 mr-2" /> Properties
                            </TabsTrigger>
                            <TabsTrigger value="qml" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full px-0">
                                <ListChecks className="h-4 w-4 mr-2" /> Qualified Materials List (QML)
                            </TabsTrigger>
                        </TabsList>
                    </div>

                    <div className="flex-1 overflow-auto p-6 bg-slate-50/50 dark:bg-slate-900/20">

                        {/* OVERVIEW TAB */}
                        <TabsContent value="overview" className="max-w-4xl space-y-6 mt-0">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Basic Information</CardTitle>
                                    <CardDescription>
                                        General details about this standard.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="name">Standard Name / Designation</Label>
                                        {isEditing ? (
                                            <Input
                                                id="name"
                                                value={name}
                                                onChange={(e) => { setName(e.target.value); setHasUnsavedChanges(true); }}
                                                placeholder="e.g. ISO 527-4 or AIMS 05-00-000"
                                            />
                                        ) : (
                                            <div className="p-2 bg-muted/50 rounded-md text-sm border">{name}</div>
                                        )}
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="description">Description</Label>
                                        {isEditing ? (
                                            <Textarea
                                                id="description"
                                                value={description}
                                                onChange={(e) => { setDescription(e.target.value); setHasUnsavedChanges(true); }}
                                                placeholder="Brief description of the standard's scope..."
                                            />
                                        ) : (
                                            <div className="py-2 text-sm min-h-[60px] whitespace-pre-wrap">{description || "No description provided."}</div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle>Applicability</CardTitle>
                                    <CardDescription>
                                        Define where this standard can be applied.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="space-y-2">
                                        <Label>Material Category</Label>
                                        <div className="flex flex-wrap gap-2">
                                            {isEditing ? (
                                                materialTypes.map(type => (
                                                    <Button
                                                        key={type.name}
                                                        variant={applicability.includes(`material:${type.name}`) ? "default" : "outline"}
                                                        size="sm"
                                                        onClick={() => {
                                                            const key = `material:${type.name}`;
                                                            setApplicability([key]); // Single select as requested
                                                            setHasUnsavedChanges(true);
                                                        }}
                                                    >
                                                        {type.name}
                                                    </Button>
                                                ))
                                            ) : (
                                                materialTypes
                                                    .filter(type => applicability.includes(`material:${type.name}`))
                                                    .map(type => (
                                                        <div key={type.name} className="px-3 py-1 bg-primary text-primary-foreground text-sm rounded-md font-medium">
                                                            {type.name}
                                                        </div>
                                                    ))
                                            )}
                                            {!isEditing && applicability.filter(a => a.startsWith('material:')).length === 0 && (
                                                <span className="text-sm text-muted-foreground">No category assigned.</span>
                                            )}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        {/* PROPERTIES & ARCHITECTURES TAB */}
                        <TabsContent value="properties" className="max-w-6xl space-y-8 mt-0">

                            {/* Section 1: Basic Material Properties */}
                            <div className="space-y-4">
                                <div className="flex justify-between items-center border-b pb-2">
                                    <div>
                                        <h3 className="text-lg font-medium">Basic Material Properties</h3>
                                        <p className="text-sm text-muted-foreground">
                                            Requirements for the raw material (unprocessed) or base material properties.
                                        </p>
                                    </div>
                                    {isEditing && (
                                        <Button size="sm" variant="outline" onClick={() => {
                                            setRules([...rules, { propertyId: "", scope: "material" }]);
                                            setHasUnsavedChanges(true);
                                        }}>
                                            <Plus className="h-4 w-4 mr-2" /> Add Material Rule
                                        </Button>
                                    )}
                                </div>

                                <RulesTable
                                    allRules={rules}
                                    properties={properties}
                                    onChangeRule={handleUpdateRule}
                                    onRemoveRule={handleRemoveRule}
                                    filterScope="material"
                                    isEditing={isEditing}
                                />
                            </div>

                            {/* Add Reference Layup Button Row */}
                            <div className="flex justify-between items-center bg-muted/30 p-4 rounded-md border border-dashed">
                                <div>
                                    <h3 className="font-medium text-foreground">Reference Layup Architectures</h3>
                                    <p className="text-sm text-muted-foreground">
                                        Define properties specific to normalized stackups (e.g. Type 1, Type 2).
                                    </p>
                                </div>
                                {isEditing && (
                                    <Button onClick={openAddArch}>
                                        <Plus className="h-4 w-4 mr-2" /> Add Reference Layup
                                    </Button>
                                )}
                            </div>

                            {/* Section 2: Reference Layups Cards */}
                            <div className="space-y-8">
                                {layupArchitectures.map((arch, index) => (
                                    <div key={arch.id || index} className="space-y-4">
                                        <div className="flex items-center justify-between border-b pb-2">
                                            <div>
                                                <h4 className="text-lg font-medium">{arch.name} Properties</h4>
                                                <div className="flex gap-4 text-sm text-muted-foreground mt-1">
                                                    <span><strong className="font-semibold">Stack:</strong> {arch.description || "-"}</span>
                                                    <span><strong className="font-semibold">Layers:</strong> {arch.layerCount}</span>
                                                    <span><strong className="font-semibold">Thickness:</strong> {arch.thickness} mm</span>
                                                    <span><strong className="font-semibold">Process:</strong> {processes.find(p => p.id === arch.processId)?.name || "-"}</span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {isEditing && (
                                                    <Button size="sm" variant="outline" onClick={() => {
                                                        setRules([...rules, { propertyId: "", scope: "layup", referenceArchitectureId: arch.id }]);
                                                        setHasUnsavedChanges(true);
                                                    }}>
                                                        <Plus className="h-4 w-4 mr-2" /> Add Property to {arch.name}
                                                    </Button>
                                                )}
                                                {isEditing && (
                                                    <>
                                                        <Button variant="outline" size="sm" onClick={() => openEditArch(arch, index)}>
                                                            <Pencil className="h-4 w-4 mr-2" /> Edit Details
                                                        </Button>
                                                        <Button variant="outline" size="sm" className="text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => handleRemoveArchitecture(index)}>
                                                            <Trash2 className="h-4 w-4 mr-2" /> Delete
                                                        </Button>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                        <div>
                                            <RulesTable
                                                allRules={rules}
                                                properties={properties}
                                                onChangeRule={handleUpdateRule}
                                                onRemoveRule={handleRemoveRule}
                                                filterScope="layup"
                                                specificArchitectureId={arch.id}
                                                isEditing={isEditing}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Architecture Dialog */}
                            <Dialog open={isArchDialogOpen} onOpenChange={(open) => {
                                if (!open) setIsArchDialogOpen(false);
                            }}>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>{editingArchIndex !== null ? "Edit Architecture" : "Add Architecture"}</DialogTitle>
                                        <DialogDescription>
                                            Define the reference stackup details.
                                        </DialogDescription>
                                    </DialogHeader>
                                    {currentArch && (
                                        <div className="grid gap-4 py-4">
                                            <div className="grid gap-2">
                                                <Label>Type Name</Label>
                                                <Input
                                                    value={currentArch.name}
                                                    onChange={(e) => setCurrentArch({ ...currentArch, name: e.target.value })}
                                                    placeholder="e.g. Type 1"
                                                />
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="grid gap-2">
                                                    <Label>Layer Count</Label>
                                                    <Input
                                                        type="number"
                                                        value={currentArch.layerCount || ""}
                                                        onChange={(e) => setCurrentArch({ ...currentArch, layerCount: parseInt(e.target.value) || 0 })}
                                                        placeholder="0"
                                                    />
                                                </div>
                                                <div className="grid gap-2">
                                                    <Label>Thickness (mm)</Label>
                                                    <Input
                                                        type="number"
                                                        step="0.01"
                                                        value={currentArch.thickness || ""}
                                                        onChange={(e) => setCurrentArch({ ...currentArch, thickness: parseFloat(e.target.value) || 0 })}
                                                        placeholder="0.00"
                                                    />
                                                </div>
                                            </div>
                                            <div className="grid gap-2">
                                                <Label>Manufacturing Process</Label>
                                                <Select
                                                    value={currentArch.processId}
                                                    onValueChange={(val) => setCurrentArch({ ...currentArch, processId: val })}
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select Process..." />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {processes.map(proc => (
                                                            <SelectItem key={proc.id} value={proc.id}>
                                                                {proc.name}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="grid gap-2">
                                                <Label>Description / Stack Sequence</Label>
                                                <Input
                                                    value={currentArch.description || ""}
                                                    onChange={(e) => setCurrentArch({ ...currentArch, description: e.target.value })}
                                                    placeholder="e.g. [0/90/90/0] - Monolithic"
                                                />
                                            </div>
                                        </div>
                                    )}
                                    <DialogFooter>
                                        <Button variant="outline" onClick={() => setIsArchDialogOpen(false)}>Cancel</Button>
                                        <Button onClick={saveArchitecture}>{editingArchIndex !== null ? "Update" : "Add"}</Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>

                        </TabsContent>

                        {/* QML TAB */}
                        <TabsContent value="qml" className="max-w-6xl space-y-6 mt-0">
                            <div className="flex justify-between items-center">
                                <div>
                                    <h3 className="text-lg font-medium">Qualified Materials List (QML)</h3>
                                    <p className="text-sm text-muted-foreground">
                                        Materials that are qualified against this standard.
                                    </p>
                                </div>
                            </div>

                            <div className="border rounded-md overflow-hidden bg-card">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Material Name</TableHead>
                                            <TableHead>Type</TableHead>
                                            <TableHead>Status</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {materials
                                            .filter(m => m.assignedProfileIds?.includes(id!))
                                            .sort((a, b) => {
                                                const order: Record<string, number> = { 'active': 1, 'restricted': 2, 'obsolete': 3, 'dev': 4 };
                                                return (order[a.status] || 99) - (order[b.status] || 99);
                                            })
                                            .map(material => (
                                                <TableRow key={material.id}>
                                                    <TableCell className="font-medium cursor-pointer text-primary hover:underline" onClick={() => navigate(`/materials/${material.id}`)}>
                                                        {material.name}
                                                    </TableCell>
                                                    <TableCell>{material.type}</TableCell>
                                                    <TableCell>
                                                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${material.status === 'active' ? 'bg-green-100 text-green-800' :
                                                            material.status === 'obsolete' ? 'bg-red-100 text-red-800' :
                                                                material.status === 'restricted' ? 'bg-yellow-100 text-yellow-800' :
                                                                    'bg-gray-100 text-gray-800'
                                                            }`}>
                                                            {material.status}
                                                        </span>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        {materials.filter(m => m.assignedProfileIds?.includes(id!)).length === 0 && (
                                            <TableRow>
                                                <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                                                    No materials are currently qualified under this standard.
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </TabsContent>

                    </div>
                </Tabs>
            </div >
        </div >
    );
}

function RulesTable({
    allRules,
    properties,
    onChangeRule,
    onRemoveRule,
    filterScope,
    architectures = [],
    specificArchitectureId,
    isEditing = false
}: {
    allRules: RequirementRule[],
    properties: any[],
    onChangeRule: (index: number, rule: RequirementRule) => void,
    onRemoveRule: (index: number) => void,
    filterScope: 'material' | 'layup',
    architectures?: ReferenceLayupArchitecture[],
    specificArchitectureId?: string,
    isEditing?: boolean
}) {
    // We render the rows that match the scope
    // We need to pass the REAL index back to the parent

    // Create a list of { rule, index } to handle correct index callbacks
    const rows = allRules
        .map((rule, index) => ({ rule, index }))
        .filter(({ rule }) => {
            if (filterScope === 'material') return rule.scope === 'material' || !rule.scope;
            if (filterScope === 'layup') {
                if (rule.scope !== 'layup') return false;
                if (specificArchitectureId) return rule.referenceArchitectureId === specificArchitectureId;
                return true;
            }
            return false;
        });

    if (rows.length === 0) {
        return <div className="text-sm text-muted-foreground py-2 italic ml-2">No rules defined for this scope.</div>;
    }

    return (
        <div className="border rounded-md overflow-hidden">
            <table className="w-full text-sm">
                <thead className="bg-muted text-left">
                    <tr>
                        <th className="p-3 font-medium min-w-[200px]">Property</th>
                        {filterScope === 'layup' && !specificArchitectureId && <th className="p-3 font-medium">Architecture Type</th>}
                        <th className="p-3 font-medium w-24">Min</th>
                        <th className="p-3 font-medium w-24">Max</th>
                        <th className="p-3 font-medium w-24">Target</th>
                        <th className="p-3 font-medium w-24">Unit</th>
                        <th className="p-3 font-medium w-32">Test Method</th>
                        {isEditing && <th className="p-3 w-10"></th>}
                    </tr>
                </thead>
                <tbody className="divide-y">
                    {rows.map(({ rule, index }) => {
                        const selectedProp = properties.find(p => p.id === rule.propertyId);
                        const availableMethods = selectedProp?.testMethods || [];

                        if (!isEditing) {
                            // Read-Only Row
                            return (
                                <tr key={index} className="bg-card">
                                    <td className="p-3">{selectedProp?.name || "Unknown Property"}</td>
                                    {filterScope === 'layup' && !specificArchitectureId && (
                                        <td className="p-3">
                                            {architectures.find(a => a.id === rule.referenceArchitectureId)?.name || "-"}
                                        </td>
                                    )}
                                    <td className="p-3">{rule.min ?? "-"}</td>
                                    <td className="p-3">{rule.max ?? "-"}</td>
                                    <td className="p-3">{rule.target ?? "-"}</td>
                                    <td className="p-3 text-muted-foreground text-xs">{rule.unit || selectedProp?.unit || '-'}</td>
                                    <td className="p-3">{rule.method || "-"}</td>
                                </tr>
                            );
                        }

                        // Edit Row
                        return (
                            <tr key={index} className="bg-card">
                                <td className="p-2">
                                    <Select
                                        value={rule.propertyId}
                                        onValueChange={(val) => {
                                            const prop = properties.find(p => p.id === val);
                                            onChangeRule(index, { ...rule, propertyId: val, unit: prop?.unit });
                                        }}
                                    >
                                        <SelectTrigger className="h-8 border-transparent hover:border-input focus:border-input">
                                            <SelectValue placeholder="Select Property..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {properties.map(p => (
                                                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </td>
                                {filterScope === 'layup' && !specificArchitectureId && (
                                    <td className="p-2">
                                        <Select
                                            value={rule.referenceArchitectureId}
                                            onValueChange={(val) => onChangeRule(index, { ...rule, referenceArchitectureId: val })}
                                        >
                                            <SelectTrigger className="h-8 border-transparent hover:border-input focus:border-input">
                                                <SelectValue placeholder="Select Type..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {architectures.map(a => (
                                                    <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </td>
                                )}
                                <td className="p-2">
                                    <Input
                                        type="number"
                                        className="h-8 w-full border-transparent hover:border-input focus:border-input"
                                        value={rule.min ?? ""}
                                        onChange={(e) => onChangeRule(index, { ...rule, min: parseFloat(e.target.value) || undefined })}
                                        placeholder="Min"
                                    />
                                </td>
                                <td className="p-2">
                                    <Input
                                        type="number"
                                        className="h-8 w-full border-transparent hover:border-input focus:border-input"
                                        value={rule.max ?? ""}
                                        onChange={(e) => onChangeRule(index, { ...rule, max: parseFloat(e.target.value) || undefined })}
                                        placeholder="Max"
                                    />
                                </td>
                                <td className="p-2">
                                    <Input
                                        className="h-8 w-full border-transparent hover:border-input focus:border-input"
                                        value={rule.target ?? ""}
                                        onChange={(e) => onChangeRule(index, { ...rule, target: e.target.value })}
                                        placeholder="Target"
                                    />
                                </td>
                                <td className="p-2 text-muted-foreground text-xs">
                                    {rule.unit || selectedProp?.unit || '-'}
                                </td>
                                <td className="p-2">
                                    {availableMethods.length > 0 ? (
                                        <Select
                                            value={rule.method || ""}
                                            onValueChange={(val) => onChangeRule(index, { ...rule, method: val })}
                                        >
                                            <SelectTrigger className="h-8 w-full border-transparent hover:border-input focus:border-input">
                                                <SelectValue placeholder="Method..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {availableMethods.map((m: string) => (
                                                    <SelectItem key={m} value={m}>{m}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    ) : (
                                        <Input
                                            className="h-8 w-full border-transparent hover:border-input focus:border-input"
                                            value={rule.method ?? ""}
                                            onChange={(e) => onChangeRule(index, { ...rule, method: e.target.value })}
                                            placeholder="e.g. ISO 527"
                                        />
                                    )}
                                </td>
                                <td className="p-2">
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => {
                                        if (window.confirm("Are you sure you want to delete this property requirement?")) {
                                            onRemoveRule(index);
                                        }
                                    }}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}
