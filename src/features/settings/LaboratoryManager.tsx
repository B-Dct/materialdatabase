import { useState } from 'react';
import { useAppStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus } from 'lucide-react';
import { type Laboratory } from '@/types/domain';

export function LaboratoryManager() {
    const { laboratories, properties, addLaboratory, updateLaboratory } = useAppStore();
    const [isCreating, setIsCreating] = useState(false);
    const [newLabName, setNewLabName] = useState('');

    // For editing authorized methods
    const [editingLabId, setEditingLabId] = useState<string | null>(null);

    const handleCreate = () => {
        if (!newLabName) return;
        addLaboratory({
            name: newLabName,
            authorizedMethods: []
        });
        setNewLabName('');
        setIsCreating(false);
    };

    const toggleMethod = (lab: Laboratory, method: string) => {
        const current = lab.authorizedMethods || [];
        const updated = current.includes(method)
            ? current.filter(m => m !== method)
            : [...current, method];

        updateLaboratory(lab.id, { authorizedMethods: updated });
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Laboratory Management</h2>
                    <p className="text-muted-foreground">Manage internal and external laboratories and their authorizations.</p>
                </div>
                <Button onClick={() => setIsCreating(true)} disabled={isCreating}>
                    <Plus className="mr-2 h-4 w-4" /> Add Laboratory
                </Button>
            </div>

            {isCreating && (
                <Card className="animate-in fade-in slide-in-from-top-4">
                    <CardHeader>
                        <CardTitle>New Laboratory</CardTitle>
                    </CardHeader>
                    <CardContent className="flex gap-4">
                        <Input
                            placeholder="Laboratory Name (e.g. External Lab GmbH)"
                            value={newLabName}
                            onChange={e => setNewLabName(e.target.value)}
                        />
                        <Button onClick={handleCreate}>Save</Button>
                        <Button variant="ghost" onClick={() => setIsCreating(false)}>Cancel</Button>
                    </CardContent>
                </Card>
            )}

            <div className="grid gap-6">
                {laboratories.map(lab => (
                    <Card key={lab.id}>
                        <CardHeader className="pb-2">
                            <div className="flex justify-between items-start">
                                <div>
                                    <CardTitle>{lab.name}</CardTitle>
                                    <CardDescription>ID: {lab.id}</CardDescription>
                                </div>
                                <Button variant="outline" size="sm" onClick={() => setEditingLabId(editingLabId === lab.id ? null : lab.id)}>
                                    {editingLabId === lab.id ? 'Done' : 'Manage Methods'}
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-sm font-medium mb-2">Authorized Test Methods:</div>

                            {editingLabId === lab.id ? (
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 border p-4 rounded-md bg-muted/20">
                                    {properties.flatMap(p => (p.testMethods || []).map(m => ({ p, m }))).map(({ p, m }) => (
                                        <div key={`${p.id}-${m}`} className="flex items-center space-x-2">
                                            <Checkbox
                                                id={`lab-${lab.id}-${p.id}-${m}`}
                                                checked={(lab.authorizedMethods || []).includes(m)}
                                                onCheckedChange={() => toggleMethod(lab, m)}
                                            />
                                            <label
                                                htmlFor={`lab-${lab.id}-${p.id}-${m}`}
                                                className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                            >
                                                {m} <span className="text-xs text-muted-foreground">({p.name})</span>
                                            </label>
                                        </div>
                                    ))}
                                    {properties.every(p => !p.testMethods || p.testMethods.length === 0) && (
                                        <div className="col-span-full text-muted-foreground text-sm italic">
                                            No properties have defined Test Methods yet. Go to Property Registry.
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="flex flex-wrap gap-2">
                                    {(lab.authorizedMethods && lab.authorizedMethods.length > 0) ? (
                                        lab.authorizedMethods.map(m => (
                                            <div key={m} className="bg-secondary text-secondary-foreground px-2.5 py-0.5 rounded-md text-xs font-medium border">
                                                {m}
                                            </div>
                                        ))
                                    ) : (
                                        <span className="text-muted-foreground text-sm italic">No methods authorized.</span>
                                    )}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
