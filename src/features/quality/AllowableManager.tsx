import { useState } from 'react';
import { useAppStore } from '@/lib/store';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, Link as LinkIcon, AlertCircle } from "lucide-react";
import type { Allowable, Measurement } from '@/types/domain';
import { Card, CardContent } from '@/components/ui/card';

interface AllowableManagerProps {
    parentId: string;
    parentType: 'material' | 'layup';
    allowables: Allowable[];
    availableMeasurements: Measurement[]; // Must pass available measurements for linking
}

export function AllowableManager({ parentId, parentType, allowables, availableMeasurements }: AllowableManagerProps) {
    const { addAllowable, deleteAllowable } = useAppStore();
    const [isOpen, setIsOpen] = useState(false);

    // Form State
    const [newName, setNewName] = useState("");
    const [newValue, setNewValue] = useState("");
    const [newUnit, setNewUnit] = useState("");
    const [newBasis, setNewBasis] = useState("");
    const [selectedMeasurementId, setSelectedMeasurementId] = useState<string>("");

    const handleAdd = async () => {
        if (!newName || !newValue || !selectedMeasurementId) return;

        await addAllowable({
            parentId,
            parentType,
            name: newName,
            value: newValue,
            unit: newUnit,
            basis: newBasis,
            sourceMeasurementId: selectedMeasurementId
        });

        // Reset
        setNewName("");
        setNewValue("");
        setNewUnit("");
        setNewBasis("");
        setSelectedMeasurementId("");
        setIsOpen(false);
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Allowables</h3>
                <Dialog open={isOpen} onOpenChange={setIsOpen}>
                    <DialogTrigger asChild>
                        <Button size="sm">
                            <Plus className="h-4 w-4 mr-2" /> Add Allowable
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Add Allowable</DialogTitle>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="name" className="text-right">Name</Label>
                                <Input id="name" value={newName} onChange={e => setNewName(e.target.value)} className="col-span-3" placeholder="e.g. Tensile Strength" />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="value" className="text-right">Value</Label>
                                <div className="col-span-3 flex gap-2">
                                    <Input id="value" value={newValue} onChange={e => setNewValue(e.target.value)} placeholder="500" className="flex-1" />
                                    <Input value={newUnit} onChange={e => setNewUnit(e.target.value)} placeholder="Unit (MPa)" className="w-24" />
                                </div>
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="basis" className="text-right">Basis</Label>
                                <Input id="basis" value={newBasis} onChange={e => setNewBasis(e.target.value)} className="col-span-3" placeholder="e.g. A-Basis" />
                            </div>

                            <div className="grid grid-cols-4 items-start gap-4 border-t pt-4">
                                <Label className="text-right pt-2">Source Measurement <span className="text-destructive">*</span></Label>
                                <div className="col-span-3 space-y-2">
                                    {availableMeasurements.length === 0 ? (
                                        <div className="text-sm text-destructive flex items-center gap-2 border border-destructive/20 bg-destructive/10 p-2 rounded">
                                            <AlertCircle className="h-4 w-4" />
                                            No measurements available. Please add a measurement first.
                                        </div>
                                    ) : (
                                        <Select value={selectedMeasurementId} onValueChange={setSelectedMeasurementId}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select reference measurement..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {availableMeasurements.map(m => (
                                                    <SelectItem key={m.id} value={m.id}>
                                                        {m.date} - {m.resultValue} {m.unit} (Lab: {m.laboratoryId || 'Internal'})
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    )}
                                    <p className="text-[10px] text-muted-foreground">
                                        An allowable must be linked to a specific measurement record for traceability.
                                    </p>
                                </div>
                            </div>
                        </div>
                        <Button onClick={handleAdd} disabled={!newName || !newValue || !selectedMeasurementId}>Save Allowable</Button>
                    </DialogContent>
                </Dialog>
            </div>

            {allowables.length === 0 ? (
                <Card>
                    <CardContent className="flex flex-col items-center justify-center p-6 text-muted-foreground">
                        <LinkIcon className="h-8 w-8 mb-2 opacity-20" />
                        <p>No allowables defined.</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="border rounded-md">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Property</TableHead>
                                <TableHead>Value</TableHead>
                                <TableHead>Basis</TableHead>
                                <TableHead>Source Ref</TableHead>
                                <TableHead className="w-[50px]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {allowables.map(item => {
                                const source = availableMeasurements.find(m => m.id === item.sourceMeasurementId);
                                return (
                                    <TableRow key={item.id}>
                                        <TableCell className="font-medium">{item.name}</TableCell>
                                        <TableCell>{item.value} <span className="text-muted-foreground text-xs">{item.unit}</span></TableCell>
                                        <TableCell><span className="text-xs border px-2 py-0.5 rounded bg-muted">{item.basis || '-'}</span></TableCell>
                                        <TableCell>
                                            {source ? (
                                                <div className="flex items-center gap-1 text-xs text-blue-600">
                                                    <LinkIcon className="h-3 w-3" />
                                                    {source.resultValue} {source.unit}
                                                </div>
                                            ) : (
                                                <span className="text-destructive text-xs">Missing Ref</span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <Button variant="ghost" size="icon" onClick={() => deleteAllowable(item.id, parentId, parentType)}>
                                                <Trash2 className="h-4 w-4 text-destructive" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </div>
            )}
        </div>
    );
}
