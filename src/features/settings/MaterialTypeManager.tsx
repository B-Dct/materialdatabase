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
import { Trash2, Plus, Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export function MaterialTypeManager() {
    const { materialTypes, fetchMaterialTypes, addMaterialType, deleteMaterialType } = useAppStore();
    const [newItem, setNewItem] = useState("");

    useEffect(() => {
        fetchMaterialTypes();
    }, [fetchMaterialTypes]);

    const handleAdd = async () => {
        if (!newItem.trim()) return;
        await addMaterialType(newItem.trim());
        setNewItem("");
    };

    const handleDelete = async (type: string) => {
        if (confirm(`Are you sure you want to delete "${type}"? This might affect existing materials.`)) {
            await deleteMaterialType(type);
        }
    };

    return (
        <div className="p-6 space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Material Types</h1>
                <p className="text-muted-foreground">Manage the list of allowed material categories.</p>
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
                                    <TableHead className="w-[100px] text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {materialTypes.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={2} className="text-center text-muted-foreground h-24">
                                            No types defined.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    materialTypes.map((type) => (
                                        <TableRow key={type}>
                                            <TableCell className="font-medium">{type}</TableCell>
                                            <TableCell className="text-right">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleDelete(type)}
                                                    className="text-muted-foreground hover:text-destructive"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
