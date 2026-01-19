import { useState } from 'react';
import { useAppStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Upload, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import Papa from 'papaparse';

interface ImportPreview {
    name: string;
    type: string;
    manufacturer: string;
    status: string;
    isValid: boolean;
    error?: string;
}

export function DataImportPage() {
    const { addMaterial } = useAppStore();
    const [isDragging, setIsDragging] = useState(false);
    const [previewData, setPreviewData] = useState<ImportPreview[]>([]);
    const [importing, setImporting] = useState(false);
    const [result, setResult] = useState<{ success: number, failed: number } | null>(null);

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => {
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const files = e.dataTransfer.files;
        if (files.length > 0) processFile(files[0]);
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            processFile(e.target.files[0]);
        }
    };

    const processFile = (file: File) => {
        setResult(null);
        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                const parsed = results.data.map((row: any) => {
                    const isValid = !!row.name && !!row.type && !!row.manufacturer;
                    return {
                        name: row.name,
                        type: row.type,
                        manufacturer: row.manufacturer,
                        status: row.status || 'standard',
                        isValid,
                        error: isValid ? undefined : 'Missing required fields (name, type, manufacturer)'
                    };
                });
                setPreviewData(parsed);
            },
            error: (error) => {
                console.error('Error parsing CSV:', error);
                alert("Failed to parse CSV file.");
            }
        });
    };

    const handleImport = async () => {
        setImporting(true);
        let successCount = 0;
        let failedCount = 0;

        for (const item of previewData) {
            if (!item.isValid) {
                failedCount++;
                continue;
            }
            try {
                await addMaterial({
                    name: item.name,
                    type: item.type,
                    manufacturer: item.manufacturer,
                    status: item.status as any,
                    description: 'Imported via CSV',
                    materialId: `IMP-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                    materialListNumber: 'N/A',
                    manufacturerAddress: 'Unknown',
                    reachStatus: 'reach_compliant',
                    maturityLevel: 1
                });
                successCount++;
            } catch (e) {
                console.error("Import error:", e);
                failedCount++;
            }
        }

        setImporting(false);
        setResult({ success: successCount, failed: failedCount });
        setPreviewData([]);
    };

    return (
        <div className="p-8 space-y-6 animate-in fade-in duration-500 max-w-4xl mx-auto">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Data Import</h1>
                <p className="text-muted-foreground">Bulk import materials using CSV files.</p>
            </div>

            <div className="grid gap-6">
                {/* Upload Area */}
                <Card
                    className={`border-2 border-dashed transition-colors ${isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'}`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                >
                    <CardContent className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                        <Upload className="h-12 w-12 mb-4 opacity-50" />
                        <h3 className="text-lg font-semibold mb-1">Drag & Drop CSV File</h3>
                        <p className="text-sm mb-4">or click to select file</p>
                        <input
                            type="file"
                            accept=".csv"
                            className="hidden"
                            id="file-upload"
                            onChange={handleFileSelect}
                        />
                        <Button variant="secondary" onClick={() => document.getElementById('file-upload')?.click()}>
                            Select File
                        </Button>
                        <p className="text-xs mt-4">Required columns: name, type, manufacturer. Optional: status.</p>
                    </CardContent>
                </Card>

                {/* Import Result Alert */}
                {result && (
                    <Alert variant={result.failed === 0 ? "default" : "destructive"}>
                        {result.failed === 0 ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                        <AlertTitle>{result.failed === 0 ? "Import Successful" : "Import Completed with Errors"}</AlertTitle>
                        <AlertDescription>
                            Successfully imported {result.success} materials. {result.failed > 0 && `Failed to import ${result.failed} items.`}
                        </AlertDescription>
                    </Alert>
                )}

                {/* Preview Table */}
                {previewData.length > 0 && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Preview ({previewData.length} items)</CardTitle>
                            <CardDescription>Review data before importing.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="max-h-[400px] overflow-auto border rounded-md">
                                <table className="w-full text-sm">
                                    <thead className="bg-muted sticky top-0">
                                        <tr>
                                            <th className="p-3 text-left font-medium">Status</th>
                                            <th className="p-3 text-left font-medium">Name</th>
                                            <th className="p-3 text-left font-medium">Type</th>
                                            <th className="p-3 text-left font-medium">Manufacturer</th>
                                            <th className="p-3 text-left font-medium">Notes</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {previewData.map((row, i) => (
                                            <tr key={i} className={!row.isValid ? 'bg-destructive/10' : ''}>
                                                <td className="p-3">
                                                    {row.isValid
                                                        ? <CheckCircle2 className="h-4 w-4 text-green-500" />
                                                        : <AlertCircle className="h-4 w-4 text-red-500" />
                                                    }
                                                </td>
                                                <td className="p-3">{row.name || <span className="text-destructive">-</span>}</td>
                                                <td className="p-3">{row.type || <span className="text-destructive">-</span>}</td>
                                                <td className="p-3">{row.manufacturer || <span className="text-destructive">-</span>}</td>
                                                <td className="p-3 text-destructive">{row.error}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <div className="mt-4 flex justify-end gap-2">
                                <Button variant="outline" onClick={() => setPreviewData([])}>Cancel</Button>
                                <Button onClick={handleImport} disabled={importing}>
                                    {importing ? "Importing..." : `Import ${previewData.filter(i => i.isValid).length} Valid Items`}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}
