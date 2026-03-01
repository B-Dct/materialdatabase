import { useState, useEffect } from 'react';
import { useAppStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Plus, Search, Eye, Trash2, Briefcase } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { CreateProjectDialog } from './CreateProjectDialog';
import { EmptyState } from '@/components/ui/empty-state';
import { TableSkeleton } from '@/components/ui/table-skeleton';

export const ProjectsPage = () => {
    const { projects, fetchProjects, deleteProject } = useAppStore();
    const [searchTerm, setSearchTerm] = useState('');
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [projectToDelete, setProjectToDelete] = useState<{ id: string, name: string } | null>(null);

    useEffect(() => {
        const load = async () => {
            setIsLoading(true);
            await fetchProjects();
            setIsLoading(false);
        };
        load();
    }, [fetchProjects]);

    const filteredProjects = projects.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.projectNumber.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const confirmDelete = async () => {
        if (!projectToDelete) return;
        try {
            await deleteProject(projectToDelete.id);
            setDeleteDialogOpen(false);
            setProjectToDelete(null);
            toast.success("Project deleted successfully");
        } catch (e: any) {
            console.error("Failed to delete project:", e);
            toast.error(e.message || "Failed to delete project", {
                duration: 10000,
                description: "The project might contain materials, layups, or test requests and cannot be deleted.",
            });
            setDeleteDialogOpen(false);
        }
    };

    return (
        <div className="h-full flex flex-col p-8 space-y-6 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
                    <p className="text-muted-foreground mt-2">Manage your engineering projects and create material/process lists.</p>
                </div>
                <Button onClick={() => setIsCreateOpen(true)} size="lg">
                    <Plus className="mr-2 h-4 w-4" /> Add Project
                </Button>
            </div>

            <div className="flex items-center space-x-2">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search projects..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-8"
                    />
                </div>
            </div>

            <div className="rounded-md border bg-card">
                {isLoading ? (
                    <TableSkeleton columns={6} rows={4} />
                ) : filteredProjects.length === 0 ? (
                    <EmptyState
                        icon={Briefcase}
                        title={searchTerm ? "No projects found" : "No projects yet"}
                        description={searchTerm ? "Try adjusting your search terms." : "Create your first engineering project to organize materials and layups."}
                        actionLabel={searchTerm ? undefined : "Create Project"}
                        onAction={searchTerm ? undefined : () => setIsCreateOpen(true)}
                    />
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Number</TableHead>
                                <TableHead>Name</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Revision</TableHead>
                                <TableHead>Created</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredProjects.map((project) => (
                                <TableRow key={project.id}>
                                    <TableCell className="font-medium">{project.projectNumber}</TableCell>
                                    <TableCell>{project.name}</TableCell>
                                    <TableCell>
                                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${project.status === 'Active' ? 'bg-green-100 text-green-800' :
                                            project.status === 'Completed' ? 'bg-blue-100 text-blue-800' :
                                                project.status === 'On Hold' ? 'bg-yellow-100 text-yellow-800' :
                                                    'bg-gray-100 text-gray-800'
                                            }`}>
                                            {project.status}
                                        </span>
                                    </TableCell>
                                    <TableCell>{project.revision}</TableCell>
                                    <TableCell>{new Date(project.createdAt || '').toLocaleDateString()}</TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Link to={`/projects/${project.id}`}>
                                                <Button variant="ghost" size="icon" title="View Project">
                                                    <Eye className="h-4 w-4" />
                                                </Button>
                                            </Link>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => {
                                                    setProjectToDelete({ id: project.id, name: project.name });
                                                    setDeleteDialogOpen(true);
                                                }}
                                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                                title="Delete Project"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </div>

            <CreateProjectDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} />

            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Project?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete the project <span className="font-semibold text-foreground">{projectToDelete?.name}</span>?
                            This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setProjectToDelete(null)}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90">
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
};
