import { useState, useEffect } from "react";
import { useAppStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Upload, Plus } from "lucide-react";
import type { Measurement } from "@/types/domain";

interface MeasurementUploadDialogProps {
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    parentId?: string;
    parentType?: 'material' | 'layup';
}

export function MeasurementUploadDialog({ open, onOpenChange, parentId, parentType = 'material' }: MeasurementUploadDialogProps) {
    const { addMeasurement, materials, properties, laboratories, fetchLaboratories, fetchMaterials, fetchProperties } = useAppStore();
    const [internalOpen, setInternalOpen] = useState(false);

    // Controlled or Uncontrolled
    const isOpen = open !== undefined ? open : internalOpen;
    const setIsOpen = onOpenChange || setInternalOpen;

    useEffect(() => {
        if (isOpen) {
            fetchMaterials();
            fetchProperties();
            fetchLaboratories();
        }
    }, [isOpen, fetchMaterials, fetchProperties, fetchLaboratories]);

    const [mode, setMode] = useState<"manual" | "upload">("manual");
    const [formData, setFormData] = useState({
        materialId: (parentType === 'material' && parentId) ? parentId : "unlinked",
        layupId: (parentType === 'layup' && parentId) ? parentId : undefined,
        propertyId: "",
        value: "",
        unit: "",
        laboratory: "",
        reliability: "engineering",
        valueType: "single",
        testMethod: "",
        date: new Date().toISOString().split('T')[0],
        sourceFile: null as File | null,
        sourceFilename: "",
        orderNumber: ""
    });

    const [sampleCount, setSampleCount] = useState<string>("5");
    const [rawValues, setRawValues] = useState<string[]>(Array(5).fill(""));
    const [stats, setStats] = useState<any>(null);

    // Update rawValues array size when sampleCount changes
    useEffect(() => {
        const count = parseInt(sampleCount);
        if (!isNaN(count) && count > 0) {
            setRawValues(prev => {
                const newArr = [...prev];
                if (count > prev.length) {
                    // pad
                    return [...newArr, ...Array(count - prev.length).fill("")];
                } else {
                    // trim
                    return newArr.slice(0, count);
                }
            });
        }
    }, [sampleCount]);

    // Calculate Stats
    useEffect(() => {
        const numbers = rawValues.map(v => parseFloat(v)).filter(n => !isNaN(n));
        if (numbers.length > 0) {
            import('@/lib/aerostats').then(({ calculateStats }) => {
                const res = calculateStats(numbers);
                setStats(res);
                setFormData(prev => ({ ...prev, value: res.mean.toFixed(2) }));
            });
        }
    }, [rawValues]);

    const handleValueChange = (index: number, val: string) => {
        const newValues = [...rawValues];
        newValues[index] = val;
        setRawValues(newValues);
    };

    const handlePropertyChange = (propId: string) => {
        const prop = properties.find(p => p.id === propId);
        setFormData({
            ...formData,
            propertyId: propId,
            unit: prop?.unit || "",
            testMethod: prop?.testMethods?.[0] || ""
        });
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setFormData({
                ...formData,
                sourceFile: file,
                sourceFilename: file.name
            });
        }
    };

    const handleSubmit = async () => {
        if (!formData.propertyId) return;

        const numbers = rawValues.map(v => parseFloat(v)).filter(n => !isNaN(n));
        // Use calculated stats or manual single value if mode is upload/single?
        // Prioritize calculated stats for manual mode

        const finalValue = mode === 'manual' ? (stats?.mean || parseFloat(formData.value)) : parseFloat(formData.value);

        const newMeasurement: Omit<Measurement, 'id' | 'createdAt'> = {
            materialId: formData.materialId === "unlinked" ? undefined : formData.materialId,
            layupId: formData.layupId,
            propertyDefinitionId: formData.propertyId,

            // New Fields
            values: mode === 'manual' ? numbers : [],
            resultValue: finalValue,
            statistics: (mode === 'manual' && stats) ? {
                ...stats,
                bValue: stats.bBasis,
                aValue: stats.aBasis
            } : undefined,

            unit: formData.unit,
            laboratoryId: formData.laboratory || "In-House",
            date: formData.date,
            sourceType: mode === "upload" ? "pdf" : "manual",
            sourceFilename: formData.sourceFilename,
            sourceRef: mode === "upload" && formData.sourceFile ? URL.createObjectURL(formData.sourceFile) : undefined, // Mock URL

            reliability: formData.reliability as any,
            testMethod: formData.testMethod,
            orderNumber: formData.orderNumber || "Pending",
            processParams: {}
        };

        await addMeasurement(newMeasurement);
        setIsOpen(false);
        setFormData({ ...formData, value: "", sourceFile: null, sourceFilename: "", orderNumber: "" });
        setRawValues(Array(5).fill(""));
        setStats(null);
    };

    // Helper to get stats config
    const selectedProp = properties.find(p => p.id === formData.propertyId);

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                {!open && (
                    <Button>
                        <Plus className="mr-2 h-4 w-4" /> Add Measurement
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Add Measurement</DialogTitle>
                    <DialogDescription>
                        Enter test results manually or upload a report.
                    </DialogDescription>
                </DialogHeader>

                <Tabs value={mode} onValueChange={(v) => setMode(v as any)} className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="manual">Manual Entry (Detailed)</TabsTrigger>
                        <TabsTrigger value="upload">Upload / Quick Entry</TabsTrigger>
                    </TabsList>

                    <div className="grid gap-6 py-4">
                        {/* 1. Header Information */}
                        <div className="bg-muted/30 p-4 rounded-md border grid gap-4">
                            <h4 className="font-semibold text-sm">Test Configuration</h4>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Material Context</Label>
                                    {parentType === 'layup' ? (
                                        <Input value="Current Layup" disabled />
                                    ) : (
                                        <Select
                                            value={formData.materialId}
                                            onValueChange={(v) => setFormData({ ...formData, materialId: v })}
                                            disabled={!!parentId}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select Material..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="unlinked" className="text-muted-foreground">-- Unlinked (General Test) --</SelectItem>
                                                {materials.map(m => (
                                                    <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <Label>Laboratory</Label>
                                    <Select value={formData.laboratory} onValueChange={v => setFormData({ ...formData, laboratory: v })}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select Lab..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {laboratories.map(l => (
                                                <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                                            ))}
                                            <SelectItem value="In-House">In-House</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Property</Label>
                                    <Select value={formData.propertyId} onValueChange={handlePropertyChange}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select Property..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {properties.map(p => (
                                                <SelectItem key={p.id} value={p.id}>{p.name} ({p.unit})</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Test Method</Label>
                                    <Input
                                        value={formData.testMethod}
                                        onChange={e => setFormData({ ...formData, testMethod: e.target.value })}
                                        placeholder="e.g. ISO 527"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Order Number</Label>
                                <Input
                                    value={formData.orderNumber}
                                    onChange={e => setFormData({ ...formData, orderNumber: e.target.value })}
                                    placeholder="e.g. WO-2024-001"
                                />
                            </div>
                        </div>
                        {/* 2. Manual Data Entry */}
                        {mode === "manual" && (
                            <div className="grid grid-cols-3 gap-6">
                                <div className="col-span-1 space-y-4">
                                    <div className="space-y-2">
                                        <Label>Sample Count (n)</Label>
                                        <Input
                                            type="number"
                                            value={sampleCount}
                                            onChange={e => setSampleCount(e.target.value)}
                                            min="1"
                                            max="100"
                                        />
                                    </div>
                                    <Label>Raw Values</Label>
                                    <div className="grid gap-2 max-h-[300px] overflow-y-auto pr-2 border rounded-md p-2">
                                        {rawValues.map((val, idx) => (
                                            <div key={idx} className="flex items-center space-x-2">
                                                <span className="text-xs text-muted-foreground w-6 text-right">{idx + 1}.</span>
                                                <Input
                                                    type="number"
                                                    value={val}
                                                    onChange={e => handleValueChange(idx, e.target.value)}
                                                    placeholder="0.00"
                                                    className="h-8"
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="col-span-2 space-y-4">
                                    <Label>Statistical Analysis (Live)</Label>
                                    <div className="bg-slate-50 border rounded-md p-4 space-y-4">
                                        {!stats ? (
                                            <div className="text-muted-foreground text-sm italic">Enter values to see statistics.</div>
                                        ) : (
                                            <>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <div className="text-sm text-muted-foreground">Mean</div>
                                                        <div className="text-2xl font-bold">{stats.mean.toFixed(2)} <span className="text-sm font-normal text-muted-foreground">{formData.unit}</span></div>
                                                    </div>
                                                    <div>
                                                        <div className="text-sm text-muted-foreground">Std Dev</div>
                                                        <div className="text-lg font-medium">{stats.stdDev.toFixed(2)}</div>
                                                    </div>
                                                </div>

                                                <div className="border-t pt-2 mt-2">
                                                    <div className="text-xs font-semibold uppercase text-muted-foreground mb-2">Design Values (per Config)</div>
                                                    <div className="grid grid-cols-2 gap-2">
                                                        {(!selectedProp?.statsConfig || selectedProp.statsConfig.calculateBasic) && (
                                                            <div className="flex justify-between text-sm">
                                                                <span>Min / Max:</span>
                                                                <span className="font-mono">{stats.min} / {stats.max}</span>
                                                            </div>
                                                        )}
                                                        {selectedProp?.statsConfig?.calculateBBasis && (
                                                            <div className="flex justify-between text-sm bg-blue-50 p-1 rounded px-2">
                                                                <span className="font-medium text-blue-700">B-Basis:</span>
                                                                <span className="font-bold text-blue-700">{stats.bBasis ? stats.bBasis.toFixed(2) : 'N/A'}</span>
                                                            </div>
                                                        )}
                                                        {selectedProp?.statsConfig?.calculateABasis && (
                                                            <div className="flex justify-between text-sm bg-purple-50 p-1 rounded px-2">
                                                                <span className="font-medium text-purple-700">A-Basis:</span>
                                                                <span className="font-bold text-purple-700">{stats.aBasis ? stats.aBasis.toFixed(2) : 'N/A'}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                {stats.warnings.length > 0 && (
                                                    <div className="mt-2 bg-yellow-50 text-yellow-800 text-xs p-2 rounded border border-yellow-200">
                                                        <ul className="list-disc pl-4">
                                                            {stats.warnings.map((w: string, i: number) => <li key={i}>{w}</li>)}
                                                        </ul>
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {mode === "upload" && (
                            <div className="space-y-4">
                                <Label>Report Summary Value</Label>
                                <Input
                                    type="number"
                                    value={formData.value}
                                    onChange={e => setFormData({ ...formData, value: e.target.value })}
                                    placeholder="Value from report"
                                />
                                <TabsContent value="upload" className="mt-0 space-y-2">
                                    <div className="border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center text-center hover:bg-muted/50 transition-colors cursor-pointer relative">
                                        <input
                                            type="file"
                                            className="absolute inset-0 opacity-0 cursor-pointer"
                                            onChange={handleFileChange}
                                            accept=".pdf,.csv,.xlsx"
                                        />
                                        <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                                        <p className="text-sm font-medium">
                                            {formData.sourceFilename || "Click to upload report (PDF/Excel)"}
                                        </p>
                                    </div>
                                </TabsContent>
                            </div>
                        )}
                    </div>
                </Tabs>

                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
                    <Button onClick={handleSubmit}>Save Record</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog >
    );
}
