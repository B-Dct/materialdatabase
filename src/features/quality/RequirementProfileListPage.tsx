import { useEffect } from 'react';
import { useAppStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Plus, Eye } from 'lucide-react';
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
    const { requirementProfiles, fetchRequirementProfiles } = useAppStore();
    const navigate = useNavigate();

    useEffect(() => {
        fetchRequirementProfiles();
    }, [fetchRequirementProfiles]);

    return (
        <div className="h-full flex flex-col p-8 space-y-6 animate-in fade-in duration-500">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Standards</h1>
                    <p className="text-muted-foreground">Manage requirement profiles and acceptance criteria.</p>
                </div>
                <Button onClick={() => navigate('/standards/new')}>
                    <Plus className="mr-2 h-4 w-4" /> Add Standard
                </Button>
            </div>

            <div className="flex-1 overflow-hidden border rounded-md">
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
                                    <TableCell>{profile.rules?.length || 0}</TableCell>
                                    <Button variant="ghost" size="icon">
                                        <Eye className="h-4 w-4 text-muted-foreground" />
                                    </Button>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
