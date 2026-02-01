import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAppStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { RequirementRuleDialog } from './RequirementRuleDialog'; // New Component
import { RequirementProfileDialog } from './RequirementEditorDialog';
import { Plus, Pencil, Edit } from 'lucide-react';
import type { RequirementRule } from '@/types/domain';

export function RequirementProfileDetailPage() {
    const { id } = useParams<{ id: string }>();
    const { requirementProfiles, properties, fetchRequirementProfiles, fetchProperties, updateRequirementProfile } = useAppStore();

    // Dialog State
    const [ruleDialogOpen, setRuleDialogOpen] = useState(false);
    const [addPropDialogOpen, setAddPropDialogOpen] = useState(false);
    const [editProfileOpen, setEditProfileOpen] = useState(false);

    // Selection State
    const [editingRule, setEditingRule] = useState<RequirementRule | undefined>(undefined);
    const [selectedPropIdForAdd, setSelectedPropIdForAdd] = useState<string>("");

    useEffect(() => {
        fetchRequirementProfiles();
        fetchProperties();
    }, [fetchRequirementProfiles, fetchProperties]);

    const profile = requirementProfiles.find(p => p.id === id);

    if (!profile) {
        return <div className="p-8">Loading Standard...</div>;
    }

    const handleSaveRule = async (newRule: RequirementRule) => {
        let updatedRules = [...profile.rules];
        const existingIdx = updatedRules.findIndex(r => r.propertyId === newRule.propertyId);

        if (existingIdx >= 0) {
            // Update existing
            updatedRules[existingIdx] = newRule;
        } else {
            // Add new
            updatedRules.push(newRule);
        }

        await updateRequirementProfile(profile.id, { rules: updatedRules });
    };

    const handleDeleteRule = async (propertyId: string) => {
        const updatedRules = profile.rules.filter(r => r.propertyId !== propertyId);
        await updateRequirementProfile(profile.id, { rules: updatedRules });
    };

    const openAddDialog = () => {
        setSelectedPropIdForAdd("");
        setAddPropDialogOpen(true);
    };

    const handlePropertySelected = () => {
        if (!selectedPropIdForAdd) return;
        // Check if already exists
        if (profile.rules.some(r => r.propertyId === selectedPropIdForAdd)) {
            alert("Property already exists in this standard.");
            return;
        }
        setEditingRule(undefined); // undefined means "new"
        setAddPropDialogOpen(false); // Close selector
        setRuleDialogOpen(true); // Open rule editor
    };

    const handleEditRule = (rule: RequirementRule) => {
        // Here we just pass the rule, the dialog will use rule.propertyId
        setEditingRule(rule);
        setSelectedPropIdForAdd(rule.propertyId); // Needed to keep prop ID context
        setRuleDialogOpen(true);
    };

    const getPropName = (id: string) => properties.find(p => p.id === id)?.name || id;
    const getPropUnit = (id: string) => properties.find(p => p.id === id)?.unit || '';

    // Filter properties not yet added
    const availableProperties = properties.filter(p => !profile.rules.some(r => r.propertyId === p.id));

    return (
        <div className="p-8 space-y-6 animate-in fade-in duration-500">
            {/* Breadcrumb & Header */}
            <div className="space-y-4">
                <Breadcrumb>
                    <BreadcrumbList>
                        <BreadcrumbItem>
                            <BreadcrumbLink asChild>
                                <Link to="/standards">Standards</Link>
                            </BreadcrumbLink>
                        </BreadcrumbItem>
                        <BreadcrumbSeparator />
                        <BreadcrumbItem>
                            <BreadcrumbPage>{profile.name}</BreadcrumbPage>
                        </BreadcrumbItem>
                    </BreadcrumbList>
                </Breadcrumb>

                <div className="flex justify-between items-start">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">{profile.name}</h1>
                        <p className="text-muted-foreground">{profile.description}</p>
                    </div>
                    <div className="flex gap-4 items-center">
                        <Button variant="outline" onClick={() => setEditProfileOpen(true)}>
                            <Edit className="mr-2 h-4 w-4" /> Edit Details
                        </Button>
                        <Button onClick={openAddDialog}>
                            <Plus className="mr-2 h-4 w-4" /> Add Requirement
                        </Button>
                    </div>
                </div>
            </div>

            <Tabs defaultValue="rules" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="rules">Rules ({profile.rules.length})</TabsTrigger>
                    <TabsTrigger value="usage">Usage</TabsTrigger>
                </TabsList>

                <TabsContent value="rules" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Defined Requirements</CardTitle>
                            <CardDescription>
                                Acceptance criteria defined for this standard.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Property</TableHead>
                                        <TableHead>Min</TableHead>
                                        <TableHead>Target</TableHead>
                                        <TableHead>Max</TableHead>
                                        <TableHead>Unit</TableHead>
                                        <TableHead>Method</TableHead>
                                        <TableHead className="w-[50px]"></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {profile.rules.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={7} className="text-center py-8 text-muted-foreground italic">
                                                No rules defined. Click "Add Requirement" to start.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        profile.rules.map((rule, idx) => (
                                            <TableRow
                                                key={idx}
                                                className="cursor-pointer hover:bg-muted/50"
                                                onClick={() => handleEditRule(rule)}
                                            >
                                                <TableCell className="font-medium">{getPropName(rule.propertyId)}</TableCell>
                                                <TableCell>{rule.min ?? '-'}</TableCell>
                                                <TableCell>{rule.target ?? '-'}</TableCell>
                                                <TableCell>{rule.max ?? '-'}</TableCell>
                                                <TableCell>{rule.unit || getPropUnit(rule.propertyId)}</TableCell>
                                                <TableCell className="text-muted-foreground">{rule.method || '-'}</TableCell>
                                                <TableCell>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                                        <Pencil className="h-4 w-4 text-muted-foreground" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="usage">
                    <Card>
                        <CardHeader>
                            <CardTitle>Where Used</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-muted-foreground text-sm italic">
                                Use cases logic implementation pending.
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Dialog 1: Select Property to Add */}
            <Dialog open={addPropDialogOpen} onOpenChange={setAddPropDialogOpen}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle>Add Requirement</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Select Property</label>
                            <Select value={selectedPropIdForAdd} onValueChange={setSelectedPropIdForAdd}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Choose a property..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {availableProperties.map(p => (
                                        <SelectItem key={p.id} value={p.id}>
                                            {p.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <Button onClick={handlePropertySelected} disabled={!selectedPropIdForAdd}>
                            Continue
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Dialog 2: Edit Rule Details */}
            <RequirementRuleDialog
                open={ruleDialogOpen}
                onOpenChange={setRuleDialogOpen}
                initialRule={editingRule}
                propertyId={selectedPropIdForAdd}
                onSave={handleSaveRule}
                onDelete={editingRule ? () => handleDeleteRule(editingRule.propertyId) : undefined}
            />

            {/* Profile Logic Edit Dialog */}
            {editProfileOpen && (
                <RequirementProfileDialog
                    open={editProfileOpen}
                    onOpenChange={setEditProfileOpen}
                    initialData={profile}
                    onSave={async (updated) => {
                        await updateRequirementProfile(profile.id, updated);
                        setEditProfileOpen(false);
                    }}
                />
            )}
        </div>
    );
}
