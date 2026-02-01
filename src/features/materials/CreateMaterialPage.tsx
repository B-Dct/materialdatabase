import { useState, useEffect } from "react";
import { useAppStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { ChevronLeft, Save } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { AlertCircle } from "lucide-react";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import type { Material, EntityStatus } from "@/types/domain";

export function CreateMaterialPage() {
    const navigate = useNavigate();
    const { addMaterial, materialTypes, fetchMaterialTypes, materials, fetchMaterials } = useAppStore();
    const [error, setError] = useState<string | null>(null);

    const [formData, setFormData] = useState<Partial<Material>>({
        materialId: "",
        materialListNumber: "",
        name: "",
        type: "",
        manufacturer: "",
        manufacturerAddress: "",
        supplier: "",
        reachStatus: "reach_compliant",
        maturityLevel: 1,
        description: "",
        status: "active" as EntityStatus,
    });

    useEffect(() => {
        fetchMaterialTypes();
        if (materials.length === 0) fetchMaterials();
    }, [fetchMaterialTypes, fetchMaterials, materials.length]);

    const isValid = formData.name && formData.type && formData.manufacturer && formData.materialId;

    const handleSubmit = async () => {
        if (!isValid) return;
        setError(null);

        // Validation: Check for duplicates
        const duplicateId = materials.find(m => m.materialId.toLowerCase() === formData.materialId?.toLowerCase());
        if (duplicateId) {
            setError(`Material ID '${formData.materialId}' already exists.`);
            return;
        }

        const duplicateName = materials.find(m => m.name.toLowerCase() === formData.name?.toLowerCase());
        if (duplicateName) {
            setError(`Material Name '${formData.name}' already exists.`);
            return;
        }

        if (formData.materialListNumber) {
            const listNum = formData.materialListNumber;
            const duplicateList = materials.find(m => m.materialListNumber?.toLowerCase() === listNum.toLowerCase());
            if (duplicateList) {
                setError(`List Number '${formData.materialListNumber}' already exists.`);
                return;
            }
        }

        try {
            await addMaterial(formData as Omit<Material, "id">);
            navigate("/materials");
        } catch (error) {
            console.error("Failed to create material:", error);
            setError("Failed to save material. Please try again.");
        }
    };

    return (
        <div className="h-full flex flex-col overflow-hidden animate-in fade-in duration-500">
            {/* Header */}
            <div className="border-b bg-background/95 backdrop-blur p-4 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => navigate('/materials')}>
                        <ChevronLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <h1 className="text-xl font-bold tracking-tight">Create New Material</h1>
                        <p className="text-sm text-muted-foreground">Register a new base material in the database.</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => navigate('/materials')}>Cancel</Button>
                    <Button onClick={handleSubmit} disabled={!isValid}>
                        <Save className="mr-2 h-4 w-4" /> Create Material
                    </Button>
                </div>
            </div>

            {/* Content - Scrollable Form */}
            <div className="flex-1 overflow-auto p-8 bg-slate-50/50 dark:bg-slate-900/20">
                <div className="max-w-5xl mx-auto space-y-6">
                    {/* Error Alert */}
                    {error && (
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>Validation Error</AlertTitle>
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                        {/* General Information */}
                        <Card className="md:col-span-2">
                            <CardHeader>
                                <CardTitle>General Information</CardTitle>
                                <CardDescription>Basic identification details for the material.</CardDescription>
                            </CardHeader>
                            <CardContent className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label htmlFor="materialId">Material ID *</Label>
                                    <Input
                                        id="materialId"
                                        placeholder="e.g. MAT-001"
                                        value={formData.materialId}
                                        onChange={e => setFormData({ ...formData, materialId: e.target.value })}
                                    />
                                    <p className="text-[10px] text-muted-foreground">Unique identifier for the material.</p>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="materialListNumber">List Number</Label>
                                    <Input
                                        id="materialListNumber"
                                        placeholder="e.g. L-123456"
                                        value={formData.materialListNumber}
                                        onChange={e => setFormData({ ...formData, materialListNumber: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="name">Material Name *</Label>
                                    <Input
                                        id="name"
                                        placeholder="e.g. HexPly 8552"
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="type">Material Type *</Label>
                                    <Select
                                        value={formData.type}
                                        onValueChange={val => setFormData({ ...formData, type: val })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select Type..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {materialTypes.length === 0 ? (
                                                <SelectItem value="none" disabled>No types defined</SelectItem>
                                            ) : (
                                                materialTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)
                                            )}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="md:col-span-2 space-y-2">
                                    <Label htmlFor="description">Description</Label>
                                    <Textarea
                                        id="description"
                                        placeholder="Technical summary, resin content, fiber type..."
                                        className="min-h-[100px]"
                                        value={formData.description}
                                        onChange={e => setFormData({ ...formData, description: e.target.value })}
                                    />
                                </div>
                            </CardContent>
                        </Card>

                        {/* Supply Chain */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Supply Chain</CardTitle>
                                <CardDescription>Manufacturer and supplier details.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="manufacturer">Manufacturer *</Label>
                                    <Input
                                        id="manufacturer"
                                        placeholder="e.g. Hexcel"
                                        value={formData.manufacturer}
                                        onChange={e => setFormData({ ...formData, manufacturer: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="address">Manufacturer Address</Label>
                                    <Input
                                        id="address"
                                        placeholder="City, Country"
                                        value={formData.manufacturerAddress}
                                        onChange={e => setFormData({ ...formData, manufacturerAddress: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="supplier">Supplier</Label>
                                    <Input
                                        id="supplier"
                                        placeholder="Direct or Distributor Name"
                                        value={formData.supplier}
                                        onChange={e => setFormData({ ...formData, supplier: e.target.value })}
                                    />
                                </div>
                            </CardContent>
                        </Card>

                        {/* Compliance & Status */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Classification</CardTitle>
                                <CardDescription>Status, maturity and compliance.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="status">Initial Status</Label>
                                    <Select
                                        value={formData.status}
                                        onValueChange={(val: any) => setFormData({ ...formData, status: val })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="active">Active</SelectItem>
                                            <SelectItem value="standard">Standard</SelectItem>
                                            <SelectItem value="restricted">Restricted</SelectItem>
                                            <SelectItem value="obsolete">Obsolete</SelectItem>
                                            <SelectItem value="engineering">Engineering</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="maturity">Maturity Level</Label>
                                    <Select
                                        value={formData.maturityLevel?.toString()}
                                        onValueChange={val => setFormData({ ...formData, maturityLevel: parseInt(val) as 1 | 2 | 3 })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="1">1 - Low (Experimental)</SelectItem>
                                            <SelectItem value="2">2 - Medium (Proven)</SelectItem>
                                            <SelectItem value="3">3 - High (Standard)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="reach">REACH Status</Label>
                                    <Select
                                        value={formData.reachStatus}
                                        onValueChange={(val: any) => setFormData({ ...formData, reachStatus: val })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="reach_compliant">Reach Compliant</SelectItem>
                                            <SelectItem value="svhc_contained">SVHC Contained</SelectItem>
                                            <SelectItem value="restricted">Restricted</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </CardContent>
                        </Card>

                    </div>
                </div>
            </div>
        </div>
    );
}
