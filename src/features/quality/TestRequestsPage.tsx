import { useEffect, useState, useMemo } from 'react';
import { useAppStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FlaskConical, Link2 } from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';

export function TestRequestsPage() {
    const {
        testRequests, fetchTestRequests, updateTestRequest,
        materials, fetchMaterials,
        layups, fetchLayups,
        assemblies, fetchAssemblies,
        isLoading
    } = useAppStore();

    const navigate = useNavigate();

    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [editingOrderNumberId, setEditingOrderNumberId] = useState<string | null>(null);
    const [tempOrderNumber, setTempOrderNumber] = useState('');

    useEffect(() => {
        if (testRequests.length === 0) fetchTestRequests();
        if (materials.length === 0) fetchMaterials();
        if (layups.length === 0) fetchLayups();
        if (assemblies.length === 0) fetchAssemblies();
    }, [fetchTestRequests, fetchMaterials, fetchLayups, fetchAssemblies, testRequests.length, materials.length, layups.length, assemblies.length]);

    const getEntityInfo = (type: string, id: string) => {
        let name = "Unknown";
        let link = "";
        if (type === 'material') {
            const m = materials.find(x => x.id === id);
            name = m ? m.name : id;
            link = `/materials/${id}`;
        } else if (type === 'layup') {
            const l = layups.find(x => x.id === id);
            name = l ? l.name : id;
            link = `/layups/${id}`;
        } else if (type === 'assembly') {
            const a = assemblies.find(x => x.id === id);
            name = a ? a.name : id;
            link = `/assemblies/${id}`;
        }
        return { name, link };
    };

    const handleSaveOrderNumber = async (id: string) => {
        try {
            await updateTestRequest(id, { orderNumber: tempOrderNumber });
            setEditingOrderNumberId(null);
        } catch (e) {
            console.error("Failed to update order number", e);
        }
    };

    const handleStatusChange = async (id: string, newStatus: any) => {
        try {
            await updateTestRequest(id, { status: newStatus });
        } catch (e) {
            console.error("Failed to update status", e);
        }
    };

    const getStatusVariant = (status: string) => {
        switch (status) {
            case 'requested': return 'default';
            case 'in_progress': return 'secondary';
            case 'completed': return 'outline';
            case 'canceled': return 'destructive';
            default: return 'outline';
        }
    };

    const formatStatus = (s: string) => s.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());

    const filteredRequests = useMemo(() => {
        if (statusFilter === 'all') return testRequests;
        return testRequests.filter(tr => tr.status === statusFilter);
    }, [testRequests, statusFilter]);

    return (
        <div className="flex h-full flex-col bg-background animate-in fade-in duration-500">
            {/* Header */}
            <div className="border-b px-6 py-4 flex items-center justify-between shrink-0 bg-card text-card-foreground shadow-sm z-10">
                <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                        <div className="bg-primary/10 p-2 rounded-lg">
                            <FlaskConical className="h-5 w-5 text-primary" />
                        </div>
                        <h1 className="text-xl font-bold tracking-tight">Test Requests</h1>
                    </div>
                    <p className="text-sm text-muted-foreground max-w-2xl pl-11">
                        Manage laboratory test requests for materials, layups, and assemblies.
                    </p>
                </div>
            </div>

            <div className="p-6 flex-1 overflow-auto bg-slate-50/50 dark:bg-slate-900/20">
                <div className="bg-white rounded-md border shadow-sm">
                    <div className="p-4 border-b flex items-center justify-between">
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="Filter by status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Requests</SelectItem>
                                <SelectItem value="requested">Requested</SelectItem>
                                <SelectItem value="in_progress">In Progress</SelectItem>
                                <SelectItem value="completed">Completed</SelectItem>
                                <SelectItem value="canceled">Canceled</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[140px]">Date</TableHead>
                                <TableHead>Requester</TableHead>
                                <TableHead>Entity</TableHead>
                                <TableHead>Tests Requested</TableHead>
                                <TableHead>Variants</TableHead>
                                <TableHead>Order Number</TableHead>
                                <TableHead className="w-[150px]">Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading && filteredRequests.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Loading requests...</TableCell>
                                </TableRow>
                            ) : filteredRequests.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No test requests found.</TableCell>
                                </TableRow>
                            ) : filteredRequests.map(req => {
                                const entityInfo = getEntityInfo(req.entityType, req.entityId);

                                return (
                                    <TableRow key={req.id}>
                                        <TableCell className="text-xs text-muted-foreground">
                                            {format(new Date(req.createdAt), 'MMM dd, yyyy HH:mm')}
                                        </TableCell>
                                        <TableCell className="font-medium">{req.requesterName}</TableCell>
                                        <TableCell>
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center gap-2">
                                                    <Badge variant="outline" className="text-[10px] uppercase">{req.entityType}</Badge>
                                                    <Button variant="link" className="h-auto p-0 flex items-center gap-1" onClick={() => navigate(entityInfo.link)}>
                                                        <span>{req.entityName}</span>
                                                        <Link2 className="h-3 w-3" />
                                                    </Button>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="font-semibold text-sm">{req.propertyName}</span>
                                                <span className="text-xs text-muted-foreground">{req.testMethodName}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="text-xs flex flex-col gap-1">
                                                <div><span className="text-muted-foreground">Vars:</span> {req.numVariants}</div>
                                                <div><span className="text-muted-foreground">Specs:</span> {req.numSpecimens}</div>
                                                {req.variantDescription && (
                                                    <span className="truncate max-w-[150px] inline-block text-muted-foreground italic mt-1" title={req.variantDescription}>
                                                        "{req.variantDescription}"
                                                    </span>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {editingOrderNumberId === req.id ? (
                                                <div className="flex items-center gap-2">
                                                    <Input
                                                        value={tempOrderNumber}
                                                        onChange={e => setTempOrderNumber(e.target.value)}
                                                        className="h-8 text-xs w-[120px]"
                                                        autoFocus
                                                        onKeyDown={e => {
                                                            if (e.key === 'Enter') handleSaveOrderNumber(req.id);
                                                            if (e.key === 'Escape') setEditingOrderNumberId(null);
                                                        }}
                                                    />
                                                    <Button size="sm" variant="ghost" onClick={() => handleSaveOrderNumber(req.id)}>Save</Button>
                                                </div>
                                            ) : (
                                                <div
                                                    className="cursor-pointer hover:bg-muted p-1 rounded min-h-6 min-w-16 flex items-center"
                                                    onClick={() => {
                                                        setEditingOrderNumberId(req.id);
                                                        setTempOrderNumber(req.orderNumber || '');
                                                    }}
                                                >
                                                    {req.orderNumber ? (
                                                        <span className="font-mono text-sm">{req.orderNumber}</span>
                                                    ) : (
                                                        <span className="text-muted-foreground text-xs italic">Click to assign</span>
                                                    )}
                                                </div>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <Select
                                                value={req.status}
                                                onValueChange={(val) => handleStatusChange(req.id, val)}
                                            >
                                                <SelectTrigger className="h-8">
                                                    <Badge variant={getStatusVariant(req.status) as any} className="pointer-events-none">
                                                        {formatStatus(req.status)}
                                                    </Badge>
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="requested">Requested</SelectItem>
                                                    <SelectItem value="in_progress">In Progress</SelectItem>
                                                    <SelectItem value="completed">Completed</SelectItem>
                                                    <SelectItem value="canceled">Canceled</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </TableCell>
                                    </TableRow>
                                )
                            })}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </div>
    );
}
