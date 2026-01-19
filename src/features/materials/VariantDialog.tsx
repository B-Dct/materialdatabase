import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { MaterialVariant } from "@/types/domain";

interface VariantDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    mode: 'add' | 'edit';
    initialData?: MaterialVariant;
    existingVariantIds: string[]; // for validation
    onSubmit: (data: { variantId: string; name: string; description: string }) => Promise<void>;
}

export function VariantDialog({ open, onOpenChange, mode, initialData, existingVariantIds, onSubmit }: VariantDialogProps) {
    const [variantId, setVariantId] = useState("");
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [errors, setErrors] = useState<{ [key: string]: string }>({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (open) {
            if (mode === 'edit' && initialData) {
                setVariantId(initialData.variantId);
                setName(initialData.variantName); // Mapping variantName -> name input
                setDescription(initialData.description || "");
            } else {
                setVariantId("");
                setName("");
                setDescription("");
            }
            setErrors({});
        }
    }, [open, mode, initialData]);

    const validate = () => {
        const newErrors: { [key: string]: string } = {};

        if (!variantId.trim()) newErrors.variantId = "Unique ID is required";
        if (!name.trim()) newErrors.name = "Name is required";

        // Uniqueness check for ID (only if adding or if ID changed during edit - though ID editing might be restricted)
        if (mode === 'add' && existingVariantIds.includes(variantId.trim())) {
            newErrors.variantId = "This ID already exists";
        }
        if (mode === 'edit' && initialData && variantId.trim() !== initialData.variantId && existingVariantIds.includes(variantId.trim())) {
            newErrors.variantId = "This ID already exists";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;

        setIsSubmitting(true);
        try {
            await onSubmit({
                variantId: variantId.trim(),
                name: name.trim(),
                description: description.trim()
            });
            onOpenChange(false);
        } catch (error: any) {
            console.error(error);
            alert("Error saving variant: " + (error.message || error));
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{mode === 'add' ? 'Add Variant' : 'Edit Variant'}</DialogTitle>
                    <DialogDescription>
                        {mode === 'add'
                            ? "Create a new variant for this material."
                            : "Update variant details."}
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="variantId">Variant ID <span className="text-destructive">*</span></Label>
                        <Input
                            id="variantId"
                            value={variantId}
                            onChange={(e) => setVariantId(e.target.value)}
                            placeholder="e.g. VAR-001"
                            disabled={mode === 'edit'} // Usually IDs are immutable, but user said "unique ID that one must input". I'll disable edit for safety or allow? Let's disable for now as it's a key.
                        />
                        {errors.variantId && <span className="text-xs text-destructive">{errors.variantId}</span>}
                        {mode === 'edit' && <span className="text-xs text-muted-foreground">ID cannot be changed after creation.</span>}
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="name">Name <span className="text-destructive">*</span></Label>
                        <Input
                            id="name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g. High Temp Version"
                        />
                        {errors.name && <span className="text-xs text-destructive">{errors.name}</span>}
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                            id="description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Details about this variant..."
                        />
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting ? "Saving..." : "Save"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
