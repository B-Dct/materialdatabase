import { useState, useEffect } from "react";
import { useAppStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
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
import { Label } from "@/components/ui/label";
import { type Material, type EntityStatus } from "@/types/domain";
import { EntityDeleteDialog } from "@/components/common/EntityDeleteDialog";
import { useAuth } from "@/lib/auth";

interface MaterialFormDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    mode: "create" | "edit";
    initialData?: Material;
}

export function MaterialFormDialog({
    open,
    onOpenChange,
    mode,
    initialData,
}: MaterialFormDialogProps) {
    const { addMaterial, updateMaterial, materialTypes, fetchMaterialTypes } = useAppStore();

    const [formData, setFormData] = useState<Partial<Material>>({
        name: "",
        type: "",
        manufacturer: "",
        description: "",
        status: "active" as EntityStatus,
    });

    // Reset or Load Data
    useEffect(() => {
        if (open) {
            fetchMaterialTypes(); // Ensure types are loaded
            if (mode === "edit" && initialData) {
                setFormData({ ...initialData });
            } else {
                setFormData({
                    name: "",
                    materialId: "",
                    materialListNumber: "",
                    type: "",
                    manufacturer: "",
                    manufacturerAddress: "",
                    supplier: "",
                    reachStatus: "reach_compliant",
                    maturityLevel: 1,
                    description: "",
                    status: "standard" as EntityStatus,
                });
            }
        }
    }, [open, mode, initialData, fetchMaterialTypes]);

    const isValid = formData.name && formData.type && formData.manufacturer;

    const handleSubmit = async () => {
        if (!isValid) return;

        try {
            if (mode === "create") {
                await addMaterial(formData as Omit<Material, "id">);
            } else if (mode === "edit" && initialData?.id) {
                await updateMaterial(initialData.id, formData);
            }
            onOpenChange(false);
        } catch (error) {
            console.error("Failed to save material:", error);
        }
    };

    // Deletion Logic
    const { can } = useAuth();
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [archiveOpen, setArchiveOpen] = useState(false);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { deleteMaterial } = useAppStore(); // Use deleteMaterial from store

    const handleDeleteConfirm = async () => {
        if (!initialData?.id) return;
        if (!can('manage:materials')) {
            alert("Insufficient Permissions"); // Or better UI feedback
            return;
        }

        await deleteMaterial(initialData.id);
        setDeleteOpen(false);
        onOpenChange(false);
    };

    const handleArchiveConfirm = async () => {
        if (!initialData?.id) return;
        await updateMaterial(initialData.id, { status: 'archived' });

        setArchiveOpen(false);
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle>{mode === "create" ? "Create New Material" : "Edit Material"}</DialogTitle>
                    <DialogDescription>
                        {mode === "create"
                            ? "Enter all required details to register a new material."
                            : "Update material details. Changes are saved immediately."}
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="materialId">Material ID *</Label>
                            <Input
                                id="materialId"
                                value={formData.materialId || ""}
                                onChange={(e) => setFormData({ ...formData, materialId: e.target.value })}
                                placeholder="e.g. MAT-001"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="materialListNumber">List Number</Label>
                            <Input
                                id="materialListNumber"
                                value={formData.materialListNumber || ""}
                                onChange={(e) => setFormData({ ...formData, materialListNumber: e.target.value })}
                                placeholder="e.g. L-12345"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Material Name *</Label>
                            <Input
                                id="name"
                                value={formData.name || ""}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="e.g. HexPly 8552"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="manufacturer">Manufacturer *</Label>
                            <Input
                                id="manufacturer"
                                value={formData.manufacturer || ""}
                                onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                                placeholder="e.g. Hexcel"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="supplier">Supplier</Label>
                            <Input
                                id="supplier"
                                value={formData.supplier || ""}
                                onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                                placeholder="Direct or Distributor"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="manufacturerAddress">Manufacturer Address</Label>
                            <Input
                                id="manufacturerAddress"
                                value={formData.manufacturerAddress || ""}
                                onChange={(e) => setFormData({ ...formData, manufacturerAddress: e.target.value })}
                                placeholder="City, Country"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="reachStatus">Reach Status</Label>
                            <Select
                                value={formData.reachStatus}
                                onValueChange={(val: any) => setFormData({ ...formData, reachStatus: val })}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="reach_compliant">Reach Compliant</SelectItem>
                                    <SelectItem value="svhc_contained">SVHC Contained</SelectItem>
                                    <SelectItem value="restricted">Restricted</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="maturityLevel">Maturity Level</Label>
                            <Select
                                value={formData.maturityLevel?.toString()}
                                onValueChange={(val) => setFormData({ ...formData, maturityLevel: parseInt(val) as 1 | 2 | 3 })}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="1">1 - Low</SelectItem>
                                    <SelectItem value="2">2 - Medium</SelectItem>
                                    <SelectItem value="3">3 - High</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="type">Type *</Label>
                            <Select
                                value={formData.type}
                                onValueChange={(val) => setFormData({ ...formData, type: val })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select Type" />
                                </SelectTrigger>
                                <SelectContent>
                                    {materialTypes.length === 0 ? (
                                        <SelectItem value="none" disabled>No types defined in Settings</SelectItem>
                                    ) : (
                                        materialTypes.map((t) => (
                                            <SelectItem key={t} value={t}>{t}</SelectItem>
                                        ))
                                    )}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="status">Status</Label>
                            <Select
                                value={formData.status}
                                onValueChange={(val: any) => setFormData({ ...formData, status: val })}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="active">Active</SelectItem>
                                    <SelectItem value="standard">Standard</SelectItem>
                                    <SelectItem value="in_review">In Review</SelectItem>
                                    <SelectItem value="blocked">Blocked</SelectItem>
                                    <SelectItem value="obsolete">Obsolete</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                            id="description"
                            className="min-h-[100px]"
                            value={formData.description || ""}
                            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData({ ...formData, description: e.target.value })}
                            placeholder="Technical summary, resin content, fiber type..."
                        />
                    </div>
                </div>

                {mode === "edit" && initialData && (
                    <div className="border-t pt-4 mt-4">
                        <h4 className="text-sm font-semibold text-destructive mb-4">Danger Zone</h4>
                        <div className="flex items-center justify-between p-4 border border-destructive/20 rounded-lg bg-destructive/5">
                            <div>
                                <h5 className="font-medium text-destructive">Archive or Delete</h5>
                                <p className="text-xs text-muted-foreground">
                                    Manage lifecycle or permanently remove this material.
                                </p>
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setArchiveOpen(true)}
                                    className="border-destructive/50 hover:bg-destructive/10 text-destructive"
                                >
                                    Archive
                                </Button>
                                <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => setDeleteOpen(true)}
                                >
                                    Delete
                                </Button>
                            </div>
                        </div>
                    </div>
                )}

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button onClick={handleSubmit} disabled={!isValid}>
                        {mode === "create" ? "Create Material" : "Save Changes"}
                    </Button>
                </DialogFooter>
            </DialogContent>

            {/* Sub-Dialogs */}
            {
                initialData && (
                    <>
                        <EntityDeleteDialog
                            open={deleteOpen}
                            onOpenChange={setDeleteOpen}
                            entityName={initialData.name}
                            entityType="Material"
                            onConfirm={handleDeleteConfirm}
                            isArchiving={false}
                        />
                        <EntityDeleteDialog
                            open={archiveOpen}
                            onOpenChange={setArchiveOpen}
                            entityName={initialData.name}
                            entityType="Material"
                            onConfirm={handleArchiveConfirm}
                            isArchiving={true}
                        />
                    </>
                )
            }
        </Dialog >
    );
}
