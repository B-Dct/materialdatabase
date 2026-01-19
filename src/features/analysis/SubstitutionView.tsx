import { useEffect, useState } from 'react';
import { useAppStore } from '@/lib/store';
import { normalizeEntityData, findSimilarEntities, type NormalizedEntity, type SubstitutionConstraint } from './analysis-utils';

import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from "@/components/ui/card";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { ArrowRight, Filter } from 'lucide-react';

export function SubstitutionView() {
    const {
        materials,
        layups,
        properties,
        measurements,
        fetchMaterials,
        fetchLayups,
        fetchProperties,
        fetchMeasurements
    } = useAppStore();

    const [targetMaterialId, setTargetMaterialId] = useState<string>('');
    const [maxDensity, setMaxDensity] = useState<string>('');
    const [minStrength, setMinStrength] = useState<string>('');

    useEffect(() => {
        fetchMaterials();
        fetchLayups();
        fetchProperties();
        fetchMeasurements();
    }, []);

    const targetMaterial = materials.find(m => m.id === targetMaterialId);

    // Prepare Data
    const allNormalized: NormalizedEntity[] = materials.map(m =>
        normalizeEntityData(m, 'material', measurements, properties)
    );

    const targetNormalized = allNormalized.find(n => n.id === targetMaterialId);

    // Build Constraints
    const constraints: SubstitutionConstraint[] = [];
    // Helper to find prop ID by name (fuzzy)
    const densityProp = properties.find(p => p.name.toLowerCase().includes('density'));
    const strengthProp = properties.find(p => p.name.toLowerCase().includes('strength'));

    if (maxDensity && densityProp) {
        constraints.push({ propertyId: densityProp.id, max: parseFloat(maxDensity) });
    }
    if (minStrength && strengthProp) {
        constraints.push({ propertyId: strengthProp.id, min: parseFloat(minStrength) });
    }

    // Run Similarity Search
    const results = targetNormalized
        ? findSimilarEntities(targetNormalized, allNormalized, constraints)
            .sort((a, b) => b.score - a.score)
            .slice(0, 5) // Top 5
        : [];

    // Impact Analysis: Find affected Layups
    const affectedLayups = targetMaterial
        ? layups.filter(l => l.layers.some(layer => {
            // Check if layer variant belongs to target material
            // Current store logic: layer.materialVariantId refers to the Variant ID.
            // We need to check if that variant belongs to the selected material.
            return targetMaterial.variants?.some(v => v.id === layer.materialVariantId);
        }))
        : [];

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1 space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Substitution Target</CardTitle>
                        <CardDescription>Select material to replace.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Original Material</label>
                            <Select value={targetMaterialId} onValueChange={setTargetMaterialId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select Material..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {materials.map(m => (
                                        <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {targetMaterial && (
                            <div className="p-4 bg-muted/20 rounded-md text-sm space-y-1">
                                <div className="font-semibold">Current Usage:</div>
                                <div>Found in <span className="font-bold text-primary">{affectedLayups.length}</span> Layups</div>
                                {affectedLayups.length > 0 && (
                                    <ul className="list-disc list-inside text-xs text-muted-foreground mt-2">
                                        {affectedLayups.slice(0, 3).map(l => (
                                            <li key={l.id}>{l.name}</li>
                                        ))}
                                        {affectedLayups.length > 3 && <li>...and {affectedLayups.length - 3} more</li>}
                                    </ul>
                                )}
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Filter className="h-4 w-4" /> Constraints
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Max Density</label>
                            <Input
                                type="number"
                                placeholder="e.g. 1.6"
                                value={maxDensity}
                                onChange={e => setMaxDensity(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Min Strength (MPa)</label>
                            <Input
                                type="number"
                                placeholder="e.g. 800"
                                value={minStrength}
                                onChange={e => setMinStrength(e.target.value)}
                            />
                        </div>
                        <Button className="w-full" variant="secondary" onClick={() => {
                            setMaxDensity('');
                            setMinStrength('');
                        }}>
                            Reset Filters
                        </Button>
                    </CardContent>
                </Card>
            </div>

            <div className="lg:col-span-2">
                <Card className="h-full">
                    <CardHeader>
                        <CardTitle>Top Candidates</CardTitle>
                        <CardDescription>Ranked by similarity score based on properties.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {!targetMaterial ? (
                            <div className="text-center py-12 text-muted-foreground">Select a material to analyze.</div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Rank</TableHead>
                                        <TableHead>Material</TableHead>
                                        <TableHead>Similarity</TableHead>
                                        <TableHead>Key Matches</TableHead>
                                        <TableHead></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {results.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                                No candidates matches the constraints.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        results.map((r, idx) => (
                                            <TableRow key={r.entity.id}>
                                                <TableCell className="font-bold text-lg">#{idx + 1}</TableCell>
                                                <TableCell>
                                                    <div className="font-medium">{r.entity.name}</div>
                                                    <div className="text-xs text-muted-foreground capitalize">{r.entity.type}</div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-24 h-2 bg-secondary rounded-full overflow-hidden">
                                                            <div
                                                                className="h-full bg-green-500"
                                                                style={{ width: `${r.score}%` }}
                                                            />
                                                        </div>
                                                        <span className="text-xs font-mono">{r.score.toFixed(0)}%</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex flex-wrap gap-1">
                                                        {r.matchDetails.slice(0, 2).map((reason, i) => (
                                                            <Badge key={i} variant="outline" className="text-[10px]">{reason}</Badge>
                                                        ))}
                                                        {r.matchDetails.length > 2 && <span className="text-xs text-muted-foreground">+{r.matchDetails.length - 2}</span>}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Button size="sm" variant="ghost">Compare <ArrowRight className="ml-2 h-4 w-4" /></Button>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
