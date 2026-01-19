import { useState } from "react";
import type { Material, MaterialVariant } from "@/types/domain";
import { useAppStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Pencil, Trash2, Box } from "lucide-react";
import { VariantDialog } from "./VariantDialog";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
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
import { v4 as uuidv4 } from "uuid";

interface VariantManagerProps {
    material: Material;
}

export function VariantManager({ material }: VariantManagerProps) {
    const { addVariant, updateVariant, deleteVariant } = useAppStore();
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [editingVariant, setEditingVariant] = useState<MaterialVariant | null>(null);
    const [deletingVariant, setDeletingVariant] = useState<MaterialVariant | null>(null);

    const variants = material.variants || [];

    const handleAdd = async (data: { variantId: string; name: string; description: string }) => {
        await addVariant(material.id, {
            id: uuidv4(), // Fix: use uuid lib
            variantId: data.variantId,
            variantName: data.name,
            description: data.description,
            // Inherited fields are handled in store
            name: material.name,
            status: material.status,
            manufacturer: material.manufacturer,
            type: material.type,
        } as any);
        setIsAddOpen(false);
    };

    const handleEdit = async (data: { variantId: string; name: string; description: string }) => {
        if (!editingVariant) return;
        // Use editingVariant.id (UUID)
        await updateVariant(material.id, editingVariant.id, {
            variantName: data.name,
            description: data.description
        });
        setEditingVariant(null);
    };

    const handleDelete = async () => {
        if (!deletingVariant) return;
        // Use deletingVariant.id (UUID)
        await deleteVariant(material.id, deletingVariant.id);
        setDeletingVariant(null);
    };

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Material Variants</CardTitle>
                    <CardDescription>
                        Manage variations of this material (e.g. different batches, slight modifications).
                    </CardDescription>
                </div>
                <Button onClick={() => setIsAddOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" /> Add Variant
                </Button>
            </CardHeader>
            <CardContent>
                {variants.length === 0 ? (
                    <div className="text-center py-12 border-2 border-dashed rounded-lg bg-muted/10">
                        <Box className="mx-auto h-12 w-12 text-muted-foreground/50 mb-3" />
                        <h3 className="text-lg font-medium text-muted-foreground">No variants defined</h3>
                        <p className="text-sm text-muted-foreground mt-1 mb-4">
                            Create a variant to track specific batches or versions.
                        </p>
                        <Button variant="outline" onClick={() => setIsAddOpen(true)}>
                            Create First Variant
                        </Button>
                    </div>
                ) : (
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>ID</TableHead>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Description</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {variants.map((variant) => (
                                    <TableRow key={variant.id}>
                                        <TableCell className="font-medium font-mono">{variant.variantId}</TableCell>
                                        <TableCell>{variant.variantName}</TableCell>
                                        <TableCell className="text-muted-foreground max-w-md truncate">
                                            {variant.description}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button size="icon" variant="ghost" onClick={() => setEditingVariant(variant)}>
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                                <Button size="icon" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => setDeletingVariant(variant)}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </CardContent>

            {/* Dialogs */}
            <VariantDialog
                open={isAddOpen}
                onOpenChange={setIsAddOpen}
                mode="add"
                existingVariantIds={variants.map(v => v.variantId)}
                onSubmit={handleAdd}
            />

            <VariantDialog
                open={!!editingVariant}
                onOpenChange={(open) => !open && setEditingVariant(null)}
                mode="edit"
                initialData={editingVariant || undefined}
                existingVariantIds={variants.map(v => v.variantId)}
                onSubmit={handleEdit}
            />

            <AlertDialog open={!!deletingVariant} onOpenChange={(open: boolean) => !open && setDeletingVariant(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Variant?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete <strong>{deletingVariant?.variantName}</strong> ({deletingVariant?.variantId})?
                            This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </Card>
    );
}
