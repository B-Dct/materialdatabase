import { useEffect, useState } from 'react';
import { useAppStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";

import { Plus, Edit, ChevronDown, ChevronRight } from 'lucide-react';
import { RequirementEditorDialog } from './RequirementEditorDialog';
import { RequirementComplianceView } from './RequirementComplianceView';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface RequirementProfileManagerProps {
    entityId?: string; // Optional context
    entityType?: 'material' | 'layup';
}

export function RequirementProfileManager({ entityId, entityType }: RequirementProfileManagerProps) {
    const { requirementProfiles, properties, fetchRequirementProfiles, fetchProperties, addRequirementProfile, updateRequirementProfile } = useAppStore();
    const [createOpen, setCreateOpen] = useState(false);

    // Editor State
    const [editorOpen, setEditorOpen] = useState(false);
    const [editingProfileId, setEditingProfileId] = useState<string | null>(null);

    // Expansion State for Compliance View
    const [expandedProfileId, setExpandedProfileId] = useState<string | null>(null);

    // Create Form State
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');

    useEffect(() => {
        fetchRequirementProfiles();
        fetchProperties();
    }, [fetchRequirementProfiles, fetchProperties]);

    const handleCreate = async () => {
        if (!name) return;
        await addRequirementProfile({
            name,
            description,
            rules: [] // Start empty, then edit
        });
        setCreateOpen(false);
        setName('');
        setDescription('');
    };

    const handleOpenEditor = (id: string, e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent toggle
        setEditingProfileId(id);
        setEditorOpen(true);
    };

    const handleSaveRules = async (rules: any[]) => {
        if (editingProfileId) {
            await updateRequirementProfile(editingProfileId, { rules });
        }
    };

    const getPropName = (id: string) => properties.find(p => p.id === id)?.name || id;

    const editingProfile = requirementProfiles.find(p => p.id === editingProfileId);

    // Filter profiles if needed (e.g. only assigned ones?) 
    // Ideally we show "Assigned" first? For now show all.

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex justify-between items-center">
                <div>
                    {!entityId && (
                        <>
                            <h1 className="text-3xl font-bold tracking-tight">Requirements</h1>
                            <p className="text-muted-foreground">Manage specification profiles and acceptance criteria.</p>
                        </>
                    )}
                    {entityId && (
                        <h3 className="text-lg font-semibold">Assigned Standards & Compliance</h3>
                    )}
                </div>
                <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                    <DialogTrigger asChild>
                        <Button variant={entityId ? "outline" : "default"} size={entityId ? "sm" : "default"}>
                            <Plus className="mr-2 h-4 w-4" /> {entityId ? "Add Standard" : "Create Profile"}
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                        <DialogHeader>
                            <DialogTitle>New Specification Profile</DialogTitle>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <label>Profile Name</label>
                                <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Airbus A350 Interior" />
                            </div>
                            <div className="grid gap-2">
                                <label>Description</label>
                                <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="e.g. Standard interior components" />
                            </div>
                            <Button onClick={handleCreate} className="mt-4">Create Profile</Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="grid gap-4 md:grid-cols-1">
                {/* Switch to single col if showing details, or keep grid? Using single col for better detail view */}
                {requirementProfiles.map((profile) => (
                    <Collapsible
                        key={profile.id}
                        open={expandedProfileId === profile.id}
                        onOpenChange={() => setExpandedProfileId(expandedProfileId === profile.id ? null : profile.id)}
                        className="border rounded-lg bg-card text-card-foreground shadow-sm"
                    >
                        <div className="p-4 flex flex-col space-y-3">
                            <div className="flex justify-between items-center">
                                <CollapsibleTrigger className="flex items-center gap-2 hover:underline cursor-pointer">
                                    {expandedProfileId === profile.id ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                    <div className="text-left">
                                        <h3 className="font-semibold">{profile.name}</h3>
                                        <p className="text-sm text-muted-foreground">{profile.description}</p>
                                    </div>
                                </CollapsibleTrigger>
                                <Button variant="ghost" size="icon" onClick={(e) => handleOpenEditor(profile.id, e)}>
                                    <Edit className="h-4 w-4 text-primary" />
                                </Button>
                            </div>

                            {/* Preview Rules if collapsed */}
                            {expandedProfileId !== profile.id && (
                                <div className="text-xs text-muted-foreground pl-6">
                                    {profile.rules.length} requirements defined.
                                </div>
                            )}

                            <CollapsibleContent>
                                {/* If Context is providing, show Compliance View */}
                                {entityId && entityType ? (
                                    <RequirementComplianceView
                                        entityId={entityId}
                                        entityType={entityType}
                                        profileId={profile.id}
                                    />
                                ) : (
                                    // Management Mode View (List Rules)
                                    <div className="mt-4 pl-6 border-l-2 ml-2">
                                        <h4 className="text-sm font-medium mb-2">Defined Rules</h4>
                                        <div className="space-y-1">
                                            {profile.rules.map((r, i) => (
                                                <div key={i} className="text-sm flex gap-2">
                                                    <span className="font-medium">{getPropName(r.propertyId)}:</span>
                                                    <span className="text-muted-foreground">
                                                        {r.target ? `Target ${r.target}` : `Range ${r.min ?? '-'} to ${r.max ?? '-'}`}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </CollapsibleContent>
                        </div>
                    </Collapsible>
                ))}
            </div>

            {editingProfile && (
                <RequirementEditorDialog
                    open={editorOpen}
                    onOpenChange={setEditorOpen}
                    initialRules={editingProfile.rules}
                    onSave={handleSaveRules}
                />
            )}
        </div>
    );
}
