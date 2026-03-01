import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DataTable } from '@/components/ui/data-table';
import { Plus, Link2, Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';

interface ProjectEntityListProps<T extends { id: string; name: string }> {
    projectId: string;
    entityType: 'material' | 'process' | 'layup' | 'assembly' | 'standardPart';
    assignedItems: T[];
    onAssignClick: () => void;
    onRemove: (entityId: string) => void;
    title: string;
    icon: any;
    createNewPath?: string;
    columns: any[];
    isEditing?: boolean;
    listStatus?: 'open' | 'closed';
    listRevision?: string;
    onFinalize?: () => void;
    onReopen?: () => void;
    onViewHistory?: () => void;
}

export function ProjectEntityList<T extends { id: string; name: string; status?: string; }>({
    assignedItems,
    onAssignClick,
    title,
    icon: Icon,
    createNewPath,
    columns,
    isEditing = true,
    listStatus,
    listRevision,
    onFinalize,
    onReopen,
    onViewHistory
}: ProjectEntityListProps<T>) {

    const navigate = useNavigate();
    const [search, setSearch] = useState("");

    const filteredAssigned = useMemo(() => {
        if (!search) return assignedItems;
        return assignedItems.filter(i => i.name.toLowerCase().includes(search.toLowerCase()));
    }, [assignedItems, search]);

    return (
        <div className="flex flex-col gap-4 h-full">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Icon className="h-5 w-5 text-muted-foreground" />
                    <h3 className="font-semibold text-lg">{title}</h3>
                    <Badge variant="secondary">{assignedItems.length}</Badge>
                    {listRevision && <Badge variant="outline" className="ml-2 font-medium">Rev {listRevision}</Badge>}
                    {listStatus && (
                        <Badge variant={listStatus === 'open' ? 'secondary' : 'default'} className="ml-1">
                            {listStatus === 'open' ? 'Open' : 'Closed'}
                        </Badge>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    {onViewHistory && (
                        <Button variant="outline" size="sm" onClick={onViewHistory}>
                            View History
                        </Button>
                    )}

                    {listStatus === 'open' ? (
                        <>
                            {onFinalize && (
                                <Button variant="default" size="sm" onClick={onFinalize} className="bg-blue-600 hover:bg-blue-700 text-white">
                                    Finalize Revision
                                </Button>
                            )}
                            {isEditing && (
                                <>
                                    <Button onClick={onAssignClick} variant="outline" size="sm" className="h-9 gap-2">
                                        <Link2 className="h-4 w-4" />
                                        Assign Existing
                                    </Button>

                                    {createNewPath && (
                                        <Button onClick={() => navigate(createNewPath)} size="sm" className="h-9 gap-2">
                                            <Plus className="h-4 w-4" />
                                            Create New
                                        </Button>
                                    )}
                                </>
                            )}
                        </>
                    ) : (
                        <>
                            {onReopen && (
                                <Button variant="default" size="sm" onClick={onReopen} className="bg-green-600 hover:bg-green-700 text-white">
                                    Start New Revision
                                </Button>
                            )}
                        </>
                    )}
                </div>
            </div>

            {assignedItems.length === 0 ? (
                <div className="mt-8">
                    <EmptyState
                        icon={Icon}
                        title={`No ${title} assigned`}
                        description={`There are currently no ${title.toLowerCase()} assigned to this work package.`}
                    />
                </div>
            ) : (
                <div className="space-y-4">
                    <div className="relative w-64">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder={`Search ${title.toLowerCase()}...`}
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-9 h-9"
                        />
                    </div>

                    <div className="border rounded-md bg-card">
                        <DataTable
                            columns={columns}
                            data={filteredAssigned}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
