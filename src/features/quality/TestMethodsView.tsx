import { useEffect, useState } from 'react';
import { useAppStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
} from "@/components/ui/command";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
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
import { Plus, Trash, Search, Settings2, ArrowUp, ArrowDown, Pencil, Check } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { TestMethodPropertyConfig } from '@/types/domain';

export function TestMethodsView() {
    const { testMethods, fetchTestMethods, addTestMethod, updateTestMethod, deleteTestMethod, properties, fetchProperties } = useAppStore();
    const { can } = useAuth();

    const [selectedMethodId, setSelectedMethodId] = useState<string | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");

    useEffect(() => {
        setIsEditing(false);
    }, [selectedMethodId]);

    // Add Method Dialog
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [newMethodName, setNewMethodName] = useState("");
    const [newMethodTitle, setNewMethodTitle] = useState("");
    const [newMethodCategory, setNewMethodCategory] = useState<'mechanical' | 'physical' | 'chemical' | undefined>(undefined);
    const [categoryFilter, setCategoryFilter] = useState<'all' | 'mechanical' | 'physical' | 'chemical'>('all');

    // Property Picker
    const [isPropPickerOpen, setIsPropPickerOpen] = useState(false);

    useEffect(() => {
        fetchTestMethods();
        fetchProperties();
    }, []);

    const selectedMethod = testMethods.find(m => m.id === selectedMethodId);

    const [methodToDelete, setMethodToDelete] = useState<string | null>(null);

    const handleCreateMethod = async () => {
        if (!newMethodName.trim()) return;
        try {
            await addTestMethod({
                name: newMethodName,
                title: newMethodTitle,
                category: newMethodCategory,
                description: "",
                properties: []
            });
            setNewMethodName("");
            setNewMethodTitle("");
            setNewMethodCategory(undefined);
            setIsAddOpen(false);
        } catch (e: any) {
            alert(`Failed to create test method: ${e.message}`);
        }
    };

    const confirmDelete = async () => {
        if (methodToDelete) {
            await deleteTestMethod(methodToDelete);
            if (selectedMethodId === methodToDelete) setSelectedMethodId(null);
            setMethodToDelete(null);
        }
    };


    const handleAddProperty = async (propId: string) => {
        if (!selectedMethod) return;
        // Check duplication
        if (selectedMethod.properties.some(p => p.propertyId === propId)) return;

        // Default to 'mean' (Basic)
        const newEntry: TestMethodPropertyConfig = { propertyId: propId, statsTypes: ['mean', 'range'] };
        const newProperties = [...selectedMethod.properties, newEntry];

        await updateTestMethod(selectedMethod.id, { properties: newProperties });
        setIsPropPickerOpen(false);
    };

    const handleRemoveProperty = async (propId: string) => {
        if (!selectedMethod) return;
        const newProperties = selectedMethod.properties.filter(p => p.propertyId !== propId);
        await updateTestMethod(selectedMethod.id, { properties: newProperties });
    };

    const handleStatsTypeToggle = async (propId: string, type: 'mean' | 'range' | 'design') => {
        if (!selectedMethod) return;

        const newProperties = selectedMethod.properties.map(p => {
            if (p.propertyId !== propId) return p;

            // Handle legacy mapping if needed (though domain should be aligned now)
            let currentTypes: ('mean' | 'range' | 'design')[];
            if (p.statsTypes) {
                currentTypes = [...p.statsTypes];
            } else if ((p as any).statsType === 'design_values') {
                currentTypes = ['mean', 'range', 'design'];
            } else {
                currentTypes = ['mean', 'range'];
            }

            let newTypes: ('mean' | 'range' | 'design')[];
            if (currentTypes.includes(type)) {
                newTypes = currentTypes.filter(t => t !== type);
            } else {
                newTypes = [...currentTypes, type];
            }

            // Enforce Mean is always selected? Or maybe not. Let's allow flexibility.
            return { ...p, statsTypes: newTypes };
        });

        await updateTestMethod(selectedMethod.id, { properties: newProperties });
    };

    const handleMoveProperty = async (index: number, direction: 'up' | 'down') => {
        if (!selectedMethod) return;
        const newProperties = [...selectedMethod.properties];
        if (direction === 'up') {
            if (index === 0) return;
            [newProperties[index - 1], newProperties[index]] = [newProperties[index], newProperties[index - 1]];
        } else {
            if (index === newProperties.length - 1) return;
            [newProperties[index], newProperties[index + 1]] = [newProperties[index + 1], newProperties[index]];
        }
        await updateTestMethod(selectedMethod.id, { properties: newProperties });
    };

    const filteredMethods = testMethods.filter(m => {
        const matchesSearch = m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (m.title && m.title.toLowerCase().includes(searchQuery.toLowerCase()));
        const matchesCategory = categoryFilter === 'all' || m.category === categoryFilter;
        return matchesSearch && matchesCategory;
    });

    // Filter available properties (exclude already assigned)
    const assignedIds = selectedMethod?.properties.map(p => p.propertyId) || [];
    const availableProperties = properties.filter(p => !assignedIds.includes(p.id));

    return (
        <div className="p-8 space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Test Methods</h1>
                    <p className="text-muted-foreground">Manage and configure test methods and their properties.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[calc(100vh-250px)]">
                {/* List Sidebar */}
                <Card className="col-span-1 flex flex-col h-full border-r-0 rounded-r-none">
                    <CardHeader className="pb-3 px-4">
                        <div className="flex justify-between items-center mb-2">
                            <CardTitle className="text-lg">Methods</CardTitle>
                            <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                                <DialogTrigger asChild>
                                    <Button size="sm" variant="outline"><Plus className="h-4 w-4 mr-1" /> New</Button>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>Create Test Method</DialogTitle>
                                    </DialogHeader>
                                    <div className="py-4 space-y-4">
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">Method Name (ID)</label>
                                            <Input
                                                placeholder="e.g. ISO 527-4"
                                                value={newMethodName}
                                                onChange={e => setNewMethodName(e.target.value)}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">Title</label>
                                            <Input
                                                placeholder="e.g. Tensile Properties"
                                                value={newMethodTitle}
                                                onChange={e => setNewMethodTitle(e.target.value)}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">Category</label>
                                            <select
                                                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                                value={newMethodCategory || ""}
                                                onChange={e => setNewMethodCategory(e.target.value as any || undefined)}
                                            >
                                                <option value="">Select Category...</option>
                                                <option value="mechanical">Mechanical</option>
                                                <option value="physical">Physical</option>
                                                <option value="chemical">Chemical</option>
                                            </select>
                                        </div>
                                        <Button onClick={handleCreateMethod} disabled={!newMethodName}>Create</Button>
                                    </div>
                                </DialogContent>
                            </Dialog>
                        </div>
                        <div className="flex gap-2 mb-2">
                            <select
                                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                                value={categoryFilter}
                                onChange={(e) => setCategoryFilter(e.target.value as any)}
                            >
                                <option value="all">All Categories</option>
                                <option value="mechanical">Mechanical</option>
                                <option value="physical">Physical</option>
                                <option value="chemical">Chemical</option>
                            </select>
                        </div>
                        <div className="relative">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search methods..."
                                className="pl-8"
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </CardHeader>
                    <CardContent className="flex-1 overflow-y-auto px-2 pb-2">
                        <div className="space-y-4">
                            {['mechanical', 'physical', 'chemical', 'other'].map(category => {
                                const categoryMethods = filteredMethods.filter(m => {
                                    if (category === 'other') return !m.category;
                                    return m.category === category;
                                });

                                if (categoryMethods.length === 0) return null;

                                return (
                                    <div key={category}>
                                        <h5 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2 mb-1">
                                            {category}
                                        </h5>
                                        <div className="space-y-1">
                                            {categoryMethods.map(method => (
                                                <div
                                                    key={method.id}
                                                    onClick={() => setSelectedMethodId(method.id)}
                                                    className={cn(
                                                        "flex items-center justify-between p-2 rounded-md cursor-pointer text-sm transition-colors group",
                                                        selectedMethodId === method.id
                                                            ? "bg-primary/10 text-primary font-medium"
                                                            : "hover:bg-muted"
                                                    )}
                                                >
                                                    <div className="truncate flex-1">
                                                        <div className="font-medium">{method.name}</div>
                                                        {method.title && <div className="text-xs text-muted-foreground">{method.title}</div>}
                                                    </div>
                                                    {can('manage:properties') && (
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-6 w-6 opacity-0 group-hover:opacity-100 hover:text-destructive"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setMethodToDelete(method.id);
                                                            }}
                                                        >
                                                            <Trash className="h-3 w-3" />
                                                        </Button>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                            {filteredMethods.length === 0 && (
                                <div className="text-sm text-muted-foreground text-center py-4">
                                    No methods found.
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Detail View */}
                <Card className="col-span-1 md:col-span-2 flex flex-col h-full border-l-0 rounded-l-none">
                    {selectedMethod ? (
                        <>
                            <CardHeader className="border-b bg-muted/20 pb-4">
                                <div className="space-y-4">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                                    {isEditing ? "Editing Method" : "Method Details"}
                                                </div>
                                                {!isEditing && (
                                                    <Badge variant="outline" className="text-[10px] h-4 px-1">Read Only</Badge>
                                                )}
                                            </div>
                                            <div className="grid gap-2 min-w-[300px]">
                                                <div className="grid grid-cols-2 gap-2">
                                                    <Input
                                                        className="font-bold"
                                                        value={selectedMethod.name}
                                                        onChange={(e) => updateTestMethod(selectedMethod.id, { name: e.target.value })}
                                                        placeholder="Method ID"
                                                        disabled={!isEditing}
                                                    />
                                                    <select
                                                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                                                        value={selectedMethod.category || ""}
                                                        onChange={(e) => updateTestMethod(selectedMethod.id, { category: e.target.value as any })}
                                                        disabled={!isEditing}
                                                    >
                                                        <option value="">No Category</option>
                                                        <option value="mechanical">Mechanical</option>
                                                        <option value="physical">Physical</option>
                                                        <option value="chemical">Chemical</option>
                                                    </select>
                                                </div>
                                                <Input
                                                    className="font-medium"
                                                    value={selectedMethod.title || ""}
                                                    onChange={(e) => updateTestMethod(selectedMethod.id, { title: e.target.value })}
                                                    placeholder="Descriptive Title (e.g. Tensile Properties)"
                                                    disabled={!isEditing}
                                                />
                                            </div>
                                        </div>
                                        {can('manage:properties') && (
                                            <Button
                                                variant={isEditing ? "default" : "outline"}
                                                size="sm"
                                                onClick={() => setIsEditing(!isEditing)}
                                                className={cn("gap-2", isEditing && "bg-green-600 hover:bg-green-700")}
                                            >
                                                {isEditing ? (
                                                    <>
                                                        <Check className="h-4 w-4" /> Done
                                                    </>
                                                ) : (
                                                    <>
                                                        <Pencil className="h-4 w-4" /> Edit
                                                    </>
                                                )}
                                            </Button>
                                        )}
                                    </div>
                                    <div>
                                        <label className="text-xs font-medium text-muted-foreground mb-1 block">Description</label>
                                        <Textarea
                                            className="text-sm min-h-[60px] resize-none"
                                            placeholder="Enter description..."
                                            value={selectedMethod.description || ""}
                                            onChange={(e) => updateTestMethod(selectedMethod.id, { description: e.target.value })}
                                            disabled={!isEditing}
                                        />
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="flex-1 overflow-y-auto p-0">
                                <div className="p-4 border-b flex justify-between items-center bg-muted/10">
                                    <h3 className="font-semibold text-sm">Assigned Properties & Configuration</h3>
                                    <Popover open={isPropPickerOpen} onOpenChange={(open) => isEditing && setIsPropPickerOpen(open)}>
                                        <PopoverTrigger asChild>
                                            <Button size="sm" variant="secondary" disabled={!isEditing}><Plus className="h-3 w-3 mr-1" /> Add Property</Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="p-0 w-[300px]" align="end">
                                            <Command>
                                                <CommandInput placeholder="Search property to add..." />
                                                <CommandEmpty>No properties found.</CommandEmpty>
                                                <CommandGroup className="max-h-[300px] overflow-auto">
                                                    {availableProperties.map(p => (
                                                        <CommandItem
                                                            key={p.id}
                                                            value={p.name}
                                                            onSelect={() => handleAddProperty(p.id)}
                                                        >
                                                            <div className="flex flex-col">
                                                                <span>{p.name}</span>
                                                                <span className="text-xs text-muted-foreground">{p.category} | {p.unit}</span>
                                                            </div>
                                                        </CommandItem>
                                                    ))}
                                                </CommandGroup>
                                            </Command>
                                        </PopoverContent>
                                    </Popover>
                                </div>

                                <div className="divide-y">
                                    {selectedMethod.properties.map((propConfig, index) => {
                                        const prop = properties.find(p => p.id === propConfig.propertyId);

                                        // Handle missing/deleted property definitions
                                        const isMissing = !prop;
                                        const displayName = prop ? prop.name : `Missing Property (${propConfig.propertyId.substring(0, 8)})`;
                                        const displayUnit = prop ? prop.unit : "???";
                                        const displayCategory = prop ? prop.category : "Unknown";

                                        return (
                                            <div key={propConfig.propertyId} className={cn("flex items-center justify-between p-3 hover:bg-muted/30 group", isMissing && "bg-destructive/10 border-l-2 border-destructive")}>
                                                <div className="flex items-center gap-3 flex-1">
                                                    <Badge variant="outline" className="w-6 h-6 rounded-full flex items-center justify-center p-0 text-muted-foreground text-[10px]">
                                                        {index + 1}
                                                    </Badge>
                                                    <div className="flex-1">
                                                        <div className={cn("font-medium text-sm flex items-center gap-2", isMissing && "text-destructive")}>
                                                            {displayName}
                                                            {/* Ensure backwards compatibility for display */}
                                                            {(!isMissing && (propConfig.statsTypes?.includes('design') || (propConfig as any).statsType === 'design_values')) && (
                                                                <Badge variant="secondary" className="text-[10px] h-4 px-1">A/B Values</Badge>
                                                            )}
                                                            {isMissing && <Badge variant="destructive" className="text-[10px] h-4 px-1">Definition Missing</Badge>}
                                                        </div>
                                                        <div className="text-xs text-muted-foreground">
                                                            <span className="capitalize">{displayCategory}</span> • {displayUnit}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-1 mr-2">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-6 w-6 p-0 hover:bg-muted"
                                                        disabled={!isEditing || index === 0}
                                                        onClick={() => handleMoveProperty(index, 'up')}
                                                    >
                                                        <ArrowUp className="h-3 w-3" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-6 w-6 p-0 hover:bg-muted"
                                                        disabled={!isEditing || index === selectedMethod.properties.length - 1}
                                                        onClick={() => handleMoveProperty(index, 'down')}
                                                    >
                                                        <ArrowDown className="h-3 w-3" />
                                                    </Button>
                                                </div>

                                                <div className="flex items-center gap-2">
                                                    {/* Stats Type Multi-Select */}
                                                    <Popover>
                                                        <PopoverTrigger asChild>
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                className="h-8 text-xs font-normal"
                                                                disabled={!isEditing}
                                                            >
                                                                <Settings2 className="h-3 w-3 mr-2" />
                                                                Configure
                                                            </Button>
                                                        </PopoverTrigger>
                                                        <PopoverContent className="w-56" align="end">
                                                            <div className="space-y-3">
                                                                <h4 className="font-medium text-xs text-muted-foreground pb-2 border-b">STATS OUTPUT</h4>
                                                                <div className="space-y-2">
                                                                    {/* Mean */}
                                                                    <div className="flex items-center space-x-2">
                                                                        <Checkbox
                                                                            id={`mean-${propConfig.propertyId}`}
                                                                            checked={propConfig.statsTypes?.includes('mean') ?? true}
                                                                            onCheckedChange={() => handleStatsTypeToggle(propConfig.propertyId, 'mean')}
                                                                        />
                                                                        <Label htmlFor={`mean-${propConfig.propertyId}`} className="text-sm">Mean</Label>
                                                                    </div>
                                                                    {/* Range */}
                                                                    <div className="flex items-center space-x-2">
                                                                        <Checkbox
                                                                            id={`range-${propConfig.propertyId}`}
                                                                            checked={propConfig.statsTypes?.includes('range') ?? true}
                                                                            onCheckedChange={() => handleStatsTypeToggle(propConfig.propertyId, 'range')}
                                                                        />
                                                                        <Label htmlFor={`range-${propConfig.propertyId}`} className="text-sm">Min / Max</Label>
                                                                    </div>
                                                                    {/* Design Values */}
                                                                    <div className="flex items-center space-x-2">
                                                                        <Checkbox
                                                                            id={`design-${propConfig.propertyId}`}
                                                                            checked={propConfig.statsTypes?.includes('design') ?? false}
                                                                            onCheckedChange={() => handleStatsTypeToggle(propConfig.propertyId, 'design')}
                                                                        />
                                                                        <Label htmlFor={`design-${propConfig.propertyId}`} className="text-sm font-medium text-blue-600">Design (A/B)</Label>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </PopoverContent>
                                                    </Popover>

                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive"
                                                        disabled={!isEditing}
                                                        onClick={() => handleRemoveProperty(propConfig.propertyId)}
                                                    >
                                                        <Trash className="h-3 w-3" />
                                                    </Button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                    {selectedMethod.properties.length === 0 && (
                                        <div className="text-center py-12 text-muted-foreground text-sm">
                                            No properties assigned.
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-8">
                            <Search className="h-10 w-10 mb-4 opacity-20" />
                            <h3 className="text-lg font-medium text-foreground">Select a Test Method</h3>
                        </div>
                    )}
                </Card>
            </div>


            <AlertDialog open={!!methodToDelete} onOpenChange={(open) => !open && setMethodToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete this test method and its configuration.
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
