import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MaterialTypeManager } from "./MaterialTypeManager";
import { ProcessManager } from "./ProcessManager";
import { LaboratoryManager } from "./LaboratoryManager";
import { PropertyRegistry } from "@/features/quality/PropertyRegistry";
import { TestMethodsView } from "@/features/quality/TestMethodsView";

import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { useAppStore } from "@/lib/store";

export function SettingsPage() {
    const { seedStandardProperties, fetchProperties, seedStandardTestMethods } = useAppStore();

    const [seedError, setSeedError] = React.useState<string | null>(null);

    const handleRestoreDefaults = async () => {
        setSeedError(null);
        if (confirm("Restore missing standard properties? This will NOT delete existing data.")) {
            try {
                await seedStandardProperties();
                await fetchProperties();
                alert("Success! Standard properties restored.");
            } catch (e: any) {
                console.error("Restore failed:", e);
                const msg = e.message || "";

                // If unique constraint or duplicate error (or custom error we threw)
                if (msg.includes("unique") || msg.includes("duplicate") || msg.includes("exist")) {
                    if (confirm("Error: Properties seem to exist but might be hidden (Permissions/RLS).\n\nDo you want to force create them with suffix ' (Std)'?")) {
                        try {
                            await seedStandardProperties({ suffix: "(Std)" });
                            await fetchProperties();
                            alert("Success! Created with suffix.");
                            return;
                        } catch (e2: any) {
                            setSeedError(e2.message);
                            return;
                        }
                    }
                }

                setSeedError(msg || "Unknown error occurred during seeding.");
                if (typeof e === 'object') {
                    try {
                        const detailed = JSON.stringify(e, null, 2);
                        setSeedError(`${msg}\n\nDetails:\n${detailed}`);
                    } catch (err) { /* ignore circular */ }
                }
            }
        }
    };

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
                    <Button variant="outline" onClick={handleRestoreDefaults}>
                        <RefreshCw className="mr-2 h-4 w-4" /> Restore Standard Properties
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

            <Tabs defaultValue="methods" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="types">Material Types</TabsTrigger>
                    <TabsTrigger value="methods">Test Methods</TabsTrigger>
                    <TabsTrigger value="processes">Processes</TabsTrigger>
                    <TabsTrigger value="labs">Laboratories</TabsTrigger>
                    <TabsTrigger value="properties_legacy" className="opacity-50">Definitions</TabsTrigger>
                </TabsList>

                <TabsContent value="types" className="space-y-4">
                    <MaterialTypeManager />
                </TabsContent>

                <TabsContent value="methods" className="space-y-4">
                    <TestMethodsView />
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
