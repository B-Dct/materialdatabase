import { useState, useMemo } from 'react';
import { useAppStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Plus, Filter, Beaker, Layers, Box } from 'lucide-react';
import type { AnalysisEntityType } from '@/types/domain';

export function AnalysisFinder() {
    const {
        materials, layups, assemblies, processes,
        analysisCart, addToAnalysisCart
    } = useAppStore();

    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState<AnalysisEntityType>('material');

    // Advanced Filters
    const [filterProcess, setFilterProcess] = useState<string>('all');
    const [filterMaterial, setFilterMaterial] = useState<string>('all');
    const [filterMaterialType, setFilterMaterialType] = useState<string>('all');

    // Extract unique material types
    const materialTypes = useMemo(() => {
        return Array.from(new Set(materials.map(m => m.type))).filter(Boolean).sort();
    }, [materials]);

    // Filter Logic
    const filteredMaterials = useMemo(() => {
        if (activeTab !== 'material') return [];
        return materials.filter(m => {
            const matchSearch = m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (m.materialId && m.materialId.toLowerCase().includes(searchTerm.toLowerCase()));
            const matchType = filterMaterialType === 'all' || m.type === filterMaterialType;
            return matchSearch && matchType;
        });
    }, [materials, activeTab, searchTerm, filterMaterialType]);

    const filteredLayups = useMemo(() => {
        if (activeTab !== 'layup') return [];
        return layups.filter(l => {
            const matchSearch = l.name.toLowerCase().includes(searchTerm.toLowerCase());
            const matchProcess = filterProcess === 'all' || l.processId === filterProcess;
            // A Layup 'contains' a material if it references it in its variants
            // Note: In real DB this might require a deeper join if variants hold material references, 
            // but we might just check base material or references. 
            // For now, let's keep it simple: if filtering by material, require exact match if possible.
            // A more advanced drill-down would read `l.variants` or `l.baseMaterialId` if it exists.
            let matchMaterial = true;
            if (filterMaterial !== 'all') {
                // If a layup has a concept of baseMaterialId:
                // matchMaterial = l.baseMaterialId === filterMaterial;
            }
            return matchSearch && matchProcess && matchMaterial;
        });
    }, [layups, activeTab, searchTerm, filterProcess, filterMaterial]);

    const filteredAssemblies = useMemo(() => {
        if (activeTab !== 'assembly') return [];
        return assemblies.filter(a => {
            const matchSearch = a.name.toLowerCase().includes(searchTerm.toLowerCase());

            let matchMaterial = true;
            if (filterMaterial !== 'all') {
                // Check if assembly components contain the material
                const hasMaterial = a.components?.some(c => c.componentId === filterMaterial);
                matchMaterial = !!hasMaterial;
            }
            return matchSearch && matchMaterial;
        });
    }, [assemblies, activeTab, searchTerm, filterMaterial]);

    const handleAdd = (id: string, type: AnalysisEntityType) => {
        addToAnalysisCart({ id, type });
        // Optional: close dialog on add or keep open to add multiple? Let's keep open.
    };

    const isFull = analysisCart.length >= 6;

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button>
                    <Search className="h-4 w-4 mr-2" /> Find & Add to Analysis
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Analysis Finder</DialogTitle>
                </DialogHeader>

                <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as AnalysisEntityType)} className="flex-1 flex flex-col mt-4 min-h-0">
                    <div className="flex justify-between items-center mb-4 shrink-0">
                        <TabsList>
                            <TabsTrigger value="material" className="gap-2"><Beaker className="h-4 w-4" /> Materials</TabsTrigger>
                            <TabsTrigger value="layup" className="gap-2"><Layers className="h-4 w-4" /> Layups</TabsTrigger>
                            <TabsTrigger value="assembly" className="gap-2"><Box className="h-4 w-4" /> Assemblies</TabsTrigger>
                        </TabsList>
                        <div className="text-sm font-medium">
                            Cart: {analysisCart.length}/6
                        </div>
                    </div>

                    <div className="flex gap-4 mb-4 shrink-0">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder={`Search ${activeTab}s...`}
                                className="pl-9"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>

                        {/* Advanced Filters based on Tab */}
                        {activeTab === 'material' && (
                            <Select value={filterMaterialType} onValueChange={setFilterMaterialType}>
                                <SelectTrigger className="w-[200px]">
                                    <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
                                    <SelectValue placeholder="Material Type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Types</SelectItem>
                                    {materialTypes.map(t => (
                                        <SelectItem key={t} value={t}>{t}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}

                        {activeTab === 'layup' && (
                            <Select value={filterProcess} onValueChange={setFilterProcess}>
                                <SelectTrigger className="w-[200px]">
                                    <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
                                    <SelectValue placeholder="Process Filter" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Processes</SelectItem>
                                    {processes.map(p => (
                                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}

                        {(activeTab === 'layup' || activeTab === 'assembly') && (
                            <Select value={filterMaterial} onValueChange={setFilterMaterial}>
                                <SelectTrigger className="w-[220px]">
                                    <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
                                    <SelectValue placeholder="Contains Material" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Any Material</SelectItem>
                                    {materials.map(m => (
                                        <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}
                    </div>

                    <div className="flex-1 overflow-y-auto min-h-0 border rounded-md p-2 bg-muted/10 relative">
                        {activeTab === 'material' && (
                            <div className="flex flex-col gap-4">
                                {(() => {
                                    if (filteredMaterials.length === 0) {
                                        return <p className="text-center text-muted-foreground py-8">No materials found.</p>;
                                    }

                                    const groupedMaterials = filteredMaterials.reduce((acc, m) => {
                                        const type = m.type || 'Unknown';
                                        if (!acc[type]) acc[type] = [];
                                        acc[type].push(m);
                                        return acc;
                                    }, {} as Record<string, typeof filteredMaterials>);

                                    return Object.entries(groupedMaterials)
                                        .sort(([a], [b]) => a.localeCompare(b))
                                        .map(([type, mats]) => (
                                            <div key={type} className="flex flex-col gap-2">
                                                <div className="sticky top-0 sticky-z bg-muted/90 backdrop-blur-sm px-2 py-1 -mx-2 z-10 border-b border-muted">
                                                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{type}</h4>
                                                </div>
                                                {mats.map(item => {
                                                    const inCart = analysisCart.some(c => c.id === item.id);
                                                    return (
                                                        <div key={item.id} className="flex items-center justify-between p-3 bg-card border rounded-sm hover:shadow-sm transition-all ml-2">
                                                            <div>
                                                                <p className="font-medium">{item.name}</p>
                                                                <p className="text-xs text-muted-foreground">{item.materialId}</p>
                                                            </div>
                                                            <Button
                                                                size="sm"
                                                                variant={inCart ? "secondary" : "default"}
                                                                disabled={inCart || isFull}
                                                                onClick={() => handleAdd(item.id, 'material')}
                                                            >
                                                                {inCart ? 'Added' : <><Plus className="h-4 w-4 mr-1" /> Add</>}
                                                            </Button>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        ));
                                })()}
                            </div>
                        )}

                        {activeTab === 'layup' && (
                            <div className="flex flex-col gap-2">
                                {filteredLayups.map(item => {
                                    const inCart = analysisCart.some(c => c.id === item.id);
                                    const processName = processes.find(p => p.id === item.processId)?.name || 'No Process';
                                    return (
                                        <div key={item.id} className="flex items-center justify-between p-3 bg-card border rounded-sm hover:shadow-sm transition-all">
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <p className="font-medium">{item.name}</p>
                                                    {item.isReference && <span className="text-[10px] bg-amber-100 text-amber-800 px-1 py-0.5 rounded">Reference</span>}
                                                </div>
                                                <p className="text-xs text-muted-foreground">Process: {processName} • Layers: {item.layers?.length || 0}</p>
                                            </div>
                                            <Button
                                                size="sm"
                                                variant={inCart ? "secondary" : "default"}
                                                disabled={inCart || isFull}
                                                onClick={() => handleAdd(item.id, 'layup')}
                                            >
                                                {inCart ? 'Added' : <><Plus className="h-4 w-4 mr-1" /> Add</>}
                                            </Button>
                                        </div>
                                    )
                                })}
                                {filteredLayups.length === 0 && <p className="text-center text-muted-foreground py-8">No layups found matching filters.</p>}
                            </div>
                        )}

                        {activeTab === 'assembly' && (
                            <div className="flex flex-col gap-2">
                                {filteredAssemblies.map(item => {
                                    const inCart = analysisCart.some(c => c.id === item.id);
                                    return (
                                        <div key={item.id} className="flex items-center justify-between p-3 bg-card border rounded-sm hover:shadow-sm transition-all">
                                            <div>
                                                <p className="font-medium">{item.name}</p>
                                                <p className="text-xs text-muted-foreground">Components: {item.components?.length || 0}</p>
                                            </div>
                                            <Button
                                                size="sm"
                                                variant={inCart ? "secondary" : "default"}
                                                disabled={inCart || isFull}
                                                onClick={() => handleAdd(item.id, 'assembly')}
                                            >
                                                {inCart ? 'Added' : <><Plus className="h-4 w-4 mr-1" /> Add</>}
                                            </Button>
                                        </div>
                                    )
                                })}
                                {filteredAssemblies.length === 0 && <p className="text-center text-muted-foreground py-8">No assemblies found matching filters.</p>}
                            </div>
                        )}
                    </div>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
}
