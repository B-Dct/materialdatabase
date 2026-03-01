import { useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ComparisonView } from "./ComparisonView";
import { SubstitutionView } from "./SubstitutionView";
import { AnalyticsCharts } from "./AnalyticsCharts";
import { ReportExportBtn } from "./ReportExportBtn";
import { HistoryView } from "./HistoryView";
import { FileBarChart, Microscope, LayoutGrid, TrendingUp } from "lucide-react";

import { useAppStore } from '@/lib/store';
import { AnalysisCart } from "./AnalysisCart";
import { AnalysisFinder } from "./AnalysisFinder";

export function AnalysisDashboard() {
    const { fetchMaterials, fetchLayups, fetchAssemblies, fetchProcesses, fetchMeasurements, fetchProperties, fetchTestMethods, fetchRequirementProfiles, analysisCart } = useAppStore();

    useEffect(() => {
        fetchMaterials(true);
        fetchLayups(true);
        fetchAssemblies();
        fetchProcesses(true);
        fetchMeasurements();
        fetchProperties();
        fetchTestMethods();
        fetchRequirementProfiles();
    }, [fetchMaterials, fetchLayups, fetchAssemblies, fetchProcesses, fetchMeasurements, fetchProperties, fetchTestMethods, fetchRequirementProfiles]);

    // Temporary bridge for legacy views until they are rewritten in Phase 2/3
    const legacyMaterialIds = analysisCart.filter(item => item.type === 'material').map(item => item.id);

    return (
        <div className="p-8 space-y-8 animate-in fade-in duration-500">
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Material Analysis</h1>
                    <p className="text-muted-foreground">Advanced analytics, benchmarking and material substitution.</p>
                </div>
                <ReportExportBtn />
            </div>

            {/* Unified Cart & Finder */}
            <div className="flex gap-4 items-stretch mb-8">
                <div className="flex-1">
                    <AnalysisCart />
                </div>
                <div className="shrink-0 flex items-stretch">
                    <AnalysisFinder />
                </div>
            </div>

            <Tabs defaultValue="comparison" className="space-y-6">
                <TabsList className="grid w-full grid-cols-5 lg:w-[800px]">
                    <TabsTrigger value="comparison" className="gap-2">
                        <LayoutGrid className="h-4 w-4" /> Comparison
                    </TabsTrigger>
                    <TabsTrigger value="analytics" className="gap-2">
                        <FileBarChart className="h-4 w-4" /> Visuals
                    </TabsTrigger>
                    <TabsTrigger value="history" className="gap-2">
                        <TrendingUp className="h-4 w-4" /> History
                    </TabsTrigger>
                    <TabsTrigger value="substitution" className="gap-2">
                        <Microscope className="h-4 w-4" /> Substitution
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="comparison">
                    <ComparisonView cart={analysisCart} />
                </TabsContent>

                <TabsContent value="analytics">
                    <AnalyticsCharts cart={analysisCart} />
                </TabsContent>

                <TabsContent value="history">
                    <HistoryView selectedIds={legacyMaterialIds} />
                </TabsContent>

                <TabsContent value="substitution">
                    <SubstitutionView />
                </TabsContent>
            </Tabs>
        </div>
    );
}
