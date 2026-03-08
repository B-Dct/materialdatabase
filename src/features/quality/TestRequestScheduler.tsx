import { useState, useEffect, useMemo } from 'react';
import { useAppStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CalendarClock, Link as LinkIcon, Plus, Trash2, User, X, ArrowUp, ArrowDown, Lock, Unlock, AlertTriangle } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format, differenceInDays, addDays, parseISO, max, min, isValid } from 'date-fns';
import type { TestTask } from '@/types/domain';
import { useParams, useNavigate } from 'react-router-dom';

export function TestRequestScheduler() {
    const { id } = useParams<{ id: string }>();
    const requestId = id || '';
    const navigate = useNavigate();
    const {
        testRequests, fetchTestRequests, updateTestRequest,
        testTasks, fetchTestTasks, createTestTask, updateTestTask, deleteTestTask,
        labTechnicians, fetchLabTechnicians,
        taskTemplates, fetchTaskTemplates, applyTemplateToRequest
    } = useAppStore();

    const [isAddingTask, setIsAddingTask] = useState(false);
    const [newTaskName, setNewTaskName] = useState('');
    const [newTaskDuration, setNewTaskDuration] = useState('8');
    const [newTaskStart, setNewTaskStart] = useState('');
    const [newTaskTarget, setNewTaskTarget] = useState('');
    const [newTaskAssignee, setNewTaskAssignee] = useState('unassigned');
    const [newTaskDependsOn, setNewTaskDependsOn] = useState('none');
    const [newTaskDependencyOffset, setNewTaskDependencyOffset] = useState('0');
    const [highlightedTaskId, setHighlightedTaskId] = useState<string | null>(null);
    const [editingTaskIds, setEditingTaskIds] = useState<Record<string, boolean>>({});

    const safeFormatDate = (dateStr: string | null | undefined, formatStr: string = 'dd.MM.yyyy') => {
        if (!dateStr) return '';
        const parsed = parseISO(dateStr);
        if (!isValid(parsed)) return 'Invalid';
        return format(parsed, formatStr);
    };

    const [isApplyingTemplate, setIsApplyingTemplate] = useState<{ type: 'specimen_preparation' | 'testing' } | null>(null);
    const [selectedTemplateId, setSelectedTemplateId] = useState('');
    const [templateStartDate, setTemplateStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));

    useEffect(() => {
        if (testRequests.length === 0) fetchTestRequests();
        fetchTestTasks(requestId);
        if (labTechnicians.length === 0) fetchLabTechnicians();
        if (taskTemplates.length === 0) fetchTaskTemplates();
    }, [requestId]);

    const request = testRequests.find(tr => tr.id === requestId);
    // Sort overall tasks by strictly start date and optionally by dependency mapping in a more complete implementation.
    // Here we sort initially by startDate to keep them linear on the view
    const tasks = useMemo(() => {
        const t = testTasks[requestId] || [];
        return [...t].sort((a, b) => {
            const valA = a.orderIndex ?? 0;
            const valB = b.orderIndex ?? 0;
            if (valA !== valB) return valA - valB;
            return (a.startDate || '').localeCompare(b.startDate || '');
        });
    }, [testTasks, requestId]);

    const handleMoveTask = async (index: number, direction: 'up' | 'down') => {
        if (direction === 'up' && index === 0) return;
        if (direction === 'down' && index === tasks.length - 1) return;

        const taskA = tasks[index];
        const taskB = tasks[direction === 'up' ? index - 1 : index + 1];

        const newOrderA = taskB.orderIndex ?? (direction === 'up' ? index - 1 : index + 1);
        const newOrderB = taskA.orderIndex ?? index;

        await Promise.all([
            updateTestTask(taskA.id, { orderIndex: newOrderA }),
            updateTestTask(taskB.id, { orderIndex: newOrderB })
        ]);
    };

    const handleApplyTemplate = async () => {
        if (!selectedTemplateId || !templateStartDate) return;
        await applyTemplateToRequest(selectedTemplateId, requestId, templateStartDate);
        setIsApplyingTemplate(null);
        setSelectedTemplateId('');
    };

    const handleCreateTask = async () => {
        if (!newTaskName.trim()) return;

        let calculatedStart = newTaskStart;
        if (!calculatedStart && newTaskDependsOn !== 'none') {
            const pred = tasks.find(t => t.id === newTaskDependsOn);
            if (pred && pred.targetDate) {
                calculatedStart = format(addDays(parseISO(pred.targetDate), Number(newTaskDependencyOffset) || 0), 'yyyy-MM-dd');
            }
        }

        await createTestTask({
            testRequestId: requestId,
            name: newTaskName,
            durationHours: Number(newTaskDuration) || 0,
            status: 'todo',
            startDate: calculatedStart || undefined,
            targetDate: newTaskTarget || undefined,
            assigneeId: newTaskAssignee !== 'unassigned' ? newTaskAssignee : undefined,
            dependsOnTaskId: newTaskDependsOn !== 'none' ? newTaskDependsOn : undefined,
            dependencyOffsetDays: Number(newTaskDependencyOffset) || 0
        });

        setNewTaskName('');
        setNewTaskDuration('8');
        setNewTaskStart('');
        setNewTaskTarget('');
        setNewTaskDependsOn('none');
        setNewTaskDependencyOffset('0');
        setIsAddingTask(false);
    };

    const scrollToTask = (id: string) => {
        setHighlightedTaskId(id);
        const element = document.getElementById(`task-row-${id}`);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        setTimeout(() => setHighlightedTaskId(null), 2500);
    };

    // Calculate timeline bounds for the visual Gantt chart
    const timelineInfo = useMemo(() => {
        if (tasks.length === 0) return null;

        let earliestDate = new Date();
        let latestDate = new Date();
        let hasValidDates = false;

        tasks.forEach(t => {
            if (t.startDate) {
                const s = parseISO(t.startDate);
                if (isValid(s)) {
                    earliestDate = hasValidDates ? min([earliestDate, s]) : s;
                    hasValidDates = true;
                }
            }
            if (t.targetDate) {
                const e = parseISO(t.targetDate);
                if (isValid(e)) {
                    latestDate = hasValidDates ? max([latestDate, e]) : e;
                    hasValidDates = true;
                }
            }
        });

        if (!hasValidDates) return null;

        // Pad the timeline a bit
        earliestDate = addDays(earliestDate, -2);
        latestDate = addDays(latestDate, 2);

        const totalDays = Math.max(7, differenceInDays(latestDate, earliestDate));

        return { earliestDate, latestDate, totalDays };
    }, [tasks]);

    const todayLinePercent = useMemo(() => {
        if (!timelineInfo) return null;
        const today = new Date();
        const daysFromStart = differenceInDays(today, timelineInfo.earliestDate);
        if (daysFromStart < 0 || daysFromStart > timelineInfo.totalDays) return null;
        return (daysFromStart / timelineInfo.totalDays) * 100;
    }, [timelineInfo]);

    const getTimelineStyle = (task: TestTask) => {
        if (!timelineInfo || !task.startDate) return { width: '100%', left: '0%', opacity: 0.3, background: '#e2e8f0' };

        const start = parseISO(task.startDate);
        if (!isValid(start)) return { width: '100%', left: '0%', opacity: 0.3, background: '#e2e8f0' };

        // Default end to start + duration/8 if target is missing
        let end = task.targetDate ? parseISO(task.targetDate) : addDays(start, Math.ceil(task.durationHours / 8) || 1);
        if (!isValid(end)) end = addDays(start, 1);

        const startOffsetDays = differenceInDays(start, timelineInfo.earliestDate);
        let taskDays = differenceInDays(end, start);
        if (taskDays < 1) taskDays = 1;

        const leftPct = Math.max(0, (startOffsetDays / timelineInfo.totalDays) * 100);
        const widthPct = Math.min(100 - leftPct, (taskDays / timelineInfo.totalDays) * 100);

        let bg = 'bg-slate-300 pointer-events-none text-slate-800 border border-slate-400';

        if (task.status === 'done') {
            bg = 'bg-emerald-500 text-white';
        } else if (task.status === 'in_progress') {
            if (task.phase === 'specimen_preparation') bg = 'bg-orange-500 text-white shadow-md shadow-orange-500/40 ring-2 ring-orange-500/20';
            else bg = 'bg-blue-500 text-white shadow-md shadow-blue-500/40 ring-2 ring-blue-500/20';
        } else if (task.status === 'canceled') {
            bg = 'bg-slate-500 text-white';
        } else {
            // Todo and others
            if (task.phase === 'specimen_preparation') bg = 'bg-orange-300 text-orange-900 border border-orange-400';
            else if (task.phase === 'testing') bg = 'bg-blue-300 text-blue-900 border border-blue-400';
            else bg = 'bg-slate-300 text-slate-800 border border-slate-400';
        }

        return {
            left: `${leftPct}%`,
            width: `${Math.max(widthPct, 2)}%`,
            className: `absolute top-1 bottom-1 rounded shadow-sm transition-all cursor-pointer hover:brightness-110 z-10 ${bg}`
        };
    };

    const mismatchWarning = useMemo(() => {
        if (!request) return null;
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // 1. Is the overall request overdue?
        if (request.targetDate && request.status !== 'completed' && request.status !== 'canceled') {
            const reqTarget = parseISO(request.targetDate);
            if (isValid(reqTarget) && reqTarget < today) {
                return `The target date for this request (${safeFormatDate(request.targetDate)}) has passed, but the request is not yet Completed.`;
            }
        }

        // 2. Are any tasks overdue?
        const overdueTask = tasks.find(t => {
            if (t.status === 'done' || t.status === 'canceled') return false;
            if (!t.targetDate) return false;
            const target = parseISO(t.targetDate);
            return isValid(target) && target < today;
        });

        if (overdueTask) {
            return `One or more tasks (e.g., "${overdueTask.name}") have passed their target date and are not yet done.`;
        }

        return null;
    }, [request, tasks]);

    return (
        <div className="flex h-full flex-col bg-background animate-in fade-in duration-500">
            {/* Header */}
            <div className="border-b px-6 py-4 flex items-center justify-between shrink-0 bg-card text-card-foreground shadow-sm z-10">
                <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                        <div className="bg-primary/10 p-2 rounded-lg">
                            <CalendarClock className="h-5 w-5 text-primary" />
                        </div>
                        <h1 className="text-xl font-bold tracking-tight">Request Scheduling & Tasks</h1>
                    </div>
                    {request && (
                        <div className="flex items-center gap-3 pl-11 text-sm text-muted-foreground">
                            <span className="font-medium text-foreground">{request.propertyName}</span> &middot;
                            <span>{request.entityName}</span> &middot;
                            <span className="font-mono text-xs">{request.orderNumber || 'Unassigned Order'}</span>
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-4">
                    {/* Overall Status Control */}
                    {request && (
                        <div className="flex items-center gap-2 border-r pr-4">
                            <span className="text-sm font-medium text-muted-foreground">Req Status:</span>
                            <Select
                                value={request.status}
                                onValueChange={(val: any) => updateTestRequest(request.id, { status: val })}
                            >
                                <SelectTrigger className="h-9 w-40 text-xs font-semibold">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="requested">Requested</SelectItem>
                                    <SelectItem value="specimen_preparation">Specimen Preparation</SelectItem>
                                    <SelectItem value="testing">Testing</SelectItem>
                                    <SelectItem value="completed">Completed</SelectItem>
                                    <SelectItem value="canceled">Canceled</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    <Button variant="outline" onClick={() => navigate('/quality/requests')}>
                        Back to Requests
                    </Button>
                </div>
            </div>

            {mismatchWarning && (
                <div className="bg-destructive/15 border-b border-destructive/20 px-6 py-2.5 flex items-center gap-3 text-destructive shadow-sm shrink-0">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    <span className="text-sm font-medium">{mismatchWarning}</span>
                </div>
            )}

            <div className="flex-1 overflow-auto bg-slate-50/50 dark:bg-slate-900/20 p-6 flex flex-col gap-6">
                {/* Top Half: Visual Gantt */}
                <div className="flex-none h-[45%] min-h-[250px] border-b bg-white flex flex-col overflow-x-auto relative shrink-0 shadow-sm z-0">
                    {!timelineInfo ? (
                        <div className="flex-1 flex items-center justify-center text-muted-foreground flex-col gap-2">
                            <CalendarClock className="h-12 w-12 opacity-20" />
                            <p>Add tasks with dates to view the timeline.</p>
                        </div>
                    ) : (
                        <div className="min-w-full h-full p-6 pb-20 overflow-y-auto">
                            {/* Timeline Header */}
                            <div className="flex border-b pb-2 mb-4 w-full relative">
                                <div className="absolute left-0 bottom-1 text-xs font-semibold text-muted-foreground">
                                    {format(timelineInfo.earliestDate, 'MMM d')}
                                </div>
                                <div className="absolute right-0 bottom-1 text-xs font-semibold text-muted-foreground -translate-x-full">
                                    {format(timelineInfo.latestDate, 'MMM d')}
                                </div>
                                <div className="px-4 text-center w-full text-xs text-muted-foreground uppercase tracking-widest">
                                    Timeline ({timelineInfo.totalDays} Days)
                                </div>
                            </div>

                            {/* Gantt Rows */}
                            <div className="space-y-4 relative w-full">
                                <div className="absolute inset-0 border-x border-slate-100 flex justify-evenly -z-10 pointer-events-none">
                                    <div className="h-full border-r border-slate-100 w-1/4"></div>
                                    <div className="h-full border-r border-slate-100 w-1/4"></div>
                                    <div className="h-full border-r border-slate-100 w-1/4"></div>
                                </div>

                                {/* Today Line */}
                                {todayLinePercent !== null && (
                                    <div
                                        className="absolute top-0 bottom-0 w-[2px] bg-blue-400 z-10 pointer-events-none shadow-[0_0_10px_rgba(96,165,250,0.5)]"
                                        style={{ left: `${todayLinePercent}%` }}
                                        title="Today"
                                    >
                                        <div className="absolute -top-1 -left-1.5 w-3.5 h-3.5 bg-blue-500 rounded-full border-2 border-white shadow-sm"></div>
                                    </div>
                                )}

                                {tasks.map((task, i) => {
                                    const style = getTimelineStyle(task);
                                    const hasDates = !!task.startDate;

                                    return (
                                        <div key={task.id} className="relative h-10 w-full group flex items-center hover:bg-slate-50 border-y border-transparent hover:border-slate-100">
                                            {!hasDates ? (
                                                <div className="px-2 text-xs italic text-slate-400">Unscheduled</div>
                                            ) : (
                                                <>
                                                    <div
                                                        className={style.className}
                                                        style={{ left: style.left, width: style.width }}
                                                        onClick={() => scrollToTask(task.id)}
                                                    >
                                                        <div className="px-2 h-full flex items-center text-[10px] font-bold text-white truncate drop-shadow-sm pointer-events-none">
                                                            {task.name}
                                                        </div>
                                                    </div>

                                                    {task.dependsOnTaskId && tasks.findIndex(t => t.id === task.dependsOnTaskId) < i && (
                                                        <svg className="absolute top-0 left-0 w-full h-full pointer-events-none stroke-blue-300 stroke-2 fill-none" style={{ zIndex: 0 }}>
                                                            <path d={`M ${style.left} 20 L 0 20`} strokeDasharray="4 2" />
                                                        </svg>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    )}
                </div>

                {/* Bottom Half: Tasks List & Form */}
                <div className="flex-1 p-6 overflow-y-auto w-full max-w-7xl mx-auto space-y-4">
                    <div className="flex items-center justify-between mt-2">
                        <h3 className="font-semibold text-lg flex items-center"><CalendarClock className="w-5 h-5 mr-2 text-muted-foreground" /> Task Details</h3>
                        <div className="flex gap-2">
                            <Button size="sm" onClick={() => { setIsAddingTask(false); setIsApplyingTemplate({ type: 'specimen_preparation' }); }} variant="outline" className="text-orange-600 border-orange-200 hover:bg-orange-50">
                                Apply Prep Template
                            </Button>
                            <Button size="sm" onClick={() => { setIsAddingTask(false); setIsApplyingTemplate({ type: 'testing' }); }} variant="outline" className="text-blue-600 border-blue-200 hover:bg-blue-50">
                                Apply Testing Template
                            </Button>
                            <Button size="sm" onClick={() => { setIsApplyingTemplate(null); setIsAddingTask(!isAddingTask); }} variant={isAddingTask ? "outline" : "default"}>
                                {isAddingTask ? <X className="w-4 h-4 mr-1" /> : <Plus className="w-4 h-4 mr-1" />}
                                {isAddingTask ? 'Cancel' : 'Add New Task'}
                            </Button>
                        </div>
                    </div>

                    {isApplyingTemplate && (
                        <div className={`p-5 border rounded-lg shadow-sm space-y-4 animate-in slide-in-from-top-2 ${isApplyingTemplate.type === 'testing' ? 'bg-blue-50 border-blue-100' : 'bg-orange-50 border-orange-100'}`}>
                            <h4 className="font-medium text-sm border-b border-black/10 pb-2">Apply {isApplyingTemplate.type === 'testing' ? 'Testing' : 'Preparation'} Template</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                <div className="space-y-1 lg:col-span-2">
                                    <Label className="text-xs">Select Template</Label>
                                    <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                                        <SelectTrigger className="h-9 text-sm bg-white"><SelectValue placeholder="Choose a template..." /></SelectTrigger>
                                        <SelectContent>
                                            {taskTemplates.filter(t => t.phase === isApplyingTemplate.type).map(t => (
                                                <SelectItem key={t.id} value={t.id} className="text-sm">{t.name}</SelectItem>
                                            ))}
                                            {taskTemplates.filter(t => t.phase === isApplyingTemplate.type).length === 0 && (
                                                <SelectItem value="none" disabled className="text-sm italic">No templates found for this phase.</SelectItem>
                                            )}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs">Initial Start Date</Label>
                                    <Input type="date" className="h-9 text-sm bg-white" value={templateStartDate} onChange={e => setTemplateStartDate(e.target.value)} />
                                </div>
                                <div className="flex items-end justify-end gap-2">
                                    <Button variant="ghost" className="w-full text-sm h-9" onClick={() => setIsApplyingTemplate(null)}>Cancel</Button>
                                    <Button className="w-full text-sm h-9" onClick={handleApplyTemplate} disabled={!selectedTemplateId || !templateStartDate}>Apply Sequence</Button>
                                </div>
                            </div>
                        </div>
                    )}

                    {isAddingTask && (
                        <div className="p-5 border rounded-lg bg-white shadow-sm space-y-4 animate-in slide-in-from-top-2">
                            <h4 className="font-medium text-sm border-b pb-2">Create Task</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                <div className="space-y-1 lg:col-span-2">
                                    <Label className="text-xs">Task Name *</Label>
                                    <Input className="h-9 text-sm" value={newTaskName} onChange={e => setNewTaskName(e.target.value)} placeholder="e.g. Cut Specimens" />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs">Depends On</Label>
                                    <div className="flex items-center gap-2">
                                        <Select value={newTaskDependsOn} onValueChange={setNewTaskDependsOn}>
                                            <SelectTrigger className="h-9 text-sm flex-1"><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="none" className="text-sm italic text-muted-foreground">No dependency</SelectItem>
                                                {tasks.map(t => (
                                                    <SelectItem key={t.id} value={t.id} className="text-sm">{t.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        {newTaskDependsOn !== 'none' && (
                                            <div className="flex items-center gap-1 w-20">
                                                <span className="text-xs text-muted-foreground whitespace-nowrap">Offset (d):</span>
                                                <Input type="number" className="h-9 text-sm px-2" value={newTaskDependencyOffset} onChange={e => setNewTaskDependencyOffset(e.target.value)} />
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs">Assignee</Label>
                                    <Select value={newTaskAssignee} onValueChange={setNewTaskAssignee}>
                                        <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="unassigned" className="text-sm italic text-muted-foreground">Unassigned</SelectItem>
                                            {labTechnicians.map(t => (
                                                <SelectItem key={t.id} value={t.id} className="text-sm">{t.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs">Start Date</Label>
                                    <Input type="date" className="h-9 text-sm" value={newTaskStart} onChange={e => setNewTaskStart(e.target.value)} />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs">Target Date</Label>
                                    <Input type="date" className="h-9 text-sm" value={newTaskTarget} onChange={e => setNewTaskTarget(e.target.value)} />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs">Est. Hours</Label>
                                    <Input type="number" min="1" className="h-9 text-sm" value={newTaskDuration} onChange={e => setNewTaskDuration(e.target.value)} />
                                </div>
                                <div className="flex items-end justify-end">
                                    <Button className="w-full text-sm h-9" onClick={handleCreateTask} disabled={!newTaskName.trim()}>
                                        <Plus className="w-4 h-4 mr-2" /> Save Task
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Task Table */}
                    <div className="bg-white border rounded-lg shadow-sm overflow-hidden mt-4">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-muted-foreground bg-slate-50 border-b">
                                <tr>
                                    <th className="px-4 py-3 font-medium">Task Name</th>
                                    <th className="px-4 py-3 font-medium">Dates</th>
                                    <th className="px-4 py-3 font-medium text-center">Duration</th>
                                    <th className="px-4 py-3 font-medium">Assignee</th>
                                    <th className="px-4 py-3 font-medium">Depends On</th>
                                    <th className="px-4 py-3 font-medium">Status</th>
                                    <th className="px-4 py-3 font-medium w-16 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {tasks.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground italic">No tasks scheduled yet.</td>
                                    </tr>
                                ) : tasks.map((task, idx) => {
                                    const assignee = labTechnicians.find(lt => lt.id === task.assigneeId);
                                    const dep = tasks.find(t => t.id === task.dependsOnTaskId);
                                    const isEditing = !!editingTaskIds[task.id];
                                    const toggleEdit = () => setEditingTaskIds(prev => ({ ...prev, [task.id]: !prev[task.id] }));

                                    let rowBg = 'hover:bg-slate-50/50';
                                    if (highlightedTaskId === task.id) rowBg = 'bg-primary/10 border-primary/20';
                                    else if (isEditing) rowBg = 'bg-blue-50/30 text-blue-900';
                                    else if (task.status === 'done') rowBg = 'opacity-60 bg-muted/20';
                                    else if (task.status === 'in_progress') rowBg = 'bg-blue-100/40 hover:bg-blue-100/60 font-medium';
                                    else if (task.phase === 'specimen_preparation') rowBg = 'bg-orange-50/30 hover:bg-orange-50/60';
                                    else if (task.phase === 'testing') rowBg = 'bg-blue-50/30 hover:bg-blue-50/60';

                                    return (
                                        <tr
                                            key={task.id}
                                            id={`task-row-${task.id}`}
                                            className={`border-b last:border-0 group transition-colors duration-500 ${rowBg}`}
                                        >
                                            <td className="px-4 py-3 font-medium">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-muted-foreground text-xs font-mono">{idx + 1}.</span>
                                                    {task.name}
                                                    {task.phase === 'specimen_preparation' && <span className="px-1.5 py-0.5 rounded-sm bg-orange-100 text-orange-700 text-[10px] font-medium leading-none ml-1" title="Specimen Preparation">Prep</span>}
                                                    {task.phase === 'testing' && <span className="px-1.5 py-0.5 rounded-sm bg-blue-100 text-blue-700 text-[10px] font-medium leading-none ml-1" title="Testing">Test</span>}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                {isEditing ? (
                                                    <div className="flex items-center gap-2">
                                                        <Input
                                                            type="date"
                                                            className="h-7 w-32 text-xs"
                                                            title="Start Date"
                                                            value={task.startDate || ''}
                                                            onChange={(e) => updateTestTask(task.id, { startDate: e.target.value })}
                                                        />
                                                        <span className="text-muted-foreground">→</span>
                                                        <Input
                                                            type="date"
                                                            className="h-7 w-32 text-xs"
                                                            title="Target Date"
                                                            value={task.targetDate || ''}
                                                            onChange={(e) => updateTestTask(task.id, { targetDate: e.target.value })}
                                                        />
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-2 text-xs">
                                                        {task.startDate ? safeFormatDate(task.startDate) : <span className="italic text-muted-foreground">TBD</span>}
                                                        <span className="text-muted-foreground">→</span>
                                                        {task.targetDate ? safeFormatDate(task.targetDate) : <span className="italic text-muted-foreground">TBD</span>}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                {isEditing ? (
                                                    <div className="flex justify-center items-center gap-1">
                                                        <Input
                                                            type="number"
                                                            min="1"
                                                            className="h-7 w-16 text-xs text-center p-1"
                                                            title="Duration (Hours)"
                                                            defaultValue={task.durationHours}
                                                            onBlur={(e) => updateTestTask(task.id, { durationHours: Number(e.target.value) || 0 })}
                                                        />
                                                        <span className="text-xs text-muted-foreground">h</span>
                                                    </div>
                                                ) : (
                                                    <div className="flex flex-col items-center justify-center gap-0.5">
                                                        <span className="bg-slate-100 border px-1.5 py-0.5 rounded text-slate-700 text-xs font-medium">{task.durationHours}h</span>
                                                        {task.standardDurationHours !== undefined && task.standardDurationHours !== null && (
                                                            <span className="text-[10px] text-muted-foreground leading-none" title="Standard template duration">std: {task.standardDurationHours}h</span>
                                                        )}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                {isEditing ? (
                                                    <Select value={task.assigneeId || 'unassigned'} onValueChange={(v) => updateTestTask(task.id, { assigneeId: v === 'unassigned' ? undefined : v })}>
                                                        <SelectTrigger className="h-7 text-xs w-32"><SelectValue /></SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="unassigned" className="text-xs italic text-muted-foreground">Unassigned</SelectItem>
                                                            {labTechnicians.map(t => (
                                                                <SelectItem key={t.id} value={t.id} className="text-xs">{t.name}</SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                ) : (
                                                    assignee ? (
                                                        <div className="flex items-center gap-1.5 text-xs"><User className="h-3 w-3 text-muted-foreground" /> {assignee.name}</div>
                                                    ) : <span className="text-muted-foreground text-xs italic">Unassigned</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                {isEditing ? (
                                                    <div className="flex flex-col gap-1">
                                                        <Select value={task.dependsOnTaskId || 'none'} onValueChange={(v) => updateTestTask(task.id, { dependsOnTaskId: v === 'none' ? undefined : v })}>
                                                            <SelectTrigger className="h-7 text-xs w-32"><SelectValue /></SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="none" className="text-xs italic text-muted-foreground">None</SelectItem>
                                                                {tasks.filter(t => t.id !== task.id).map(t => (
                                                                    <SelectItem key={t.id} value={t.id} className="text-xs">{t.name}</SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                        {task.dependsOnTaskId && (
                                                            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                                                                Offset (d):
                                                                <Input type="number" className="h-6 w-12 text-xs text-center p-1" defaultValue={task.dependencyOffsetDays || 0} onBlur={(e) => updateTestTask(task.id, { dependencyOffsetDays: Number(e.target.value) || 0 })} />
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : (
                                                    dep ? (
                                                        <div className="flex items-center gap-1.5 text-xs text-blue-600">
                                                            <LinkIcon className="h-3 w-3" /> {dep.name}
                                                            {task.dependencyOffsetDays ? (
                                                                <span className="text-muted-foreground ml-1 text-[10px] bg-blue-50 px-1 rounded border border-blue-100">
                                                                    {task.dependencyOffsetDays > 0 ? '+' : ''}{task.dependencyOffsetDays}d
                                                                </span>
                                                            ) : null}
                                                        </div>
                                                    ) : <span className="text-muted-foreground text-xs italic">-</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                <Select value={task.status} onValueChange={(v: any) => updateTestTask(task.id, { status: v })}>
                                                    <SelectTrigger className="h-8 text-xs w-[130px] font-medium"><SelectValue /></SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="todo" className="text-xs">TODO</SelectItem>
                                                        <SelectItem value="in_progress" className="text-xs">IN PROGRESS</SelectItem>
                                                        <SelectItem value="done" className="text-xs">DONE</SelectItem>
                                                        <SelectItem value="canceled" className="text-xs">CANCELED</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <div className={`flex items-center justify-end gap-1 transition-opacity ${isEditing ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className={`h-7 w-7 ${isEditing ? 'text-blue-600 bg-blue-50 hover:bg-blue-100 hover:text-blue-700' : 'text-muted-foreground'}`}
                                                        onClick={toggleEdit}
                                                        title={isEditing ? "Lock / Finish Editing" : "Unlock / Edit Task"}
                                                    >
                                                        {isEditing ? <Unlock className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
                                                    </Button>
                                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleMoveTask(idx, 'up')} disabled={idx === 0}>
                                                        <ArrowUp className="h-3.5 w-3.5" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleMoveTask(idx, 'down')} disabled={idx === tasks.length - 1}>
                                                        <ArrowDown className="h-3.5 w-3.5" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive ml-2" onClick={() => deleteTestTask(task.id)}>
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
