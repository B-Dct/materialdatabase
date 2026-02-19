import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAppStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LayoutGrid, Box, FileText, ArrowLeft, Pencil, Save, X as XIcon, Trash2, Archive, Layers } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MaterialPropertiesView } from './MaterialPropertiesView';
import { MaterialSpecifications } from './MaterialSpecifications';
import { VariantManager } from './VariantManager';
import { MaterialUsage } from './MaterialUsage';
import { EntityStandardsManager } from '@/features/quality/EntityStandardsManager';
import { MeasurementEntry } from '@/features/quality/MeasurementEntry';
import { HistoryLog } from '@/features/shared/HistoryLog';
import { Ruler, Award, CheckCircle, Copy, Network } from 'lucide-react'; // Ensure imports are consolidated
import type { Material } from '@/types/domain';
import { EntityDeleteDialog } from '@/components/common/EntityDeleteDialog';


export function MaterialDetailPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const {
        materials,
        fetchMaterials,
        measurements,
        fetchMeasurements,
        fetchSpecifications,
        fetchSpecificationsForEntities,
        updateMaterial,
        deleteMaterial,
        fetchProperties,
        fetchLayups,
        fetchAssemblies,
        isLoading
    } = useAppStore();

    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState<Partial<Material>>({});
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);


    // Initial load
    useEffect(() => {
        if (materials.length === 0) fetchMaterials();

        // Fetch Contexts (Layups/Assemblies) for Reference Views
        fetchLayups();
        fetchAssemblies();

        // Also fetch related data
        fetchMeasurements();
        fetchProperties();
        if (id) fetchSpecifications(id, 'material');
    }, [id, materials.length, fetchMaterials, fetchMeasurements, fetchSpecifications, fetchProperties, fetchLayups, fetchAssemblies]);



    const material = materials.find(m => m.id === id);

    useEffect(() => {
        if (material && !isEditing) {
            setFormData(material);
        }

        if (material) {
            const entities: { id: string, type: 'material' | 'layup' | 'assembly' }[] = [];
            entities.push({ id: material.id, type: 'material' });

            (material.assignedReferenceLayupIds || []).forEach(refId => {
                entities.push({ id: refId, type: 'layup' });
            });

            (material.assignedReferenceAssemblyIds || []).forEach(refId => {
                entities.push({ id: refId, type: 'assembly' });
            });

            if (entities.length > 0 && fetchSpecificationsForEntities) {
                fetchSpecificationsForEntities(entities);
            }
        }
    }, [material, isEditing, fetchSpecificationsForEntities]);

    if (isLoading && !material) {
        return (
            <div className="flex h-screen items-center justify-center">
                <div className="flex flex-col items-center gap-2">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
                    <p className="text-muted-foreground">Loading Material...</p>
                </div>
            </div>
        );
    }

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
        try {
            await deleteMaterial(material.id);
            setDeleteDialogOpen(false);
            navigate('/materials');
        } catch (e: any) {
            const msg = e.message || "Failed to delete material";
            toast.error(msg);
            setDeleteDialogOpen(false);
        }
    };

    const handleArchive = async () => {
        if (confirm("Are you sure you want to archive this material? It will be marked as Obsolete.")) {
            handleChange('status', 'obsolete');
            // We need to save this change immediately to persist it
            // However, handleSave uses formData, so updating formData above works, but we need to trigger save.
            // But handleSave might validate other fields.
            // Let's just set it in formData and users can click Save, OR we do it nicely.
            // UI Pattern: The button assumes immediate action?
            // "Archive" usually implies an action.
            // Let's save immediately.
            try {
                if (material.id) {
                    await updateMaterial(material.id, { status: 'obsolete' });
                    setFormData(prev => ({ ...prev, status: 'obsolete' }));
                    // Refresh? Store updates automatically.
                }
            } catch (e) {
                console.error("Archive failed", e);
            }
        }
    };
    const handleChange = async (field: keyof Material, value: any) => {
        if (field === 'status') {
            const { validateStatusTransition } = await import('@/lib/integrity-utils');
            const relevantSpecs = useAppStore.getState().specifications.filter(s => s.materialId === material.id);
            const relevantMeasurements = measurements.filter(m => m.materialId === material.id);

            const result = validateStatusTransition(material.status, value, {
                hasMeasurements: relevantMeasurements.length > 0,
                hasDocuments: relevantSpecs.length > 0,
                isUsedInactiveProject: false // TODO: Check generic usage
            });

            if (!result.allowed) {
                toast.error(result.reason || "Status transition not allowed");
                return;
            }
        }
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
                            <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => setDeleteDialogOpen(true)}
                            >
                                <Trash2 className="h-4 w-4 mr-2" /> Delete
                            </Button>

                            <EntityDeleteDialog
                                open={deleteDialogOpen}
                                onOpenChange={setDeleteDialogOpen}
                                entityName={material.name}
                                entityType="Material"
                                onConfirm={handleDelete}
                            />

                            {/* Archive Button */}
                            {formData.status !== 'obsolete' && (
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => {
                                        // If we want it to be part of "Save", we just change state. 
                                        // But "Archive" feels like an action.
                                        // Let's implement handlesArchive which saves immediately?
                                        // Or just sets the status dropdown to obsolete?
                                        // Simpler: Set status to obsolete in formData and show toast/alert "Status set to obsolete, click Save".
                                        // User Experience: "Archive" button should probably just do it.
                                        // I'll stick to my handleArchive implementation above.
                                        handleArchive();
                                    }}
                                >
                                    <Archive className="h-4 w-4 mr-2" /> Archive
                                </Button>
                            )}

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

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Reference Context Column */}
                            <Card>
                                <CardHeader>
                                    <div className="flex items-center justify-between">
                                        <CardTitle>Reference Context (Engineering)</CardTitle>
                                        {isEditing && (
                                            <div className="flex gap-2">
                                                {/* Add Layup Button */}
                                                <Select
                                                    onValueChange={(val) => {
                                                        const current = formData.assignedReferenceLayupIds || [];
                                                        if (!current.includes(val)) {
                                                            handleChange('assignedReferenceLayupIds', [...current, val]);
                                                        }
                                                    }}
                                                >
                                                    <SelectTrigger className="h-7 w-[130px] text-xs">
                                                        <SelectValue placeholder="+ Add Layup" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {useAppStore.getState().layups
                                                            .filter(l => l.isReference)
                                                            .filter(l => !(formData.assignedReferenceLayupIds || []).includes(l.id))
                                                            .map(l => (
                                                                <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                                                            ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        )}
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="space-y-2">
                                        <span className="text-sm font-medium text-muted-foreground block">Assigned Reference Layups</span>
                                        {(formData.assignedReferenceLayupIds || material.assignedReferenceLayupIds || []).length > 0 ? (
                                            <div className="flex flex-wrap gap-2">
                                                {(formData.assignedReferenceLayupIds || material.assignedReferenceLayupIds || []).map(refId => {
                                                    const layup = useAppStore.getState().layups.find(l => l.id === refId);
                                                    if (!layup) return null;
                                                    return (
                                                        <Badge key={refId} variant="secondary" className="flex items-center gap-1 pr-1">
                                                            <Layers className="h-3 w-3 mr-1" />
                                                            {layup.name}
                                                            {isEditing && (
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-4 w-4 ml-1 hover:bg-destructive/20 hover:text-destructive rounded-full"
                                                                    onClick={() => {
                                                                        const current = formData.assignedReferenceLayupIds || [];
                                                                        handleChange('assignedReferenceLayupIds', current.filter(id => id !== refId));
                                                                    }}
                                                                >
                                                                    <XIcon className="h-3 w-3" />
                                                                </Button>
                                                            )}
                                                        </Badge>
                                                    );
                                                })}
                                            </div>
                                        ) : (
                                            <span className="text-sm text-muted-foreground italic">No Reference Layups assigned.</span>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>

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
                        </div>

                        {/* History Log */}
                        <div className="h-[400px]">
                            <HistoryLog entityId={material.id} entityType="material" />
                        </div>

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

                    <TabsContent value="measurements">
                        <MeasurementEntry
                            parentId={material.id}
                            parentType="material"
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
            </Tabs >
        </div >
    );
}
