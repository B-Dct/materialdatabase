import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAppStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, FlaskConical, PlusCircle, Trash2, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

interface PropertyRequestState {
    propertyId: string;
    propertyName: string;
    testMethodId: string;
    testMethodName: string;
    numVariants: number;
    numSpecimens: number;
    variantDescription: string;
}
export function CreateTestRequestPage() {
    const { entityType, entityId } = useParams<{ entityType: string; entityId: string }>();
    const navigate = useNavigate();

    const {
        materials, layups, assemblies,
        properties, fetchProperties,
        testMethods, fetchTestMethods,
        createTestRequests
    } = useAppStore();

    const [isLoadingData, setIsLoadingData] = useState(true);
    const [requesterName, setRequesterName] = useState('');
    const [requestItems, setRequestItems] = useState<PropertyRequestState[]>([]);

    // Derived entity logic
    const entity = useMemo(() => {
        if (!entityId) return null;
        if (entityType === 'material') return materials.find(m => m.id === entityId);
        if (entityType === 'layup') return layups.find(l => l.id === entityId);
        if (entityType === 'assembly') return assemblies.find(a => a.id === entityId);
        return null;
    }, [entityType, entityId, materials, layups, assemblies]);

    const entityName = entity?.name || 'Unknown Entity';

    // Load necessary data and compute "smart" defaults
    useEffect(() => {
        async function loadData() {
            setIsLoadingData(true);
            if (properties.length === 0) await fetchProperties();
            if (testMethods.length === 0) await fetchTestMethods();

            setIsLoadingData(false);
        }
        loadData();
    }, [entityId, entityType, fetchProperties, fetchTestMethods]);

    // Compute default properties once data is loaded
    // User Feedback: Removed auto-population of assigned properties. User only wants to test explicitly selected properties.
    useEffect(() => {
        if (isLoadingData || !entityId) return;
        if (requestItems.length > 0) return; // Only default on first load

        // The user explicitly requested to NOT pre-fill the form with all assigned properties.
        // They want to start with an empty list and add properties manually.
        setRequestItems([]);

    }, [isLoadingData, entityId]);

    // Handle adding a manual property
    const handleAddProperty = (propertyId: string) => {
        if (requestItems.some(i => i.propertyId === propertyId)) {
            toast.error("This property is already in the request.");
            return;
        }

        const propDef = properties.find(p => p.id === propertyId);
        if (!propDef) return;

        const availableMethods = testMethods.filter(tm => !tm.category || tm.category === propDef.category);
        const defaultMethod = availableMethods[0];

        setRequestItems([
            ...requestItems,
            {
                propertyId,
                propertyName: propDef.name,
                testMethodId: defaultMethod?.id || '',
                testMethodName: defaultMethod?.name || '',
                numVariants: 1,
                numSpecimens: 5,
                variantDescription: ''
            }
        ]);
    };

    const handleRemoveProperty = (propertyId: string) => {
        setRequestItems(requestItems.filter(i => i.propertyId !== propertyId));
    };

    const handleUpdateItem = (propertyId: string, updates: Partial<PropertyRequestState>) => {
        setRequestItems(prev => prev.map(item => {
            if (item.propertyId === propertyId) {
                const newItem = { ...item, ...updates };
                // Keep method name in sync with method id
                if (updates.testMethodId) {
                    const method = testMethods.find(tm => tm.id === updates.testMethodId);
                    if (method) newItem.testMethodName = method.name;
                }
                return newItem;
            }
            return item;
        }));
    };

    const handleSubmit = async () => {
        if (!requesterName.trim()) {
            toast.error("Please enter a requester name.");
            return;
        }

        if (requestItems.length === 0) {
            toast.error("Please add at least one property to test.");
            return;
        }

        // Validate all items have methods
        const invalidItems = requestItems.filter(i => !i.testMethodId);
        if (invalidItems.length > 0) {
            toast.error(`Please select a test method for: ${invalidItems.map(i => i.propertyName).join(', ')}`);
            return;
        }

        try {
            const requestsToCreate = requestItems.map(item => ({
                entityType: entityType as 'material' | 'layup' | 'assembly',
                entityId: entityId!,
                entityName: entityName,
                requesterName,
                status: 'requested' as const,
                propertyId: item.propertyId,
                propertyName: item.propertyName,
                testMethodId: item.testMethodId,
                testMethodName: item.testMethodName,
                numVariants: item.numVariants,
                numSpecimens: item.numSpecimens,
                variantDescription: item.variantDescription
            }));

            await createTestRequests(requestsToCreate);

            // Navigate back to entity
            navigate(`/${entityType}s/${entityId}`);

        } catch (error: any) {
            console.error("Failed to submit requests", error);
        }
    };

    // Filter properties dropdown to only those with at least one matching test method
    const availablePropertiesToAdd = useMemo(() => {
        return properties.filter(prop => {
            // Must have a test method
            const hasMethod = testMethods.some(tm => !tm.category || tm.category === prop.category);
            // Must not already be selected
            const notSelected = !requestItems.some(i => i.propertyId === prop.id);
            return hasMethod && notSelected;
        });
    }, [properties, testMethods, requestItems]);

    if (isLoadingData) {
        return <div className="p-8 text-center text-muted-foreground">Loading test request context...</div>;
    }

    return (
        <div className="flex h-full flex-col bg-background animate-in fade-in duration-500">
            {/* Header */}
            <div className="border-b px-6 py-4 flex items-center justify-between shrink-0 bg-card z-10">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => navigate(`/${entityType}s/${entityId}`)}>
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <div className="flex items-center gap-2">
                            <div className="bg-primary/10 p-2 rounded-lg">
                                <FlaskConical className="h-5 w-5 text-primary" />
                            </div>
                            <h1 className="text-xl font-bold tracking-tight">Request Lab Tests</h1>
                        </div>
                        <p className="text-sm text-muted-foreground ml-11">
                            Creating order for {entityType} <span className="font-medium text-foreground">{entityName}</span>
                        </p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => navigate(`/${entityType}s/${entityId}`)}>Cancel</Button>
                    <Button onClick={handleSubmit} disabled={requestItems.length === 0 || !requesterName.trim()} className="gap-2">
                        <CheckCircle2 className="h-4 w-4" />
                        Submit Request(s)
                    </Button>
                </div>
            </div>

            <div className="flex-1 overflow-auto p-6 bg-slate-50/50 dark:bg-slate-900/20">
                <div className="max-w-4xl mx-auto space-y-6">

                    {/* General Info */}
                    <Card>
                        <CardHeader className="pb-4">
                            <CardTitle className="text-lg">General Information</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid gap-2">
                                <Label htmlFor="requester">Requester Name</Label>
                                <Input
                                    id="requester"
                                    placeholder="e.g. Jane Doe"
                                    value={requesterName}
                                    onChange={(e) => setRequesterName(e.target.value)}
                                    className="max-w-md"
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Properties to Test */}
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-semibold tracking-tight">Properties to Test</h2>
                        <Select onValueChange={(val) => handleAddProperty(val)}>
                            <SelectTrigger className="w-[250px]">
                                <PlusCircle className="h-4 w-4 mr-2" />
                                <SelectValue placeholder="Add Property" />
                            </SelectTrigger>
                            <SelectContent>
                                {availablePropertiesToAdd.length === 0 ? (
                                    <div className="p-2 text-sm text-muted-foreground">No more properties available</div>
                                ) : (
                                    availablePropertiesToAdd.map(p => (
                                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                    ))
                                )}
                            </SelectContent>
                        </Select>
                    </div>

                    {requestItems.length === 0 ? (
                        <Card className="border-dashed bg-transparent">
                            <CardContent className="flex flex-col items-center justify-center p-12 text-center">
                                <FlaskConical className="h-12 w-12 text-muted-foreground mb-4 opacity-20" />
                                <p className="text-muted-foreground font-medium">No properties selected</p>
                                <p className="text-sm text-muted-foreground max-w-sm mt-1">
                                    Use the "Add Property" button above to select which properties you want the lab to test.
                                </p>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="grid gap-4">
                            {requestItems.map((item, index) => {
                                const propDef = properties.find(p => p.id === item.propertyId);
                                const availableMethods = testMethods.filter(tm => !tm.category || tm.category === propDef?.category);

                                return (
                                    <Card key={item.propertyId} className="overflow-hidden border-l-4 border-l-blue-500">
                                        <div className="p-4 bg-muted/30 border-b flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                                                    {index + 1}
                                                </div>
                                                <h3 className="font-semibold text-base">{item.propertyName}</h3>
                                            </div>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => handleRemoveProperty(item.propertyId)}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                        <CardContent className="p-4 grid gap-6">
                                            <div className="grid sm:grid-cols-3 gap-6">
                                                <div className="grid gap-2">
                                                    <Label className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Test Method <span className="text-destructive">*</span></Label>
                                                    <Select
                                                        value={item.testMethodId}
                                                        onValueChange={(val) => handleUpdateItem(item.propertyId, { testMethodId: val })}
                                                    >
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Select Method" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {availableMethods.map(m => (
                                                                <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <div className="grid gap-2">
                                                    <Label className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Number of Variants</Label>
                                                    <Input
                                                        type="number"
                                                        min={1}
                                                        value={item.numVariants}
                                                        onChange={(e) => handleUpdateItem(item.propertyId, { numVariants: parseInt(e.target.value) || 1 })}
                                                    />
                                                </div>
                                                <div className="grid gap-2">
                                                    <Label className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Specimens per Variant</Label>
                                                    <Input
                                                        type="number"
                                                        min={1}
                                                        value={item.numSpecimens}
                                                        onChange={(e) => handleUpdateItem(item.propertyId, { numSpecimens: parseInt(e.target.value) || 1 })}
                                                    />
                                                </div>
                                            </div>
                                            <div className="grid gap-2">
                                                <Label className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Variant Requirements / Description</Label>
                                                <Textarea
                                                    placeholder="Define specific conditions (e.g., RT/Dry, ETW) or layup requirements for these test specimens..."
                                                    value={item.variantDescription}
                                                    onChange={(e) => handleUpdateItem(item.propertyId, { variantDescription: e.target.value })}
                                                    className="resize-y"
                                                    rows={3}
                                                />
                                            </div>
                                        </CardContent>
                                    </Card>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
