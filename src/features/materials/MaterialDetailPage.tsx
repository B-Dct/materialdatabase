import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LayoutGrid, Box, FileText, ArrowLeft, Pencil, Save, X as XIcon, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MaterialPropertiesView } from './MaterialPropertiesView';
import { MaterialSpecifications } from './MaterialSpecifications';
import { VariantManager } from './VariantManager';
import { MaterialUsage } from './MaterialUsage';
import { EntityStandardsManager } from '@/features/quality/EntityStandardsManager';
import { MeasurementEntry } from '@/features/quality/MeasurementEntry';
import { Ruler, Award, CheckCircle, Copy, Network } from 'lucide-react'; // Ensure imports are consolidated
import type { Material } from '@/types/domain';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export function MaterialDetailPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const {
        materials,
        fetchMaterials,
        measurements,
        fetchMeasurements,
        fetchSpecifications,
        updateMaterial,
        deleteMaterial
    } = useAppStore();

    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState<Partial<Material>>({});

    useEffect(() => {
        if (materials.length === 0) fetchMaterials();
        fetchMeasurements();
        if (id) fetchSpecifications(id, 'material');
    }, [id, materials.length, fetchMaterials, fetchMeasurements, fetchSpecifications]);

    const material = materials.find(m => m.id === id);

    useEffect(() => {
        if (material && !isEditing) {
            setFormData(material);
        }
    }, [material, isEditing]);

    if (!material) {
        return (
            <div className="p-10 border-4 border-red-500 bg-red-50">
                <h1 className="text-2xl font-bold text-red-700">Material Not Found!</h1>
                <p>Requested ID: {id}</p>
                <div className="mt-4 bg-white p-4 rounded text-sm">
                    <strong>Available Materials (Click to switch):</strong>
                    <ul className="list-disc pl-5 mt-2">
                        {materials.slice(0, 5).map(m => (
                            <li key={m.id}>
                                <button className="text-blue-600 underline" onClick={() => navigate(`/materials/${m.id}`)}>
                                    {m.name}
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        );
    }

    const handleEdit = () => {
        setFormData({ ...material });
        setIsEditing(true);
    };

    const handleCancel = () => {
        setIsEditing(false);
        setFormData({ ...material });
    };

    const handleSave = async () => {
        if (!material.id) return;
        await updateMaterial(material.id, formData);
        setIsEditing(false);
    };

    const handleDelete = async () => {
        if (!material.id) return;
        await deleteMaterial(material.id);
        navigate('/materials');
    };

    const handleChange = (field: keyof Material, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    return (
        <div className="flex h-full flex-col bg-background animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex items-center justify-between border-b px-6 py-4">
                <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => navigate('/materials')}>
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                        {isEditing ? (
                            <Input
                                value={formData.name || ''}
                                onChange={(e) => handleChange('name', e.target.value)}
                                className="h-7 text-lg font-semibold w-[300px]"
                            />
                        ) : (
                            <h1 className="text-xl font-semibold">{material.name}</h1>
                        )}
                        {!isEditing && <StatusBadge status={material.status} className="ml-2" />}
                    </div>
                    {!isEditing && (
                        <div className="text-xs text-muted-foreground flex gap-2 pl-8">
                            <span>{material.type}</span>
                            <span>•</span>
                            <span>{material.manufacturer}</span>
                        </div>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    {isEditing ? (
                        <>
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="destructive" size="sm">
                                        <Trash2 className="h-4 w-4 mr-2" /> Delete
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            This action cannot be undone. This will permanently delete the material
                                            <strong> {material.name}</strong> and all associated data.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
                                            Delete Material
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                            <Button variant="outline" size="sm" onClick={handleCancel}>
                                <XIcon className="h-4 w-4 mr-2" /> Cancel
                            </Button>
                            <Button size="sm" onClick={handleSave}>
                                <Save className="h-4 w-4 mr-2" /> Save Changes
                            </Button>
                        </>
                    ) : (
                        <Button variant="outline" size="sm" onClick={handleEdit}>
                            <Pencil className="h-4 w-4 mr-2" /> Edit Material
                        </Button>
                    )}
                </div>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="overview" className="flex flex-1 flex-col overflow-hidden">
                <div className="border-b px-6 bg-muted/20">
                    <TabsList className="bg-transparent p-0 gap-6">
                        <TabsTrigger value="overview" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full px-0">
                            <LayoutGrid className="h-4 w-4 mr-2" /> Overview
                        </TabsTrigger>
                        <TabsTrigger value="properties" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full px-0">
                            <Box className="h-4 w-4 mr-2" /> Properties
                        </TabsTrigger>
                        <TabsTrigger value="specifications" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full px-0">
                            <FileText className="h-4 w-4 mr-2" /> Specifications
                        </TabsTrigger>
                        <TabsTrigger value="measurements" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full px-0">
                            <Ruler className="h-4 w-4 mr-2" /> Measurements
                        </TabsTrigger>
                        <TabsTrigger value="standards" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full px-0">
                            <Award className="h-4 w-4 mr-2" /> Standards
                        </TabsTrigger>
                        <TabsTrigger value="allowables" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full px-0">
                            <CheckCircle className="h-4 w-4 mr-2" /> Allowables
                        </TabsTrigger>
                        <TabsTrigger value="variants" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full px-0">
                            <Copy className="h-4 w-4 mr-2" /> Variants
                        </TabsTrigger>
                        <TabsTrigger value="usage" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full px-0">
                            <Network className="h-4 w-4 mr-2" /> Usage
                        </TabsTrigger>
                    </TabsList>
                </div>

                <div className="flex-1 overflow-auto p-6 bg-slate-50/50 dark:bg-slate-900/20">
                    <TabsContent value="overview" className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Identity Column */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>Identity & Classification</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="grid grid-cols-3 gap-4 text-sm items-center">
                                        <span className="text-muted-foreground font-medium">Material ID</span>
                                        <span className="col-span-2 text-muted-foreground">{material.materialId}</span>
                                    </div>
                                    <div className="grid grid-cols-3 gap-4 text-sm items-center">
                                        <span className="text-muted-foreground font-medium">Material List #</span>
                                        <span className="col-span-2 text-muted-foreground">{material.materialListNumber}</span>
                                    </div>
                                    <div className="grid grid-cols-3 gap-4 text-sm items-center">
                                        <span className="text-muted-foreground font-medium">Name</span>
                                        {isEditing ? (
                                            <Input
                                                value={formData.name || ''}
                                                onChange={(e) => handleChange('name', e.target.value)}
                                                className="col-span-2 h-8"
                                            />
                                        ) : (
                                            <span className="col-span-2">{material.name}</span>
                                        )}
                                    </div>
                                    <div className="grid grid-cols-3 gap-4 text-sm items-center">
                                        <span className="text-muted-foreground font-medium">Type</span>
                                        {isEditing ? (
                                            <Input // Pending strict type select logic
                                                value={formData.type || ''}
                                                onChange={(e) => handleChange('type', e.target.value)}
                                                className="col-span-2 h-8"
                                                placeholder='e.g. Prepreg'
                                            />
                                        ) : (
                                            <span className="col-span-2">{material.type}</span>
                                        )}
                                    </div>
                                    <div className="grid grid-cols-3 gap-4 text-sm pt-4 border-t items-center">
                                        <span className="text-muted-foreground font-medium">Status</span>
                                        <div className="col-span-2">
                                            {isEditing ? (
                                                <Select
                                                    value={formData.status}
                                                    onValueChange={(val) => handleChange('status', val)}
                                                >
                                                    <SelectTrigger className="h-8 w-full">
                                                        <SelectValue placeholder="Status" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="active">Active</SelectItem>
                                                        <SelectItem value="standard">Standard</SelectItem>
                                                        <SelectItem value="restricted">Restricted</SelectItem>
                                                        <SelectItem value="obsolete">Obsolete</SelectItem>
                                                        <SelectItem value="engineering">Engineering</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            ) : (
                                                <div className="flex flex-wrap gap-2">
                                                    <StatusBadge status={material.status} />
                                                    <Badge variant={material.reachStatus === 'reach_compliant' ? 'outline' : 'destructive'} className="border-green-600 text-green-700 bg-green-50">
                                                        {material.reachStatus?.replace('_', ' ').toUpperCase()}
                                                    </Badge>
                                                    <Badge variant="outline">Maturity Level {material.maturityLevel}</Badge>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {isEditing && (
                                        <>
                                            <div className="grid grid-cols-3 gap-4 text-sm items-center">
                                                <span className="text-muted-foreground font-medium">REACH</span>
                                                <div className="col-span-2">
                                                    <Select
                                                        value={formData.reachStatus}
                                                        onValueChange={(val) => handleChange('reachStatus', val)}
                                                    >
                                                        <SelectTrigger className="h-8 w-full">
                                                            <SelectValue placeholder="REACH Status" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="reach_compliant">Reach Compliant</SelectItem>
                                                            <SelectItem value="svhc_contained">SVHC Contained</SelectItem>
                                                            <SelectItem value="restricted">Restricted</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-3 gap-4 text-sm items-center">
                                                <span className="text-muted-foreground font-medium">Maturity</span>
                                                <div className="col-span-2">
                                                    <Select
                                                        value={String(formData.maturityLevel || 1)}
                                                        onValueChange={(val) => handleChange('maturityLevel', parseInt(val))}
                                                    >
                                                        <SelectTrigger className="h-8 w-full">
                                                            <SelectValue placeholder="Level" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="1">Level 1</SelectItem>
                                                            <SelectItem value="2">Level 2</SelectItem>
                                                            <SelectItem value="3">Level 3</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Supply Chain Column */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>Supply Chain</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="grid grid-cols-3 gap-4 text-sm items-center">
                                        <span className="text-muted-foreground font-medium">Manufacturer</span>
                                        {isEditing ? (
                                            <Input
                                                value={formData.manufacturer || ''}
                                                onChange={(e) => handleChange('manufacturer', e.target.value)}
                                                className="col-span-2 h-8"
                                            />
                                        ) : (
                                            <span className="col-span-2">{material.manufacturer}</span>
                                        )}
                                    </div>
                                    <div className="grid grid-cols-3 gap-4 text-sm items-start">
                                        <span className="text-muted-foreground font-medium pt-2">Address</span>
                                        {isEditing ? (
                                            <Textarea
                                                value={formData.manufacturerAddress || ''}
                                                onChange={(e) => handleChange('manufacturerAddress', e.target.value)}
                                                className="col-span-2 min-h-[80px]"
                                            />
                                        ) : (
                                            <span className="col-span-2 whitespace-pre-wrap">{material.manufacturerAddress || "-"}</span>
                                        )}
                                    </div>
                                    <div className="grid grid-cols-3 gap-4 text-sm items-center">
                                        <span className="text-muted-foreground font-medium">Supplier</span>
                                        {isEditing ? (
                                            <Input
                                                value={formData.supplier || ''}
                                                onChange={(e) => handleChange('supplier', e.target.value)}
                                                className="col-span-2 h-8"
                                            />
                                        ) : (
                                            <span className="col-span-2">{material.supplier || "-"}</span>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Description Section */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Description</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {isEditing ? (
                                    <Textarea
                                        value={formData.description || ''}
                                        onChange={(e) => handleChange('description', e.target.value)}
                                        className="min-h-[100px]"
                                    />
                                ) : (
                                    <p className="text-sm whitespace-pre-wrap">{material.description || "No description provided."}</p>
                                )}
                            </CardContent>
                        </Card>

                        {/* Meta Info Footer */}
                        <div className="text-xs text-muted-foreground grid grid-cols-2 lg:grid-cols-4 gap-4 px-2">
                            <div>
                                <span className="block font-medium mb-1">System UUID</span>
                                <span className="font-mono text-[10px]">{material.id}</span>
                            </div>
                            <div>
                                <span className="block font-medium mb-1">Created At</span>
                                <span>{new Date(material.createdAt).toLocaleString()}</span>
                            </div>
                            {material.updatedAt && (
                                <div>
                                    <span className="block font-medium mb-1">Last Updated</span>
                                    <span>{new Date(material.updatedAt).toLocaleString()}</span>
                                </div>
                            )}
                        </div>
                    </TabsContent>

                    <TabsContent value="properties" className="h-full">
                        <MaterialPropertiesView
                            material={material}
                            measurements={(measurements || []).filter(m => m.materialId === material.id)}
                        />
                    </TabsContent>

                    <TabsContent value="specifications">
                        <MaterialSpecifications material={material} />
                    </TabsContent>

                    <TabsContent value="measurements">
                        <MeasurementEntry
                            parentId={material.id}
                            parentType="material"
                        />
                    </TabsContent>

                    <TabsContent value="standards">
                        <EntityStandardsManager
                            assignedProfileIds={material.assignedProfileIds || []}
                            onAssign={async (id) => {
                                const currentIds = material.assignedProfileIds || [];
                                await updateMaterial(material.id, { assignedProfileIds: [...currentIds, id] });
                            }}
                            onUnassign={async (id) => {
                                const currentIds = material.assignedProfileIds || [];
                                await updateMaterial(material.id, { assignedProfileIds: currentIds.filter(pid => pid !== id) });
                            }}
                        />
                    </TabsContent>

                    <TabsContent value="allowables">
                        <div className="p-4 border-2 border-dashed rounded text-center text-muted-foreground">
                            Placeholder: MaterialAllowablesView
                        </div>
                    </TabsContent>

                    <TabsContent value="variants">
                        <VariantManager material={material} />
                    </TabsContent>

                    <TabsContent value="usage">
                        <MaterialUsage material={material} />
                    </TabsContent>
                </div>
            </Tabs>
        </div>
    );
}
