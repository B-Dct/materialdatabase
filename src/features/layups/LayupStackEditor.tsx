import { useState, useEffect } from 'react';
import { useAppStore } from '@/lib/store';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { SortableLayer } from './SortableLayer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Save, Plus, ChevronRight } from 'lucide-react';

import type { EntityStatus } from '@/types/domain';
import { v4 as uuidv4 } from "uuid";

interface LayerItem {
    id: string; // Internal ID for drag
    variantId: string;
    variantName: string;
    orientation: number;
    materialType?: string; // e.g. "Prepreg", "Resin"
}

interface LayupStackEditorProps {
    layup?: any; // To be typed properly
    readonly?: boolean;
    lockStructure?: boolean; // New prop: Locking stack for edits
    initialProjectIds?: string[]; // Auto-assign to projects when creating new
    initialWorkPackageId?: string; // Auto-assign to WP and restrict materials
    onSaveSuccess?: () => void;
}

export function LayupStackEditor({ layup, readonly = false, lockStructure = false, initialProjectIds, initialWorkPackageId, onSaveSuccess }: LayupStackEditorProps) {
    const { addLayup, updateLayup, materials, processes, fetchProcesses, fetchMaterials, requirementProfiles, fetchRequirementProfiles, workPackages, fetchWorkPackages } = useAppStore();
    const [name, setName] = useState(layup?.name || "");
    const [status, setStatus] = useState<EntityStatus>(layup?.status || "engineering");
    const [processId, setProcessId] = useState<string>(layup?.processId || "");
    const [thickness, setThickness] = useState<number>(layup?.totalThickness || 0);
    const [weight, setWeight] = useState<number>(layup?.totalWeight || 0);

    // Reference Layup Definition
    const [isReference, setIsReference] = useState<boolean>(layup?.isReference || false);
    const [referenceMaterialId, setReferenceMaterialId] = useState<string>(layup?.materialId || "");
    const [selectedProfileId, setSelectedProfileId] = useState<string>(layup?.assignedProfileIds?.[0] || "");
    const [selectedArchitectureId, setSelectedArchitectureId] = useState<string>(layup?.architectureTypeId || "");

    // Derived Lists for Cascading Dropdowns
    const availableProfiles = requirementProfiles.filter(p => {
        if (!referenceMaterialId) return false;
        const mat = materials.find(m => m.id === referenceMaterialId);
        if (!mat) return false;
        const materialTag = `material:${mat.name}`;
        return (mat.assignedProfileIds?.includes(p.id)) || (p.applicability?.includes(materialTag));
    });

    const selectedProfile = requirementProfiles.find(p => p.id === selectedProfileId);
    const availableArchitectures = selectedProfile?.layupArchitectures || [];
    const selectedArchitecture = availableArchitectures.find(a => a.id === selectedArchitectureId);

    useEffect(() => {
        if (isReference && !readonly && !layup?.id) { // Only auto-generate on creation
            const refMaterial = materials.find(m => m.id === referenceMaterialId);
            const refProfile = requirementProfiles.find(p => p.id === selectedProfileId);
            const refArchitecture = availableArchitectures.find(a => a.id === selectedArchitectureId);

            if (refMaterial && refProfile && refArchitecture) {
                const generatedName = `${refMaterial.name}_${refProfile.name}_${refArchitecture.name}`;
                setName(generatedName);
                if (refArchitecture.thickness) {
                    setThickness(refArchitecture.thickness);
                }
                setProcessId("none");
            }
        }
    }, [isReference, referenceMaterialId, selectedProfileId, selectedArchitectureId, materials, requirementProfiles, availableArchitectures, readonly, layup?.id]);

    const [layers, setLayers] = useState<LayerItem[]>(
        layup?.layers?.map((l: any) => ({
            id: uuidv4(), // Use uuid for new internal IDs
            variantId: l.materialVariantId,
            orientation: l.orientation,
            variantName: "Loaded Layer", // Placeholder, updated by effect below
            materialType: "Unknown"
        })) || []
    );

    // Search for Materials
    const [searchTerm, setSearchTerm] = useState("");

    // New Selection State for Split View
    const [selectedMaterialId, setSelectedMaterialId] = useState<string | null>(null);

    // Sync state with props
    useEffect(() => {
        if (layup) {
            setName(layup.name);
            setStatus(layup.status);
            setProcessId(layup.processId || "");
            setThickness(layup.totalThickness || 0);
            setWeight(layup.totalWeight || 0);
            setIsReference(layup.isReference || false);
            setReferenceMaterialId(layup.materialId || "");
            setSelectedProfileId(layup.assignedProfileIds?.[0] || "");
            setSelectedArchitectureId(layup.architectureTypeId || "");

            if (layup.layers && layup.layers.length > 0) {
                setLayers(layup.layers.map((l: any) => {
                    let vName = "Loaded Layer";
                    let mType = "Unknown";

                    for (const m of materials) {
                        const v = m.variants?.find(v => v.id === l.materialVariantId);
                        if (v) {
                            vName = `${m.name} - ${v.variantName}`;
                            mType = m.type;
                            break;
                        } else if (m.id === l.materialVariantId) {
                            vName = `${m.name} - Standard`;
                            mType = m.type;
                            break;
                        }
                    }

                    return {
                        id: uuidv4(),
                        variantId: l.materialVariantId,
                        orientation: l.orientation,
                        variantName: vName,
                        materialType: mType
                    };
                }));
            }
        }
    }, [layup, materials]);

    useEffect(() => {
        fetchProcesses();
        fetchMaterials();
        fetchRequirementProfiles();
        if (initialProjectIds?.[0]) {
            fetchWorkPackages(initialProjectIds[0]);
        } else if (initialWorkPackageId) {
            // Also need to get work packages if we only have a wpId so we can fetch its context.
            // Currently, fetchWorkPackages requires a projectId. Let's see if we can get it or just ignore missing fetch for now.
            // Since workPackages might already be loaded in state by the project view.
        }
    }, [fetchProcesses, fetchMaterials, fetchRequirementProfiles, fetchWorkPackages, initialProjectIds, initialWorkPackageId]);

    // Work Package Context filtering
    const wpContext = initialWorkPackageId ? workPackages.find(wp => wp.id === initialWorkPackageId) : null;
    const allowedMaterialIds = wpContext ? wpContext.assignedMaterials.map(m => m.materialId) : null;

    // Filtered Materials List
    const filteredMaterials = (materials || []).filter(m => {
        const matchesSearch = (m.name || "").toLowerCase().includes(searchTerm.toLowerCase());
        const isNotRestricted = !['restricted', 'obsolete'].includes(m.status);
        const isWpAllowed = allowedMaterialIds ? allowedMaterialIds.includes(m.id) : true;
        return matchesSearch && isNotRestricted && isWpAllowed;
    });

    // Get selected material and its variants
    const selectedMaterial = materials.find(m => m.id === selectedMaterialId);
    const selectedMaterialVariants = selectedMaterial?.variants || [];

    // DnD Sensors
    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor)
    );

    const handleDragEnd = (event: DragEndEvent) => {
        if (readonly || lockStructure) return; // Prevent drag if locked
        const { active, over } = event;
        if (over && active.id !== over.id) {
            setLayers((items) => {
                const oldIndex = items.findIndex(i => i.id === active.id);
                const newIndex = items.findIndex(i => i.id === over.id);
                return arrayMove(items, oldIndex, newIndex);
            });
        }
    };

    const addLayer = (materialName: string, variantId: string, variantName: string, materialType: string) => {
        if (readonly || lockStructure) return;
        const newLayer: LayerItem = {
            id: uuidv4(),
            variantId: variantId,
            variantName: `${materialName} - ${variantName}`,
            orientation: 0,
            materialType: materialType
        };
        setLayers([...layers, newLayer]);
    };

    const removeLayer = (id: string) => {
        if (readonly || lockStructure) return;
        setLayers(layers.filter(l => l.id !== id));
    };

    const updateOrientation = (id: string, newOri: number) => {
        if (readonly || lockStructure) return;
        setLayers(layers.map(l => l.id === id ? { ...l, orientation: newOri } : l));
    };

    const handleSave = async () => {
        if (!name) return alert("Please enter a layup name");
        if (!isReference && layers.length === 0) return alert("Add at least one layer");

        if (!layup?.id && isReference) {
            if (!referenceMaterialId) return alert("Please select an associated material for the reference layup.");
            if (!selectedProfileId) return alert("Please select a standard for the reference layup.");
            if (!selectedArchitectureId) return alert("Please select an architecture type for the reference layup.");
        }

        try {
            if (layup?.id) {
                // Update Existing
                console.log("Saving existing layup status...", { id: layup.id, status, reason: layup.restrictionReason }); // Debug log

                let reason = layup.restrictionReason;
                if (status === 'restricted' && layup.status !== 'restricted') {
                    const input = window.prompt("Please enter the reason for restriction (Mandatory):");
                    if (input === null) return; // Cancelled
                    if (input.trim().length === 0) return alert("Reason is mandatory.");
                    reason = input;
                }

                if (status !== 'restricted' && layup.status === 'restricted') {
                    reason = "";
                }

                console.log("Calling updateLayup with:", { id: layup.id, status, reason, thickness, weight });

                await updateLayup(layup.id, {
                    status,
                    restrictionReason: reason,
                    totalThickness: thickness,
                    totalWeight: weight,
                    // Note: Immutable fields (isReference, materialId, architectureTypeId, assignedProfileIds) are purposely NOT updated here
                });
                console.log("updateLayup completed.");

                // Force local update if store subscription is laggy (though it shouldn't be)
                setStatus(status);
            } else {
                // Create New
                console.log("Creating new layup...");
                const payload = {
                    name,
                    status,
                    processId: (processId && processId !== "none") ? processId : undefined,
                    layers: layers.map((l, index) => ({
                        id: uuidv4(),
                        materialVariantId: l.variantId,
                        orientation: l.orientation,
                        sequence: index + 1
                    })),
                    totalThickness: thickness,
                    totalWeight: weight,
                    processParams: {},
                    measurements: [],
                    previousVersionId: undefined,
                    createdBy: '00000000-0000-0000-0000-000000000000', // WORKAROUND: Force public ownership until RLS migration is verified
                    restrictionReason: undefined,
                    isReference: isReference,
                    materialId: (isReference && referenceMaterialId) ? referenceMaterialId : undefined,
                    architectureTypeId: (isReference && selectedArchitectureId) ? selectedArchitectureId : undefined,
                    assignedProfileIds: (isReference && selectedProfileId) ? [selectedProfileId] : undefined,
                    projectIds: initialProjectIds,
                };

                await addLayup(payload);

                console.log("Layup created.");
            }

            if (onSaveSuccess) onSaveSuccess();
        } catch (e: any) {
            console.error("Save failed:", e);
            alert("Failed to save: " + (e.message || e));
        }
    };




    return (
        <div className="flex flex-col h-[calc(100vh-100px)] overflow-hidden animate-in fade-in">
            <div className="flex-1 grid grid-cols-12 gap-6 overflow-hidden">
                {/* LEFT: Split Pane for Material Library */}
                {/* 
                    UPDATED REQUIREMENT: Stack is IMMUTABLE even in Edit Mode.
                    So we hide the Material Library unless it's a NEW creation (layup.id is undefined or handled via Create Page).
                    The prop `readonly` here means "Is this a View Mode?". 
                    But even if `readonly={false}` (Edit Mode), we must NOT allow changing stack.
                    Only allow changing stack if we are creating a FRESH layup (no ID).
                    
                    For now, assuming `layup` prop presence implies "Edit Mode of existing" vs "Create Mode".
                    Actually `layup` is passed even for create? Usually yes.
                    If passed layup has an ID, it's existing. 
                */}
                {/* 
                    UPDATED: Allow stack editing if not readonly.
                */}
                {/* LEFT: Material Library - Hidden if locked/readonly */}
                {(!readonly && !lockStructure) && (
                    <div className="col-span-4 flex flex-col h-full gap-6 overflow-hidden">
                        {/* Material Selection - Shrinks if material selected */}
                        <Card className={`flex flex-col overflow-hidden transition-all duration-300 ${selectedMaterialId ? "h-[9rem] min-h-[9rem]" : "h-full"}`}>
                            <CardHeader className={`pb-3 px-4 pt-4 shrink-0 transition-opacity ${selectedMaterialId ? "hidden" : "block"}`}>
                                <CardTitle className="text-sm">1. Select Material</CardTitle>
                                <Input
                                    placeholder="Search materials..."
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                    className="h-8 text-xs mt-2"
                                />
                            </CardHeader>
                            {/* If selected, show a simplified header/back button instead of search */}
                            {selectedMaterialId && (
                                <div className="p-3 pb-0 flex items-center justify-between shrink-0">
                                    <span className="text-sm font-medium">Selected Material</span>
                                    <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => setSelectedMaterialId(null)}>
                                        Change
                                    </Button>
                                </div>
                            )}

                            <CardContent className="flex-1 overflow-auto p-0 border-t mt-2">
                                <div className="divide-y">
                                    {filteredMaterials.length === 0 ? (
                                        <div className="text-center p-4 text-xs text-muted-foreground">No materials found.</div>
                                    ) : (
                                        filteredMaterials
                                            // Optional: If selected, only show the selected one?
                                            .filter(m => selectedMaterialId ? m.id === selectedMaterialId : true)
                                            .map(m => (
                                                <div
                                                    key={m.id}
                                                    className={`p-3 cursor-pointer hover:bg-muted/50 transition-colors ${selectedMaterialId === m.id ? "bg-muted border-l-4 border-l-primary" : ""}`}
                                                    onClick={() => setSelectedMaterialId(m.id === selectedMaterialId ? null : m.id)}
                                                >
                                                    <div className="flex justify-between items-center">
                                                        <span className="font-medium text-sm">{m.name}</span>
                                                        <Badge variant="outline" className="text-[10px] h-5">{m.type}</Badge>
                                                    </div>
                                                    <div className="text-[10px] text-muted-foreground mt-1">{m.manufacturer || "Unknown Mfg"}</div>
                                                </div>
                                            ))
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Variant Selection - Expands to fill remaining space */}
                        {selectedMaterialId && (
                            <Card className="flex flex-col flex-1 overflow-hidden animate-in slide-in-from-bottom-5 fade-in duration-300">
                                <CardHeader className="pb-3 px-4 pt-4 border-b bg-muted/20 shrink-0">
                                    <CardTitle className="text-sm">2. Add Variant to Stack</CardTitle>
                                    <CardDescription className="text-xs">
                                        {selectedMaterial ? `Variants for ${selectedMaterial.name}` : "Select a material"}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="flex-1 overflow-auto p-0">
                                    {!selectedMaterialVariants || selectedMaterialVariants.length === 0 ? (
                                        <div className="p-4 text-center text-xs text-muted-foreground">
                                            No variants defined for this material.
                                        </div>
                                    ) : (
                                        <div className="divide-y">
                                            {selectedMaterialVariants.map(v => (
                                                <div key={v.variantId} className="p-3 flex items-center justify-between hover:bg-muted/30">
                                                    <div className="flex flex-col gap-0.5">
                                                        <span className="text-sm font-medium">{v.variantName}</span>
                                                        <span className="text-[10px] font-mono text-muted-foreground">{v.variantId}</span>
                                                    </div>
                                                    <Button
                                                        size="sm"
                                                        variant="secondary"
                                                        className="h-7 text-xs"
                                                        onClick={() => addLayer(selectedMaterial!.name, v.id, v.variantName, selectedMaterial!.type)}
                                                    >
                                                        <Plus className="h-3 w-3 mr-1" /> Add
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        )}
                    </div>
                )}

                {/* RIGHT: Stacking & Config */}
                {/* Expand col-span if library is hidden (readonly or lockStructure) */}
                <div className={`${(!readonly && !lockStructure) ? 'col-span-8' : 'col-span-12'} flex flex-col h-full gap-4 overflow-hidden`}>
                    {/* Top: Layup Setup & Metadata */}
                    <Card>
                        <CardContent className="p-4 space-y-4">
                            {/* FIRST: Status & Save Action row */}
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                    <input
                                        type="checkbox"
                                        id="isReference"
                                        checked={isReference}
                                        onChange={(e) => setIsReference(e.target.checked)}
                                        disabled={readonly || !!layup?.id} // Immutable once created
                                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                    />
                                    <label
                                        htmlFor="isReference"
                                        className="text-sm font-bold leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                    >
                                        Define as Reference Layup for Material
                                    </label>
                                </div>

                                <div className="flex gap-4 items-center">
                                    <label className="text-sm font-medium">Status:</label>
                                    {readonly ? (
                                        <div className="flex items-center h-8 gap-4">
                                            <StatusBadge status={status} />
                                        </div>
                                    ) : (
                                        <>
                                            <Select value={status} onValueChange={(v: any) => setStatus(v)}>
                                                <SelectTrigger className="w-[150px] h-8">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="active"><StatusBadge status="active" /></SelectItem>
                                                    <SelectItem value="standard"><StatusBadge status="standard" /></SelectItem>
                                                    <SelectItem value="restricted"><StatusBadge status="restricted" /></SelectItem>
                                                    <SelectItem value="obsolete"><StatusBadge status="obsolete" /></SelectItem>
                                                    <SelectItem value="engineering"><StatusBadge status="engineering" /></SelectItem>
                                                </SelectContent>
                                            </Select>

                                            {!readonly && (
                                                <Button size="sm" className="h-8" onClick={handleSave}>
                                                    <Save className="h-4 w-4 mr-2" />
                                                    {layup?.id ? "Update Status" : "Create Layup"}
                                                </Button>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Reference Definition Dropdowns */}
                            {isReference && (
                                <div className="grid grid-cols-3 gap-4 animate-in fade-in slide-in-from-top-2 border rounded-md p-3 bg-muted/10">
                                    {/* 1. Material */}
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-medium">1. Associated Material</label>
                                        {readonly || !!layup?.id ? (
                                            <div className="text-sm border rounded-md px-3 py-1.5 bg-muted/20 text-muted-foreground truncate" title={materials.find(m => m.id === referenceMaterialId)?.name}>
                                                {referenceMaterialId ? materials.find(m => m.id === referenceMaterialId)?.name : "None"}
                                            </div>
                                        ) : (
                                            <Select value={referenceMaterialId} onValueChange={(val) => {
                                                setReferenceMaterialId(val);
                                                setSelectedProfileId(""); // Reset dependent fields
                                                setSelectedArchitectureId("");
                                            }}>
                                                <SelectTrigger className="h-8 text-xs">
                                                    <SelectValue placeholder="Select Material..." />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {materials.filter(m => !['restricted', 'obsolete'].includes(m.status)).map(m => (
                                                        <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        )}
                                    </div>

                                    {/* 2. Standard */}
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-medium">2. Requirement Profile</label>
                                        {readonly || !!layup?.id ? (
                                            <div className="text-sm border rounded-md px-3 py-1.5 bg-muted/20 text-muted-foreground truncate" title={requirementProfiles.find(p => p.id === selectedProfileId)?.name}>
                                                {selectedProfileId ? requirementProfiles.find(p => p.id === selectedProfileId)?.name : "None"}
                                            </div>
                                        ) : (
                                            <Select
                                                value={selectedProfileId}
                                                onValueChange={(val) => {
                                                    setSelectedProfileId(val);
                                                    setSelectedArchitectureId("");
                                                }}
                                                disabled={!referenceMaterialId}
                                            >
                                                <SelectTrigger className="h-8 text-xs">
                                                    <SelectValue placeholder={!referenceMaterialId ? "Select Material first" : "Select Standard..."} />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {availableProfiles.length === 0 ? (
                                                        <div className="p-2 text-xs text-muted-foreground text-center">No profiles found for this material.</div>
                                                    ) : (
                                                        availableProfiles.map(p => (
                                                            <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                                        ))
                                                    )}
                                                </SelectContent>
                                            </Select>
                                        )}
                                    </div>

                                    {/* 3. Architecture Type */}
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-medium">3. Architecture Type</label>
                                        {readonly || !!layup?.id ? (
                                            <div className="text-sm border rounded-md px-3 py-1.5 bg-muted/20 text-muted-foreground truncate" title={requirementProfiles.flatMap(p => p.layupArchitectures || []).find(a => a.id === selectedArchitectureId)?.name}>
                                                {selectedArchitectureId ?
                                                    (requirementProfiles.flatMap(p => p.layupArchitectures || []).find(a => a.id === selectedArchitectureId)?.name || "Unknown")
                                                    : "None"}
                                            </div>
                                        ) : (
                                            <Select
                                                value={selectedArchitectureId}
                                                onValueChange={setSelectedArchitectureId}
                                                disabled={!selectedProfileId}
                                            >
                                                <SelectTrigger className="h-8 text-xs">
                                                    <SelectValue placeholder={!selectedProfileId ? "Select Standard first" : "Select Type..."} />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {availableArchitectures.length === 0 ? (
                                                        <div className="p-2 text-xs text-muted-foreground text-center">No architectures defined.</div>
                                                    ) : (
                                                        availableArchitectures.map(a => (
                                                            <SelectItem key={a.id} value={a.id}>
                                                                {a.name} ({a.layerCount}L, {a.thickness}mm)
                                                            </SelectItem>
                                                        ))
                                                    )}
                                                </SelectContent>
                                            </Select>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Secondary Metadata */}
                            <div className="pt-3 border-t grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-medium text-muted-foreground">Layup Name</label>
                                    {readonly || isReference ? (
                                        <div className="text-sm border rounded-md px-3 h-8 flex items-center bg-muted/20 text-muted-foreground cursor-not-allowed" title="Name is auto-generated for reference layups.">
                                            {name}
                                        </div>
                                    ) : (
                                        <Input value={name} onChange={e => setName(e.target.value)} disabled={!!layup} placeholder="e.g. Wing Skin Upper" className="h-8 text-sm" />
                                    )}
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-medium text-muted-foreground">Manufacturing Process</label>
                                    {readonly || layup?.id || isReference ? (
                                        <div className="text-sm border rounded-md px-3 h-8 flex items-center bg-muted/20 text-muted-foreground cursor-not-allowed" title={isReference ? "Process is implicit for reference layups." : "Process cannot be changed after creation."}>
                                            {isReference ? "Implicit from Standard" : ((processes || []).find(p => p.id === processId)?.name || 'None')}
                                        </div>
                                    ) : (
                                        <Select value={processId} onValueChange={setProcessId}>
                                            <SelectTrigger className="h-8 text-sm">
                                                <SelectValue placeholder="Select Process..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {(processes || []).map(p => (
                                                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                                ))}
                                                <SelectItem value="none">None</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    )}
                                </div>

                                {/* Calculated Stats - Subtle Style */}
                                <div className="col-span-2 grid grid-cols-3 gap-4 mt-2">
                                    <div className="flex flex-col items-center justify-center p-2 bg-muted/10 rounded-md border border-dashed">
                                        <label className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Layers</label>
                                        <div className="text-sm font-semibold text-slate-700 dark:text-slate-300 mt-1">{layers.length} {isReference && selectedArchitecture?.layerCount && <span className="text-muted-foreground font-normal ml-1">/ {selectedArchitecture.layerCount} required</span>}</div>
                                    </div>
                                    <div className="flex flex-col items-center justify-center p-2 bg-muted/10 rounded-md border border-dashed">
                                        <label className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Thickness</label>
                                        <div className="flex items-center gap-1 mt-1">
                                            {readonly || isReference ? (
                                                <span className="text-sm font-semibold">{thickness.toFixed(3)}</span>
                                            ) : (
                                                <Input
                                                    type="number"
                                                    value={thickness}
                                                    onChange={e => setThickness(parseFloat(e.target.value) || 0)}
                                                    className="h-6 w-20 text-center text-xs"
                                                    step={0.001}
                                                />
                                            )}
                                            <span className="text-[10px] text-muted-foreground">mm</span>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-center justify-center p-2 bg-muted/10 rounded-md border border-dashed">
                                        <label className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Weight</label>
                                        <div className="flex items-center gap-1 mt-1">
                                            {readonly || isReference ? (
                                                <span className="text-sm font-semibold text-muted-foreground" title="Not required for Reference Layup">N/A</span>
                                            ) : (
                                                <Input
                                                    type="number"
                                                    value={weight}
                                                    onChange={e => setWeight(parseFloat(e.target.value) || 0)}
                                                    className="h-6 w-20 text-center text-xs"
                                                    step={1}
                                                />
                                            )}
                                            {(!readonly && !isReference) && <span className="text-[10px] text-muted-foreground">g/m²</span>}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Bottom: Stack - Updated to hug content but have min height */}
                    <Card className="min-h-[300px] flex flex-col overflow-hidden bg-slate-50 dark:bg-slate-900/50">
                        <CardHeader className="pb-2 border-b">
                            <div className="flex justify-between items-center">
                                <CardTitle className="text-base">
                                    Stack Sequence
                                    {lockStructure && <span className="text-xs font-normal text-muted-foreground ml-2">(Locked)</span>}
                                </CardTitle>
                                <div className="flex items-center gap-3">
                                    <Badge variant="outline">{layers.length} Layers</Badge>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="flex-1 overflow-auto p-4">
                            <DndContext
                                sensors={sensors}
                                collisionDetection={closestCenter}
                                onDragEnd={handleDragEnd}
                            >
                                <SortableContext items={layers.map(l => l.id)} strategy={verticalListSortingStrategy}>
                                    {layers.length === 0 ? (
                                        <div className="h-full flex flex-col items-center justify-center text-muted-foreground border-2 border-dashed rounded-lg">
                                            <ChevronRight className="h-12 w-12 mb-4 opacity-20" />
                                            <p>Stack is empty.</p>
                                            {(!readonly && !lockStructure) && <p className="text-sm">Select a material and add variants.</p>}
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            {layers.map((layer, index) => (
                                                <SortableLayer
                                                    key={layer.id}
                                                    {...layer}
                                                    index={index}
                                                    onRemove={removeLayer}
                                                    onOrientationChange={updateOrientation}
                                                    // Readonly only if prop is true
                                                    readonly={readonly || lockStructure}
                                                />
                                            ))}
                                        </div>
                                    )}
                                </SortableContext>
                            </DndContext>
                        </CardContent>
                    </Card>

                </div>
            </div>
        </div>
    );
}
