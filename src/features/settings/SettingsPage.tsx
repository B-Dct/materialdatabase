import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MaterialTypeManager } from "./MaterialTypeManager";
import { ProcessManager } from "./ProcessManager";
import { LaboratoryManager } from "./LaboratoryManager";
import { PropertyRegistry } from "@/features/quality/PropertyRegistry";

export function SettingsPage() {
    return (
        <div className="p-8 space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
                <p className="text-muted-foreground">Manage global application configurations and master data.</p>
            </div>

            <Tabs defaultValue="types" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="types">Material Types</TabsTrigger>
                    <TabsTrigger value="properties">Properties</TabsTrigger>
                    <TabsTrigger value="processes">Processes</TabsTrigger>
                    <TabsTrigger value="labs">Laboratories</TabsTrigger>
                </TabsList>

                <TabsContent value="types" className="space-y-4">
                    <MaterialTypeManager />
                </TabsContent>

                <TabsContent value="properties" className="space-y-4">
                    <PropertyRegistry />
                </TabsContent>

                <TabsContent value="processes" className="space-y-4">
                    <ProcessManager />
                </TabsContent>

                <TabsContent value="labs" className="space-y-4">
                    <LaboratoryManager />
                </TabsContent>
            </Tabs>
        </div>
    );
}
