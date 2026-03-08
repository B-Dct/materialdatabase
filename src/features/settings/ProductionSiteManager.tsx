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
import { Plus, Archive, ArchiveRestore } from "lucide-react";
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

export function ProductionSiteManager() {
    const { productionSites, fetchProductionSites, addProductionSite, archiveProductionSite, restoreProductionSite } = useAppStore();
    const [newItemName, setNewItemName] = useState("");
    const [newItemDescription, setNewItemDescription] = useState("");
    const [showArchived, setShowArchived] = useState(false);
    const [itemToArchive, setItemToArchive] = useState<{ id: string, name: string } | null>(null);

    useEffect(() => {
        fetchProductionSites(showArchived);
    }, [fetchProductionSites, showArchived]);

    const handleAdd = async () => {
        if (!newItemName.trim()) return;
        await addProductionSite({
            name: newItemName.trim(),
            description: newItemDescription.trim(),
            entryStatus: 'active'
        });
        setNewItemName("");
        setNewItemDescription("");
    };

    const confirmArchive = async () => {
        if (itemToArchive) {
            await archiveProductionSite(itemToArchive.id);
            setItemToArchive(null);
        }
    };

    const handleArchiveClick = (id: string, name: string) => {
        setItemToArchive({ id, name });
    };

    const handleRestore = async (id: string) => {
        await restoreProductionSite(id);
    };

    const filteredSites = showArchived
        ? productionSites
        : productionSites.filter(t => t.entryStatus !== 'archived');

    return (
        <div className="p-6 space-y-6 animate-in fade-in">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Production Sites</h2>
                    <p className="text-muted-foreground">Manage the list of allowed production sites (Herstellorte).</p>
                </div>
                <div className="flex items-center space-x-2">
                    <Switch id="show-archived-sites" checked={showArchived} onCheckedChange={setShowArchived} />
                    <Label htmlFor="show-archived-sites">Show Archived</Label>
                </div>
            </div>

            <Card className="max-w-4xl">
                <CardHeader>
                    <CardTitle>Defined Production Sites</CardTitle>
                    <CardDescription>
                        These sites will be available when creating new Layups and Assemblies.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid gap-4 p-4 border rounded-md bg-muted/10 mb-6">
                        <h3 className="text-sm font-medium">Add New Production Site</h3>
                        <div className="flex gap-4 items-end">
                            <div className="space-y-2 flex-1">
                                <Label htmlFor="siteName">Site Name <span className="text-red-500">*</span></Label>
                                <Input
                                    id="siteName"
                                    placeholder="e.g. Finkenwerder"
                                    value={newItemName}
                                    onChange={(e) => setNewItemName(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                                />
                            </div>
                            <div className="space-y-2 flex-[2]">
                                <Label htmlFor="siteDesc">Description</Label>
                                <Input
                                    id="siteDesc"
                                    placeholder="Optional notes or details"
                                    value={newItemDescription}
                                    onChange={(e) => setNewItemDescription(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                                />
                            </div>
                            <Button onClick={handleAdd} disabled={!newItemName.trim()} className="w-[120px]">
                                <Plus className="h-4 w-4 mr-2" /> Add Site
                            </Button>
                        </div>
                    </div>

                    <div className="border rounded-md mt-4">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Location Name</TableHead>
                                    <TableHead>Description</TableHead>
                                    <TableHead className="text-center">Layups</TableHead>
                                    <TableHead className="text-center">Tests</TableHead>
                                    <TableHead className="w-[120px] text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredSites.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center text-muted-foreground h-24">
                                            No production sites defined.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredSites.map((site) => (
                                        <TableRow key={site.id} className={site.entryStatus === 'archived' ? 'opacity-60 bg-muted/20' : ''}>
                                            <TableCell className="font-medium flex items-center gap-2">
                                                {site.name}
                                                {site.entryStatus === 'archived' && <Badge variant="outline" className="h-5 text-[10px]">Archived</Badge>}
                                            </TableCell>
                                            <TableCell className="text-muted-foreground">
                                                {site.description || '-'}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <Badge variant="secondary">{site.layupCount || 0}</Badge>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <Badge variant="secondary">{site.testCount || 0}</Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-1">
                                                    {site.entryStatus !== 'archived' ? (
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => handleArchiveClick(site.id, site.name)}
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
                                                            onClick={() => handleRestore(site.id)}
                                                            title="Restore"
                                                        >
                                                            <ArchiveRestore className="h-4 w-4" />
                                                        </Button>
                                                    )}
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
                        <AlertDialogTitle>Archive Production Site?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to archive <strong>{itemToArchive?.name}</strong>? It will be hidden from selection lists but preserved in data records.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmArchive} className="bg-amber-600 hover:bg-amber-700">Archive</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
