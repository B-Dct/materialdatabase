import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAppStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs";
import { ArrowLeft, LayoutGrid, ShieldCheck, Box, Scale, Ruler, BarChart2, FileText } from 'lucide-react';
import { LayupStackEditor } from './LayupStackEditor';
import { LayupStatistics } from './LayupStatistics';
import { MeasurementEntry } from '@/features/quality/MeasurementEntry';
import { EntityStandardsManager } from "@/features/quality/EntityStandardsManager";
import { AllowableManager } from '@/features/quality/AllowableManager';
import { HistoryLog } from '@/features/shared/HistoryLog';
import { EntityDeleteDialog } from '@/components/common/EntityDeleteDialog';

import { LayupPropertiesView } from './LayupPropertiesView';
import { LayupSpecifications } from './LayupSpecifications';

import { useNavigate } from 'react-router-dom';
import { toast } from "sonner";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { ReferenceLayupArchitecture } from "@/types/domain";

export function LayupDetailPage() {
    const { id } = useParams<{ id: string }>();
    const {
        layups,
        fetchLayups,
        updateLayup,
        deleteLayup,
        getLayupUsage,
        measurements,
        fetchMeasurements,
        fetchSpecifications,
        fetchProperties,
        materials,
        fetchMaterials,
        requirementProfiles,
        fetchRequirementProfiles
    } = useAppStore();
    const [layup, setLayup] = useState<any>(null); // Type properly

    const navigate = useNavigate();

    const [deleteOpen, setDeleteOpen] = useState(false);
    const [archiveOpen, setArchiveOpen] = useState(false);
    const [isInUse, setIsInUse] = useState(false);

    useEffect(() => {
        if (layup?.id && getLayupUsage) {
            getLayupUsage(layup.id).then(usage => {
                setIsInUse(usage.length > 0);
            });
        }
    }, [layup?.id, getLayupUsage]);

    const handleDeleteConfirm = async () => {
        try {
            await deleteLayup(layup!.id);
            toast.success("Layup deleted successfully");
            navigate('/layups');
        } catch (e: any) {
            console.error("Failed to delete", e);
            toast.error(e.message || "Failed to delete layup");
            setDeleteOpen(false);
        }
    };


    const handleArchiveConfirm = async () => {
        try {
            await updateLayup(layup!.id, { status: 'obsolete' });
            toast.success("Layup archived successfully");
            setArchiveOpen(false);
        } catch (e: any) {
            console.error("Failed to archive", e);
            toast.error(e.message || "Failed to archive layup");
        }
    };
    useEffect(() => {
        if (layups.length === 0) {
            fetchLayups();
        }
        fetchProperties();
        if (id) {
            fetchSpecifications(id, 'layup');
        }
    }, [fetchLayups, layups.length, id, fetchSpecifications, fetchProperties]);

    useEffect(() => {
        if (id && layups.length > 0) {
            const found = layups.find((l) => l.id === id);
            setLayup(found || null);
        }
    }, [id, layups]);

    useEffect(() => {
        if (measurements.length === 0) {
            fetchMeasurements();
        }
    }, [fetchMeasurements, measurements.length]);

    useEffect(() => {
        if (materials.length === 0) fetchMaterials();
        if (requirementProfiles.length === 0) fetchRequirementProfiles();
    }, [fetchMaterials, fetchRequirementProfiles, materials.length, requirementProfiles.length]);

    const availableArchitectures = (() => {
        if (!layup) return [];

        // For Reference Layups or if no material is linked, show ALL available architectures from profiles
        if (layup.isReference || (!layup.materialId && (!layup.layers || layup.layers.length === 0))) {
            const allArchs: ReferenceLayupArchitecture[] = [];
            requirementProfiles.forEach(p => {
                if (p.layupArchitectures) {
                    p.layupArchitectures.forEach(a => {
                        if (!allArchs.some(existing => existing.id === a.id)) {
                            allArchs.push(a);
                        }
                    });
                }
            });
            return allArchs;
        }

        // 1. Try to find material for Product Layups
        let materialId = layup.materialId;
        if (!materialId && layup.layers?.length > 0) {
            // Fallback: try to find base material of first layer
            const firstVariantId = layup.layers[0].materialVariantId;
            const mat = materials.find(m => m.variants?.some(v => v.variantId === firstVariantId));
            if (mat) materialId = mat.id;
        }

        if (!materialId) return [];

        const material = materials.find(m => m.id === materialId);
        if (!material) return [];

        // 2. Get profiles assigned to this material
        const materialTag = `material:${material.name}`;

        const relevantProfiles = requirementProfiles.filter(p =>
            (material.assignedProfileIds?.includes(p.id)) ||
            (p.applicability?.includes(materialTag))
        );

        // 3. Collect architectures
        const archs: ReferenceLayupArchitecture[] = [];
        relevantProfiles.forEach(p => {
            if (p.layupArchitectures) {
                p.layupArchitectures.forEach(a => {
                    if (!archs.some(existing => existing.id === a.id)) {
                        archs.push(a);
                    }
                });
            }
        });
        return archs;
    })();

    const handleUpdateArchitecture = async (archId: string) => {
        if (!layup) return;
        await updateLayup(layup.id, { architectureTypeId: archId });
    };

    // View Settings
    const [showMeasurementsTab, setShowMeasurementsTab] = useState(true);

    useEffect(() => {
        const stored = localStorage.getItem('layup-db-show-measurements');
        if (stored !== null) {
            setShowMeasurementsTab(stored === 'true');
        }
    }, []);

    const [isEditing, setIsEditing] = useState(false);

    if (!layup) {
        return <div className="p-8">Loading Layup...</div>;
    }

    const isReferenceLayup = layup.isReference || !!layup.architectureTypeId;

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
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl font-bold tracking-tight">{layup.name}</h1>
                            <StatusBadge status={layup.status} />
                            {isReferenceLayup && (
                                <span className="flex items-center gap-1 bg-amber-100 text-amber-800 text-xs px-2 py-0.5 rounded-full border border-amber-200">
                                    <ShieldCheck className="h-3 w-3" /> Reference Layup
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                            {!isReferenceLayup && <span>Process: {layup.processId || 'None'}</span>}
                            <span>{layup.layers?.length || 0} Layers</span>

                            {/* Architecture Dropdown - Enable for all layups when editing */}
                            {isEditing ? (
                                <div className="flex items-center gap-2">
                                    <span className="text-muted-foreground">Type:</span>
                                    <Select
                                        value={layup.architectureTypeId || "none"}
                                        onValueChange={(val) => handleUpdateArchitecture(val === "none" ? "" : val)}
                                    >
                                        <SelectTrigger className="h-7 w-[180px] text-xs">
                                            <SelectValue placeholder="Select Type..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">None</SelectItem>
                                            {availableArchitectures.map(arch => (
                                                <SelectItem key={arch.id} value={arch.id}>
                                                    {arch.name} ({arch.layerCount}L)
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            ) : (
                                layup.architectureTypeId && (
                                    <span className="flex items-center gap-1 border border-blue-200 bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-xs">
                                        <ShieldCheck className="h-3 w-3" />
                                        {availableArchitectures.find(a => a.id === layup.architectureTypeId)?.name || "Unknown Type"}
                                    </span>
                                )
                            )}
                        </div>
                    </div>
                </div>
                <div className="flex gap-2 items-center">
                    {layup.productionSite && (
                        <div className="text-sm border px-3 py-1 rounded-md bg-muted/50">
                            Site: <span className="font-medium">{layup.productionSite.toUpperCase()}</span>
                        </div>
                    )}
                    {isEditing ? (
                        <>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setArchiveOpen(true)}
                                className="border-destructive/50 hover:bg-destructive/10 text-destructive h-8"
                            >
                                Archive
                            </Button>

                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <span tabIndex={0}> {/* Span needed for disabled button tooltip trigger */}
                                            <Button
                                                variant="destructive"
                                                size="sm"
                                                onClick={() => setDeleteOpen(true)}
                                                className="h-8"
                                                disabled={isInUse}
                                            >
                                                Delete
                                            </Button>
                                        </span>
                                    </TooltipTrigger>
                                    {isInUse && (
                                        <TooltipContent>
                                            <p>Cannot delete: Layer is used in assemblies.</p>
                                            <p>Please archive instead.</p>
                                        </TooltipContent>
                                    )}
                                </Tooltip>
                            </TooltipProvider>

                            <Button variant="outline" size="sm" onClick={() => setIsEditing(false)}>
                                Cancel Editing
                            </Button>
                        </>
                    ) : (
                        <Button onClick={() => setIsEditing(true)}>
                            Edit Details
                        </Button>
                    )}
                </div>
            </div>

            <div className="flex-1 overflow-hidden flex flex-col">
                <Tabs defaultValue="overview" className="flex-1 flex flex-col overflow-hidden">
                    <div className="px-4 border-b shrink-0 bg-muted/20">
                        <TabsList className="bg-transparent h-12 w-full justify-start gap-6">
                            {/* Reference Layup Tabs */}
                            {isReferenceLayup ? (
                                <>
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
                                    <TabsTrigger value="statistics" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full px-0">
                                        <BarChart2 className="h-4 w-4 mr-2" /> Statistics
                                    </TabsTrigger>
                                </>
                            ) : (
                                /* Product Layup Tabs */
                                <>
                                    <TabsTrigger value="overview" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full px-0">
                                        <LayoutGrid className="h-4 w-4 mr-2" /> Overview
                                    </TabsTrigger>
                                    <TabsTrigger value="properties" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full px-0">
                                        <Box className="h-4 w-4 mr-2" /> Properties
                                    </TabsTrigger>
                                    <TabsTrigger value="specifications" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full px-0">
                                        <FileText className="h-4 w-4 mr-2" /> Specifications
                                    </TabsTrigger>
                                    <TabsTrigger value="standards" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full px-0">
                                        <ShieldCheck className="h-4 w-4 mr-2" /> Standards
                                    </TabsTrigger>
                                    {showMeasurementsTab && (
                                        <TabsTrigger value="measurements" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full px-0">
                                            <Ruler className="h-4 w-4 mr-2" /> Measurements
                                        </TabsTrigger>
                                    )}
                                    <TabsTrigger value="allowables" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full px-0">
                                        <Scale className="h-4 w-4 mr-2" /> Allowables
                                    </TabsTrigger>
                                    <TabsTrigger value="statistics" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full px-0">
                                        <BarChart2 className="h-4 w-4 mr-2" /> Statistics
                                    </TabsTrigger>
                                </>
                            )}
                        </TabsList>
                    </div>

                    <TabsContent value="overview" className="flex-1 overflow-auto p-4 bg-slate-50/50 dark:bg-slate-900/20 data-[state=active]:flex data-[state=inactive]:hidden flex-col gap-4">
                        {isReferenceLayup ? (
                            <div className="space-y-6">
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="border p-4 rounded-md bg-white">
                                        <h3 className="font-medium text-sm text-muted-foreground mb-4">Reference Details</h3>
                                        <div className="space-y-2 text-sm">
                                            <div><span className="font-medium">Type:</span> {availableArchitectures.find(a => a.id === layup.architectureTypeId)?.name || "N/A"}</div>
                                            <div><span className="font-medium">Material:</span> {materials.find(m => m.id === layup.materialId)?.name || "N/A"}</div>
                                            <div><span className="font-medium">Thickness:</span> {layup.totalThickness} mm</div>
                                        </div>
                                    </div>
                                    {/* Maybe a simplified read-only stack view? */}
                                </div>
                            </div>
                        ) : (
                            <>
                                <div className="min-h-[500px] flex flex-col border rounded-lg overflow-hidden p-0 bg-background">
                                    <LayupStackEditor
                                        layup={layup}
                                        readonly={!isEditing}
                                        lockStructure={!!layup} // Lock structure if layup exists
                                        onSaveSuccess={() => setIsEditing(false)}
                                    />
                                </div>
                                <div className="h-[400px]">
                                    <HistoryLog entityId={layup.id} entityType="layup" />
                                </div>
                            </>
                        )}
                    </TabsContent>

                    <TabsContent value="properties" className="flex-1 overflow-auto p-4 md:p-6 pt-2 bg-slate-50/50 dark:bg-slate-900/20 space-y-4">
                        <div className="flex justify-between items-center">
                            <h3 className="text-lg font-medium">Properties</h3>

                        </div>
                        <div className="flex-1 min-h-[500px] border rounded-md bg-background p-1">
                            <LayupPropertiesView layup={layup} measurements={measurements} />
                        </div>
                    </TabsContent>

                    <TabsContent value="specifications" className="flex-1 overflow-auto p-4 md:p-6 pt-2 bg-slate-50/50 dark:bg-slate-900/20 space-y-4">
                        <LayupSpecifications layup={layup} />
                    </TabsContent>

                    <TabsContent value="standards" className="flex-1 overflow-auto p-4 md:p-6 pt-2 bg-slate-50/50 dark:bg-slate-900/20 space-y-4">
                        <EntityStandardsManager
                            assignedProfileIds={layup.assignedProfileIds || []}
                            onAssign={async (id) => {
                                const currentIds = layup.assignedProfileIds || [];
                                await updateLayup(layup.id, { assignedProfileIds: [...currentIds, id] });
                            }}
                            onUnassign={async (id) => {
                                const currentIds = layup.assignedProfileIds || [];
                                await updateLayup(layup.id, { assignedProfileIds: currentIds.filter((pid: string) => pid !== id) });
                            }}
                        />
                    </TabsContent>

                    <TabsContent value="measurements" className="flex-1 overflow-auto p-4 md:p-6 pt-2 bg-slate-50/50 dark:bg-slate-900/20">
                        <MeasurementEntry
                            parentId={layup.id}
                            parentType="layup"
                        />
                    </TabsContent>

                    <TabsContent value="allowables" className="flex-1 overflow-auto p-4 md:p-6 pt-2 bg-slate-50/50 dark:bg-slate-900/20">
                        <AllowableManager
                            parentId={layup.id}
                            parentType="layup"
                            allowables={layup.allowables || []}
                            availableMeasurements={layup.measurements || []}
                        />
                    </TabsContent>

                    <TabsContent value="statistics" className="flex-1 overflow-auto p-4 md:p-6 pt-2 bg-slate-50/50 dark:bg-slate-900/20">
                        <LayupStatistics layup={layup} />
                    </TabsContent>

                </Tabs >
            </div>


            {/* Dialogs */}
            {
                layup && (
                    <>
                        <EntityDeleteDialog
                            open={deleteOpen}
                            onOpenChange={setDeleteOpen}
                            entityName={layup.name}
                            entityType="Layup"
                            onConfirm={handleDeleteConfirm}
                            isArchiving={false}
                        />
                        <EntityDeleteDialog
                            open={archiveOpen}
                            onOpenChange={setArchiveOpen}
                            entityName={layup.name}
                            entityType="Layup"
                            onConfirm={handleArchiveConfirm}
                            isArchiving={true}
                        />
                    </>
                )
            }
        </div>
    );
}
