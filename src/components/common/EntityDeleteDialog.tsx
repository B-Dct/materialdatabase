import { useState } from "react";
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
import { AlertTriangle } from "lucide-react";

interface EntityDeleteDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    entityName: string;
    entityType: "Material" | "Layup";
    onConfirm: () => void;
    isArchiving?: boolean;
}

export function EntityDeleteDialog({
    open,
    onOpenChange,
    entityName,
    entityType,
    onConfirm,
    isArchiving = false
}: EntityDeleteDialogProps) {
    const [confirmName, setConfirmName] = useState("");

    // Strict match required
    const isValid = confirmName === entityName;

    const handleConfirm = () => {
        if (!isValid) return;
        onConfirm();
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px] border-destructive/50">
                <DialogHeader>
                    <div className="flex items-center gap-2 text-destructive">
                        <AlertTriangle className="h-6 w-6" />
                        <DialogTitle>{isArchiving ? `Archive ${entityType}` : `Delete ${entityType}`}</DialogTitle>
                    </div>
                    <DialogDescription>
                        {isArchiving
                            ? `This will move the ${entityType.toLowerCase()} to the archive. It will be hidden from normal lists.`
                            : `This action cannot be undone. This will permanently delete the ${entityType.toLowerCase()} and its related data.`}
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="confirmName">
                            Type <span className="font-bold select-none">{entityName}</span> to confirm:
                        </Label>
                        <Input
                            id="confirmName"
                            value={confirmName}
                            onChange={(e) => setConfirmName(e.target.value)}
                            placeholder={entityName}
                            className="border-destructive/20 focus-visible:ring-destructive"
                            autoComplete="off"
                            onPaste={(e) => e.preventDefault()} // Force typing
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="ghost" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button
                        variant="destructive"
                        onClick={handleConfirm}
                        disabled={!isValid}
                    >
                        {isArchiving ? "Confirm Archive" : "Delete Permanently"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
