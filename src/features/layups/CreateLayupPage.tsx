import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAppStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ShieldCheck, Layers } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LayupStackEditor } from './LayupStackEditor';
import { toast } from "sonner";

export function CreateLayupPage() {
    const navigate = useNavigate();
    const { addLayup, materials, fetchMaterials, requirementProfiles, fetchRequirementProfiles } = useAppStore();

    // Mode Selection: 'product' | 'reference'
    const [mode, setMode] = useState<'product' | 'reference'>('product');

    // Reference Layup Form State
    const [selectedMaterialId, setSelectedMaterialId] = useState<string>("");
    const [selectedProfileId, setSelectedProfileId] = useState<string>("");
    const [selectedArchitectureId, setSelectedArchitectureId] = useState<string>("");
    const [refName, setRefName] = useState<string>("");

    useEffect(() => {
        fetchMaterials();
        fetchRequirementProfiles();
    }, [fetchMaterials, fetchRequirementProfiles]);

    // Derived Lists for Cascading Dropdowns
    const selectedMaterial = materials.find(m => m.id === selectedMaterialId);

    // Profiles applicable to selected material
    const availableProfiles = requirementProfiles.filter(p => {
        if (!selectedMaterial) return false;
        const materialTag = `material:${selectedMaterial.name}`;
        // Check explicit assignment OR tag match
        return (selectedMaterial.assignedProfileIds?.includes(p.id)) ||
            (p.applicability?.includes(materialTag));
    });

    const selectedProfile = requirementProfiles.find(p => p.id === selectedProfileId);
    const availableArchitectures = selectedProfile?.layupArchitectures || [];
    const selectedArchitecture = availableArchitectures.find(a => a.id === selectedArchitectureId);

    // Auto-generate name when selections change
    useEffect(() => {
        if (selectedMaterial && selectedArchitecture) {
            setRefName(`${selectedMaterial.name} - ${selectedArchitecture.name}`);
        }
    }, [selectedMaterial, selectedArchitecture]);

    const handleSaveSuccess = () => {
        navigate('/layups');
    };

    const handleCreateReferenceLayup = async () => {
        if (!selectedMaterialId || !selectedProfileId || !selectedArchitectureId || !refName) {
            toast.error("Please complete all fields.");
            return;
        }

        try {
            await addLayup({
                name: refName,
                status: 'active', // Default for reference? or 'standard'?
                isReference: true,
                materialId: selectedMaterialId,
                architectureTypeId: selectedArchitectureId,
                assignedProfileIds: [selectedProfileId], // Auto-link the profile
                layers: [], // Empty stack for now, or could generate dummy layers based on arch.layerCount
                totalThickness: selectedArchitecture?.thickness || 0,
                totalWeight: 0,
                processParams: {},
                measurements: [],
                createdBy: '00000000-0000-0000-0000-000000000000'
            });
            toast.success("Reference Layup created successfully");
            navigate('/layups');
        } catch (e: any) {
            console.error("Failed to create reference layup", e);
            toast.error(e.message || "Failed to create layup");
        }
    };

    return (
        <div className="flex flex-col h-full bg-background animate-in fade-in">
            {/* Header */}
            <div className="border-b px-6 py-4 flex items-center justify-between bg-card text-card-foreground shadow-sm">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" asChild>
                        <Link to="/layups">
                            <ArrowLeft className="h-5 w-5" />
                        </Link>
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Create New Layup</h1>
                        <p className="text-sm text-muted-foreground">
                            {mode === 'product' ? "Define stack sequence for a product layup." : "Register a standard reference layup for testing."}
                        </p>
                    </div>
                </div>

                {/* Mode Toggles */}
                <Tabs value={mode} onValueChange={(v: any) => setMode(v)} className="w-[400px]">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="product">
                            <Layers className="h-4 w-4 mr-2" />
                            Product Layup
                        </TabsTrigger>
                        <TabsTrigger value="reference">
                            <ShieldCheck className="h-4 w-4 mr-2" />
                            Reference Layup
                        </TabsTrigger>
                    </TabsList>
                </Tabs>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden p-6">
                {mode === 'product' ? (
                    <LayupStackEditor
                        readonly={false}
                        onSaveSuccess={handleSaveSuccess}
                    />
                ) : (
                    <div className="max-w-2xl mx-auto space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Reference Layup Definition</CardTitle>
                                <CardDescription>
                                    Link a material to a standard architecture to track test data.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                {/* 1. Material */}
                                <div className="space-y-2">
                                    <Label>Material</Label>
                                    <Select value={selectedMaterialId} onValueChange={(val) => {
                                        setSelectedMaterialId(val);
                                        setSelectedProfileId(""); // Reset dependent fields
                                        setSelectedArchitectureId("");
                                    }}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select Material..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {materials.filter(m => !['restricted', 'obsolete'].includes(m.status)).map(m => (
                                                <SelectItem key={m.id} value={m.id}>{m.name} ({m.type})</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* 2. Standard (Profile) */}
                                <div className="space-y-2">
                                    <Label>Standard / Requirement Profile</Label>
                                    <Select
                                        value={selectedProfileId}
                                        onValueChange={(val) => {
                                            setSelectedProfileId(val);
                                            setSelectedArchitectureId("");
                                        }}
                                        disabled={!selectedMaterialId}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder={!selectedMaterialId ? "Select Material first" : "Select Standard..."} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {availableProfiles.length === 0 ? (
                                                <div className="p-2 text-sm text-muted-foreground text-center">No profiles found for this material.</div>
                                            ) : (
                                                availableProfiles.map(p => (
                                                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                                ))
                                            )}
                                        </SelectContent>
                                    </Select>
                                    {selectedMaterialId && availableProfiles.length === 0 && (
                                        <p className="text-[10px] text-destructive">
                                            This material has no assigned standards. Please assign a standard to the material first.
                                        </p>
                                    )}
                                </div>

                                {/* 3. Architecture Type */}
                                <div className="space-y-2">
                                    <Label>Architecture Type</Label>
                                    <Select
                                        value={selectedArchitectureId}
                                        onValueChange={setSelectedArchitectureId}
                                        disabled={!selectedProfileId}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder={!selectedProfileId ? "Select Standard first" : "Select Architecture Type..."} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {availableArchitectures.length === 0 ? (
                                                <div className="p-2 text-sm text-muted-foreground text-center">No architectures defined in this standard.</div>
                                            ) : (
                                                availableArchitectures.map(a => (
                                                    <SelectItem key={a.id} value={a.id}>
                                                        {a.name} ({a.layerCount} layers, {a.thickness}mm)
                                                    </SelectItem>
                                                ))
                                            )}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* 4. Name (Auto-generated but editable) */}
                                <div className="space-y-2">
                                    <Label>Layup Name</Label>
                                    <Input
                                        value={refName}
                                        onChange={(e) => setRefName(e.target.value)}
                                        placeholder="e.g. PHG-9012 - Monolithic 8"
                                    />
                                </div>

                                <div className="pt-4 flex justify-end">
                                    <Button onClick={handleCreateReferenceLayup} disabled={!selectedArchitectureId || !refName}>
                                        Create Reference Layup
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}
            </div>
        </div>
    );
}
