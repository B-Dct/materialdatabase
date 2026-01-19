import { Briefcase } from "lucide-react";
import type { Material } from "@/types/domain";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface MaterialUsageProps {
    material: Material;
}

// Mock Data for "Project Material Lists"
const MOCK_PROJECTS = [
    { id: 'proj-001', name: 'Airbus A350 Wing', list: 'Structural Composites', role: 'Primary Structure', status: 'Approved' },
    { id: 'proj-002', name: 'Formula 1 Front Wing', list: 'Aero Parts', role: 'Skin', status: 'In Review' },
    { id: 'proj-003', name: 'Internal R&D', list: 'Material Screening', role: 'Candidate', status: 'Testing' },
];

export function MaterialUsage({ material }: MaterialUsageProps) {
    // In a real app, we would fetch projects where materialId matches.
    // For now, we randomize visibility based on ID to simulate variety
    const linkedProjects = MOCK_PROJECTS.filter(() => Math.random() > 0.3 || material.name.includes("Carbon"));

    if (linkedProjects.length === 0) {
        return (
            <div className="py-12 text-center border-2 border-dashed rounded-lg bg-muted/10 text-muted-foreground">
                <Briefcase className="mx-auto h-12 w-12 opacity-50 mb-3" />
                <h3 className="text-lg font-medium">No Project usage found</h3>
                <p className="text-sm">This material is not currently assigned to any project lists.</p>
            </div>
        );
    }

    return (
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Project Name</TableHead>
                        <TableHead>Material List</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Status</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {linkedProjects.map((proj) => (
                        <TableRow key={proj.id}>
                            <TableCell className="font-medium">{proj.name}</TableCell>
                            <TableCell>{proj.list}</TableCell>
                            <TableCell>{proj.role}</TableCell>
                            <TableCell>
                                <Badge variant={proj.status === 'Approved' ? 'default' : 'secondary'}>
                                    {proj.status}
                                </Badge>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
