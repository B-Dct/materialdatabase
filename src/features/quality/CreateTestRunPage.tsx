import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAppStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Save, Calculator, Plus, X, Check, ChevronsUpDown, FileText } from "lucide-react";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import type { TestMethodPropertyConfig, MaterialDocument } from "@/types/domain";

// Simplified K-Factor Lookup (One-Sided Tolerance Limit Factors)
// 95% Confidence.
const K_FACTORS: Record<number, { kA: number, kB: number }> = {
    2: { kA: 37.0, kB: 37.0 },
    3: { kA: 11.2, kB: 8.8 },
    4: { kA: 7.2, kB: 6.2 },
    5: { kA: 5.74, kB: 4.61 },
    6: { kA: 4.97, kB: 4.01 },
    7: { kA: 4.5, kB: 3.65 },
    8: { kA: 4.2, kB: 3.4 },
    9: { kA: 4.0, kB: 3.2 },
    10: { kA: 3.83, kB: 3.09 }
};
const getKFactors = (n: number) => {
    if (n < 3) return { kA: 0, kB: 0 };
    if (n in K_FACTORS) return K_FACTORS[n];
    return { kA: 3.0, kB: 2.5 };
};

export function CreateTestRunPage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    // Context from URL
    const urlMaterialId = searchParams.get("materialId");
    const urlLayupId = searchParams.get("layupId");
    const urlAssemblyId = searchParams.get("assemblyId");
    const urlRequestId = searchParams.get("requestId");

    // Store
    const {
        properties, fetchProperties, addMeasurement, uploadFile,
        testMethods, fetchTestMethods,
        materials, fetchMaterials,
        layups, fetchLayups,
        assemblies, fetchAssemblies,
        laboratories, fetchLaboratories,
        testRequests, fetchTestRequests, updateTestRequest
    } = useAppStore();

    // Metadata State
    const [labId, setLabId] = useState("");
    const [testDate, setTestDate] = useState(new Date().toISOString().split('T')[0]);
    const [orderNumber, setOrderNumber] = useState("");
    const [referenceNumber, setReferenceNumber] = useState("");
    const [testType, setTestType] = useState<"engineering" | "qualification" | "">("");
    const [comment, setComment] = useState("");

    // Global Entity State
    const [entityType, setEntityType] = useState<"material" | "layup" | "assembly">("material");
    const [entityId, setEntityId] = useState<string>("");

    // Files State
    const [files, setFiles] = useState<{ file: File; category: string }[]>([]);
    const [uploading, setUploading] = useState(false);

    // Method / Matrix State
    const [selectedMethodId, setSelectedMethodId] = useState<string>("");
    const [specimenCount, setSpecimenCount] = useState(5);
    const [targetProperties, setTargetProperties] = useState<TestMethodPropertyConfig[]>([]);
    const [matrixData, setMatrixData] = useState<Record<string, Record<number, string>>>({});
    const [contextData, setContextData] = useState<Record<string, { referenceLayupId?: string }>>({});
    const [openPropSelect, setOpenPropSelect] = useState(false);

    // Initial Load
    useEffect(() => {
        fetchProperties();
        fetchTestMethods();
        fetchLaboratories();
        fetchMaterials();
        fetchLayups();
        fetchAssemblies();
        if (testRequests.length === 0) fetchTestRequests();

        if (urlMaterialId) { setEntityType("material"); setEntityId(urlMaterialId); }
        else if (urlLayupId) { setEntityType("layup"); setEntityId(urlLayupId); }
        else if (urlAssemblyId) { setEntityType("assembly"); setEntityId(urlAssemblyId); }

    }, [urlMaterialId, urlLayupId, urlAssemblyId, fetchTestRequests, testRequests.length]);

    // Pre-fill from Request
    useEffect(() => {
        if (urlRequestId && testRequests.length > 0 && materials.length > 0 && layups.length > 0 && assemblies.length > 0 && testMethods.length > 0 && properties.length > 0) {
            const req = testRequests.find(r => r.id === urlRequestId);
            if (req) {
                setEntityType(req.entityType as any);
                setEntityId(req.entityId);
                if (req.orderNumber) setOrderNumber(req.orderNumber);
                if (req.variantDescription) setReferenceNumber(req.variantDescription);
                setSpecimenCount(req.numSpecimens);

                // Set Test Method
                setSelectedMethodId(req.testMethodId);

                // Add exact property column
                setTargetProperties([{ propertyId: req.propertyId, statsTypes: ['mean', 'range'] }]);
            }
        }
    }, [urlRequestId, testRequests, materials, layups, assemblies, testMethods, properties]);

    const getEntityName = () => {
        if (!entityId) return null;
        if (entityType === "material") return materials.find(m => m.id === entityId)?.name;
        if (entityType === "layup") return layups.find(l => l.id === entityId)?.name;
        if (entityType === "assembly") return assemblies.find(a => a.id === entityId)?.name;
        return "Unknown";
    };

    const handleMethodChange = (methodId: string) => {
        setSelectedMethodId(methodId);
        const method = testMethods.find(m => m.id === methodId);
        if (method) {
            if (method.properties && method.properties.length > 0) {
                setTargetProperties([...method.properties]);
            } else if ((method as any).propertyIds) {
                const legacyIds: string[] = (method as any).propertyIds;
                setTargetProperties(legacyIds.map(id => ({ propertyId: id, statsTypes: ['mean', 'range'] })));
            } else {
                setTargetProperties([]);
            }
            setMatrixData({});
        } else {
            setTargetProperties([]);
        }
    };

    const addColumn = (propId: string) => {
        if (!targetProperties.some(p => p.propertyId === propId)) {
            setTargetProperties([...targetProperties, { propertyId: propId, statsTypes: ['mean', 'range'] }]);
            // Init context if needed check scope?
        }
        setOpenPropSelect(false);
    };

    const removeColumn = (propId: string) => {
        setTargetProperties(targetProperties.filter(p => p.propertyId !== propId));
        const newData = { ...matrixData };
        delete newData[propId];
        setMatrixData(newData);

        const newContext = { ...contextData };
        delete newContext[propId];
        setContextData(newContext);
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, category: string) => {
        if (e.target.files && e.target.files[0]) {
            setFiles([...files, { file: e.target.files[0], category }]);
        }
        // Reset input
        e.target.value = '';
    };

    const removeFile = (index: number) => {
        setFiles(files.filter((_, i) => i !== index));
    };

    const getStats = (config: TestMethodPropertyConfig) => {
        const propId = config.propertyId;
        const values = Object.values(matrixData[propId] || {})
            .map(v => parseFloat(v.replace(/,/g, '.')))
            .filter(v => !isNaN(v));

        if (values.length === 0) return { mean: "-", min: "-", max: "-", bValue: "-", aValue: "-" };

        const min = Math.min(...values);
        const max = Math.max(...values);
        const sum = values.reduce((a, b) => a + b, 0);
        const mean = sum / values.length;

        let bValDisplay = "-";
        let aValDisplay = "-";

        if ((config.statsTypes?.includes('design') || (config as any).statsType === 'design_values') && values.length >= 3) {
            const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (values.length - 1);
            const stdDev = Math.sqrt(variance);
            const { kA, kB } = getKFactors(values.length);

            if (kA > 0) {
                const bVal = mean - (kB * stdDev);
                const aVal = mean - (kA * stdDev);
                bValDisplay = bVal.toFixed(2);
                aValDisplay = aVal.toFixed(2);
            }
        }

        return {
            mean: mean.toFixed(2),
            min: min.toFixed(2),
            max: max.toFixed(2),
            bValue: bValDisplay,
            aValue: aValDisplay,
            n: values.length,
            stdDev: values.length > 1 ? Math.sqrt(values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (values.length - 1)).toFixed(2) : "-"
        };
    };

    const referenceLayups = layups.filter(l =>
        l.isReference &&
        (entityType === 'material' ? l.materialId === entityId : true)
    );

    const handleSave = async () => {
        if (!entityId) {
            alert("Please select an Entity first.");
            return;
        }
        if (targetProperties.length === 0) {
            alert("No properties to save.");
            return;
        }
        // Validation
        if (!labId) { alert("Validation Error: Please select a Laboratory."); return; }
        if (!orderNumber.trim()) { alert("Validation Error: Order Number is required."); return; }
        if (!referenceNumber.trim()) { alert("Validation Error: Reference Number is required."); return; }
        if (!testType) { alert("Validation Error: Please select a Test Type."); return; }

        setUploading(true);
        try {
            // 1. Upload Files
            const uploadedAttachments: MaterialDocument[] = [];
            for (const f of files) {
                const path = `measurements/${Date.now()}-${f.file.name}`;
                const url = await uploadFile(f.file, 'documents', path);
                uploadedAttachments.push({
                    id: Math.random().toString(36).substring(7),
                    name: f.file.name,
                    url,
                    category: f.category,
                    uploadedAt: new Date().toISOString()
                });
            }

            const methodName = testMethods.find(m => m.id === selectedMethodId)?.name;
            let successCount = 0;

            for (const config of targetProperties) {
                const propId = config.propertyId;
                const rawValues = Object.values(matrixData[propId] || {})
                    .map(v => parseFloat(v.replace(/,/g, '.')))
                    .filter(v => !isNaN(v));

                if (rawValues.length === 0) continue;

                const property = properties.find(p => p.id === propId);

                // Determine Reference Layup ID
                // If entityType is 'layup', the Layup itself is the reference.
                const effectiveRefLayupId = entityType === 'layup' ? entityId : contextData[propId]?.referenceLayupId;

                // Validate Reference Layup
                if (property?.scope === 'layup' && !effectiveRefLayupId) {
                    alert(`Validation Error: Property '${property.name}' requires a Reference Layup.`);
                    setUploading(false);
                    return;
                }

                const min = Math.min(...rawValues);
                const max = Math.max(...rawValues);
                const sum = rawValues.reduce((a, b) => a + b, 0);
                const mean = sum / rawValues.length;
                const n = rawValues.length;

                // Full Stats Calculation
                let stdDev = 0;
                let bValue: number | undefined = undefined;
                let aValue: number | undefined = undefined;
                let cv = 0;

                if (n > 1) {
                    const variance = rawValues.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (n - 1);
                    stdDev = Math.sqrt(variance);
                    cv = (stdDev / mean) * 100;

                    if ((config.statsTypes?.includes('design') || (config as any).statsType === 'design_values') && n >= 3) {
                        const { kA, kB } = getKFactors(n);
                        if (kB > 0) bValue = mean - (kB * stdDev);
                        if (kA > 0) aValue = mean - (kA * stdDev);
                    }
                }



                await addMeasurement({
                    materialId: entityType === 'material' ? entityId : undefined,
                    layupId: entityType === 'layup' ? entityId : undefined,
                    assemblyId: entityType === 'assembly' ? entityId : undefined,

                    propertyDefinitionId: propId,
                    resultValue: Number(mean.toFixed(4)),
                    unit: property?.unit || "",
                    values: rawValues,
                    statistics: {
                        mean,
                        min,
                        max,
                        n,
                        stdDev,
                        cv,
                        bValue,
                        aValue,
                        kFactor: (config.statsTypes?.includes('design') || (config as any).statsType === 'design_values') ? getKFactors(n).kB : undefined
                    },

                    date: new Date(testDate).toISOString(),
                    laboratoryId: labId || undefined,
                    orderNumber: orderNumber || "N/A",
                    referenceNumber: referenceNumber || undefined,
                    reliability: testType === 'qualification' ? 'allowable' : 'engineering',

                    comment: comment || undefined,
                    attachments: uploadedAttachments,

                    sourceType: 'manual',
                    testMethod: methodName,
                    processParams: { specimenCount },
                    referenceLayupId: effectiveRefLayupId
                });
                successCount++;
            }

            if (successCount > 0) {
                if (urlRequestId) {
                    await updateTestRequest(urlRequestId, { status: 'completed' });
                    navigate('/quality/requests');
                } else {
                    navigate(-1);
                }
            } else {
                alert("No valid data entered.");
            }
        } catch (e) {
            console.error(e);
            alert("Error saving data.");
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="p-8 max-w-[1600px] mx-auto space-y-8 pb-32">
            {/* Header */}
            <div className="flex items-center gap-4 border-b pb-6">
                <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Enter Measurement Data</h1>
                    <p className="text-muted-foreground">
                        {getEntityName() ? (
                            <>Recording results for <span className="font-semibold text-foreground">{getEntityName()}</span></>
                        ) : (
                            "Select a target entity and configure the test run."
                        )}
                    </p>
                </div>
                <div className="ml-auto flex gap-2">
                    <Button size="lg" onClick={handleSave} disabled={targetProperties.length === 0 || !entityId || uploading}>
                        {uploading ? (
                            <>Saving...</>
                        ) : (
                            <><Save className="mr-2 h-4 w-4" /> Save All</>
                        )}
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                {/* Left: Configuration */}
                <div className="xl:col-span-2 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Test Configuration</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* 1. Entity Context */}
                                <div className="space-y-2">
                                    <Label>Target Entity</Label>
                                    {(urlMaterialId || urlLayupId || urlAssemblyId) ? (
                                        <Input value={getEntityName() || "Loading..."} disabled className="bg-muted font-medium" />
                                    ) : (
                                        <div className="flex gap-2">
                                            <Select value={entityType} onValueChange={(v: any) => { setEntityType(v); setEntityId(""); }}>
                                                <SelectTrigger className="w-[100px]"><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="material">Material</SelectItem>
                                                    <SelectItem value="layup">Layup</SelectItem>
                                                    <SelectItem value="assembly">Assembly</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <Popover>
                                                <PopoverTrigger asChild>
                                                    <Button variant="outline" role="combobox" className="flex-1 justify-between">
                                                        <span className="truncate">{getEntityName() || "Select..."}</span>
                                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                    </Button>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-[300px] p-0">
                                                    <Command>
                                                        <CommandInput placeholder={`Search ${entityType}...`} />
                                                        <CommandList>
                                                            <CommandEmpty>No results found.</CommandEmpty>
                                                            <CommandGroup>
                                                                {(entityType === 'material' ? materials : entityType === 'layup' ? layups : assemblies).map(item => (
                                                                    <CommandItem key={item.id} value={item.name} onSelect={() => setEntityId(item.id)}>
                                                                        <Check className={cn("mr-2 h-4 w-4", entityId === item.id ? "opacity-100" : "opacity-0")} />
                                                                        {item.name}
                                                                    </CommandItem>
                                                                ))}
                                                            </CommandGroup>
                                                        </CommandList>
                                                    </Command>
                                                </PopoverContent>
                                            </Popover>
                                        </div>
                                    )}
                                </div>

                                {/* 2. Order Info */}
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="space-y-2">
                                        <Label className="after:content-['*'] after:ml-0.5 after:text-red-500">Order Number</Label>
                                        <Input placeholder="e.g. WO-2024-XXX" value={orderNumber} onChange={e => setOrderNumber(e.target.value)} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="after:content-['*'] after:ml-0.5 after:text-red-500">Reference</Label>
                                        <Input placeholder="e.g. Batch/Coupon" value={referenceNumber} onChange={e => setReferenceNumber(e.target.value)} />
                                    </div>
                                </div>

                                {/* 3. Lab, Date, Type */}
                                <div className="grid grid-cols-3 gap-2 col-span-2 md:col-span-1">
                                    <div className="space-y-2">
                                        <Label className="after:content-['*'] after:ml-0.5 after:text-red-500">Laboratory</Label>
                                        <Select value={labId} onValueChange={setLabId}>
                                            <SelectTrigger><SelectValue placeholder="Select Lab" /></SelectTrigger>
                                            <SelectContent>
                                                {laboratories.map(l => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Date</Label>
                                        <Input type="date" value={testDate} onChange={e => setTestDate(e.target.value)} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="after:content-['*'] after:ml-0.5 after:text-red-500">Type</Label>
                                        <Select value={testType} onValueChange={(v: any) => setTestType(v)}>
                                            <SelectTrigger><SelectValue placeholder="Select Type..." /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="engineering">Engineering</SelectItem>
                                                <SelectItem value="qualification">Qualification</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                {/* 4. Test Method */}
                                <div className="space-y-2 md:col-span-1">
                                    <Label className="text-primary font-semibold">Test Method</Label>
                                    <Select value={selectedMethodId} onValueChange={handleMethodChange}>
                                        <SelectTrigger className="border-primary/50 bg-primary/5 font-medium">
                                            <SelectValue placeholder="Select Standard Method..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {testMethods.map(m => (
                                                <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Full Width Matrix */}
                    <Card className="min-h-[500px]">
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle>Results Matrix</CardTitle>
                                <CardDescription>
                                    {targetProperties.length > 0
                                        ? `Enter values for ${targetProperties.length} properties across ${specimenCount} specimens.`
                                        : "Select a Test Method above to generate the matrix."}
                                </CardDescription>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-2">
                                    <Label>Specimens:</Label>
                                    <Input
                                        type="number"
                                        className="w-20"
                                        value={specimenCount}
                                        onChange={e => setSpecimenCount(Number(e.target.value))}
                                        min={1} max={50}
                                    />
                                </div>
                                {/* Manual Add Column */}
                                <Popover open={openPropSelect} onOpenChange={setOpenPropSelect}>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" size="sm">
                                            <Plus className="mr-2 h-4 w-4" /> Add Column
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="p-0 w-[240px]" align="end">
                                        <Command>
                                            <CommandInput placeholder="Search property..." />
                                            <CommandList>
                                                <CommandEmpty>No property found.</CommandEmpty>
                                                <CommandGroup>
                                                    {properties.map(p => (
                                                        <CommandItem key={p.id} value={p.name} onSelect={() => addColumn(p.id)}>
                                                            {p.name}
                                                        </CommandItem>
                                                    ))}
                                                </CommandGroup>
                                            </CommandList>
                                        </Command>
                                    </PopoverContent>
                                </Popover>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {targetProperties.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-24 text-muted-foreground bg-muted/5 rounded-lg border-2 border-dashed">
                                    <Calculator className="h-12 w-12 mb-4 opacity-20" />
                                    <h3 className="text-xl font-medium">No Data Columns</h3>
                                </div>
                            ) : (
                                <div className="overflow-x-auto border rounded-md">
                                    <Table>
                                        <TableHeader className="bg-muted/50">
                                            <TableRow>
                                                <TableHead className="w-[100px] border-r font-bold">Specimen</TableHead>
                                                {targetProperties.map(config => {
                                                    const p = properties.find(x => x.id === config.propertyId);
                                                    return (
                                                        <TableHead key={config.propertyId} className="min-w-[180px] text-center border-r relative group">
                                                            <div className="py-2">
                                                                <div className="font-bold text-foreground">{p?.name || <span className="text-destructive font-mono text-xs" title={config.propertyId}>Missing Prop ({config.propertyId.slice(0, 6)}...)</span>}</div>
                                                                <div className="text-xs font-mono text-muted-foreground">[{p?.unit || "-"}]</div>
                                                                {entityType !== 'layup' && (
                                                                    <div className="mt-2 px-2">
                                                                        <Select
                                                                            value={contextData[config.propertyId]?.referenceLayupId || ""}
                                                                            onValueChange={(val) => setContextData(prev => ({
                                                                                ...prev,
                                                                                [config.propertyId]: { ...prev[config.propertyId], referenceLayupId: val }
                                                                            }))}
                                                                        >
                                                                            <SelectTrigger className="h-7 text-xs">
                                                                                <SelectValue placeholder="Ref Layup..." />
                                                                            </SelectTrigger>
                                                                            <SelectContent>
                                                                                {referenceLayups.map(l => (
                                                                                    <SelectItem key={l.id} value={l.id} className="text-xs">{l.name}</SelectItem>
                                                                                ))}
                                                                            </SelectContent>
                                                                        </Select>
                                                                    </div>
                                                                )}
                                                                {(config.statsTypes?.includes('design') || (config as any).statsType === 'design_values') && (
                                                                    <div className="text-[10px] text-blue-600 font-medium mt-1">Design Values</div>
                                                                )}
                                                            </div>
                                                            <Button variant="ghost" size="icon" className="absolute right-1 top-1 h-6 w-6 opacity-0 group-hover:opacity-100 hover:text-destructive" onClick={() => removeColumn(config.propertyId)}>
                                                                <X className="h-3 w-3" />
                                                            </Button>
                                                        </TableHead>
                                                    );
                                                })}
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {Array.from({ length: specimenCount }).map((_, idx) => (
                                                <TableRow key={idx} className="hover:bg-muted/30">
                                                    <TableCell className="font-medium border-r bg-muted/10 text-center text-muted-foreground">{idx + 1}</TableCell>
                                                    {targetProperties.map(config => (
                                                        <TableCell key={config.propertyId} className="p-0 border-r">
                                                            <Input
                                                                className="h-10 w-full border-0 rounded-none text-center hover:bg-muted/30 focus-visible:ring-1 focus-visible:ring-inset"
                                                                placeholder="-"
                                                                value={matrixData[config.propertyId]?.[idx] || ""}
                                                                onChange={(e) => {
                                                                    const val = e.target.value;
                                                                    setMatrixData(prev => ({
                                                                        ...prev,
                                                                        [config.propertyId]: { ...(prev[config.propertyId] || {}), [idx]: val }
                                                                    }));
                                                                }}
                                                            />
                                                        </TableCell>
                                                    ))}
                                                </TableRow>
                                            ))}

                                            {/* Calculated Stats */}
                                            {/* Mean (Only if enabled, or default) */}
                                            {targetProperties.some(c => c.statsTypes?.includes('mean') !== false) && (
                                                <TableRow className="bg-muted/50 border-t-2 border-primary/20">
                                                    <TableCell className="border-r font-bold text-primary">Mean</TableCell>
                                                    {targetProperties.map(config => (
                                                        <TableCell key={config.propertyId} className="text-center font-mono font-bold text-primary border-r">
                                                            {(config.statsTypes?.includes('mean') !== false) ? getStats(config).mean : "-"}
                                                        </TableCell>
                                                    ))}
                                                </TableRow>
                                            )}

                                            {/* Min/Max (Range) */}
                                            {targetProperties.some(c => c.statsTypes?.includes('range') !== false) && (
                                                <TableRow className="bg-muted/30">
                                                    <TableCell className="border-r font-medium text-muted-foreground">Min / Max</TableCell>
                                                    {targetProperties.map(config => (
                                                        <TableCell key={config.propertyId} className="text-center font-mono text-sm border-r">
                                                            {(config.statsTypes?.includes('range') !== false) ?
                                                                `${getStats(config).min} / ${getStats(config).max}`
                                                                : "-"}
                                                        </TableCell>
                                                    ))}
                                                </TableRow>
                                            )}

                                            {/* Design Values (Conditional Rows) */}
                                            {targetProperties.some(c => c.statsTypes?.includes('design') || (c as any).statsType === 'design_values') && (
                                                <>
                                                    <TableRow className="bg-blue-50/50">
                                                        <TableCell className="border-r font-bold text-blue-700">B-Value (T90)</TableCell>
                                                        {targetProperties.map(config => (
                                                            <TableCell key={config.propertyId} className="text-center font-mono font-bold text-blue-700 border-r">
                                                                {(config.statsTypes?.includes('design') || (config as any).statsType === 'design_values') ? getStats(config).bValue : "-"}
                                                            </TableCell>
                                                        ))}
                                                    </TableRow>
                                                    <TableRow className="bg-blue-50/80 border-b-2 border-blue-200">
                                                        <TableCell className="border-r font-bold text-blue-800">A-Value (T99)</TableCell>
                                                        {targetProperties.map(config => (
                                                            <TableCell key={config.propertyId} className="text-center font-mono font-bold text-blue-800 border-r">
                                                                {(config.statsTypes?.includes('design') || (config as any).statsType === 'design_values') ? getStats(config).aValue : "-"}
                                                            </TableCell>
                                                        ))}
                                                    </TableRow>
                                                </>
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Right: Docs & Comments */}
                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Comments & Documentation</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-2">
                                <Label>Test Comments</Label>
                                <Textarea
                                    placeholder="Enter any observations, deviations, or notes about this test run..."
                                    className="min-h-[100px]"
                                    value={comment}
                                    onChange={e => setComment(e.target.value)}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Attachments</Label>
                                <div className="border border-dashed rounded-lg p-4 space-y-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="cert-upload" className="text-xs text-muted-foreground">Upload Certificates or Body Docs</Label>
                                        <div className="flex gap-2">
                                            <Input
                                                id="cert-upload"
                                                type="file"
                                                className="text-xs"
                                                onChange={(e) => handleFileSelect(e, 'Certificate')}
                                            />
                                            {/* Could add a select for category if needed per file, but simple for now */}
                                        </div>
                                        <div className="flex gap-2">
                                            <Input
                                                id="specimen-upload"
                                                type="file"
                                                className="text-xs"
                                                onChange={(e) => handleFileSelect(e, 'Specimen Documentation')}
                                            />
                                        </div>
                                    </div>

                                    {/* File List */}
                                    {files.length > 0 && (
                                        <div className="space-y-2">
                                            <Label className="text-xs font-semibold">Selected Files:</Label>
                                            {files.map((f, idx) => (
                                                <div key={idx} className="flex items-center justify-between bg-muted/50 p-2 rounded text-sm">
                                                    <div className="flex items-center gap-2 overflow-hidden">
                                                        <FileText className="h-4 w-4 shrink-0 text-blue-500" />
                                                        <div className="flex flex-col min-w-0">
                                                            <span className="truncate font-medium">{f.file.name}</span>
                                                            <span className="text-[10px] text-muted-foreground">{f.category}</span>
                                                        </div>
                                                    </div>
                                                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeFile(idx)}>
                                                        <X className="h-3 w-3" />
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Quick Stats or Helper Text could go here */}
                    <Card className="bg-blue-50/20 border-blue-100">
                        <CardContent className="pt-6">
                            <div className="flex items-start gap-2 text-sm text-blue-800">
                                <div className="mt-1"><Calculator className="h-4 w-4" /></div>
                                <p>
                                    Automated Analysis:
                                    <br />
                                    Statistics (Mean, StdDev, CV) and Design Values (A/B-Basis) are calculated automatically based on input values.
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
