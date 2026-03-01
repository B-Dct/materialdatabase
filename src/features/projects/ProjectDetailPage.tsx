import { useEffect, useRef, useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAppStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Box, Factory, Layers, PlaySquare, Settings2, Plus, Trash2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProjectEntityList } from './components/ProjectEntityList';
import { AssignmentDialog } from './components/AssignmentDialog';
import type { AssignableEntityType } from './components/AssignmentDialog';
import { Badge } from '@/components/ui/badge';
import { createColumnHelper } from '@tanstack/react-table';
import type { Material, ManufacturingProcess, Layup, Assembly, StandardPart, ProjectWorkPackage } from '@/types/domain';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

import { format } from 'date-fns';

export const ProjectDetailPage = () => {
    const { id } = useParams<{ id: string }>();
    const {
        projects, fetchProjects, currentProject, setCurrentProject,
        workPackages, createWorkPackage, updateWorkPackage, deleteWorkPackage, closeWorkPackageList, reopenWorkPackageList, fetchWorkPackageHistory,
        materials, layups, assemblies, processes: manufacturingProcesses, standardParts,
        fetchMaterials, fetchLayups, fetchAssemblies, fetchProcesses, fetchStandardParts
    } = useAppStore();

    const [selectedWpId, setSelectedWpId] = useState<string | null>(null);
    const [assignmentOpen, setAssignmentOpen] = useState(false);
    const [assignmentType, setAssignmentType] = useState<AssignableEntityType>('material');
    const [isEditingWP, setIsEditingWP] = useState(false);

    // Revisioning States
    const [isCloseDialogOpen, setIsCloseDialogOpen] = useState(false);
    const [isHistoryDialogOpen, setIsHistoryDialogOpen] = useState(false);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [wpHistory, setWpHistory] = useState<any[]>([]);
    const [revisionDiff, setRevisionDiff] = useState<string>('');
    const [missingComponentsPrompt, setMissingComponentsPrompt] = useState<{
        isOpen: boolean;
        layupsToAdd: string[];
        assembliesToAdd: string[];
        materialsToAdd: { materialId: string, specificationId: string }[];
        processesToAdd: string[];
        standardPartsToAdd: string[];
        pendingSelections: { itemId: string, specId?: string }[];
        assignmentType: AssignableEntityType;
    }>({
        isOpen: false,
        layupsToAdd: [],
        assembliesToAdd: [],
        materialsToAdd: [],
        processesToAdd: [],
        standardPartsToAdd: [],
        pendingSelections: [],
        assignmentType: 'material'
    });
    const [activeCloseList, setActiveCloseList] = useState<AssignableEntityType | null>(null);

    const hasFetchedContent = useRef(false);

    useEffect(() => {
        if (!hasFetchedContent.current) {
            if (!projects.length) fetchProjects();
            if (!materials.length) fetchMaterials();
            if (!layups.length) fetchLayups();
            if (!assemblies.length) fetchAssemblies();
            if (!manufacturingProcesses.length) fetchProcesses();
            if (!standardParts.length) fetchStandardParts();
            hasFetchedContent.current = true;
        }
    }, [
        projects.length, materials.length, layups.length, assemblies.length, manufacturingProcesses.length, standardParts.length,
        fetchProjects, fetchMaterials, fetchLayups, fetchAssemblies, fetchProcesses, fetchStandardParts
    ]);

    useEffect(() => {
        if (id) {
            const proj = projects.find(p => p.id === id);
            if (proj) {
                setCurrentProject(proj);
            }
        }
        return () => setCurrentProject(null);
    }, [id, projects, setCurrentProject]);

    // Select first work package by default if none selected
    useEffect(() => {
        if (workPackages.length > 0 && !selectedWpId) {
            setSelectedWpId(workPackages[0].id);
        } else if (workPackages.length === 0 && selectedWpId) {
            setSelectedWpId(null);
        }
    }, [workPackages, selectedWpId]);

    const activeWp = useMemo(() => workPackages.find(wp => wp.id === selectedWpId), [workPackages, selectedWpId]);

    // Edit mode is handled globally, but list finalization takes precedence
    // Replaced global wp.status check with individual list status checks where applicable


    const handleCreateWorkPackage = () => {
        if (!currentProject) return;
        const name = prompt("Enter Work Package name:");
        if (!name) return;

        createWorkPackage({
            projectId: currentProject.id,
            name,
            materialListStatus: 'open',
            materialListRevision: 'A',
            processListStatus: 'open',
            processListRevision: 'A',
            partListStatus: 'open',
            partListRevision: 'A',
            layupListStatus: 'open',
            layupListRevision: 'A',
            assemblyListStatus: 'open',
            assemblyListRevision: 'A',
            assignedMaterials: [],
            assignedProcesses: [],
            assignedStandardParts: [],
            assignedLayups: [],
            assignedAssemblies: []
        });
    };

    const handleDeleteWorkPackage = (wpId: string) => {
        if (confirm("Are you sure you want to delete this work package? All assignments will be lost.")) {
            deleteWorkPackage(wpId);
        }
    };

    if (!currentProject) {
        return <div className="p-8 text-center text-muted-foreground">Loading project...</div>;
    }

    const handleOpenHistory = (listType: AssignableEntityType) => {
        loadHistory(listType);
        setIsHistoryDialogOpen(true);
    };

    const loadHistory = async (listType: AssignableEntityType) => {
        if (!activeWp) return;
        setHistoryLoading(true);
        try {
            const history = await fetchWorkPackageHistory(activeWp.id, listType);
            setWpHistory(history);
        } catch (e) {
            console.error("Failed to load history", e);
        } finally {
            setHistoryLoading(false);
        }
    };

    const generateDiffString = async (listType: AssignableEntityType) => {
        if (!activeWp) return "";
        try {
            const history = await fetchWorkPackageHistory(activeWp.id, listType);
            const lastRev = history.length > 0 ? history[0] : null;

            let diffLines: string[] = [];

            if (!lastRev) {
                // Initial Revision A
                diffLines.push(`**Initial Release: Revision A**`);
                let count = 0;
                if (listType === 'material') count = activeWp.assignedMaterials.length;
                if (listType === 'process') count = activeWp.assignedProcesses.length;
                if (listType === 'standardPart') count = activeWp.assignedStandardParts.length;
                if (listType === 'layup') count = activeWp.assignedLayups.length;
                if (listType === 'assembly') count = activeWp.assignedAssemblies.length;

                if (count > 0) diffLines.push(`+ Assigned ${count} item(s) to ${listType} list`);
                else diffLines.push(`No components assigned yet.`);
                return diffLines.join('\n');
            }

            // Compare with last snapshot
            const P = lastRev.snapshot;
            const C = activeWp;

            const compareArrays = (oldArr: any[], newArr: any[], typeLabel: string, getName: (val: any) => string) => {
                const oIds = new Set(oldArr);
                const nIds = new Set(newArr);
                newArr.forEach(id => {
                    if (!oIds.has(id)) diffLines.push(`+ Added ${typeLabel}: ${getName(id)}`);
                });
                oldArr.forEach(id => {
                    if (!nIds.has(id)) diffLines.push(`- Removed ${typeLabel}: ${getName(id)}`);
                });
            };

            if (listType === 'material') {
                compareArrays(P.assignedMaterials?.map((m: any) => m.materialId) || [], C.assignedMaterials.map((m: any) => m.materialId), "Material", id => materials.find(m => m.id === id)?.name || id);
            } else if (listType === 'process') {
                compareArrays(P.assignedProcesses || [], C.assignedProcesses, "Process", id => manufacturingProcesses.find(p => p.id === id)?.name || id);
            } else if (listType === 'standardPart') {
                compareArrays(P.assignedStandardParts || [], C.assignedStandardParts, "Standard Part", id => standardParts.find(p => p.id === id)?.name || id);
            } else if (listType === 'layup') {
                compareArrays(P.assignedLayups || [], C.assignedLayups, "Layup", id => layups.find(l => l.id === id)?.name || id);
            } else if (listType === 'assembly') {
                compareArrays(P.assignedAssemblies || [], C.assignedAssemblies, "Assembly", id => assemblies.find(a => a.id === id)?.name || id);
            }

            if (diffLines.length === 0) {
                diffLines.push("No changes made since previous revision.");
            }

            return diffLines.join('\n');
        } catch (e) {
            console.error(e);
            return "Failed to generate diff.";
        }
    };

    const handleOpenCloseDialog = async (listType: AssignableEntityType) => {
        setActiveCloseList(listType);
        const diff = await generateDiffString(listType);
        setRevisionDiff(diff);
        setIsCloseDialogOpen(true);
    };

    const handleConfirmClose = () => {
        if (!activeWp || !activeCloseList) return;

        let snapshot = [];
        if (activeCloseList === 'material') snapshot = activeWp.assignedMaterials as any;
        if (activeCloseList === 'process') snapshot = activeWp.assignedProcesses as any;
        if (activeCloseList === 'standardPart') snapshot = activeWp.assignedStandardParts as any;
        if (activeCloseList === 'layup') snapshot = activeWp.assignedLayups as any;
        if (activeCloseList === 'assembly') snapshot = activeWp.assignedAssemblies as any;

        closeWorkPackageList(activeWp.id, activeCloseList, revisionDiff, snapshot);
        setIsCloseDialogOpen(false);
        setActiveCloseList(null);
    };

    // --- Derived Items for Active WP ---
    const wpMaterials = activeWp
        ? activeWp.assignedMaterials.map(m => materials.find(mat => mat.id === m.materialId)).filter(Boolean) as Material[]
        : [];
    const wpProcesses = activeWp
        ? activeWp.assignedProcesses.map(pid => manufacturingProcesses.find(p => p.id === pid)).filter(Boolean) as ManufacturingProcess[]
        : [];
    const wpStandardParts = activeWp
        ? activeWp.assignedStandardParts.map(pid => standardParts.find(p => p.id === pid)).filter(Boolean) as StandardPart[]
        : [];
    const wpLayups = activeWp
        ? activeWp.assignedLayups.map(lid => layups.find(l => l.id === lid)).filter(Boolean) as Layup[]
        : [];
    const wpAssemblies = activeWp
        ? activeWp.assignedAssemblies.map(aid => assemblies.find(a => a.id === aid)).filter(Boolean) as Assembly[]
        : [];

    // --- Columns Helpers ---
    const materialHelper = createColumnHelper<Material>();
    const materialColumns = [
        materialHelper.accessor('name', { header: 'Name', cell: info => <Link to={`/materials/${info.row.original.id}`} className="hover:underline font-medium text-blue-600">{info.getValue()}</Link> }),
        materialHelper.accessor('materialId', { header: 'ID', cell: info => <span className="text-muted-foreground">{info.getValue()}</span> }),
        materialHelper.accessor('manufacturer', { header: 'Manufacturer' }),
        materialHelper.accessor('status', { header: 'Status', cell: info => <Badge variant="outline">{info.getValue()}</Badge> }),
        ...(isEditingWP ? [materialHelper.display({
            id: 'actions',
            cell: info => (
                <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10 h-7"
                    onClick={() => handleRemoveAssignment('material', info.row.original.id)}>
                    Remove
                </Button>
            )
        })] : [])
    ];

    const partHelper = createColumnHelper<StandardPart>();
    const partColumns = [
        partHelper.accessor('name', { header: 'Name', cell: info => <span className="font-medium text-blue-600">{info.getValue()}</span> }),
        partHelper.accessor('manufacturer', { header: 'Manufacturer' }),
        partHelper.accessor('supplier', { header: 'Supplier' }),
        ...(isEditingWP ? [partHelper.display({
            id: 'actions',
            cell: info => (
                <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10 h-7"
                    onClick={() => handleRemoveAssignment('standardPart', info.row.original.id)}>
                    Remove
                </Button>
            )
        })] : [])
    ];

    const processHelper = createColumnHelper<ManufacturingProcess>();
    const processColumns = [
        processHelper.accessor('name', { header: 'Name', cell: info => <Link to={`/settings/processes`} className="hover:underline font-medium text-blue-600">{info.getValue()}</Link> }),
        processHelper.accessor('processNumber', { header: 'Number' }),
        processHelper.accessor('entryStatus', { header: 'Status', cell: info => <Badge variant="outline">{info.getValue()}</Badge> }),
        ...(isEditingWP ? [processHelper.display({
            id: 'actions',
            cell: info => (
                <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10 h-7"
                    onClick={() => handleRemoveAssignment('process', info.row.original.id)}>
                    Remove
                </Button>
            )
        })] : [])
    ];

    const layupHelper = createColumnHelper<Layup>();
    const layupColumns = [
        layupHelper.accessor('name', { header: 'Name', cell: info => <Link to={`/layups/${info.row.original.id}`} className="hover:underline font-medium text-blue-600">{info.getValue()}</Link> }),
        layupHelper.accessor('layers', { header: 'Layers', cell: info => info.getValue().length }),
        layupHelper.accessor('totalThickness', { header: 'Thickness (mm)' }),
        layupHelper.accessor('status', { header: 'Status', cell: info => <Badge variant="outline">{info.getValue()}</Badge> }),
        ...(isEditingWP ? [layupHelper.display({
            id: 'actions',
            cell: info => (
                <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10 h-7"
                    onClick={() => handleRemoveAssignment('layup', info.row.original.id)}>
                    Remove
                </Button>
            )
        })] : [])
    ];

    const assemblyHelper = createColumnHelper<Assembly>();
    const assemblyColumns = [
        assemblyHelper.accessor('name', { header: 'Name', cell: info => <Link to={`/assemblies/${info.row.original.id}`} className="hover:underline font-medium text-blue-600">{info.getValue()}</Link> }),
        assemblyHelper.accessor('status', { header: 'Status', cell: info => <Badge variant="outline">{info.getValue()}</Badge> }),
        ...(isEditingWP ? [assemblyHelper.display({
            id: 'actions',
            cell: info => (
                <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10 h-7"
                    onClick={() => handleRemoveAssignment('assembly', info.row.original.id)}>
                    Remove
                </Button>
            )
        })] : [])
    ];

    // --- Assignment Actions ---
    const handleRemoveAssignment = (type: AssignableEntityType, itemId: string) => {
        if (!activeWp) return;
        const updates: Partial<ProjectWorkPackage> = {};
        if (type === 'material') {
            updates.assignedMaterials = activeWp.assignedMaterials.filter(m => m.materialId !== itemId);
        } else if (type === 'process') {
            updates.assignedProcesses = activeWp.assignedProcesses.filter(id => id !== itemId);
        } else if (type === 'standardPart') {
            updates.assignedStandardParts = activeWp.assignedStandardParts.filter(id => id !== itemId);
        } else if (type === 'layup') {
            updates.assignedLayups = activeWp.assignedLayups.filter(id => id !== itemId);
        } else if (type === 'assembly') {
            updates.assignedAssemblies = activeWp.assignedAssemblies.filter(id => id !== itemId);
        }
        updateWorkPackage(activeWp.id, updates);
    };

    const handleAssignSelections = (selections: { itemId: string, specId?: string }[]) => {
        if (!activeWp) return;

        // Check for missing dependencies if assigning a Layup or Assembly
        if (assignmentType === 'layup' || assignmentType === 'assembly') {
            const missingMaterials: { materialId: string; specificationId: string }[] = [];
            const missingStandardParts = new Set<string>();
            const missingProcesses = new Set<string>();
            const missingLayups = new Set<string>();

            const currentMaterials = new Set(activeWp.assignedMaterials.map(m => m.materialId));
            const currentParts = new Set(activeWp.assignedStandardParts);
            const currentProcesses = new Set(activeWp.assignedProcesses);
            const currentLayups = new Set(activeWp.assignedLayups);

            const getBaseMaterialId = (variantOrBaseId: string) => {
                for (const m of materials) {
                    if (m.id === variantOrBaseId) return m.id;
                    if (m.variants?.some(v => v.id === variantOrBaseId)) return m.id;
                }
                return undefined;
            };

            if (assignmentType === 'layup') {
                selections.forEach(s => {
                    const layup = layups.find(l => l.id === s.itemId);
                    if (layup) {
                        layup.layers.forEach((layer: any) => {
                            const baseMatId = getBaseMaterialId(layer.materialVariantId);
                            if (baseMatId && !currentMaterials.has(baseMatId)) {
                                missingMaterials.push({ materialId: baseMatId, specificationId: '' });
                                currentMaterials.add(baseMatId);
                            }
                        });
                        if (layup.processId && !currentProcesses.has(layup.processId)) {
                            missingProcesses.add(layup.processId);
                            currentProcesses.add(layup.processId);
                        }
                    }
                });
            } else if (assignmentType === 'assembly') {
                selections.forEach(s => {
                    const assembly = assemblies.find(a => a.id === s.itemId);
                    if (assembly) {
                        assembly.components.forEach((comp: any) => {
                            if (comp.componentType === 'material') {
                                const baseMatId = getBaseMaterialId(comp.componentId);
                                if (baseMatId && !currentMaterials.has(baseMatId)) {
                                    missingMaterials.push({ materialId: baseMatId, specificationId: '' });
                                    currentMaterials.add(baseMatId);
                                }
                            } else if (comp.componentType === 'process' && !currentProcesses.has(comp.componentId)) {
                                missingProcesses.add(comp.componentId);
                                currentProcesses.add(comp.componentId);
                            } else if (comp.componentType === 'layup' && !currentLayups.has(comp.componentId)) {
                                missingLayups.add(comp.componentId);
                                currentLayups.add(comp.componentId);
                            } else if (comp.componentType === 'part' && !currentParts.has(comp.componentId)) {
                                missingStandardParts.add(comp.componentId);
                                currentParts.add(comp.componentId);
                            }
                        });
                        if (assembly.processIds && assembly.processIds.length > 0) {
                            assembly.processIds.forEach(pId => {
                                if (!currentProcesses.has(pId)) {
                                    missingProcesses.add(pId);
                                    currentProcesses.add(pId);
                                }
                            });
                        }
                    }
                });
            }

            if (missingMaterials.length > 0 || missingStandardParts.size > 0 || missingProcesses.size > 0 || missingLayups.size > 0) {
                setMissingComponentsPrompt({
                    isOpen: true,
                    layupsToAdd: Array.from(missingLayups),
                    assembliesToAdd: [],
                    materialsToAdd: missingMaterials,
                    processesToAdd: Array.from(missingProcesses),
                    standardPartsToAdd: Array.from(missingStandardParts),
                    pendingSelections: selections,
                    assignmentType
                });
                return; // Wait for prompt resolution
            }
        }

        applyAssignments(selections, assignmentType);
    };

    const applyAssignments = (selections: { itemId: string, specId?: string }[], type: AssignableEntityType, extraDeps?: any) => {
        if (!activeWp) return;
        const updates: Partial<ProjectWorkPackage> = {};

        if (type === 'material') {
            const current = activeWp.assignedMaterials;
            const additions = selections.map(s => ({ materialId: s.itemId, specificationId: s.specId! }));
            const newAssignments = [...current];
            additions.forEach(add => {
                if (!newAssignments.some(na => na.materialId === add.materialId)) {
                    newAssignments.push(add);
                }
            });
            updates.assignedMaterials = newAssignments;
        } else if (type === 'process') {
            const current = new Set(activeWp.assignedProcesses);
            selections.forEach(s => current.add(s.itemId));
            updates.assignedProcesses = Array.from(current);
        } else if (type === 'standardPart') {
            const current = new Set(activeWp.assignedStandardParts);
            selections.forEach(s => current.add(s.itemId));
            updates.assignedStandardParts = Array.from(current);
        } else if (type === 'layup') {
            const current = new Set(activeWp.assignedLayups);
            selections.forEach(s => current.add(s.itemId));
            if (extraDeps?.layups) extraDeps.layups.forEach((id: string) => current.add(id));
            updates.assignedLayups = Array.from(current);

            // Inherit lower level deps if passed
            if (extraDeps) {
                if (extraDeps.materials?.length > 0) {
                    const currentMat = activeWp.assignedMaterials;
                    const newMat = [...currentMat];
                    extraDeps.materials.forEach((add: any) => {
                        if (!newMat.some(na => na.materialId === add.materialId)) newMat.push(add);
                    });
                    updates.assignedMaterials = newMat;
                }
                if (extraDeps.processes?.length > 0) {
                    const currentProc = new Set(activeWp.assignedProcesses);
                    extraDeps.processes.forEach((id: string) => currentProc.add(id));
                    updates.assignedProcesses = Array.from(currentProc);
                }
                if (extraDeps.parts?.length > 0) {
                    const currentPart = new Set(activeWp.assignedStandardParts);
                    extraDeps.parts.forEach((id: string) => currentPart.add(id));
                    updates.assignedStandardParts = Array.from(currentPart);
                }
            }

        } else if (type === 'assembly') {
            const current = new Set(activeWp.assignedAssemblies);
            selections.forEach(s => current.add(s.itemId));
            updates.assignedAssemblies = Array.from(current);

            // Inherit lower level deps if passed
            if (extraDeps) {
                if (extraDeps.layups?.length > 0) {
                    const currentLayup = new Set(activeWp.assignedLayups);
                    extraDeps.layups.forEach((id: string) => currentLayup.add(id));
                    updates.assignedLayups = Array.from(currentLayup);
                }
                if (extraDeps.processes?.length > 0) {
                    const currentProc = new Set(activeWp.assignedProcesses);
                    extraDeps.processes.forEach((id: string) => currentProc.add(id));
                    updates.assignedProcesses = Array.from(currentProc);
                }
                if (extraDeps.parts?.length > 0) {
                    const currentPart = new Set(activeWp.assignedStandardParts);
                    extraDeps.parts.forEach((id: string) => currentPart.add(id));
                    updates.assignedStandardParts = Array.from(currentPart);
                }
            }
        }

        updateWorkPackage(activeWp.id, updates);
        setAssignmentOpen(false);
    };

    const confirmMissingComponents = () => {
        if (!activeWp) return;
        const updates: Partial<ProjectWorkPackage> = {};

        // Add pending primary selections
        const primaryType = missingComponentsPrompt.assignmentType;
        if (primaryType === 'layup') {
            const current = new Set(activeWp.assignedLayups);
            missingComponentsPrompt.pendingSelections.forEach(s => current.add(s.itemId));
            updates.assignedLayups = Array.from(current);
        } else if (primaryType === 'assembly') {
            const current = new Set(activeWp.assignedAssemblies);
            missingComponentsPrompt.pendingSelections.forEach(s => current.add(s.itemId));
            updates.assignedAssemblies = Array.from(current);
        }

        // Add extra dependencies
        if (missingComponentsPrompt.materialsToAdd.length > 0) {
            const currentMat = activeWp.assignedMaterials || [];
            const newMat = [...currentMat];
            missingComponentsPrompt.materialsToAdd.forEach(add => {
                if (!newMat.some(na => na.materialId === add.materialId)) newMat.push(add);
            });
            updates.assignedMaterials = newMat;
        }

        if (missingComponentsPrompt.processesToAdd.length > 0) {
            const currentProc = new Set(activeWp.assignedProcesses || []);
            missingComponentsPrompt.processesToAdd.forEach(id => currentProc.add(id));
            updates.assignedProcesses = Array.from(currentProc);
        }

        if (missingComponentsPrompt.standardPartsToAdd.length > 0) {
            const currentPart = new Set(activeWp.assignedStandardParts || []);
            missingComponentsPrompt.standardPartsToAdd.forEach(id => currentPart.add(id));
            updates.assignedStandardParts = Array.from(currentPart);
        }

        if (missingComponentsPrompt.layupsToAdd.length > 0) {
            const currentLayup = new Set(updates.assignedLayups || activeWp.assignedLayups || []);
            missingComponentsPrompt.layupsToAdd.forEach(id => currentLayup.add(id));
            updates.assignedLayups = Array.from(currentLayup);
        }

        console.log("Confirming missing components:", missingComponentsPrompt);
        console.log("Sending updates to work package:", updates);

        updateWorkPackage(activeWp.id, updates);
        setAssignmentOpen(false);
        setMissingComponentsPrompt(prev => ({ ...prev, isOpen: false }));
    };

    const rejectMissingComponents = () => {
        applyAssignments(missingComponentsPrompt.pendingSelections, missingComponentsPrompt.assignmentType);
        setMissingComponentsPrompt(prev => ({ ...prev, isOpen: false }));
    };

    const openAssignment = (type: AssignableEntityType) => {
        setAssignmentType(type);
        setAssignmentOpen(true);
    };

    const getAvailableItemsForDialog = () => {
        if (!activeWp) return [];
        switch (assignmentType) {
            case 'material': return materials.filter(m => !activeWp.assignedMaterials.some(am => am.materialId === m.id));
            case 'process': return manufacturingProcesses.filter(p => !activeWp.assignedProcesses.includes(p.id));
            case 'standardPart': return standardParts.filter(p => !activeWp.assignedStandardParts.includes(p.id));
            case 'layup': return layups.filter(l => !activeWp.assignedLayups.includes(l.id));
            case 'assembly': return assemblies.filter(a => !activeWp.assignedAssemblies.includes(a.id));
            default: return [];
        }
    };

    return (
        <div className="flex flex-col h-full bg-background animate-in fade-in">
            <div className="border-b px-6 py-4 flex items-center justify-between bg-card text-card-foreground shadow-sm shrink-0">
                <div className="flex items-center gap-4">
                    <Link to="/projects">
                        <Button variant="ghost" size="icon">
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">{currentProject.name}</h1>
                        <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                            <span className="font-mono">{currentProject.projectNumber}</span>
                            <span>•</span>
                            <span>Rev {currentProject.revision}</span>
                            <span>•</span>
                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${currentProject.status === 'Active' ? 'bg-green-100 text-green-800' :
                                currentProject.status === 'Completed' ? 'bg-blue-100 text-blue-800' :
                                    currentProject.status === 'On Hold' ? 'bg-yellow-100 text-yellow-800' :
                                        'bg-gray-100 text-gray-800'
                                }`}>
                                {currentProject.status}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-hidden flex">
                <div className="w-64 border-r bg-slate-50/50 dark:bg-slate-900/20 flex flex-col shrink-0">
                    <div className="p-4 border-b flex items-center justify-between">
                        <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Work Packages</h3>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleCreateWorkPackage}>
                            <Plus className="h-4 w-4" />
                        </Button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 space-y-1">
                        {workPackages.length === 0 ? (
                            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                                No Work Packages yet.
                            </div>
                        ) : (
                            workPackages.map(wp => (
                                <div key={wp.id} className="group relative">
                                    <button
                                        onClick={() => setSelectedWpId(wp.id)}
                                        className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${selectedWpId === wp.id ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted'}`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <span className="truncate">{wp.name}</span>
                                        </div>
                                    </button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6 absolute right-1 top-1.5 opacity-0 group-hover:opacity-100 text-destructive hover:bg-destructive/10"
                                        onClick={(e) => { e.stopPropagation(); handleDeleteWorkPackage(wp.id); }}
                                    >
                                        <Trash2 className="h-3 w-3" />
                                    </Button>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                <div className="flex-1 overflow-auto p-6 bg-slate-50/50 dark:bg-slate-900/20">
                    {!activeWp ? (
                        <div className="h-full flex flex-col items-center justify-center max-w-md mx-auto text-center space-y-4">
                            <div className="h-16 w-16 bg-muted rounded-full flex items-center justify-center mb-4">
                                <Box className="h-8 w-8 text-muted-foreground" />
                            </div>
                            <h2 className="text-2xl font-semibold tracking-tight">Project Work Packages</h2>
                            <p className="text-muted-foreground">Projects are organized into Work Packages. Each Work Package contains its own specific set of materials, layups, parts, and processes.</p>
                            <Button onClick={handleCreateWorkPackage} size="lg" className="mt-4">
                                <Plus className="h-5 w-5 mr-2" />
                                Create Work Package
                            </Button>
                        </div>
                    ) : (
                        <div className="space-y-6 max-w-6xl mx-auto">
                            <div className="flex items-center justify-between pb-4 border-b">
                                <div>
                                    <div className="flex items-center gap-3">
                                        <h2 className="text-2xl font-bold tracking-tight">{activeWp.name}</h2>
                                    </div>
                                    {activeWp.description && <p className="text-muted-foreground mt-1">{activeWp.description}</p>}
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button variant={isEditingWP ? "default" : "outline"} size="sm" onClick={() => setIsEditingWP(!isEditingWP)}>
                                        {isEditingWP ? "Done Editing" : "Edit Details"}
                                    </Button>
                                    <Button variant="outline" size="sm" className="text-destructive hover:bg-destructive/10 ml-2" onClick={() => handleDeleteWorkPackage(activeWp.id)}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>

                            <Tabs defaultValue="materials" className="w-full">
                                <TabsList className="grid w-full grid-cols-5 max-w-[900px] mb-4">
                                    <TabsTrigger value="materials" className="flex gap-2"><Box className="h-4 w-4" /> Materials</TabsTrigger>
                                    <TabsTrigger value="parts" className="flex gap-2"><Settings2 className="h-4 w-4" /> Standard Parts</TabsTrigger>
                                    <TabsTrigger value="processes" className="flex gap-2"><Factory className="h-4 w-4" /> Processes</TabsTrigger>
                                    <TabsTrigger value="layups" className="flex gap-2"><Layers className="h-4 w-4" /> Layups</TabsTrigger>
                                    <TabsTrigger value="assemblies" className="flex gap-2"><PlaySquare className="h-4 w-4" /> Assemblies</TabsTrigger>
                                </TabsList>

                                <TabsContent value="materials" className="mt-2 p-6 border rounded-lg bg-card min-h-[400px]">
                                    <ProjectEntityList
                                        projectId={currentProject.id}
                                        entityType="material"
                                        assignedItems={wpMaterials}
                                        onAssignClick={() => openAssignment('material')}
                                        onRemove={(id) => handleRemoveAssignment('material', id)}
                                        title="Materials"
                                        icon={Box}
                                        columns={materialColumns}
                                        isEditing={isEditingWP}
                                        listStatus={activeWp.materialListStatus}
                                        listRevision={activeWp.materialListRevision}
                                        onFinalize={() => handleOpenCloseDialog('material')}
                                        onReopen={() => reopenWorkPackageList(activeWp.id, 'material', activeWp.materialListRevision)}
                                        onViewHistory={() => handleOpenHistory('material')}
                                    />
                                </TabsContent>

                                <TabsContent value="parts" className="mt-2 p-6 border rounded-lg bg-card min-h-[400px]">
                                    <ProjectEntityList
                                        projectId={currentProject.id}
                                        entityType="standardPart"
                                        assignedItems={wpStandardParts}
                                        onAssignClick={() => openAssignment('standardPart')}
                                        onRemove={(id) => handleRemoveAssignment('standardPart', id)}
                                        title="Standard Parts"
                                        icon={Settings2}
                                        columns={partColumns}
                                        isEditing={isEditingWP}
                                        listStatus={activeWp.partListStatus}
                                        listRevision={activeWp.partListRevision}
                                        onFinalize={() => handleOpenCloseDialog('standardPart')}
                                        onReopen={() => reopenWorkPackageList(activeWp.id, 'standardPart', activeWp.partListRevision)}
                                        onViewHistory={() => handleOpenHistory('standardPart')}
                                    />
                                </TabsContent>

                                <TabsContent value="processes" className="mt-2 p-6 border rounded-lg bg-card min-h-[400px]">
                                    <ProjectEntityList
                                        projectId={currentProject.id}
                                        entityType="process"
                                        assignedItems={wpProcesses}
                                        onAssignClick={() => openAssignment('process')}
                                        onRemove={(id) => handleRemoveAssignment('process', id)}
                                        title="Manufacturing Processes"
                                        icon={Factory}
                                        columns={processColumns}
                                        isEditing={isEditingWP}
                                        listStatus={activeWp.processListStatus}
                                        listRevision={activeWp.processListRevision}
                                        onFinalize={() => handleOpenCloseDialog('process')}
                                        onReopen={() => reopenWorkPackageList(activeWp.id, 'process', activeWp.processListRevision)}
                                        onViewHistory={() => handleOpenHistory('process')}
                                    />
                                </TabsContent>

                                <TabsContent value="layups" className="mt-2 p-6 border rounded-lg bg-card min-h-[400px]">
                                    <ProjectEntityList
                                        projectId={currentProject.id}
                                        entityType="layup"
                                        assignedItems={wpLayups}
                                        onAssignClick={() => openAssignment('layup')}
                                        onRemove={(id) => handleRemoveAssignment('layup', id)}
                                        title="Layups"
                                        icon={Layers}
                                        createNewPath={`/layups/new?projectId=${currentProject.id}&wpId=${activeWp.id}`}
                                        columns={layupColumns}
                                        isEditing={isEditingWP}
                                        listStatus={activeWp.layupListStatus}
                                        listRevision={activeWp.layupListRevision}
                                        onFinalize={() => handleOpenCloseDialog('layup')}
                                        onReopen={() => reopenWorkPackageList(activeWp.id, 'layup', activeWp.layupListRevision)}
                                        onViewHistory={() => handleOpenHistory('layup')}
                                    />
                                </TabsContent>

                                <TabsContent value="assemblies" className="mt-2 p-6 border rounded-lg bg-card min-h-[400px]">
                                    <ProjectEntityList
                                        projectId={currentProject.id}
                                        entityType="assembly"
                                        assignedItems={wpAssemblies}
                                        onAssignClick={() => openAssignment('assembly')}
                                        onRemove={(id) => handleRemoveAssignment('assembly', id)}
                                        title="Assemblies"
                                        icon={PlaySquare}
                                        createNewPath={`/assemblies/new?projectId=${currentProject.id}&wpId=${activeWp.id}`}
                                        columns={assemblyColumns}
                                        isEditing={isEditingWP}
                                        listStatus={activeWp.assemblyListStatus}
                                        listRevision={activeWp.assemblyListRevision}
                                        onFinalize={() => handleOpenCloseDialog('assembly')}
                                        onReopen={() => reopenWorkPackageList(activeWp.id, 'assembly', activeWp.assemblyListRevision)}
                                        onViewHistory={() => handleOpenHistory('assembly')}
                                    />
                                </TabsContent>
                            </Tabs>
                        </div>
                    )}
                </div>
            </div>

            <AssignmentDialog
                open={assignmentOpen}
                onOpenChange={setAssignmentOpen}
                entityType={assignmentType}
                availableItems={getAvailableItemsForDialog()}
                onAssign={handleAssignSelections}
            />
            {/* Mission Components Prompt Dialog */}
            <Dialog open={missingComponentsPrompt.isOpen} onOpenChange={(open) => !open && setMissingComponentsPrompt(prev => ({ ...prev, isOpen: false }))}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Missing Work Package Components</DialogTitle>
                        <DialogDescription>
                            The selected items rely on components that are not currently assigned to this work package.
                            Would you like to automatically assign these missing components to the work package so they can be fully utilized?
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4 text-sm max-h-[400px] overflow-y-auto">
                        {missingComponentsPrompt.materialsToAdd.length > 0 && (
                            <div>
                                <h4 className="font-semibold text-foreground mb-1">Materials</h4>
                                <ul className="list-disc pl-5 text-muted-foreground">
                                    {missingComponentsPrompt.materialsToAdd.map(m => (
                                        <li key={m.materialId}>{materials.find(mat => mat.id === m.materialId)?.name || 'Unknown Material'}</li>
                                    ))}
                                </ul>
                            </div>
                        )}
                        {missingComponentsPrompt.layupsToAdd.length > 0 && (
                            <div>
                                <h4 className="font-semibold text-foreground mb-1">Layups</h4>
                                <ul className="list-disc pl-5 text-muted-foreground">
                                    {missingComponentsPrompt.layupsToAdd.map(id => (
                                        <li key={id}>{layups.find(l => l.id === id)?.name || 'Unknown Layup'}</li>
                                    ))}
                                </ul>
                            </div>
                        )}
                        {missingComponentsPrompt.standardPartsToAdd.length > 0 && (
                            <div>
                                <h4 className="font-semibold text-foreground mb-1">Standard Parts</h4>
                                <ul className="list-disc pl-5 text-muted-foreground">
                                    {missingComponentsPrompt.standardPartsToAdd.map(id => (
                                        <li key={id}>{standardParts.find(p => p.id === id)?.name || 'Unknown Part'}</li>
                                    ))}
                                </ul>
                            </div>
                        )}
                        {missingComponentsPrompt.processesToAdd.length > 0 && (
                            <div>
                                <h4 className="font-semibold text-foreground mb-1">Processes</h4>
                                <ul className="list-disc pl-5 text-muted-foreground">
                                    {missingComponentsPrompt.processesToAdd.map(id => (
                                        <li key={id}>{manufacturingProcesses.find(p => p.id === id)?.name || 'Unknown Process'}</li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={rejectMissingComponents}>
                            No, Keep Existing List
                        </Button>
                        <Button onClick={confirmMissingComponents}>
                            Yes, Add Missing Items
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Close Revision Dialog */}
            <Dialog open={isCloseDialogOpen} onOpenChange={setIsCloseDialogOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Finalize Revision for {activeCloseList}</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to finalize this revision? The current list state will be saved as a read-only snapshot.
                            A new revision can be started at any time if further changes are required.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="py-4">
                        <h4 className="font-semibold text-sm mb-2">Changelog Details</h4>
                        <div className="bg-muted/50 p-4 rounded-md text-sm whitespace-pre-wrap font-mono max-h-[300px] overflow-y-auto">
                            {revisionDiff || "Generating diff..."}
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsCloseDialogOpen(false)}>Cancel</Button>
                        <Button variant="default" onClick={handleConfirmClose} className="bg-blue-600 hover:bg-blue-700">Confirm Finalize</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* History Dialog */}
            <Dialog open={isHistoryDialogOpen} onOpenChange={setIsHistoryDialogOpen}>
                <DialogContent className="max-w-3xl">
                    <DialogHeader>
                        <DialogTitle>Revision History</DialogTitle>
                        <DialogDescription>
                            A log of all finalized revisions and changes for this Work Package.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="py-4 space-y-4 max-h-[500px] overflow-y-auto pr-2">
                        {historyLoading ? (
                            <div className="text-center text-sm text-muted-foreground py-8">Loading history...</div>
                        ) : wpHistory.length === 0 ? (
                            <div className="text-center text-sm text-muted-foreground py-8">No finalized revisions found.</div>
                        ) : (
                            wpHistory.map((rev) => (
                                <div key={rev.id} className="border rounded-md p-4 bg-card">
                                    <div className="flex justify-between items-center mb-2 border-b pb-2">
                                        <div className="font-semibold text-lg flex items-center gap-2">
                                            Revision {rev.revision}
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                            {format(new Date(rev.createdAt), 'MMM d, yyyy h:mm a')}
                                        </div>
                                    </div>
                                    <div className="bg-muted p-3 rounded-md text-sm whitespace-pre-wrap font-mono text-muted-foreground">
                                        {rev.changelog}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsHistoryDialogOpen(false)}>Close</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};
