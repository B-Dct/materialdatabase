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
import { EntityDeleteDialog } from '@/components/common/EntityDeleteDialog';

import { LayupPropertiesView } from './LayupPropertiesView';
import { LayupSpecifications } from './LayupSpecifications';

import { useNavigate } from 'react-router-dom';

export function LayupDetailPage() {
    const { id } = useParams<{ id: string }>();
    const { layups, fetchLayups, updateLayup, measurements, fetchMeasurements, fetchSpecifications } = useAppStore();
    const [layup, setLayup] = useState<any>(null); // Type properly

    const navigate = useNavigate();

    const { deleteLayup } = useAppStore(); // Assuming deleteLayup exists in store
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [archiveOpen, setArchiveOpen] = useState(false);


    const handleDeleteConfirm = async () => {
        try {
            await deleteLayup(layup!.id);
            navigate('/layups');
        } catch (e) {
            console.error("Failed to delete", e);
        }
    };

    const handleArchiveConfirm = async () => {
        try {
            await updateLayup(layup!.id, { status: 'obsolete' });
            setArchiveOpen(false);
            // Refresh logic handled by store subscription usually
        } catch (e) {
            console.error("Failed to archive", e);
        }
    };
    useEffect(() => {
        if (layups.length === 0) {
            fetchLayups();
        }
        if (id) {
            fetchSpecifications(id, 'layup');
        }
    }, [fetchLayups, layups.length, id, fetchSpecifications]);

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
    const [isEditing, setIsEditing] = useState(false);

    if (!layup) {
        return <div className="p-8">Loading Layup...</div>;
    }

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
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                            <span>Process: {layup.processId || 'None'}</span>
                            <span>{layup.layers?.length || 0} Layers</span>
                        </div>
                    </div>
                </div>
                <div className="flex gap-2 items-center">
                    {layup.productionSite && (
                        <div className="text-sm border px-3 py-1 rounded-md bg-muted/50">
                            Site: <span className="font-medium">{layup.productionSite.toUpperCase()}</span>
                        </div>
                    )}

                    {/* Edit Toggle */}
                    {!isEditing ? (
                        <Button onClick={() => setIsEditing(true)}>
                            Edit Details
                        </Button>
                    ) : (
                        <Button variant="outline" onClick={() => setIsEditing(false)}>
                            Cancel Editing
                        </Button>
                    )}
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden flex flex-col">
                <Tabs defaultValue="overview" className="flex-1 flex flex-col overflow-hidden">
                    <div className="px-4 border-b shrink-0 bg-muted/20">
                        <TabsList className="bg-transparent h-12 w-full justify-start gap-6">
                            <TabsTrigger value="overview" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full px-0">
                                <LayoutGrid className="h-4 w-4 mr-2" /> Overview
                            </TabsTrigger>
                            <TabsTrigger value="standards" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full px-0">
                                <ShieldCheck className="h-4 w-4 mr-2" /> Standards
                            </TabsTrigger>
                            <TabsTrigger value="properties" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full px-0">
                                <Box className="h-4 w-4 mr-2" /> Properties
                            </TabsTrigger>
                            <TabsTrigger value="specifications" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full px-0">
                                <FileText className="h-4 w-4 mr-2" /> Specifications
                            </TabsTrigger>
                            <TabsTrigger value="allowables" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full px-0">
                                <Scale className="h-4 w-4 mr-2" /> Allowables
                            </TabsTrigger>
                            <TabsTrigger value="measurements" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full px-0">
                                <Ruler className="h-4 w-4 mr-2" /> Measurements
                            </TabsTrigger>
                            <TabsTrigger value="statistics" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full px-0">
                                <BarChart2 className="h-4 w-4 mr-2" /> Statistics
                            </TabsTrigger>
                        </TabsList>
                    </div>



                    <TabsContent value="overview" className="flex-1 overflow-hidden p-0 bg-slate-50/50 dark:bg-slate-900/20 data-[state=active]:flex data-[state=inactive]:hidden flex-col">
                        <div className="h-full flex flex-col border rounded-lg overflow-hidden p-0 bg-background">
                            {/* 
                            We reuse LayupStackEditor here. 
                            If isEditing is true, it allows changes.
                            If false, it should probably fit visually as a "View".
                        */}
                            <LayupStackEditor
                                layup={layup}
                                readonly={!isEditing}
                                lockStructure={!!layup} // Lock structure if layup exists
                                onSaveSuccess={() => setIsEditing(false)}
                            />

                            {/* Danger Zone - Only in Edit Mode */}
                            {isEditing && (
                                <div className="p-4 border-t mt-auto bg-destructive/5">
                                    <h4 className="text-sm font-semibold text-destructive mb-3">Danger Zone</h4>
                                    <div className="flex items-center justify-between">
                                        <div className="text-xs text-muted-foreground">
                                            Archive or permanently delete this layup.
                                        </div>
                                        <div className="flex gap-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setArchiveOpen(true)}
                                                className="border-destructive/50 hover:bg-destructive/10 text-destructive h-8"
                                            >
                                                Archive
                                            </Button>
                                            <Button
                                                variant="destructive"
                                                size="sm"
                                                onClick={() => setDeleteOpen(true)}
                                                className="h-8"
                                            >
                                                Delete
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            )}


                        </div>
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

                    <TabsContent value="allowables" className="flex-1 overflow-auto p-4 md:p-6 pt-2 bg-slate-50/50 dark:bg-slate-900/20">
                        <AllowableManager
                            parentId={layup.id}
                            parentType="layup"
                            allowables={layup.allowables || []}
                            availableMeasurements={layup.measurements || []}
                        />
                    </TabsContent>

                    <TabsContent value="measurements" className="flex-1 overflow-auto p-4 md:p-6 pt-2 bg-slate-50/50 dark:bg-slate-900/20">
                        <MeasurementEntry
                            parentId={layup.id}
                            parentType="layup"
                        />
                    </TabsContent>

                    <TabsContent value="statistics" className="flex-1 overflow-auto p-4 md:p-6 pt-2 bg-slate-50/50 dark:bg-slate-900/20">
                        <LayupStatistics layup={layup} />
                    </TabsContent>

                </Tabs >
            </div >


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
        </div >
    );
}
