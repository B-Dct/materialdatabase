import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAppStore } from '@/lib/store';
import { MeasurementEntry } from '@/features/quality/MeasurementEntry';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MaterialFormDialog } from './MaterialFormDialog';
import { PropertyManagerDialog } from './PropertyManagerDialog';
import { VariantManager } from './VariantManager';
import { MaterialUsage } from './MaterialUsage';
import { MaterialStatistics } from './MaterialStatistics';
import { AllowableManager } from '@/features/quality/AllowableManager';
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { FileText, Upload, Eye, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

// Mock type for an uploaded file
interface UploadedFile {
    id: string;
    name: string;
    size: string;
    type: string;
    url: string; // Blob URL
}

import { Check, Plus as PlusIcon, X } from "lucide-react";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"

export function MaterialDetailPage() {
    const { id } = useParams<{ id: string }>();
    const { materials, fetchMaterials, requirementProfiles, fetchRequirementProfiles, updateMaterial } = useAppStore();
    const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
    const [isDragging, setIsDragging] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [isPropertyManagerOpen, setIsPropertyManagerOpen] = useState(false);

    // Ensure data is loaded
    useEffect(() => {
        if (materials.length === 0) fetchMaterials();
        fetchRequirementProfiles(); // Ensure profiles are loaded
    }, [fetchMaterials, fetchRequirementProfiles, materials.length]);

    const material = materials.find(m => m.id === id);

    if (!material && materials.length > 0) {
        return <div className="p-8">Material not found</div>;
    }

    if (!material) {
        return <div className="p-8">Loading...</div>;
    }

    // File Upload Handlers
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
        const files = Array.from(e.dataTransfer.files);
        handleFiles(files);
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const files = Array.from(e.target.files);
            handleFiles(files);
        }
    };

    const handleFiles = (files: File[]) => {
        const newFiles = files
            .filter(f => f.type === 'application/pdf')
            .map(f => ({
                id: Math.random().toString(36).substring(7),
                name: f.name,
                size: (f.size / 1024 / 1024).toFixed(2) + ' MB',
                type: f.type,
                url: URL.createObjectURL(f)
            }));

        if (files.length !== newFiles.length) {
            alert("Only PDF files are supported.");
        }

        setUploadedFiles([...uploadedFiles, ...newFiles]);
    };

    const handleDeleteFile = (fileId: string) => {
        setUploadedFiles(uploadedFiles.filter(f => f.id !== fileId));
    };

    return (
        <div className="p-8 space-y-6 animate-in fade-in duration-500">
            {/* Breadcrumb & Header */}
            <div className="space-y-4">
                <Breadcrumb>
                    <BreadcrumbList>
                        <BreadcrumbItem>
                            <BreadcrumbLink asChild>
                                <Link to="/materials">Materials</Link>
                            </BreadcrumbLink>
                        </BreadcrumbItem>
                        <BreadcrumbSeparator />
                        <BreadcrumbItem>
                            <BreadcrumbPage>{material.name}</BreadcrumbPage>
                        </BreadcrumbItem>
                    </BreadcrumbList>
                </Breadcrumb>

                <div className="flex justify-between items-start">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">{material.name}</h1>
                        <p className="text-muted-foreground">{material.manufacturer} • {material.type}</p>
                    </div>
                    <div className="flex gap-4 items-center">
                        <Badge variant={
                            material.status === 'standard' ? 'default' :
                                material.status === 'blocked' ? 'destructive' : 'secondary'
                        } className="text-sm px-4 py-1">
                            {material.status}
                        </Badge>
                        <Button variant="outline" onClick={() => setIsEditOpen(true)}>
                            Edit Details
                        </Button>
                    </div>
                </div>

                <MaterialFormDialog
                    open={isEditOpen}
                    onOpenChange={setIsEditOpen}
                    mode="edit"
                    initialData={material}
                />
            </div>

            {/* Tabs content */}
            <Tabs defaultValue="overview" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="datasheets">Datasheets ({uploadedFiles.length})</TabsTrigger>
                    <TabsTrigger value="allowables">Allowables ({material.allowables?.length || 0})</TabsTrigger>
                    <TabsTrigger value="measurements">Measurements ({material.measurements?.length || 0})</TabsTrigger>
                    <TabsTrigger value="standards">Standards ({material.assignedProfileIds?.length || 0})</TabsTrigger>
                    <TabsTrigger value="variants">Variants</TabsTrigger>
                    <TabsTrigger value="usage">Usage</TabsTrigger>
                    <TabsTrigger value="statistics">Statistics</TabsTrigger>
                </TabsList>




                <TabsContent value="overview" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>General Information</CardTitle>
                        </CardHeader>
                        <CardContent className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                            <div className="grid gap-1">
                                <span className="text-sm text-muted-foreground">Material ID</span>
                                <span className="font-medium">{material.materialId || '-'}</span>
                            </div>
                            <div className="grid gap-1">
                                <span className="text-sm text-muted-foreground">List Number</span>
                                <span className="font-medium">{material.materialListNumber || '-'}</span>
                            </div>
                            <div className="grid gap-1">
                                <span className="text-sm text-muted-foreground">Material Type</span>
                                <span className="font-medium">{material.type}</span>
                            </div>

                            <div className="grid gap-1">
                                <span className="text-sm text-muted-foreground">Manufacturer</span>
                                <span className="font-medium">{material.manufacturer}</span>
                            </div>
                            <div className="grid gap-1">
                                <span className="text-sm text-muted-foreground">Manufacturer Address</span>
                                <span className="font-medium">{material.manufacturerAddress || '-'}</span>
                            </div>
                            <div className="grid gap-1">
                                <span className="text-sm text-muted-foreground">Supplier</span>
                                <span className="font-medium">{material.supplier || '-'}</span>
                            </div>

                            <div className="grid gap-1">
                                <span className="text-sm text-muted-foreground">Reach Status</span>
                                <div>
                                    <Badge variant="outline" className={
                                        material.reachStatus === 'reach_compliant' ? 'bg-green-100 text-green-800' :
                                            material.reachStatus === 'svhc_contained' ? 'bg-orange-100 text-orange-800' :
                                                material.reachStatus === 'restricted' ? 'bg-red-100 text-red-800' :
                                                    ''
                                    }>
                                        {material.reachStatus === 'reach_compliant' ? 'Compliant' :
                                            material.reachStatus === 'svhc_contained' ? 'SVHC' :
                                                material.reachStatus === 'restricted' ? 'Restricted' : material.reachStatus || '-'}
                                    </Badge>
                                </div>
                            </div>
                            <div className="grid gap-1">
                                <span className="text-sm text-muted-foreground">Maturity Level</span>
                                <span className={`font-bold ${material.maturityLevel === 3 ? 'text-green-600' :
                                        material.maturityLevel === 1 ? 'text-amber-600' : 'text-blue-600'
                                    }`}>
                                    Level {material.maturityLevel || '-'}
                                </span>
                            </div>
                            <div className="grid gap-1">
                                <span className="text-sm text-muted-foreground">Created At</span>
                                <span className="font-medium">{new Date(material.createdAt).toLocaleDateString()}</span>
                            </div>

                            <div className="grid gap-1 col-span-full">
                                <span className="text-sm text-muted-foreground">Description</span>
                                <span className="font-medium">{material.description || '-'}</span>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Material Properties Table */}
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle>Material Properties</CardTitle>
                            <Button variant="outline" size="sm" onClick={() => setIsPropertyManagerOpen(true)}>
                                Manage Properties
                            </Button>
                        </CardHeader>
                        <CardContent>
                            <div className="border rounded-md">
                                <table className="w-full text-sm">
                                    <thead className="bg-muted/50">
                                        <tr className="border-b">
                                            <th className="h-10 px-4 text-left font-medium text-muted-foreground">Property</th>
                                            <th className="h-10 px-4 text-left font-medium text-muted-foreground">Value</th>
                                            <th className="h-10 px-4 text-left font-medium text-muted-foreground">Unit</th>
                                            <th className="h-10 px-4 text-left font-medium text-muted-foreground">Specification/Source</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(!material.properties || material.properties.length === 0) ? (
                                            <tr>
                                                <td colSpan={4} className="p-4 text-center text-muted-foreground italic">
                                                    No general properties defined.
                                                </td>
                                            </tr>
                                        ) : (
                                            material.properties.map((prop) => (
                                                <tr key={prop.id} className="border-b last:border-0 hover:bg-muted/5">
                                                    <td className="p-3 align-middle font-medium">{prop.name}</td>
                                                    <td className="p-3 align-middle">{prop.value}</td>
                                                    <td className="p-3 align-middle">{prop.unit}</td>
                                                    <td className="p-3 align-middle text-muted-foreground">{prop.specification}</td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>

                    <PropertyManagerDialog
                        open={isPropertyManagerOpen}
                        onOpenChange={setIsPropertyManagerOpen}
                        material={material}
                    />
                </TabsContent>

                <TabsContent value="allowables">
                    <AllowableManager
                        parentId={material.id}
                        parentType="material"
                        allowables={material.allowables || []}
                        availableMeasurements={material.measurements || []}
                    />
                </TabsContent>

                <TabsContent value="measurements">
                    <MeasurementEntry parentId={material.id} parentType="material" />
                </TabsContent>

                <TabsContent value="datasheets" className="space-y-4">
                    <div className="grid md:grid-cols-3 gap-6">
                        {/* Upload Zone */}
                        <Card
                            className={cn(
                                "md:col-span-1 border-2 border-dashed flex flex-col items-center justify-center p-8 text-center cursor-pointer transition-colors",
                                isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"
                            )}
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                            onClick={() => document.getElementById('pdf-upload')?.click()}
                        >
                            <Upload className="h-10 w-10 text-muted-foreground mb-4" />
                            <h3 className="font-semibold mb-1">Click or Drag PDF</h3>
                            <p className="text-xs text-muted-foreground">Upload datasheets or test reports</p>
                            <input
                                type="file"
                                id="pdf-upload"
                                className="hidden"
                                accept="application/pdf"
                                multiple
                                onChange={handleFileSelect}
                            />
                        </Card>

                        {/* File List */}
                        <Card className="md:col-span-2">
                            <CardHeader>
                                <CardTitle>Uploaded Documents</CardTitle>
                                <CardDescription>Files are stored temporarily for this session.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {uploadedFiles.length === 0 ? (
                                    <div className="text-center py-8 text-muted-foreground text-sm">
                                        No files uploaded yet.
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {uploadedFiles.map(file => (
                                            <div key={file.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 group">
                                                <div className="flex items-center gap-3 overflow-hidden">
                                                    <div className="bg-red-100 p-2 rounded text-red-600">
                                                        <FileText className="h-5 w-5" />
                                                    </div>
                                                    <div className="grid gap-0.5 truncate">
                                                        <span className="text-sm font-medium truncate">{file.name}</span>
                                                        <span className="text-xs text-muted-foreground">{file.size}</span>
                                                    </div>
                                                </div>
                                                <div className="flex gap-1">
                                                    <Button variant="ghost" size="icon" onClick={() => window.open(file.url, '_blank')}>
                                                        <Eye className="h-4 w-4" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleDeleteFile(file.id)}>
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="usage">
                    <MaterialUsage material={material} />
                </TabsContent>

                <TabsContent value="statistics">
                    <MaterialStatistics material={material} />
                </TabsContent>

                <TabsContent value="variants">
                    <VariantManager material={material} />
                </TabsContent>


                <TabsContent value="standards" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Assigned Standards & Specifications</CardTitle>
                            <CardDescription>
                                Manage requirement profiles linked to this material. Analysis is performed against these standards.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* List Assigned */}
                            <div className="space-y-2">
                                {(!material.assignedProfileIds || material.assignedProfileIds.length === 0) && (
                                    <div className="text-sm text-muted-foreground italic">No standards assigned.</div>
                                )}
                                {material.assignedProfileIds?.map(pid => {
                                    const profile = requirementProfiles.find(p => p.id === pid);
                                    if (!profile) return null;
                                    return (
                                        <div key={pid} className="flex items-center justify-between border p-3 rounded-md bg-muted/20">
                                            <div>
                                                <div className="font-medium">{profile.name}</div>
                                                <div className="text-xs text-muted-foreground">{profile.description}</div>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="text-destructive hover:text-destructive"
                                                onClick={() => {
                                                    const current = material.assignedProfileIds || [];
                                                    updateMaterial(material.id, {
                                                        assignedProfileIds: current.filter(id => id !== pid)
                                                    });
                                                }}
                                            >
                                                <X className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    )
                                })}
                            </div>

                            {/* Add New */}
                            <div className="border-t pt-4">
                                <h4 className="text-sm font-medium mb-2">Assign Standard</h4>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" className="w-[300px] justify-between">
                                            Select Standard...
                                            <PlusIcon className="ml-2 h-4 w-4 opacity-50" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[300px] p-0" align="start">
                                        <Command>
                                            <CommandInput placeholder="Search standards..." />
                                            <CommandList>
                                                <CommandEmpty>No standard found.</CommandEmpty>
                                                <CommandGroup>
                                                    {requirementProfiles.map((profile) => {
                                                        const isAssigned = (material.assignedProfileIds || []).includes(profile.id);
                                                        return (
                                                            <CommandItem
                                                                key={profile.id}
                                                                value={profile.name}
                                                                onSelect={() => {
                                                                    if (isAssigned) return;
                                                                    const current = material.assignedProfileIds || [];
                                                                    updateMaterial(material.id, {
                                                                        assignedProfileIds: [...current, profile.id]
                                                                    });
                                                                }}
                                                            >
                                                                <Check
                                                                    className={cn(
                                                                        "mr-2 h-4 w-4",
                                                                        isAssigned ? "opacity-100" : "opacity-0"
                                                                    )}
                                                                />
                                                                {profile.name}
                                                            </CommandItem>
                                                        );
                                                    })}
                                                </CommandGroup>
                                            </CommandList>
                                        </Command>
                                    </PopoverContent>
                                </Popover>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
