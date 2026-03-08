import { useState, useEffect } from 'react';
import { useAppStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Plus, Trash2, ListTree, Beaker, FileCheck2 } from 'lucide-react';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
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
import { Label } from "@/components/ui/label";
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export function TaskTemplateManager() {
    const {
        taskTemplates, taskTemplateItems,
        fetchTaskTemplates, createTaskTemplate, deleteTaskTemplate,
        fetchTaskTemplateItems, createTaskTemplateItem, deleteTaskTemplateItem
    } = useAppStore();

    const [isCreatingTemplate, setIsCreatingTemplate] = useState(false);
    const [newTemplateName, setNewTemplateName] = useState("");
    const [newTemplateDesc, setNewTemplateDesc] = useState("");
    const [newTemplatePhase, setNewTemplatePhase] = useState<'specimen_preparation' | 'testing'>('testing');
    const [deleteTemplateId, setDeleteTemplateId] = useState<string | null>(null);

    const [expandedTemplateId, setExpandedTemplateId] = useState<string | null>(null);
    const [isCreatingItem, setIsCreatingItem] = useState(false);
    const [newItemName, setNewItemName] = useState("");
    const [newItemDuration, setNewItemDuration] = useState("8");
    const [newItemDependsOn, setNewItemDependsOn] = useState<string>("none");
    const [newItemOffset, setNewItemOffset] = useState("0");

    useEffect(() => {
        fetchTaskTemplates();
    }, []);

    const handleExpand = (templateId: string) => {
        if (expandedTemplateId === templateId) {
            setExpandedTemplateId(null);
        } else {
            setExpandedTemplateId(templateId);
            fetchTaskTemplateItems(templateId);
            setIsCreatingItem(false);
        }
    };

    const handleCreateTemplate = async () => {
        if (!newTemplateName.trim()) return;
        await createTaskTemplate({
            name: newTemplateName,
            description: newTemplateDesc,
            phase: newTemplatePhase
        });
        setNewTemplateName("");
        setNewTemplateDesc("");
        setNewTemplatePhase('testing');
        setIsCreatingTemplate(false);
    };

    const confirmDeleteTemplate = async () => {
        if (deleteTemplateId) {
            await deleteTaskTemplate(deleteTemplateId);
            setDeleteTemplateId(null);
            if (expandedTemplateId === deleteTemplateId) setExpandedTemplateId(null);
        }
    };

    const handleCreateItem = async (templateId: string) => {
        if (!newItemName.trim() || !newItemDuration) return;

        let dependsOnIndex: number | undefined = undefined;
        if (newItemDependsOn !== "none") {
            dependsOnIndex = parseInt(newItemDependsOn, 10);
        }

        await createTaskTemplateItem({
            templateId,
            name: newItemName,
            durationHours: parseInt(newItemDuration, 10),
            dependsOnItemIndex: dependsOnIndex,
            dependencyOffsetDays: parseInt(newItemOffset, 10) || 0,
            orderIndex: 0 // Will be overridden in store
        });

        setIsCreatingItem(false);
        setNewItemName("");
        setNewItemDuration("8");
        setNewItemDependsOn("none");
        setNewItemOffset("0");
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-medium">Task Templates</h3>
                    <p className="text-sm text-muted-foreground">
                        Define reusable sequences of tasks for testing or specimen preparation.
                    </p>
                </div>
                {!isCreatingTemplate && (
                    <Button onClick={() => setIsCreatingTemplate(true)} size="sm">
                        <Plus className="mr-2 h-4 w-4" /> Add Template
                    </Button>
                )}
            </div>

            {isCreatingTemplate && (
                <Card className="border-dashed bg-muted/30">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base">New Workflow Template</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4 max-w-2xl">
                            <div className="space-y-2">
                                <Label>Template Name</Label>
                                <Input
                                    placeholder="e.g. Standard Tensile Prep"
                                    value={newTemplateName}
                                    onChange={(e) => setNewTemplateName(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Phase</Label>
                                <Select value={newTemplatePhase} onValueChange={(v: any) => setNewTemplatePhase(v)}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="specimen_preparation">Specimen Preparation</SelectItem>
                                        <SelectItem value="testing">Testing</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2 col-span-2">
                                <Label>Description</Label>
                                <Input
                                    placeholder="Optional description..."
                                    value={newTemplateDesc}
                                    onChange={(e) => setNewTemplateDesc(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="flex justify-start gap-2 max-w-2xl">
                            <Button onClick={handleCreateTemplate} disabled={!newTemplateName.trim()}>Save Template</Button>
                            <Button variant="ghost" onClick={() => setIsCreatingTemplate(false)}>Cancel</Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            <div className="grid gap-4">
                {taskTemplates.map(template => {
                    const isExpanded = expandedTemplateId === template.id;
                    const items = taskTemplateItems[template.id] || [];
                    const sortedItems = [...items].sort((a, b) => a.orderIndex - b.orderIndex);

                    return (
                        <Card key={template.id} className={isExpanded ? "border-primary/50 shadow-sm" : ""}>
                            <CardHeader className="py-4">
                                <div className="flex items-start justify-between">
                                    <div className="space-y-1 cursor-pointer flex-1" onClick={() => handleExpand(template.id)}>
                                        <div className="flex items-center gap-2">
                                            {template.phase === 'testing' ? <Beaker className="h-4 w-4 text-primary" /> : <FileCheck2 className="h-4 w-4 text-orange-500" />}
                                            <CardTitle className="text-base">{template.name}</CardTitle>
                                            <Badge variant="outline" className="text-xs font-normal">
                                                {template.phase === 'testing' ? 'Testing' : 'Preparation'}
                                            </Badge>
                                        </div>
                                        {template.description && (
                                            <CardDescription>{template.description}</CardDescription>
                                        )}
                                        <div className="text-xs text-muted-foreground mt-2 flex items-center gap-3">
                                            <span><strong>{items.length}</strong> Task Steps</span>
                                            <span><strong>{items.reduce((sum, i) => sum + i.durationHours, 0)}h</strong> Total Effort</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleExpand(template.id)}
                                        >
                                            {isExpanded ? 'Hide Items' : 'Manage Sequence...'}
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                            onClick={() => setDeleteTemplateId(template.id)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            </CardHeader>

                            {isExpanded && (
                                <CardContent className="pt-0 pb-4 border-t mt-4 bg-slate-50/50">
                                    <div className="mt-4 mb-2 flex items-center justify-between">
                                        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                                            <ListTree className="h-4 w-4" /> Template Sequence
                                        </div>
                                        {!isCreatingItem && (
                                            <Button size="sm" variant="outline" onClick={() => setIsCreatingItem(true)} className="h-8 text-xs">
                                                <Plus className="mr-2 h-3 w-3" /> Add Task Step
                                            </Button>
                                        )}
                                    </div>

                                    {sortedItems.length > 0 ? (
                                        <div className="bg-white border rounded-md shadow-sm overflow-hidden mb-4">
                                            <Table>
                                                <TableHeader>
                                                    <TableRow className="bg-muted/50">
                                                        <TableHead className="w-12 text-center">#</TableHead>
                                                        <TableHead>Task Name</TableHead>
                                                        <TableHead>Standard Duration</TableHead>
                                                        <TableHead>Depends On</TableHead>
                                                        <TableHead className="w-[80px] text-right">Actions</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {sortedItems.map((item, idx) => {
                                                        const depItem = item.dependsOnItemIndex !== undefined
                                                            ? sortedItems.find(i => i.orderIndex === item.dependsOnItemIndex)
                                                            : null;
                                                        return (
                                                            <TableRow key={item.id}>
                                                                <TableCell className="text-center font-mono text-muted-foreground text-xs">{idx + 1}</TableCell>
                                                                <TableCell className="font-medium text-sm">{item.name}</TableCell>
                                                                <TableCell className="text-xs">{item.durationHours} hrs</TableCell>
                                                                <TableCell className="text-xs">
                                                                    {depItem ? (
                                                                        <span className="flex items-center gap-1">
                                                                            <span className="text-muted-foreground">After:</span> {depItem.name}
                                                                            {item.dependencyOffsetDays ? ` (${item.dependencyOffsetDays > 0 ? '+' : ''}${item.dependencyOffsetDays}d)` : ''}
                                                                        </span>
                                                                    ) : <span className="text-muted-foreground italic">-</span>}
                                                                </TableCell>
                                                                <TableCell className="text-right">
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="h-6 w-6 text-destructive"
                                                                        onClick={() => deleteTaskTemplateItem(item.id, template.id)}
                                                                    >
                                                                        <Trash2 className="h-3 w-3" />
                                                                    </Button>
                                                                </TableCell>
                                                            </TableRow>
                                                        );
                                                    })}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    ) : (
                                        <div className="py-6 text-center border rounded-md border-dashed bg-white mb-4">
                                            <p className="text-sm text-muted-foreground">No tasks defined in this template.</p>
                                        </div>
                                    )}

                                    {isCreatingItem && (
                                        <div className="p-4 bg-white border border-primary/20 rounded-md shadow-sm space-y-4">
                                            <h4 className="text-sm font-semibold">New Task Step</h4>
                                            <div className="grid grid-cols-12 gap-4">
                                                <div className="col-span-5 space-y-1.5">
                                                    <Label className="text-xs">Task Name</Label>
                                                    <Input
                                                        className="h-8 text-sm"
                                                        value={newItemName}
                                                        onChange={e => setNewItemName(e.target.value)}
                                                        placeholder="e.g. Conditioning"
                                                    />
                                                </div>
                                                <div className="col-span-2 space-y-1.5">
                                                    <Label className="text-xs">Duration (hrs)</Label>
                                                    <Input
                                                        type="number"
                                                        className="h-8 text-sm"
                                                        value={newItemDuration}
                                                        onChange={e => setNewItemDuration(e.target.value)}
                                                    />
                                                </div>
                                                <div className="col-span-3 space-y-1.5">
                                                    <Label className="text-xs">Depends On</Label>
                                                    <Select value={newItemDependsOn} onValueChange={setNewItemDependsOn}>
                                                        <SelectTrigger className="h-8 text-xs">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="none">None</SelectItem>
                                                            {sortedItems.map((opt, i) => (
                                                                <SelectItem key={opt.id} value={opt.orderIndex.toString()}>{i + 1}. {opt.name}</SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <div className="col-span-2 space-y-1.5">
                                                    <Label className="text-xs">Offset (d)</Label>
                                                    <Input
                                                        type="number"
                                                        className="h-8 text-sm"
                                                        value={newItemOffset}
                                                        onChange={e => setNewItemOffset(e.target.value)}
                                                    />
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                <Button size="sm" onClick={() => handleCreateItem(template.id)} disabled={!newItemName.trim() || !newItemDuration}>Add Step</Button>
                                                <Button size="sm" variant="ghost" onClick={() => setIsCreatingItem(false)}>Cancel</Button>
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                            )}
                        </Card>
                    );
                })}
            </div>

            <AlertDialog open={!!deleteTemplateId} onOpenChange={(open) => !open && setDeleteTemplateId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Template?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to permanently delete this workflow template? This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDeleteTemplate} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
