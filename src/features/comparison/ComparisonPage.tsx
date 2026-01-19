import { useState } from 'react';
import { useAppStore } from '@/lib/store';
import type { Material } from '@/types/domain';
import { Button } from '@/components/ui/button';
import { Check, Plus, X } from 'lucide-react';

import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

export function ComparisonPage() {
    const { materials, fetchMaterials } = useAppStore();
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [open, setOpen] = useState(false);

    // Ensure materials are loaded
    useState(() => { fetchMaterials(); });

    const selectedMaterials = materials.filter(m => selectedIds.includes(m.id));

    const toggleSelection = (id: string) => {
        if (selectedIds.includes(id)) {
            setSelectedIds(selectedIds.filter(prev => prev !== id));
        } else {
            if (selectedIds.length >= 3) {
                alert("You can compare up to 3 materials at a time.");
                return;
            }
            setSelectedIds([...selectedIds, id]);
            setOpen(false);
        }
    };

    // Helper to get property value safely (mocking properties for now as they are on variants usually)
    // For this prototype, we will compare base material fields
    const fields: { label: string, key: keyof Material }[] = [
        { label: 'Type', key: 'type' },
        { label: 'Manufacturer', key: 'manufacturer' },
        { label: 'Status', key: 'status' },
    ];

    return (
        <div className="p-8 space-y-6 animate-in fade-in duration-500">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Compare Materials</h1>
                    <p className="text-muted-foreground">Side-by-side comparison of material properties.</p>
                </div>

                <Popover open={open} onOpenChange={setOpen}>
                    <PopoverTrigger asChild>
                        <Button variant="outline" className="w-[200px] justify-between">
                            <Plus className="mr-2 h-4 w-4" />
                            Add Material ({selectedIds.length}/3)
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[300px] p-0">
                        <Command>
                            <CommandInput placeholder="Search material..." />
                            <CommandList>
                                <CommandEmpty>No material found.</CommandEmpty>
                                <CommandGroup>
                                    {materials.map((material) => (
                                        <CommandItem
                                            key={material.id}
                                            value={material.name}
                                            onSelect={() => toggleSelection(material.id)}
                                        >
                                            <Check
                                                className={cn(
                                                    "mr-2 h-4 w-4",
                                                    selectedIds.includes(material.id) ? "opacity-100" : "opacity-0"
                                                )}
                                            />
                                            {material.name}
                                        </CommandItem>
                                    ))}
                                </CommandGroup>
                            </CommandList>
                        </Command>
                    </PopoverContent>
                </Popover>
            </div>

            {selectedMaterials.length === 0 ? (
                <div className="text-center py-20 border-2 border-dashed rounded-lg text-muted-foreground">
                    Select materials to start comparing.
                </div>
            ) : (
                <div className="overflow-auto border rounded-xl shadow-sm bg-card">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[200px]">Property</TableHead>
                                {selectedMaterials.map(m => (
                                    <TableHead key={m.id} className="min-w-[200px]">
                                        <div className="flex justify-between items-center">
                                            <span>{m.name}</span>
                                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => toggleSelection(m.id)}>
                                                <X className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    </TableHead>
                                ))}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {fields.map(field => (
                                <TableRow key={field.key}>
                                    <TableCell className="font-medium">{field.label}</TableCell>
                                    {selectedMaterials.map(m => (
                                        <TableCell key={m.id}>
                                            {String(m[field.key])}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))}
                            <TableRow>
                                <TableCell className="font-medium">Description</TableCell>
                                {selectedMaterials.map(m => (
                                    <TableCell key={m.id} className="text-muted-foreground text-xs">
                                        {m.description || '-'}
                                    </TableCell>
                                ))}
                            </TableRow>
                        </TableBody>
                    </Table>
                </div>
            )}
        </div>
    );
}
