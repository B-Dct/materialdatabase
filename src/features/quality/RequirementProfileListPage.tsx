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
import { Plus, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

export function RequirementProfileListPage() {
    const { requirementProfiles, fetchRequirementProfiles, addRequirementProfile } = useAppStore();
    const navigate = useNavigate();
    const [createOpen, setCreateOpen] = useState(false);

    // Create Form State
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');

    useEffect(() => {
        fetchRequirementProfiles();
    }, [fetchRequirementProfiles]);

    const handleCreate = async () => {
        if (!name) return;

        await addRequirementProfile({
            name,
            description,
            rules: []
        });
        setCreateOpen(false);
        setName('');
        setDescription('');
    };

    return (
        <div className="p-8 space-y-6 animate-in fade-in duration-500">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Standards</h1>
                    <p className="text-muted-foreground">Manage requirement profiles and acceptance criteria.</p>
                </div>
                <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="mr-2 h-4 w-4" /> Create Standard
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                        <DialogHeader>
                            <DialogTitle>New Standard</DialogTitle>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <label>Name</label>
                                <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Airbus A350 Interior" />
                            </div>
                            <div className="grid gap-2">
                                <label>Description</label>
                                <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="e.g. Standard interior components" />
                            </div>
                            <Button onClick={handleCreate} className="mt-4">Create</Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

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
                                    onClick={() => navigate(`/standards/${profile.id}`)}
                                >
                                    <TableCell className="font-medium">{profile.name}</TableCell>
                                    <TableCell>{profile.description}</TableCell>
                                    <TableCell>{profile.rules.length}</TableCell>
                                    <TableCell>
                                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
