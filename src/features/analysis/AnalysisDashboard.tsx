import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ComparisonView } from "./ComparisonView";
import { SubstitutionView } from "./SubstitutionView";
import { AnalyticsCharts } from "./AnalyticsCharts";
import { ReportExportBtn } from "./ReportExportBtn";
import { HistoryView } from "./HistoryView";
import { FileBarChart, Microscope, LayoutGrid, TrendingUp, Plus, X } from "lucide-react";

import { useAppStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Badge } from "@/components/ui/badge";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

export function AnalysisDashboard() {
    const { materials, fetchMaterials } = useAppStore();
    const [selectedMaterialIds, setSelectedMaterialIds] = useState<string[]>([]);
    const [addCandidateId, setAddCandidateId] = useState<string>('');

    useEffect(() => {
        fetchMaterials();
    }, []);

    const handleAdd = () => {
        if (addCandidateId && !selectedMaterialIds.includes(addCandidateId)) {
            if (selectedMaterialIds.length >= 4) return; // Limit to 4
            setSelectedMaterialIds([...selectedMaterialIds, addCandidateId]);
            setAddCandidateId('');
        }
    };

    const handleRemove = (id: string) => {
        setSelectedMaterialIds(selectedMaterialIds.filter(m => m !== id));
    };

    return (
        <div className="p-8 space-y-8 animate-in fade-in duration-500">
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Material Analysis</h1>
                    <p className="text-muted-foreground">Advanced analytics, benchmarking and material substitution.</p>
                </div>
                <ReportExportBtn />
            </div>

            {/* Global Selection Bar */}
            <div className="bg-card border rounded-lg p-4 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-4 flex-1">
                    <div className="flex items-center gap-2">
                        <Select value={addCandidateId} onValueChange={setAddCandidateId}>
                            <SelectTrigger className="w-[250px] bg-background">
                                <SelectValue placeholder="Add Material to Analyze..." />
                            </SelectTrigger>
                            <SelectContent>
                                {materials.filter(m => !selectedMaterialIds.includes(m.id)).map(m => (
                                    <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Button onClick={handleAdd} disabled={!addCandidateId || selectedMaterialIds.length >= 4} variant="secondary">
                            <Plus className="h-4 w-4 mr-2" /> Add
                        </Button>
                    </div>

                    <div className="h-8 w-px bg-border mx-2" />

                    <div className="flex gap-2 flex-wrap">
                        {selectedMaterialIds.length === 0 && (
                            <span className="text-sm text-muted-foreground italic">No materials selected. Add up to 4.</span>
                        )}
                        {selectedMaterialIds.map(id => {
                            const mat = materials.find(m => m.id === id);
                            return (
                                <Badge key={id} variant="outline" className="pl-2 pr-1 py-1 h-8 text-sm flex items-center gap-1 bg-background">
                                    {mat?.name}
                                    <Button variant="ghost" size="icon" className="h-5 w-5 ml-1 rounded-full hover:bg-destructive/10 hover:text-destructive" onClick={() => handleRemove(id)}>
                                        <X className="h-3 w-3" />
                                    </Button>
                                </Badge>
                            );
                        })}
                    </div>
                </div>
                <div className="text-xs text-muted-foreground">
                    {selectedMaterialIds.length} / 4 Selected
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
                    <ComparisonView selectedIds={selectedMaterialIds} />
                </TabsContent>

                <TabsContent value="analytics">
                    <AnalyticsCharts selectedIds={selectedMaterialIds} />
                </TabsContent>

                <TabsContent value="history">
                    <HistoryView selectedIds={selectedMaterialIds} />
                </TabsContent>

                <TabsContent value="substitution">
                    <SubstitutionView />
                </TabsContent>
            </Tabs>
        </div>
    );
}
