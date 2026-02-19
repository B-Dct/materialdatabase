import { useState, useEffect } from "react";
import { useAppStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Trash2, Plus, Info, Archive, ArchiveRestore } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
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

export function MaterialTypeManager() {
    const { materialTypes, fetchMaterialTypes, addMaterialType, deleteMaterialType, archiveMaterialType, restoreMaterialType } = useAppStore();
    const [newItem, setNewItem] = useState("");
    const [showArchived, setShowArchived] = useState(false);
    const [itemToArchive, setItemToArchive] = useState<string | null>(null);
    const [itemToDelete, setItemToDelete] = useState<string | null>(null);

    useEffect(() => {
        fetchMaterialTypes(showArchived);
    }, [fetchMaterialTypes, showArchived]);

    const handleAdd = async () => {
        if (!newItem.trim()) return;
        await addMaterialType(newItem.trim());
        setNewItem("");
    };

    const confirmDelete = async () => {
        if (itemToDelete) {
            await deleteMaterialType(itemToDelete);
            setItemToDelete(null);
        }
    };

    const confirmArchive = async () => {
        if (itemToArchive) {
            await archiveMaterialType(itemToArchive);
            setItemToArchive(null);
        }
    };

    const handleDeleteClick = (type: string) => {
        setItemToDelete(type);
    };

    const handleArchiveClick = (type: string) => {
        setItemToArchive(type);
    };

    const handleRestore = async (type: string) => {
        await restoreMaterialType(type);
    };

    // Restore not directly supported in store yet for MaterialTypes (store.archiveMaterialType exists, restore via re-create or need specific restore action?)
    // Actually store.archiveMaterialType sets status to archived.
    // To restore, we need an action. `SupabaseStorage` doesn't have explicit `unarchiveMaterialType`.
    // But `createMaterialType` might fail if name exists.
    // Wait, `entry_status` is on definitions.
    // Use `createMaterialType` to re-activate if I can?
    // Or add `unarchiveMaterialType` to store/storage.
    // For now, I will omit restore button or implement it properly.
    // Let's implement `restoreMaterialType` in store/storage later or now.
    // Actually, `updateProcess` exists. `updateMaterialType`?
    // I can add `unarchiveMaterialType` to store/storage. 
    // Let's assume for now I can't restore easily without adding code. 
    // I will add `restoreMaterialType` to store/storage in next step if needed.
    // OR I can use `createMaterialType` which should upsert?
    // Supabase insert might fail on conflict.

    // Let's adding Restore button that does nothing but alerts for now, or use `archiveMaterialType` to toggle?
    // No, `archiveMaterialType` likely sets to 'archived'.

    const filteredTypes = showArchived
        ? materialTypes
        : materialTypes.filter(t => t.entryStatus !== 'archived');

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Material Types</h1>
                    <p className="text-muted-foreground">Manage the list of allowed material categories.</p>
                </div>
                <div className="flex items-center space-x-2">
                    <Switch id="show-archived-types" checked={showArchived} onCheckedChange={setShowArchived} />
                    <Label htmlFor="show-archived-types">Show Archived</Label>
                </div>
            </div>

            <Card className="max-w-2xl">
                <CardHeader>
                    <CardTitle>Defined Types</CardTitle>
                    <CardDescription>
                        These types will be available when creating new materials.
                        <br />
                        <span className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                            <Info className="h-3 w-3" />
                            Note: "Prepreg" and "Fabric" trigger special behavior in Layup Editor (Orientation).
                        </span>
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex gap-2">
                        <Input
                            placeholder="New Type Name (e.g. Resin)"
                            value={newItem}
                            onChange={(e) => setNewItem(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                        />
                        <Button onClick={handleAdd}>
                            <Plus className="h-4 w-4 mr-2" /> Add
                        </Button>
                    </div>

                    <div className="border rounded-md">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead className="w-[140px] text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredTypes.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={2} className="text-center text-muted-foreground h-24">
                                            No types defined.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredTypes.map((type) => (
                                        <TableRow key={type.name} className={type.entryStatus === 'archived' ? 'opacity-60 bg-muted/20' : ''}>
                                            <TableCell className="font-medium flex items-center gap-2">
                                                {type.name}
                                                {type.entryStatus === 'archived' && <Badge variant="outline" className="h-5 text-[10px]">Archived</Badge>}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-1">
                                                    {type.entryStatus !== 'archived' ? (
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => handleArchiveClick(type.name)}
                                                            className="text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                                                            title="Archive"
                                                        >
                                                            <Archive className="h-4 w-4" />
                                                        </Button>
                                                    ) : (
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                                            onClick={() => handleRestore(type.name)}
                                                            title="Restore"
                                                        >
                                                            <ArchiveRestore className="h-4 w-4" />
                                                        </Button>
                                                    )}
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => handleDeleteClick(type.name)}
                                                        className="text-muted-foreground hover:text-destructive"
                                                        title="Delete Permanently"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            <AlertDialog open={!!itemToArchive} onOpenChange={(open) => !open && setItemToArchive(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Archive Material Type?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to archive <strong>{itemToArchive}</strong>? It will be hidden from selection lists but preserved in historical data.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmArchive} className="bg-amber-600 hover:bg-amber-700">Archive</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={!!itemToDelete} onOpenChange={(open) => !open && setItemToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Material Type?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to PERMANENTLY delete <strong>{itemToDelete}</strong>? This action cannot be undone and may affect existing materials.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
