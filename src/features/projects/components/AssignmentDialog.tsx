import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import type { MaterialSpecification } from '@/types/domain';
import { storage } from '@/lib/store';

export type AssignableEntityType = 'material' | 'process' | 'layup' | 'assembly' | 'standardPart';

interface AssignmentDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    entityType: AssignableEntityType;
    availableItems: any[];
    onAssign: (selections: { itemId: string, specId?: string }[]) => void;
}

export function AssignmentDialog({ open, onOpenChange, entityType, availableItems, onAssign }: AssignmentDialogProps) {
    const [search, setSearch] = useState('');
    const [selectedIds, setSelectedIds] = useState<string[]>([]);

    // For materials, they must select a specification per material before confirming
    // Record<materialId, specificationId>
    const [selectedSpecs, setSelectedSpecs] = useState<Record<string, string>>({});
    const [fetchedSpecs, setFetchedSpecs] = useState<Record<string, MaterialSpecification[]>>({});

    const filteredItems = useMemo(() => {
        if (!search) return availableItems;
        return availableItems.filter(i => (i.name || i.title || '').toLowerCase().includes(search.toLowerCase()));
    }, [availableItems, search]);

    const handleToggle = (id: string) => {
        setSelectedIds(prev => {
            const isSelected = prev.includes(id);
            if (!isSelected) {
                // We are adding it
                if (entityType === 'material' && !fetchedSpecs[id]) {
                    storage.getSpecifications(id, 'material')
                        .then(specs => setFetchedSpecs(s => ({ ...s, [id]: specs })))
                        .catch(err => console.error("Failed to load specs", err));
                }
                return [...prev, id];
            } else {
                // We are removing it
                return prev.filter(x => x !== id);
            }
        });
    };

    const handleAssign = () => {
        const payload = selectedIds.map(id => ({
            itemId: id,
            specId: entityType === 'material' ? selectedSpecs[id] : undefined
        }));
        onAssign(payload);

        // Reset state
        setSelectedIds([]);
        setSelectedSpecs({});
        setFetchedSpecs({});
        setSearch('');
    };

    // Validation
    const isReady = useMemo(() => {
        if (selectedIds.length === 0) return false;
        if (entityType === 'material') {
            // Check if all selected materials have a spec selected
            for (const id of selectedIds) {
                if (!selectedSpecs[id]) return false;
            }
        }
        return true;
    }, [selectedIds, selectedSpecs, entityType]);

    function getDialogTitle() {
        switch (entityType) {
            case 'material': return 'Assign Materials';
            case 'process': return 'Assign Processes';
            case 'standardPart': return 'Assign Standard Parts';
            case 'layup': return 'Assign Layups';
            case 'assembly': return 'Assign Assemblies';
            default: return 'Assign Item';
        }
    }

    return (
        <Dialog open={open} onOpenChange={(val) => {
            if (!val) {
                setSelectedIds([]);
                setSelectedSpecs({});
                setSearch('');
                setFetchedSpecs({});
            }
            onOpenChange(val);
        }}>
            <DialogContent className="sm:max-w-[700px] h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>{getDialogTitle()}</DialogTitle>
                </DialogHeader>

                <div className="relative mb-4 shrink-0">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search library..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-9"
                    />
                </div>

                <div className="flex-1 overflow-y-auto border rounded-md relative">
                    <div className="p-4 space-y-2">
                        {filteredItems.length === 0 ? (
                            <p className="text-center text-muted-foreground py-8">No items found.</p>
                        ) : (
                            filteredItems.map(item => {
                                const isSelected = selectedIds.includes(item.id);
                                // Material specific block to pick specification
                                const itemSpecs = entityType === 'material' ? (fetchedSpecs[item.id] || []) : [];

                                return (
                                    <div key={item.id} className="border rounded-lg p-3 space-y-3 bg-card hover:bg-accent/5 transition-colors">
                                        <div className="flex items-start gap-3">
                                            <Checkbox
                                                checked={isSelected}
                                                onCheckedChange={() => handleToggle(item.id)}
                                                className="mt-1"
                                            />
                                            <div className="flex-1 leading-none">
                                                <div className="font-medium">{item.name || item.title}</div>
                                                <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                                                    {item.description || item.manufacturer || item.details || 'No additional details'}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Nested Specification selection for Materials */}
                                        {isSelected && entityType === 'material' && (
                                            <div className="ml-7 mt-2 p-3 bg-slate-50 dark:bg-slate-900 rounded-md border">
                                                <p className="text-sm font-medium mb-2">Select Specification/Norm:</p>
                                                {!fetchedSpecs[item.id] ? (
                                                    <p className="text-sm text-muted-foreground">Loading specifications...</p>
                                                ) : itemSpecs.length === 0 ? (
                                                    <p className="text-sm text-destructive">No specifications found. A material must have at least one specification to be assigned.</p>
                                                ) : (
                                                    <div className="space-y-2">
                                                        {itemSpecs.map((spec: MaterialSpecification) => (
                                                            <label key={spec.id} className="flex items-center gap-2 text-sm cursor-pointer">
                                                                <input
                                                                    type="radio"
                                                                    name={`spec-${item.id}`}
                                                                    className="border-primary text-primary focus:ring-primary"
                                                                    checked={selectedSpecs[item.id] === spec.id}
                                                                    onChange={() => setSelectedSpecs(prev => ({ ...prev, [item.id]: spec.id }))}
                                                                />
                                                                <span className="font-medium">{spec.name}</span>
                                                                {spec.code && <span className="text-muted-foreground ml-2">({spec.code})</span>}
                                                            </label>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                <DialogFooter className="mt-4 shrink-0">
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={handleAssign} disabled={!isReady}>
                        Assign {selectedIds.length > 0 ? selectedIds.length : ''} {selectedIds.length === 1 ? 'Item' : 'Items'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
