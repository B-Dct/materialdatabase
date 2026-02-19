import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MaterialTypeManager } from "./MaterialTypeManager";
import { ProcessManager } from "./ProcessManager";
import { LaboratoryManager } from "./LaboratoryManager";
import { PropertyRegistry } from "@/features/quality/PropertyRegistry";

import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { useAppStore } from "@/lib/store";

export function SettingsPage() {
    const { seedStandardTestMethods } = useAppStore();

    const [seedError, setSeedError] = React.useState<string | null>(null);

    return (
        <div className="p-8 space-y-6">
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
                    <p className="text-muted-foreground">Manage global application configurations and master data.</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" type="button" onClick={async (e) => {
                        e.preventDefault(); // Safety
                        setSeedError(null);
                        // Confirm with user
                        if (confirm("Create standard Aerospace Test Methods (ISO/ASTM)?")) {
                            try {
                                await seedStandardTestMethods();
                                alert("Success: Methods created!");
                            } catch (e: any) {
                                console.error(e);
                                setSeedError(e.message || "Unknown error during seeding.");
                            }
                        }
                    }}>
                        <RefreshCw className="mr-2 h-4 w-4" /> Seed Aerospace Methods
                    </Button>
                </div>
            </div>

            {seedError && (
                <div className="p-4 border border-destructive/50 text-destructive bg-destructive/10 rounded-md">
                    <h4 className="font-bold">Error Details:</h4>
                    <p className="font-mono text-sm whitespace-pre-wrap">{seedError}</p>
                    <p className="text-xs mt-2 text-muted-foreground">Please share this message with me.</p>
                </div>
            )}

            <Tabs defaultValue="types" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="types">Material Types</TabsTrigger>
                    {/* <TabsTrigger value="methods">Test Methods</TabsTrigger> Moved to Master Data */}
                    <TabsTrigger value="processes">Processes</TabsTrigger>
                    <TabsTrigger value="labs">Laboratories</TabsTrigger>
                    <TabsTrigger value="properties_legacy">Properties</TabsTrigger>
                </TabsList>

                <TabsContent value="types" className="space-y-4">
                    <MaterialTypeManager />
                </TabsContent>

                <TabsContent value="processes" className="space-y-4">
                    <ProcessManager />
                </TabsContent>

                <TabsContent value="labs" className="space-y-4">
                    <LaboratoryManager />
                </TabsContent>

                <TabsContent value="properties_legacy" className="space-y-4">
                    <PropertyRegistry />
                </TabsContent>
            </Tabs>
        </div>
    );
}
