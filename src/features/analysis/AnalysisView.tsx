import { useEffect, useState } from 'react';
import { useAppStore } from '@/lib/store';

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
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';

export function AnalysisView() {
    const {
        materials,
        requirementProfiles,
        properties,
        fetchMaterials,
        fetchRequirementProfiles,
        fetchProperties
    } = useAppStore();

    const [selectedMaterialId, setSelectedMaterialId] = useState<string>('');
    const [selectedProfileId, setSelectedProfileId] = useState<string>('');

    useEffect(() => {
        if (materials.length === 0) fetchMaterials();
        fetchRequirementProfiles();
        fetchProperties();
    }, [materials.length]);

    const selectedMaterial = materials.find(m => m.id === selectedMaterialId);
    const selectedProfile = requirementProfiles.find(p => p.id === selectedProfileId);

    // Get profiles to display: either manually selected or all assigned to material
    let displayProfiles: any[] = [];
    if (selectedProfile) {
        displayProfiles = [selectedProfile];
    } else if (selectedMaterial && selectedMaterial.assignedProfileIds && selectedMaterial.assignedProfileIds.length > 0) {
        displayProfiles = selectedMaterial.assignedProfileIds
            .map(id => requirementProfiles.find(p => p.id === id))
            .filter(Boolean);
    }

    // Calculate Additional Properties not in profiles
    const displayedPropNames = new Set<string>();
    displayProfiles.forEach((p: any) => {
        p.rules.forEach((r: any) => {
            const def = properties.find(def => def.id === r.propertyId);
            if (def) displayedPropNames.add(def.name);
        });
    });
    const extraProperties = selectedMaterial ? (selectedMaterial.properties || []).filter(p => !displayedPropNames.has(p.name)) : [];


    // Helper to get actual value (Real calculation from measurements)
    const getActualStats = (propId: string) => {
        if (!selectedMaterial || !selectedMaterial.measurements) return null;

        const measure = selectedMaterial.measurements.filter(m => m.propertyDefinitionId === propId);
        if (measure.length === 0) return null;

        // Calculate Average
        const sum = measure.reduce((acc, curr) => acc + curr.resultValue, 0);
        const avg = sum / measure.length;

        // Get unique labs
        const labs = Array.from(new Set(measure.map(m => m.laboratoryId).filter(Boolean)));

        return {
            average: avg,
            count: measure.length,
            labs: labs.join(", ")
        };
    };

    const analyzeStatus = (rule: any, actual: number | null) => {
        if (actual === null) return "missing";

        let passed = true;
        if (rule.min !== undefined && actual < rule.min) passed = false;
        if (rule.max !== undefined && actual > rule.max) passed = false;

        return passed ? "pass" : "fail";
    };

    return (
        <div className="p-8 space-y-8 animate-in fade-in duration-500">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">target / actual analysis</h1>
                <p className="text-muted-foreground">Compare material properties against specification profiles.</p>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
                <Card>
                    <CardHeader>
                        <CardTitle>Configuration</CardTitle>
                        <CardDescription>Select material. Associated standards will load automatically.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Material / Layup</label>
                            <Select value={selectedMaterialId} onValueChange={val => {
                                setSelectedMaterialId(val);
                                setSelectedProfileId(''); // Reset manual profile on material change
                            }}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select Material" />
                                </SelectTrigger>
                                <SelectContent>
                                    {materials.map(m => (
                                        <SelectItem key={m.id} value={m.id}>{m.name} ({m.type})</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <label className="text-sm font-medium">Requirement Profile (Optional Override)</label>
                                <ArrowRight className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <Select value={selectedProfileId} onValueChange={setSelectedProfileId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="View Specific Profile..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {requirementProfiles.map(p => (
                                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <p className="text-xs text-muted-foreground">
                                Leave empty to show all assigned standards.
                            </p>
                        </div>
                    </CardContent>
                </Card>

                {selectedMaterial && (
                    <Card className="border-primary/20 bg-primary/5">
                        <CardHeader>
                            <CardTitle>Analysis Overview</CardTitle>
                            <CardDescription>
                                <span className="font-semibold text-foreground">{selectedMaterial.name}</span>
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="text-center py-4">
                                <div className="text-4xl font-bold mb-2">
                                    {displayProfiles.length}
                                </div>
                                <div className="text-sm text-muted-foreground">Active Standards Analyzed</div>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>

            {selectedMaterial && displayProfiles.length > 0 && (
                <div className="space-y-8">
                    {displayProfiles.map((profile: any) => (
                        <Card key={profile.id}>
                            <CardHeader className="pb-2">
                                <div className="flex justify-between items-center">
                                    <div>
                                        <CardTitle>{profile.name}</CardTitle>
                                        <CardDescription>{profile.description}</CardDescription>
                                    </div>
                                    <Badge variant="outline">{profile.rules.length} Rules</Badge>
                                </div>
                            </CardHeader>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Property</TableHead>
                                        <TableHead>Requirement (Standard)</TableHead>
                                        <TableHead>Material Value</TableHead>
                                        <TableHead className="text-right">Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {profile.rules.map((rule: any, idx: number) => {
                                        const prop = properties.find(p => p.id === rule.propertyId);
                                        const stats = getActualStats(rule.propertyId);

                                        // Determine Actual Value: Measurement Avg > Manual Property
                                        let actual = stats ? stats.average : null;
                                        let source = stats ? 'measurement' : 'none';

                                        if (actual === null && prop) {
                                            // Check Manual Properties
                                            // 1. Try matching by requirementProfileId + Name (strict)
                                            let matProp = selectedMaterial.properties?.find(p =>
                                                p.name === prop.name && p.requirementProfileId === profile.id
                                            );
                                            // 2. Fallback to just Name (generic)
                                            if (!matProp) {
                                                matProp = selectedMaterial.properties?.find(p => p.name === prop.name);
                                            }

                                            if (matProp) {
                                                const val = typeof matProp.value === 'number' ? matProp.value : parseFloat(matProp.value);
                                                if (!isNaN(val)) {
                                                    actual = val;
                                                    source = 'property';
                                                }
                                            }
                                        }

                                        const status = analyzeStatus(rule, actual);

                                        return (
                                            <TableRow key={idx}>
                                                <TableCell className="font-medium">
                                                    <div>{prop?.name || 'Unknown'} <span className="text-muted-foreground text-xs">({prop?.unit})</span></div>
                                                    <div className="text-xs text-muted-foreground">Method: {prop?.testMethods?.join(', ') || 'N/A'}</div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex flex-col text-sm">
                                                        {rule.min !== undefined && <span>Min: {rule.min}</span>}
                                                        {rule.max !== undefined && <span>Max: {rule.max}</span>}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div>{actual !== null ? actual.toFixed(2) : <span className="text-muted-foreground italic">No Data</span>}</div>
                                                    {source === 'measurement' && stats && <div className="text-xs text-muted-foreground">Lab: {stats.labs} (n={stats.count})</div>}
                                                    {source === 'property' && <div className="text-xs text-muted-foreground">Manual Property</div>}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    {status === "pass" && <Badge className="bg-emerald-600 hover:bg-emerald-700">Pass <CheckCircle2 className="ml-1 h-3 w-3" /></Badge>}
                                                    {status === "fail" && <Badge className="bg-rose-600 hover:bg-rose-700">Fail <AlertCircle className="ml-1 h-3 w-3" /></Badge>}
                                                    {status === "missing" && <Badge variant="outline">Missing Data</Badge>}
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </Card>
                    ))}
                </div>
            )}

            {selectedMaterial && extraProperties.length > 0 && (
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle>Additional Properties</CardTitle>
                        <CardDescription>Properties defined on the material but not part of the active standards.</CardDescription>
                    </CardHeader>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Property</TableHead>
                                <TableHead>Value</TableHead>
                                <TableHead>Unit</TableHead>
                                <TableHead>Context / Spec</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {extraProperties.map((p, idx) => (
                                <TableRow key={p.id || idx}>
                                    <TableCell className="font-medium">{p.name}</TableCell>
                                    <TableCell>{p.value}</TableCell>
                                    <TableCell className="text-muted-foreground text-sm">{p.unit}</TableCell>
                                    <TableCell className="text-muted-foreground text-sm">{p.specification || '-'}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </Card>
            )}

            {selectedMaterial && displayProfiles.length === 0 && extraProperties.length === 0 && (
                <div className="text-center py-12 border rounded-lg bg-muted/10">
                    <p className="text-muted-foreground">No data found for this material. Assign standards or add properties in the Material Detail view.</p>
                </div>
            )}
        </div>
    );
}
