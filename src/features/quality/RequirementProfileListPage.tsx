import { useEffect, useState } from 'react';
import { useAppStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Plus, ChevronRight, Edit } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { RequirementProfileDialog } from './RequirementEditorDialog'; // Unified Dialog
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

export function RequirementProfileListPage() {
    const { requirementProfiles, fetchRequirementProfiles, addRequirementProfile, updateRequirementProfile } = useAppStore();
    const navigate = useNavigate();
    const [createOpen, setCreateOpen] = useState(false);

    // Edit State
    const [editOpen, setEditOpen] = useState(false);
    const [editingProfileId, setEditingProfileId] = useState<string | null>(null);

    useEffect(() => {
        fetchRequirementProfiles();
    }, [fetchRequirementProfiles]);

    const handleCreate = async (profileData: any) => {
        await addRequirementProfile({
            ...profileData,
            rules: profileData.rules || []
        });
        setCreateOpen(false);
    };

    const handleUpdate = async (profileData: any) => {
        if (editingProfileId) {
            await updateRequirementProfile(editingProfileId, profileData);
        }
        setEditOpen(false);
    };

    return (
        <div className="p-8 space-y-6 animate-in fade-in duration-500">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Standards</h1>
                    <p className="text-muted-foreground">Manage requirement profiles and acceptance criteria.</p>
                </div>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Standards</h1>
                    <p className="text-muted-foreground">Manage requirement profiles and acceptance criteria.</p>
                </div>
                <Button onClick={() => setCreateOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" /> Create Standard
                </Button>
            </div>

            {/* Create Dialog */}
            {createOpen && (
                <RequirementProfileDialog
                    open={createOpen}
                    onOpenChange={setCreateOpen}
                    initialData={null}
                    onSave={handleCreate}
                />
            )}

            <div className="border rounded-md">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead>Rules Count</TableHead>
                            <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {requirementProfiles.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                                    No standards defined.
                                </TableCell>
                            </TableRow>
                        ) : (
                            requirementProfiles.map((profile) => (
                                <TableRow
                                    key={profile.id}
                                    className="cursor-pointer hover:bg-muted/50"
                                    onClick={() => navigate(profile.id)}
                                >
                                    <TableCell className="font-medium">{profile.name}</TableCell>
                                    <TableCell>{profile.description}</TableCell>
                                    <TableCell>{profile.rules.length}</TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setEditingProfileId(profile.id);
                                                    setEditOpen(true);
                                                }}
                                            >
                                                <Edit className="h-4 w-4 text-muted-foreground" />
                                            </Button>
                                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Edit Dialog */}
            {editOpen && (
                <RequirementProfileDialog
                    open={editOpen}
                    onOpenChange={setEditOpen}
                    initialData={requirementProfiles.find(p => p.id === editingProfileId)}
                    onSave={handleUpdate}
                />
            )}
        </div>
    );
}
