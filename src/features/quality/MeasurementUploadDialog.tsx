import { useState, useEffect } from "react";
import { useAppStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Plus } from "lucide-react";
import type { Measurement } from "@/types/domain";

interface MeasurementUploadDialogProps {
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    parentId?: string;
    parentType?: 'material' | 'layup' | 'assembly';
}

export function MeasurementUploadDialog({ open, onOpenChange, parentId, parentType = 'material' }: MeasurementUploadDialogProps) {
    const { addMeasurement, uploadFile, materials, properties, laboratories, fetchLaboratories, fetchMaterials, fetchProperties } = useAppStore();
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
        assemblyId: (parentType === 'assembly' && parentId) ? parentId : undefined,
        propertyId: "",
        value: "",
        unit: "",
        laboratory: "",
        reliability: "engineering",
        valueType: "single",
        testMethod: "",
        date: new Date().toISOString().split('T')[0],
        orderNumber: "",
        comment: "",
        // Files
        certificateFile: null as File | null,
        specimenDocFile: null as File | null
    });

    const [sampleCount, setSampleCount] = useState<string>("5");
    const [rawValues, setRawValues] = useState<string[]>(Array(5).fill(""));
    const [stats, setStats] = useState<any>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

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
                if (mode === 'manual') {
                    setFormData(prev => ({ ...prev, value: res.mean.toFixed(2) }));
                }
            });
        }
    }, [rawValues, mode]);

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

    const handleSubmit = async () => {
        if (!formData.propertyId) return;
        setIsSubmitting(true);

        try {
            const numbers = rawValues.map(v => parseFloat(v)).filter(n => !isNaN(n));
            const finalValue = mode === 'manual' ? (stats?.mean || parseFloat(formData.value)) : parseFloat(formData.value);

            // Upload Files
            const attachments: any[] = [];
            // We'll store simple metadata: { name, url, category, uploadedAt }

            if (formData.certificateFile) {
                const url = await uploadFile(formData.certificateFile, 'measurement-attachments');
                attachments.push({
                    id: Math.random().toString(36).substring(7),
                    name: formData.certificateFile.name,
                    url,
                    category: "Test Certificate",
                    uploadedAt: new Date().toISOString()
                });
            }

            if (formData.specimenDocFile) {
                const url = await uploadFile(formData.specimenDocFile, 'measurement-attachments');
                attachments.push({
                    id: Math.random().toString(36).substring(7),
                    name: formData.specimenDocFile.name,
                    url,
                    category: "Specimen Documentation",
                    uploadedAt: new Date().toISOString()
                });
            }

            const newMeasurement: Omit<Measurement, 'id' | 'createdAt'> = {
                materialId: formData.materialId === "unlinked" ? undefined : formData.materialId,
                layupId: formData.layupId,
                assemblyId: formData.assemblyId,
                propertyDefinitionId: formData.propertyId,

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
                // Legacy fields 
                sourceFilename: formData.certificateFile?.name || (mode === 'upload' ? "Upload" : ""),
                sourceRef: attachments.find(a => a.category === "Test Certificate")?.url,

                reliability: formData.reliability as any,
                testMethod: formData.testMethod,

                comment: formData.comment,
                attachments: attachments,

                orderNumber: formData.orderNumber || "Pending",
                processParams: {}
            } as any;

            await addMeasurement(newMeasurement);

            setIsOpen(false);
            // Reset
            setFormData({
                materialId: (parentType === 'material' && parentId) ? parentId : "unlinked",
                layupId: (parentType === 'layup' && parentId) ? parentId : undefined,
                assemblyId: (parentType === 'assembly' && parentId) ? parentId : undefined,
                propertyId: "",
                value: "",
                unit: "",
                laboratory: "",
                reliability: "engineering",
                valueType: "single",
                testMethod: "",
                date: new Date().toISOString().split('T')[0],
                orderNumber: "",
                comment: "",
                certificateFile: null,
                specimenDocFile: null
            });
            setRawValues(Array(5).fill(""));
            setStats(null);

        } catch (e) {
            console.error("Failed to upload measurement", e);
        } finally {
            setIsSubmitting(false);
        }
    };



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

                <div className="grid gap-6 py-4">
                    {/* Common Header Information */}
                    <div className="bg-muted/30 p-4 rounded-md border grid gap-4">
                        <h4 className="font-semibold text-sm">Test Configuration</h4>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Material Context</Label>
                                {parentType === 'layup' || parentType === 'assembly' ? (
                                    <Input value={parentType === 'layup' ? "Current Layup" : "Current Assembly"} disabled />
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

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Order Number</Label>
                                <Input
                                    value={formData.orderNumber}
                                    onChange={e => setFormData({ ...formData, orderNumber: e.target.value })}
                                    placeholder="e.g. WO-2024-001"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Test Date</Label>
                                <Input
                                    type="date"
                                    value={formData.date}
                                    onChange={e => setFormData({ ...formData, date: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>

                    <Tabs value={mode} onValueChange={(v) => setMode(v as any)} className="w-full">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="manual">Manual Entry (Detailed)</TabsTrigger>
                            <TabsTrigger value="upload">Quick Results</TabsTrigger>
                        </TabsList>

                        <div className="py-4">
                            {mode === "manual" && (
                                <div className="grid grid-cols-3 gap-6">
                                    <div className="col-span-1 space-y-4">
                                        <div className="space-y-2">
                                            <Label>Sample Count (n)</Label>
                                            <Input type="number" value={sampleCount} onChange={e => setSampleCount(e.target.value)} min="1" max="100" />
                                        </div>
                                        <Label>Raw Values</Label>
                                        <div className="grid gap-2 max-h-[250px] overflow-y-auto pr-2 border rounded-md p-2">
                                            {rawValues.map((val, idx) => (
                                                <div key={idx} className="flex items-center space-x-2">
                                                    <span className="text-xs text-muted-foreground w-6 text-right">{idx + 1}.</span>
                                                    <Input type="number" value={val} onChange={e => handleValueChange(idx, e.target.value)} placeholder="0.00" className="h-8" />
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="col-span-2 space-y-4">
                                        <Label>Statistical Analysis</Label>
                                        <div className="bg-slate-50 border rounded-md p-4 space-y-4">
                                            {!stats ? (
                                                <div className="text-muted-foreground text-sm italic">Enter values to see statistics.</div>
                                            ) : (
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <div className="text-sm text-muted-foreground">Mean</div>
                                                        <div className="text-2xl font-bold">{stats.mean.toFixed(2)} <span className="text-sm font-normal text-muted-foreground">{formData.unit}</span></div>
                                                    </div>
                                                    <div>
                                                        <div className="text-sm text-muted-foreground">Std Dev</div>
                                                        <div className="text-lg font-medium">{stats.stdDev.toFixed(2)}</div>
                                                    </div>
                                                    {/* Additional stats... */}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {mode === "upload" && (
                                <div className="space-y-4">
                                    <Label>Report Result Value (Mean)</Label>
                                    <Input type="number" value={formData.value} onChange={e => setFormData({ ...formData, value: e.target.value })} placeholder="Value from report" />
                                </div>
                            )}
                        </div>
                    </Tabs>

                    {/* Attachments & Comments */}
                    <div className="space-y-4 border-t pt-4">
                        <Label>Comments & Documentation</Label>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-xs text-muted-foreground">Test Certificate / Report</Label>
                                <div className="flex items-center gap-2">
                                    <Input type="file" onChange={e => setFormData({ ...formData, certificateFile: e.target.files?.[0] || null })} accept=".pdf,.xlsx,.csv" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs text-muted-foreground">Specimen Documentation</Label>
                                <div className="flex items-center gap-2">
                                    <Input type="file" onChange={e => setFormData({ ...formData, specimenDocFile: e.target.files?.[0] || null })} accept=".pdf,.png,.jpg,.jpeg" />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Comment</Label>
                            <Textarea
                                value={formData.comment}
                                onChange={e => setFormData({ ...formData, comment: e.target.value })}
                                placeholder="Add any observations, failure modes, or deviations..."
                                className="h-20"
                            />
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
                    <Button onClick={handleSubmit} disabled={isSubmitting}>
                        {isSubmitting ? "Saving..." : "Save Measurement"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog >
    );
}
