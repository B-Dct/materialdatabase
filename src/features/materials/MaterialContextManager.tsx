import { useState, useEffect } from 'react';
import { useAppStore } from '@/lib/store';
import type { Material } from '@/types/domain';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Check, ChevronsUpDown, X, Save, Box, Layers } from "lucide-react";


interface MaterialContextManagerProps {
    material: Material;
}

export function MaterialContextManager({ material }: MaterialContextManagerProps) {
    const { layups, assemblies, fetchLayups, fetchAssemblies, updateMaterial } = useAppStore();

    // Local state
    const [assignedLayupIds, setAssignedLayupIds] = useState<string[]>(material.assignedReferenceLayupIds || []);
    const [assignedAssemblyIds, setAssignedAssemblyIds] = useState<string[]>(material.assignedReferenceAssemblyIds || []);
    const [hasChanges, setHasChanges] = useState(false);

    // Popover states
    const [openLayup, setOpenLayup] = useState(false);
    const [openAssembly, setOpenAssembly] = useState(false);

    useEffect(() => {
        fetchLayups();
        fetchAssemblies();
    }, [fetchLayups, fetchAssemblies]);

    const handleAddLayup = (id: string) => {
        if (!assignedLayupIds.includes(id)) {
            setAssignedLayupIds(prev => [...prev, id]);
            setHasChanges(true);
        }
        setOpenLayup(false);
    };

    const handleRemoveLayup = (id: string) => {
        setAssignedLayupIds(prev => prev.filter(i => i !== id));
        setHasChanges(true);
    };

    const handleAddAssembly = (id: string) => {
        if (!assignedAssemblyIds.includes(id)) {
            setAssignedAssemblyIds(prev => [...prev, id]);
            setHasChanges(true);
        }
        setOpenAssembly(false);
    };

    const handleRemoveAssembly = (id: string) => {
        setAssignedAssemblyIds(prev => prev.filter(i => i !== id));
        setHasChanges(true);
    };

    const handleSave = async () => {
        try {
            await updateMaterial(material.id, {
                assignedReferenceLayupIds: assignedLayupIds,
                assignedReferenceAssemblyIds: assignedAssemblyIds,
            });
            setHasChanges(false);
        } catch (e) {
            console.error("Failed to update contexts", e);
        }
    };

    // Filter "valid" reference contexts (hide obsolete)
    // And exclude already assigned ones from the search list
    const availableLayups = layups.filter(l => l.status !== 'obsolete' && !assignedLayupIds.includes(l.id));
    const availableAssemblies = assemblies.filter(a => a.status !== 'obsolete' && !assignedAssemblyIds.includes(a.id));

    // Get assigned objects
    const assignedLayups = layups.filter(l => assignedLayupIds.includes(l.id));
    const assignedAssemblies = assemblies.filter(a => assignedAssemblyIds.includes(a.id));

    return (
        <div className="flex flex-col gap-6 p-1 h-full animate-in fade-in">
            <div className="flex justify-between items-center shrink-0">
                <div>
                    <h3 className="text-lg font-medium">Reference Contexts</h3>
                    <p className="text-sm text-muted-foreground">Assign Layups and Assemblies to be used as reference contexts for this material.</p>
                </div>
                <Button onClick={handleSave} disabled={!hasChanges} size="sm">
                    <Save className="w-4 h-4 mr-2" /> Save Changes
                </Button>
            </div>

            <div className="grid grid-cols-2 gap-6 flex-1 overflow-hidden min-h-0">
                {/* Reference Layups */}
                <Card className="flex flex-col overflow-hidden border-dashed border-2">
                    <CardHeader className="shrink-0 pb-3">
                        <div className="flex justify-between items-center">
                            <CardTitle className="text-base flex items-center gap-2">
                                <Layers className="w-4 h-4 text-blue-500" />
                                Reference Layups
                            </CardTitle>
                            <Popover open={openLayup} onOpenChange={setOpenLayup}>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" size="sm" className="h-8 w-[150px] justify-between">
                                        Add Layup...
                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[300px] p-0" align="end">
                                    <Command>
                                        <CommandInput placeholder="Search layups..." />
                                        <CommandList>
                                            <CommandEmpty>No layup found.</CommandEmpty>
                                            <CommandGroup heading="Available Layups">
                                                {availableLayups.map((l) => (
                                                    <CommandItem
                                                        key={l.id}
                                                        value={l.name}
                                                        onSelect={() => handleAddLayup(l.id)}
                                                    >
                                                        <Check className="mr-2 h-4 w-4 opacity-0" />
                                                        <div className="flex flex-col">
                                                            <span>{l.name}</span>
                                                            <span className="text-[10px] text-muted-foreground">{l.description}</span>
                                                        </div>
                                                    </CommandItem>
                                                ))}
                                            </CommandGroup>
                                        </CommandList>
                                    </Command>
                                </PopoverContent>
                            </Popover>
                        </div>
                        <CardDescription>Layups where this material is tested.</CardDescription>
                    </CardHeader>
                    <CardContent className="flex-1 overflow-hidden flex flex-col p-0">
                        <div className="h-full px-6 pb-6 overflow-auto">
                            <div className="flex flex-col gap-2">
                                {assignedLayups.length === 0 && (
                                    <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground border-2 border-dashed rounded-lg bg-muted/10">
                                        <Layers className="h-8 w-8 mb-2 opacity-20" />
                                        <p className="text-sm">No layups assigned</p>
                                    </div>
                                )}
                                {assignedLayups.map(l => (
                                    <div key={l.id} className="group flex items-center justify-between border p-2 rounded-md bg-card hover:bg-muted/50 transition-colors">
                                        <div className="flex flex-col gap-0.5">
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium text-sm">{l.name}</span>
                                                <Badge variant="secondary" className="text-[10px] h-4 px-1">{l.status}</Badge>
                                            </div>
                                            <span className="text-[11px] text-muted-foreground truncate max-w-[250px]">{l.description}</span>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                                            onClick={() => handleRemoveLayup(l.id)}
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Reference Assemblies */}
                <Card className="flex flex-col overflow-hidden border-dashed border-2">
                    <CardHeader className="shrink-0 pb-3">
                        <div className="flex justify-between items-center">
                            <CardTitle className="text-base flex items-center gap-2">
                                <Box className="w-4 h-4 text-purple-500" />
                                Reference Assemblies
                            </CardTitle>
                            <Popover open={openAssembly} onOpenChange={setOpenAssembly}>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" size="sm" className="h-8 w-[150px] justify-between">
                                        Add Assembly...
                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[300px] p-0" align="end">
                                    <Command>
                                        <CommandInput placeholder="Search assemblies..." />
                                        <CommandList>
                                            <CommandEmpty>No assembly found.</CommandEmpty>
                                            <CommandGroup heading="Available Assemblies">
                                                {availableAssemblies.map((a) => (
                                                    <CommandItem
                                                        key={a.id}
                                                        value={a.name}
                                                        onSelect={() => handleAddAssembly(a.id)}
                                                    >
                                                        <Check className="mr-2 h-4 w-4 opacity-0" />
                                                        <div className="flex flex-col">
                                                            <span>{a.name}</span>
                                                            <span className="text-[10px] text-muted-foreground">{a.description}</span>
                                                        </div>
                                                    </CommandItem>
                                                ))}
                                            </CommandGroup>
                                        </CommandList>
                                    </Command>
                                </PopoverContent>
                            </Popover>
                        </div>
                        <CardDescription>Assemblies using this material.</CardDescription>
                    </CardHeader>
                    <CardContent className="flex-1 overflow-hidden flex flex-col p-0">
                        <div className="h-full px-6 pb-6 overflow-auto">
                            <div className="flex flex-col gap-2">
                                {assignedAssemblies.length === 0 && (
                                    <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground border-2 border-dashed rounded-lg bg-muted/10">
                                        <Box className="h-8 w-8 mb-2 opacity-20" />
                                        <p className="text-sm">No assemblies assigned</p>
                                    </div>
                                )}
                                {assignedAssemblies.map(a => (
                                    <div key={a.id} className="group flex items-center justify-between border p-2 rounded-md bg-card hover:bg-muted/50 transition-colors">
                                        <div className="flex flex-col gap-0.5">
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium text-sm">{a.name}</span>
                                                <Badge variant="secondary" className="text-[10px] h-4 px-1">{a.status}</Badge>
                                            </div>
                                            <span className="text-[11px] text-muted-foreground truncate max-w-[250px]">{a.description}</span>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                                            onClick={() => handleRemoveAssembly(a.id)}
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
