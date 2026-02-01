import { useAppStore } from '@/lib/store';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Plus as PlusIcon, X, Edit } from "lucide-react";
import { cn } from '@/lib/utils';
import { RequirementProfileDialog } from '@/features/quality/RequirementEditorDialog';
import { useState } from 'react';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import type { Layup } from '@/types/domain';

import { RequirementComplianceView } from '@/features/quality/RequirementComplianceView';

interface LayupRequirementsProps {
    layup: Layup;
}

export function LayupRequirements({ layup }: LayupRequirementsProps) {
    const { requirementProfiles, updateLayup, updateRequirementProfile } = useAppStore();
    const [profileDialogOpen, setProfileDialogOpen] = useState(false);
    const [editingProfileId, setEditingProfileId] = useState<string | null>(null);
    const [isPopoverOpen, setIsPopoverOpen] = useState(false);

    return (
        <Card>
            <CardHeader>
                <CardTitle>Assigned Requirements</CardTitle>
                <CardDescription>
                    Manage specification profiles linked to this layup.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* List Assigned */}
                <div className="space-y-4">
                    {(!layup.assignedProfileIds || layup.assignedProfileIds.length === 0) && (
                        <div className="text-sm text-muted-foreground italic p-4 border rounded-md bg-muted/20 text-center">
                            No requirement profiles assigned.
                        </div>
                    )}
                    {layup.assignedProfileIds?.map(pid => {
                        const profile = requirementProfiles.find(p => p.id === pid);
                        if (!profile) return null;
                        return (
                            <div key={pid} className="space-y-4 border p-3 rounded-md bg-card transition-colors">
                                <div className="flex items-center justify-between">
                                    <div className="space-y-1">
                                        <div className="font-medium flex items-center gap-2">
                                            {profile.name}
                                            <Badge variant="outline" className="text-xs font-normal">
                                                {profile.rules.length} Rules
                                            </Badge>
                                        </div>
                                        <div className="text-xs text-muted-foreground">{profile.description}</div>
                                    </div>
                                    <div className="flex gap-1">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => {
                                                setEditingProfileId(profile.id);
                                                setProfileDialogOpen(true);
                                            }}
                                        >
                                            <Edit className="h-4 w-4 text-primary" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                            onClick={() => {
                                                const current = layup.assignedProfileIds || [];
                                                updateLayup(layup.id, {
                                                    assignedProfileIds: current.filter(id => id !== pid)
                                                });
                                            }}
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>

                                {/* Compliance View Embed */}
                                <RequirementComplianceView
                                    entityId={layup.id}
                                    entityType="layup"
                                    profileId={profile.id}
                                />
                            </div>
                        )
                    })}
                </div>

                {/* Add New */}
                <div className="border-t pt-4">
                    <h4 className="text-sm font-medium mb-3">Assign Profile</h4>
                    <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
                        <PopoverTrigger asChild>
                            <Button variant="outline" className="w-[300px] justify-between">
                                Select Requirement Profile...
                                <PlusIcon className="ml-2 h-4 w-4 opacity-50" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[300px] p-0" align="start">
                            <div className="flex flex-col max-h-[300px] overflow-y-auto border rounded-md bg-popover text-popover-foreground">
                                {requirementProfiles.length === 0 && (
                                    <div className="p-4 text-sm text-center text-muted-foreground">No profiles found.</div>
                                )}
                                {requirementProfiles.map(profile => {
                                    const isAssigned = (layup.assignedProfileIds || []).includes(profile.id);
                                    return (
                                        <div
                                            key={profile.id}
                                            className={cn(
                                                "flex items-center gap-2 px-4 py-2 cursor-pointer hover:bg-muted text-sm transition-colors",
                                                isAssigned ? "text-muted-foreground bg-muted/50" : ""
                                            )}
                                            onClick={() => {
                                                if (isAssigned) return;
                                                const current = layup.assignedProfileIds || [];
                                                updateLayup(layup.id, {
                                                    assignedProfileIds: [...current, profile.id]
                                                });
                                                setIsPopoverOpen(false);
                                            }}
                                        >
                                            <Check
                                                className={cn(
                                                    "h-4 w-4",
                                                    isAssigned ? "opacity-100" : "opacity-0"
                                                )}
                                            />
                                            <div className="flex flex-col">
                                                <span>{profile.name}</span>
                                                {profile.description && (
                                                    <span className="text-[10px] text-muted-foreground truncate max-w-[200px]">{profile.description}</span>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </PopoverContent>
                    </Popover>
                </div>

                {profileDialogOpen && (
                    <RequirementProfileDialog
                        open={profileDialogOpen}
                        onOpenChange={setProfileDialogOpen}
                        initialData={requirementProfiles.find(p => p.id === editingProfileId)}
                        onSave={async (updated) => {
                            if (updated.id) {
                                await updateRequirementProfile(updated.id, updated);
                            }
                            setProfileDialogOpen(false);
                        }}
                    />
                )}
            </CardContent>
        </Card>
    );
}
