import { useState, useEffect } from 'react';
import { useAppStore } from '@/lib/store';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
// SortableComponentItem imported below
// SortableLayer expects { id, variantName, orientation, materialType }. 
// Our Assembly items might differ. Let's create `SortableAssemblyComponent` inline or new file later if needed.
// For now, I'll inline a simple Sortable wrapper or use the existing one if compatible.
// Checking existing SortableLayer: it uses `useSortable` and renders a div.
import { SortableComponentItem } from './SortableComponentItem'; // Will create this next

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Plus, Save, ChevronRight } from 'lucide-react';
import type { EntityStatus, Assembly } from '@/types/domain';
import { v4 as uuidv4 } from "uuid";
import { MultiProcessSelector } from './MultiProcessSelector';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";


import type { ComponentConfig } from '@/types/domain';

interface ComponentItem {
    id: string; // internal drag ID
    componentType: 'layup' | 'material';
    componentId: string; // origin ID
    componentName: string;
    quantity: number;
    // For materials, we might want orientation? Assemblies usually define placement.
    // Let's assume orientation is relevant if it's a material ply, or "Position" string.
    // Domain says `position?: string`.
    position?: string;
    config?: ComponentConfig;
    materialType?: string; // Derived from store to help UI render correct inputs
}

interface AssemblyStackEditorProps {
    assembly?: Assembly;
    readonly?: boolean;
    onSaveSuccess?: () => void;
}

export function AssemblyStackEditor({ assembly, readonly = false, onSaveSuccess }: AssemblyStackEditorProps) {
    const { addAssembly, updateAssembly, materials, layups, fetchMaterials, fetchLayups } = useAppStore();

    // Form State
    const [name, setName] = useState(assembly?.name || "");
    const [description, setDescription] = useState(assembly?.description || "");
    const [status, setStatus] = useState<EntityStatus>(assembly?.status || "engineering");
    const [processIds, setProcessIds] = useState<string[]>(assembly?.processIds || []);

    // Stack State
    const [components, setComponents] = useState<ComponentItem[]>([]);

    useEffect(() => {
        fetchMaterials();
        fetchLayups();
    }, [fetchMaterials, fetchLayups]);

    // Init from assembly
    useEffect(() => {
        if (assembly) {
            setName(assembly.name);
            setDescription(assembly.description);
            setStatus(assembly.status);
            setProcessIds(assembly.processIds || []);

            if (assembly.components) {
                // Map existing components
                const mapped = assembly.components.map(c => {
                    let name = "Unknown";
                    let matTypeString = "";

                    if (c.componentType === 'layup') {
                        const l = layups.find(x => x.id === c.componentId);
                        if (l) name = l.name;
                    } else {
                        // Find variant or material?
                        const mat = materials.find(m => m.variants?.some(v => v.id === c.componentId));
                        const variant = mat?.variants?.find(v => v.id === c.componentId);
                        if (variant && mat) {
                            name = `${mat.name} - ${variant.variantName}`;
                            matTypeString = mat.type;
                        }
                    }

                    return {
                        id: c.id || uuidv4(),
                        componentType: c.componentType,
                        componentId: c.componentId,
                        componentName: name,
                        quantity: c.quantity,
                        position: c.position,
                        config: c.config,
                        materialType: matTypeString
                    };
                });
                setComponents(mapped);
            }
        }
    }, [assembly, materials, layups]);

    // DnD
    const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor));

    const handleDragEnd = (event: DragEndEvent) => {
        if (readonly) return;
        const { active, over } = event;
        if (over && active.id !== over.id) {
            setComponents((items) => {
                const oldIndex = items.findIndex(i => i.id === active.id);
                const newIndex = items.findIndex(i => i.id === over.id);
                return arrayMove(items, oldIndex, newIndex);
            });
        }
    };

    const addComponent = (type: 'layup' | 'material', id: string, name: string) => {
        if (readonly) return;

        // Derive material type if it's a material
        let matTypeString = "";
        let initialConfig: any = {};

        if (type === 'material') {
            const mat = materials.find(m => m.variants?.some(v => v.id === id));
            if (mat) {
                matTypeString = mat.type;
                const t = mat.type.toLowerCase();
                if (t.includes('lack') || t.includes('coating') || t.includes('varnish')) {
                    initialConfig.coatingThickness = { min: 0, max: 0, unit: 'µm' };
                }
                if (t.includes('klebstoff') || t.includes('adhesive') || t.includes('glue')) {
                    initialConfig.adhesiveGrammage = { min: 0, max: 0, unit: 'g/m²' };
                }
            }
        }

        setComponents([...components, {
            id: uuidv4(),
            componentType: type,
            componentId: id,
            componentName: name,
            quantity: 1,
            position: "",
            materialType: matTypeString,
            config: initialConfig
        }]);
    };

    const removeComponent = (id: string) => {
        if (readonly) return;
        setComponents(components.filter(c => c.id !== id));
    };

    const handleSave = async () => {
        if (!name) return alert("Name is required");
        if (components.length === 0) return alert("Add at least one component");

        const payloadComponents = components.map((c, idx) => ({
            componentType: c.componentType,
            componentId: c.componentId,
            componentName: c.componentName,
            quantity: c.quantity,
            sequence: idx + 1,
            position: c.position,
            config: c.config // Persist Config
        }));

        try {
            if (assembly?.id) {
                await updateAssembly(assembly.id, {
                    name,
                    description,
                    status,
                    processIds,
                    components: payloadComponents as any // Cast for store compatibility
                });
            } else {
                await addAssembly({
                    name,
                    description,
                    status,
                    version: 1,
                    processIds,
                    properties: [],
                    allowables: [],
                    assignedProfileIds: [],
                    measurements: []
                }, payloadComponents as any);
            }
            if (onSaveSuccess) onSaveSuccess();
        } catch (e: any) {
            console.error(e);
            alert("Save failed: " + e.message);
        }
    };

    // Library Filter
    const [matSearch, setMatSearch] = useState("");
    const [layupSearch, setLayupSearch] = useState("");

    // Selection State
    const [selectedMaterialId, setSelectedMaterialId] = useState<string | null>(null);

    const handleUpdateComponent = (id: string, updates: Partial<ComponentItem>) => {
        setComponents(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
    };

    return (
        <div className="grid grid-cols-12 gap-6 h-[calc(100vh-140px)]">
            {/* LEFT: Library */}
            {!readonly && (
                <div className="col-span-4 flex flex-col h-full overflow-hidden">
                    <Card className="h-full flex flex-col transition-all duration-500 ease-in-out">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm">Component Library</CardTitle>
                        </CardHeader>
                        <Tabs defaultValue="materials" className="flex-1 flex flex-col overflow-hidden">
                            <div className="px-4">
                                <TabsList className="w-full">
                                    <TabsTrigger value="materials" className="flex-1">Materials</TabsTrigger>
                                    <TabsTrigger value="layups" className="flex-1">Layups</TabsTrigger>
                                </TabsList>
                            </div>

                            <TabsContent value="materials" className="flex-1 flex flex-col overflow-hidden p-0 mt-2">
                                {!selectedMaterialId ? (
                                    <>
                                        <div className="px-4 pb-2 shrink-0">
                                            <Input placeholder="Search materials..." value={matSearch} onChange={e => setMatSearch(e.target.value)} className="h-8 text-xs" />
                                        </div>
                                        <div className="flex-1 overflow-auto">
                                            <div className="divide-y relative">
                                                {materials
                                                    .filter(m =>
                                                        m.name.toLowerCase().includes(matSearch.toLowerCase()) &&
                                                        !['restricted', 'obsolete'].includes(m.status)
                                                    )
                                                    .map(m => (
                                                        <div
                                                            key={m.id}
                                                            className="p-3 hover:bg-muted/50 cursor-pointer flex justify-between items-center group transition-colors"
                                                            onClick={() => setSelectedMaterialId(m.id)}
                                                        >
                                                            <div>
                                                                <span className="font-medium text-sm">{m.name}</span>
                                                                <div className="flex gap-2">
                                                                    <Badge variant="outline" className="text-[10px] h-4 px-1">{m.type}</Badge>
                                                                    <span className="text-[10px] text-muted-foreground self-center">{(m.variants || []).length} variants</span>
                                                                </div>
                                                            </div>
                                                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                                        </div>
                                                    ))}
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <div className="flex flex-col h-full animate-in slide-in-from-right-5 fade-in duration-200">
                                        <div className="px-4 py-3 bg-muted/30 border-b flex justify-between items-center shrink-0">
                                            <div className="flex flex-col">
                                                <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Selected Material</span>
                                                <span className="font-medium text-sm">{materials.find(m => m.id === selectedMaterialId)?.name}</span>
                                            </div>
                                            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setSelectedMaterialId(null)}>
                                                Change
                                            </Button>
                                        </div>
                                        <div className="flex-1 overflow-auto bg-slate-50/50 dark:bg-slate-900/20">
                                            <div className="p-3 text-xs font-medium text-muted-foreground border-b bg-background/50 backdrop-blur">
                                                Available Variants
                                            </div>
                                            <div className="divide-y">
                                                {(materials.find(m => m.id === selectedMaterialId)?.variants || []).map(v => (
                                                    <div key={v.id} className="flex justify-between items-center p-3 hover:bg-muted/50 text-sm bg-background">
                                                        <div className="flex flex-col">
                                                            <span className="font-medium">{v.variantName}</span>
                                                            <span className="text-[10px] text-muted-foreground font-mono">{v.id}</span>
                                                        </div>
                                                        <Button
                                                            size="sm"
                                                            variant="secondary"
                                                            className="h-7 text-xs"
                                                            onClick={() => addComponent('material', v.id, `${materials.find(m => m.id === selectedMaterialId)?.name} - ${v.variantName}`)}
                                                        >
                                                            <Plus className="h-3 w-3 mr-1" /> Add
                                                        </Button>
                                                    </div>
                                                ))}
                                                {(materials.find(m => m.id === selectedMaterialId)?.variants || []).length === 0 && (
                                                    <div className="p-8 text-center text-muted-foreground text-xs italic">
                                                        No variants available for this material.
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </TabsContent>

                            <TabsContent value="layups" className="flex-1 overflow-auto p-0 mt-2">
                                <div className="px-4 pb-2">
                                    <Input placeholder="Search..." value={layupSearch} onChange={e => setLayupSearch(e.target.value)} className="h-8 text-xs" />
                                </div>
                                <div className="divide-y">
                                    {layups
                                        .filter(l =>
                                            l.name.toLowerCase().includes(layupSearch.toLowerCase()) &&
                                            !['restricted', 'obsolete'].includes(l.status)
                                        )
                                        .map(l => (
                                            <div key={l.id} className="p-3 hover:bg-muted/50 flex justify-between items-center">
                                                <div className="flex flex-col">
                                                    <span className="font-medium text-sm">{l.name}</span>
                                                    <span className="text-[10px] text-muted-foreground">{l.layers.length} Layers • {l.status}</span>
                                                </div>
                                                <Button size="sm" variant="secondary" className="h-7 text-xs" onClick={() => addComponent('layup', l.id, l.name)}>
                                                    Add
                                                </Button>
                                            </div>
                                        ))}
                                </div>
                            </TabsContent>
                        </Tabs>
                    </Card>
                </div>
            )}

            {/* RIGHT: Stack Editor */}
            <div className={readonly ? "col-span-12" : "col-span-8"}>
                <div className="flex flex-col h-full gap-4">
                    {/* Header Controls */}
                    <Card>
                        <CardContent className="p-4 grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Assembly Name</label>
                                <Input disabled={readonly} value={name} onChange={e => setName(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Status</label>
                                {readonly ? (
                                    <div className="h-10 flex items-center"><StatusBadge status={status} /></div>
                                ) : (
                                    <div className="flex gap-2">
                                        <Select value={status} onValueChange={(v: any) => setStatus(v)}>
                                            <SelectTrigger>
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
                                        <Button onClick={handleSave}><Save className="h-4 w-4 mr-2" /> Save</Button>
                                    </div>
                                )}
                            </div>
                            <div className="col-span-2 space-y-2">
                                <label className="text-sm font-medium">Applicable Processes</label>
                                <MultiProcessSelector
                                    selectedIds={processIds}
                                    onChange={setProcessIds}
                                    readonly={readonly}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Stack */}
                    <Card className="flex-1 flex flex-col overflow-hidden bg-slate-50 dark:bg-slate-900/50">
                        <CardHeader className="pb-2 border-b">
                            <CardTitle className="text-base flex justify-between">
                                Assembly Structure
                                <Badge variant="outline">{components.length} Components</Badge>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="flex-1 overflow-auto p-4">
                            <DndContext
                                sensors={sensors}
                                collisionDetection={closestCenter}
                                onDragEnd={handleDragEnd}
                            >
                                <SortableContext items={components.map(c => c.id)} strategy={verticalListSortingStrategy}>
                                    {components.length === 0 ? (
                                        <div className="h-full flex flex-col items-center justify-center text-muted-foreground border-2 border-dashed rounded-lg">
                                            <ChevronRight className="h-12 w-12 mb-4 opacity-20" />
                                            <p>Assembly structure is empty.</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            {components.map((comp) => (
                                                <SortableComponentItem
                                                    key={comp.id}
                                                    {...comp}
                                                    readonly={readonly}
                                                    onRemove={removeComponent}
                                                    onUpdate={handleUpdateComponent}
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
