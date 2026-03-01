import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useAppStore } from "@/lib/store";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Box, LayoutGrid, Scale, BarChart2, ShieldCheck, FileText, Ruler, Pencil, Archive, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { StatusBadge } from "@/components/ui/StatusBadge";

import { AssemblyStackEditor } from "./AssemblyStackEditor";

import { AssemblyStatistics } from "./AssemblyStatistics";
import { AllowableManager } from "@/features/quality/AllowableManager";
import { EntityStandardsManager } from "@/features/quality/EntityStandardsManager";
import { AssemblyPropertiesView } from "./AssemblyPropertiesView";
import { AssemblySpecifications } from "./AssemblySpecifications";
import { MeasurementEntry } from "@/features/quality/MeasurementEntry";
import { EntityDeleteDialog } from '@/components/common/EntityDeleteDialog';



import { toast } from "sonner";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export function AssemblyDetailPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const {
        assemblies, fetchAssemblies, updateAssembly, deleteAssembly, getAssemblyUsage,
        measurements, fetchMeasurements, fetchProperties
    } = useAppStore();

    const [activeTab, setActiveTab] = useState("overview");
    const [isEditing, setIsEditing] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [archiveOpen, setArchiveOpen] = useState(false);
    const [isInUse, setIsInUse] = useState(false);

    // View Settings
    const [showMeasurementsTab, setShowMeasurementsTab] = useState(true);

    useEffect(() => {
        const stored = localStorage.getItem('assembly-db-show-measurements');
        if (stored !== null) {
            setShowMeasurementsTab(stored === 'true');
        }
    }, []);

    useEffect(() => {
        if (assemblies.length === 0) fetchAssemblies();
        if (measurements.length === 0) fetchMeasurements();
        fetchProperties();
    }, [id, fetchAssemblies, fetchMeasurements, assemblies.length, measurements.length, fetchProperties]);

    const assembly = assemblies.find(a => a.id === id);

    useEffect(() => {
        if (assembly?.id && getAssemblyUsage) {
            getAssemblyUsage(assembly.id).then((usage: any[]) => {
                setIsInUse(usage.length > 0);
            });
        }
    }, [assembly?.id, getAssemblyUsage]);

    const handleDeleteConfirm = async () => {
        if (!assembly) return;
        try {
            await deleteAssembly(assembly.id);
            toast.success("Assembly deleted successfully");
            navigate('/assemblies');
        } catch (e: any) {
            console.error("Failed to delete", e);
            toast.error(e.message || "Failed to delete assembly");
            setDeleteOpen(false);
        }
    };

    const handleArchiveConfirm = async () => {
        if (!assembly) return;
        try {
            await updateAssembly(assembly.id, { status: 'obsolete' });
            toast.success("Assembly archived successfully");
            setArchiveOpen(false);
        } catch (e: any) {
            console.error("Failed to archive", e);
            toast.error(e.message || "Failed to archive assembly");
        }
    };

    if (!assembly) {
        return <div className="p-8 text-center">Loading Assembly...</div>;
    }

    return (
        <div className="h-full flex flex-col overflow-hidden animate-in fade-in">
            {/* Header */}
            <div className="border-b px-6 py-4 flex items-center justify-between bg-card text-card-foreground shadow-sm shrink-0">
                <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => navigate('/assemblies')}>
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                        <h1 className="text-xl font-bold tracking-tight">{assembly.name}</h1>
                        <StatusBadge status={assembly.status} className="ml-1" />
                    </div>
                    <p className="text-sm text-muted-foreground pl-8 max-w-2xl line-clamp-1">
                        {assembly.description || "No description provided."}
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    {isEditing ? (
                        <>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setArchiveOpen(true)}
                                className="border-destructive/50 hover:bg-destructive/10 text-destructive h-8"
                            >
                                <Archive className="mr-2 h-4 w-4" /> Archive
                            </Button>

                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <span tabIndex={0}>
                                            <Button
                                                variant="destructive"
                                                size="sm"
                                                onClick={() => setDeleteOpen(true)}
                                                className="h-8"
                                                disabled={isInUse}
                                            >
                                                <Trash2 className="mr-2 h-4 w-4" /> Delete
                                            </Button>
                                        </span>
                                    </TooltipTrigger>
                                    {isInUse && (
                                        <TooltipContent>
                                            <p>Cannot delete: Assembly is used in other assemblies.</p>
                                            <p>Please archive instead.</p>
                                        </TooltipContent>
                                    )}
                                </Tooltip>
                            </TooltipProvider>
                            <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)}>
                                Cancel Editing
                            </Button>
                        </>
                    ) : (
                        <Button variant="secondary" size="sm" onClick={() => setIsEditing(true)}>
                            <Pencil className="h-4 w-4 mr-2" /> Edit Details
                        </Button>
                    )}
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-hidden flex flex-col">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
                    <div className="px-4 border-b shrink-0 bg-muted/20">
                        <TabsList className="bg-transparent h-12 w-full justify-start gap-6">
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
                            <TabsTrigger value="allowables" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full px-0">
                                <Scale className="h-4 w-4 mr-2" /> Allowables
                            </TabsTrigger>
                            {showMeasurementsTab && (
                                <TabsTrigger value="measurements" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full px-0">
                                    <Ruler className="h-4 w-4 mr-2" /> Measurements
                                </TabsTrigger>
                            )}
                            <TabsTrigger value="statistics" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full px-0">
                                <BarChart2 className="h-4 w-4 mr-2" /> Statistics
                            </TabsTrigger>
                        </TabsList>
                    </div>

                    {/* Content Areas */}
                    <div className="flex-1 overflow-auto p-6 bg-slate-50/50 dark:bg-slate-900/20">

                        <TabsContent value="overview" className="h-full m-0 flex flex-col gap-4">
                            <AssemblyStackEditor
                                assembly={assembly}
                                readonly={!isEditing}
                                lockStructure={!!assembly}
                                onSaveSuccess={() => {
                                    setIsEditing(false);
                                    fetchAssemblies();
                                }}
                            />


                        </TabsContent>

                        <TabsContent value="properties" className="h-full m-0 space-y-6">
                            <div className="flex justify-between items-center">
                                <div>
                                    <h3 className="text-lg font-medium">Assembly Properties</h3>
                                    <p className="text-sm text-muted-foreground">Functional properties specific to this assembly configuration.</p>
                                </div>

                            </div>

                            <div className="flex-1 min-h-[500px] border rounded-md bg-background p-1">
                                <AssemblyPropertiesView assembly={assembly} measurements={assembly.measurements || []} />
                            </div>


                        </TabsContent>

                        <TabsContent value="specifications" className="h-full m-0 space-y-4">
                            <AssemblySpecifications assembly={assembly} />
                        </TabsContent>

                        <TabsContent value="standards" className="h-full m-0 space-y-4">
                            <EntityStandardsManager
                                assignedProfileIds={assembly.assignedProfileIds || []}
                                onAssign={async (id) => {
                                    const currentIds = assembly.assignedProfileIds || [];
                                    await updateAssembly(assembly.id, { assignedProfileIds: [...currentIds, id] });
                                }}
                                onUnassign={async (id) => {
                                    const currentIds = assembly.assignedProfileIds || [];
                                    await updateAssembly(assembly.id, { assignedProfileIds: currentIds.filter((pid: string) => pid !== id) });
                                }}
                            />
                        </TabsContent>

                        <TabsContent value="allowables" className="h-full m-0">
                            <AllowableManager
                                parentId={assembly.id}
                                parentType="assembly"
                                allowables={assembly.allowables || []}
                                availableMeasurements={measurements} // Pass all for now
                            />
                        </TabsContent>

                        {showMeasurementsTab && (
                            <TabsContent value="measurements" className="h-full m-0">
                                <MeasurementEntry
                                    parentId={assembly.id}
                                    parentType="assembly"
                                />
                            </TabsContent>
                        )}

                        <TabsContent value="statistics" className="h-full m-0">
                            <AssemblyStatistics assembly={assembly} />
                        </TabsContent>
                    </div>
                </Tabs>
            </div>

            {/* Dialogs */}
            <EntityDeleteDialog
                open={deleteOpen}
                onOpenChange={setDeleteOpen}
                entityName={assembly.name}
                entityType="Assembly"
                onConfirm={handleDeleteConfirm}
                isArchiving={false}
            />
            <EntityDeleteDialog
                open={archiveOpen}
                onOpenChange={setArchiveOpen}
                entityName={assembly.name}
                entityType="Assembly"
                onConfirm={handleArchiveConfirm}
                isArchiving={true}
            />
        </div>
    );
}


