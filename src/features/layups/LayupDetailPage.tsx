import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAppStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs";
import { ArrowLeft } from 'lucide-react';
import { LayupStackEditor } from './LayupStackEditor';
import { LayupStatistics } from './LayupStatistics';
import { MeasurementEntry } from '@/features/quality/MeasurementEntry';
import { LayupRequirements } from './LayupRequirements';
import { AllowableManager } from '@/features/quality/AllowableManager';
import { EntityDeleteDialog } from '@/components/common/EntityDeleteDialog';

import { useNavigate } from 'react-router-dom';

export function LayupDetailPage() {
    const { id } = useParams<{ id: string }>();
    const { layups, fetchLayups, updateLayup } = useAppStore();
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
    }, [fetchLayups, layups.length]);

    useEffect(() => {
        if (id && layups.length > 0) {
            const found = layups.find((l) => l.id === id);
            setLayup(found || null);
        }
    }, [id, layups]);
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
                            <Badge variant={layup.status === 'approved' ? 'default' : 'secondary'}>
                                {layup.status}
                            </Badge>
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
            <div className="flex-1 overflow-hidden p-6">
                <Tabs defaultValue="overview" className="h-full flex flex-col space-y-4">
                    <TabsList className="w-max">
                        <TabsTrigger value="overview">Overview</TabsTrigger>
                        <TabsTrigger value="requirements">Requirements</TabsTrigger>
                        <TabsTrigger value="allowables">Allowables ({layup.allowables?.length || 0})</TabsTrigger>
                        <TabsTrigger value="measurements">Measurements ({layup.measurements?.length || 0})</TabsTrigger>
                        <TabsTrigger value="statistics">Statistics</TabsTrigger>
                    </TabsList>

                    <TabsContent value="overview" className="flex-1 overflow-hidden border rounded-lg p-0">
                        {/* 
                            We reuse LayupStackEditor here. 
                            If isEditing is true, it allows changes.
                            If false, it should probably fit visually as a "View".
                        */}
                        <LayupStackEditor
                            layup={layup}
                            readonly={!isEditing}
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
                    </TabsContent>

                    <TabsContent value="requirements" className="space-y-4">
                        <LayupRequirements layup={layup} />
                    </TabsContent>

                    <TabsContent value="allowables">
                        <AllowableManager
                            parentId={layup.id}
                            parentType="layup"
                            allowables={layup.allowables || []}
                            availableMeasurements={layup.measurements || []}
                        />
                    </TabsContent>

                    <TabsContent value="measurements">
                        <MeasurementEntry
                            parentId={layup.id}
                            parentType="layup"
                        />
                    </TabsContent>

                    <TabsContent value="statistics">
                        <LayupStatistics layup={layup} />
                    </TabsContent>
                </Tabs>
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
        </div >
    );
}
