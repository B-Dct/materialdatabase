import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useAppStore } from "@/lib/store";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Box, LayoutGrid, Scale, BarChart2, ShieldCheck, FileText, Ruler } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/StatusBadge";

import { AssemblyStackEditor } from "./AssemblyStackEditor";

import { AssemblyStatistics } from "./AssemblyStatistics";
import { AllowableManager } from "@/features/quality/AllowableManager";
import { EntityStandardsManager } from "@/features/quality/EntityStandardsManager";
import { AssemblyPropertiesView } from "./AssemblyPropertiesView";
import { AssemblySpecifications } from "./AssemblySpecifications";
import { MeasurementEntry } from "@/features/quality/MeasurementEntry";

export function AssemblyDetailPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const {
        assemblies, fetchAssemblies, updateAssembly,
        measurements, fetchMeasurements
    } = useAppStore();

    const [activeTab, setActiveTab] = useState("overview");


    useEffect(() => {
        if (assemblies.length === 0) fetchAssemblies();
        if (measurements.length === 0) fetchMeasurements();
    }, [id, fetchAssemblies, fetchMeasurements, assemblies.length, measurements.length]);

    const assembly = assemblies.find(a => a.id === id);

    if (!assembly) {
        return <div className="p-8 text-center">Loading Assembly...</div>;
    }

    return (
        <div className="h-full flex flex-col overflow-hidden animate-in fade-in">
            {/* Header */}
            <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 p-4 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => navigate('/assemblies')}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-xl font-bold tracking-tight">{assembly.name}</h1>
                            <StatusBadge status={assembly.status} />
                            <Badge variant="outline" className="font-mono">v{assembly.version}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-1 max-w-2xl">
                            {assembly.description || "No description provided."}
                        </p>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-hidden flex flex-col">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
                    <div className="px-4 border-b shrink-0 bg-muted/20">
                        <TabsList className="bg-transparent h-12 w-full justify-start gap-6">
                            <TabsTrigger value="overview" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full px-0">
                                <LayoutGrid className="h-4 w-4 mr-2" /> Overview
                            </TabsTrigger>
                            <TabsTrigger value="standards" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full px-0">
                                <ShieldCheck className="h-4 w-4 mr-2" /> Standards
                            </TabsTrigger>
                            <TabsTrigger value="properties" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full px-0">
                                <Box className="h-4 w-4 mr-2" /> Properties
                            </TabsTrigger>
                            <TabsTrigger value="specifications" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full px-0">
                                <FileText className="h-4 w-4 mr-2" /> Specifications
                            </TabsTrigger>
                            <TabsTrigger value="allowables" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full px-0">
                                <Scale className="h-4 w-4 mr-2" /> Allowables
                            </TabsTrigger>
                            <TabsTrigger value="measurements" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full px-0">
                                <Ruler className="h-4 w-4 mr-2" /> Measurements
                            </TabsTrigger>
                            <TabsTrigger value="statistics" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full px-0">
                                <BarChart2 className="h-4 w-4 mr-2" /> Statistics
                            </TabsTrigger>
                        </TabsList>
                    </div>

                    {/* Content Areas */}
                    <div className="flex-1 overflow-auto p-6 bg-slate-50/50 dark:bg-slate-900/20">

                        <TabsContent value="overview" className="h-full m-0">
                            <AssemblyStackEditor
                                assembly={assembly}
                                readonly={true}
                                onSaveSuccess={() => fetchAssemblies()}
                            />
                        </TabsContent>

                        <TabsContent value="properties" className="h-full m-0 space-y-6">
                            <div className="flex justify-between items-center">
                                <div>
                                    <h3 className="text-lg font-medium">Assembly Properties</h3>
                                    <p className="text-sm text-muted-foreground">Functional properties specific to this assembly configuration.</p>
                                </div>

                            </div>

                            <div className="flex-1 min-h-[500px] border rounded-md bg-background p-1">
                                <AssemblyPropertiesView assembly={assembly} measurements={assembly.measurements || []} />
                            </div>


                        </TabsContent>

                        <TabsContent value="specifications" className="h-full m-0 space-y-4">
                            <AssemblySpecifications assembly={assembly} />
                        </TabsContent>

                        <TabsContent value="standards" className="h-full m-0 space-y-4">
                            <EntityStandardsManager
                                assignedProfileIds={assembly.assignedProfileIds || []}
                                onAssign={async (id) => {
                                    const currentIds = assembly.assignedProfileIds || [];
                                    await updateAssembly(assembly.id, { assignedProfileIds: [...currentIds, id] });
                                }}
                                onUnassign={async (id) => {
                                    const currentIds = assembly.assignedProfileIds || [];
                                    await updateAssembly(assembly.id, { assignedProfileIds: currentIds.filter((pid: string) => pid !== id) });
                                }}
                            />
                        </TabsContent>

                        <TabsContent value="allowables" className="h-full m-0">
                            <AllowableManager
                                parentId={assembly.id}
                                parentType="assembly"
                                allowables={assembly.allowables || []}
                                availableMeasurements={measurements} // Pass all for now
                            />
                        </TabsContent>

                        <TabsContent value="measurements" className="h-full m-0">
                            <MeasurementEntry
                                parentId={assembly.id}
                                parentType="assembly"
                            />
                        </TabsContent>

                        <TabsContent value="statistics" className="h-full m-0">
                            <AssemblyStatistics assembly={assembly} />
                        </TabsContent>
                    </div>
                </Tabs>
            </div>
        </div>
    );
}
