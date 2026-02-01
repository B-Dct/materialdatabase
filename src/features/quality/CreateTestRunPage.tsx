import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAppStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Save, Calculator, Plus, X, Check, ChevronsUpDown } from "lucide-react";
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
import type { TestMethodPropertyConfig } from "@/types/domain";

// Simplified K-Factor Lookup (One-Sided Tolerance Limit Factors)
// 95% Confidence.
// kB: 90% Probability (B-Basis)
// kA: 99% Probability (A-Basis)
// Source: approximate values from Mil-Hdbk-17 / CMH-17
const K_FACTORS: Record<number, { kA: number, kB: number }> = {
    2: { kA: 37.0, kB: 37.0 }, // undefined usually, but purely illustrative
    3: { kA: 11.2, kB: 8.8 }, // Very high penalty
    4: { kA: 7.2, kB: 6.2 },
    5: { kA: 5.74, kB: 4.61 },
    6: { kA: 4.97, kB: 4.01 },
    7: { kA: 4.5, kB: 3.65 }, // approx
    8: { kA: 4.2, kB: 3.4 },  // approx
    9: { kA: 4.0, kB: 3.2 },  // approx
    10: { kA: 3.83, kB: 3.09 } // approx
};
// Fallback for >10
const getKFactors = (n: number) => {
    if (n < 3) return { kA: 0, kB: 0 }; // Not enough data
    if (n in K_FACTORS) return K_FACTORS[n];
    // Approximation for >10
    return { kA: 3.0, kB: 2.5 };
};

export function CreateTestRunPage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    // Context from URL (if any)
    const urlMaterialId = searchParams.get("materialId");
    const urlLayupId = searchParams.get("layupId");
    const urlAssemblyId = searchParams.get("assemblyId");

    // Store
    const {
        properties, fetchProperties, addMeasurement,
        testMethods, fetchTestMethods,
        materials, fetchMaterials,
        layups, fetchLayups,
        assemblies, fetchAssemblies,
        laboratories, fetchLaboratories
    } = useAppStore();

    // Metadata State
    const [labId, setLabId] = useState("");
    const [testDate, setTestDate] = useState(new Date().toISOString().split('T')[0]);
    const [orderNumber, setOrderNumber] = useState("");
    const [referenceNumber, setReferenceNumber] = useState("");
    const [testType, setTestType] = useState<"engineering" | "qualification">("engineering");

    // Global Entity State (if no URL context)
    const [entityType, setEntityType] = useState<"material" | "layup" | "assembly">("material");
    const [entityId, setEntityId] = useState<string>("");

    // Method / Matrix State
    const [selectedMethodId, setSelectedMethodId] = useState<string>("");
    const [specimenCount, setSpecimenCount] = useState(5);
    const [targetProperties, setTargetProperties] = useState<TestMethodPropertyConfig[]>([]);
    const [matrixData, setMatrixData] = useState<Record<string, Record<number, string>>>({});
    const [openPropSelect, setOpenPropSelect] = useState(false);

    // Initial Load
    useEffect(() => {
        fetchProperties();
        fetchTestMethods();
        fetchLaboratories();
        fetchMaterials();
        fetchLayups();
        fetchAssemblies();

        if (urlMaterialId) { setEntityType("material"); setEntityId(urlMaterialId); }
        else if (urlLayupId) { setEntityType("layup"); setEntityId(urlLayupId); }
        else if (urlAssemblyId) { setEntityType("assembly"); setEntityId(urlAssemblyId); }

    }, [urlMaterialId, urlLayupId, urlAssemblyId]);

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
        console.log("Selected Method:", method);
        if (method) {
            // Use properties config if available, else map IDs
            if (method.properties && method.properties.length > 0) {
                setTargetProperties([...method.properties]);
            } else if ((method as any).propertyIds) {
                // Fallback for migration readiness
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
        }
        setOpenPropSelect(false);
    };

    const removeColumn = (propId: string) => {
        setTargetProperties(targetProperties.filter(p => p.propertyId !== propId));
        const newData = { ...matrixData };
        delete newData[propId];
        setMatrixData(newData);
    };

    const getStats = (config: TestMethodPropertyConfig) => {
        const propId = config.propertyId;
        const values = Object.values(matrixData[propId] || {})
            .map(v => parseFloat(v))
            .filter(v => !isNaN(v));

        if (values.length === 0) return { mean: "-", min: "-", max: "-", bValue: "-", aValue: "-" };

        const min = Math.min(...values);
        const max = Math.max(...values);
        const sum = values.reduce((a, b) => a + b, 0);
        const mean = sum / values.length;

        let bValDisplay = "-";
        let aValDisplay = "-";

        if ((config.statsTypes?.includes('design') || (config as any).statsType === 'design_values') && values.length >= 3) {
            // StdDev
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

    const handleSave = async () => {
        if (!entityId) {
            alert("Please select an Entity first.");
            return;
        }
        if (targetProperties.length === 0) {
            alert("No properties to save.");
            return;
        }

        try {
            const methodName = testMethods.find(m => m.id === selectedMethodId)?.name;
            let successCount = 0;

            for (const config of targetProperties) {
                const propId = config.propertyId;
                const rawValues = Object.values(matrixData[propId] || {})
                    .map(v => parseFloat(v))
                    .filter(v => !isNaN(v));

                if (rawValues.length === 0) continue;

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

                const property = properties.find(p => p.id === propId);

                await addMeasurement({
                    materialId: entityType === 'material' ? entityId : undefined,
                    layupId: entityType === 'layup' ? entityId : undefined,
                    assemblyId: entityType === 'assembly' ? entityId : undefined,

                    propertyDefinitionId: propId,
                    resultValue: Number(mean.toFixed(4)), // Save Mean as primary
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

                    sourceType: 'manual',
                    testMethod: methodName,
                    processParams: { specimenCount }
                });
                successCount++;
            }

            if (successCount > 0) {
                navigate(-1);
            } else {
                alert("No valid data entered.");
            }
        } catch (e) {
            console.error(e);
            alert("Error saving data.");
        }
    };

    return (
        <div className="p-8 max-w-[1600px] mx-auto space-y-8">
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
                    <Button size="lg" onClick={handleSave} disabled={targetProperties.length === 0 || !entityId}>
                        <Save className="mr-2 h-4 w-4" /> Save All
                    </Button>
                </div>
            </div>

            {/* Top Section: Configuration Grid */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Test Configuration</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
                                <Label>Order Number</Label>
                                <Input placeholder="e.g. WO-2024-XXX" value={orderNumber} onChange={e => setOrderNumber(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label>Reference</Label>
                                <Input placeholder="e.g. Batch/Coupon" value={referenceNumber} onChange={e => setReferenceNumber(e.target.value)} />
                            </div>
                        </div>
                        {/* 3. Lab, Date, Type */}
                        <div className="grid grid-cols-3 gap-2">
                            <div className="space-y-2">
                                <Label>Laboratory</Label>
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
                                <Label>Type</Label>
                                <Select value={testType} onValueChange={(v: any) => setTestType(v)}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="engineering">Engineering</SelectItem>
                                        <SelectItem value="qualification">Qualification</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        {/* 4. Test Method */}
                        <div className="space-y-2">
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

            {/* Bottom Section: Full Width Matrix */}
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
                                                        <div className="font-bold text-foreground">{p?.name}</div>
                                                        <div className="text-xs font-mono text-muted-foreground">[{p?.unit}]</div>
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
    );
}
