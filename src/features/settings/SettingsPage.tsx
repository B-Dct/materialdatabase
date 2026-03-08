import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MaterialTypeManager } from "./MaterialTypeManager";
import { ProcessManager } from "./ProcessManager";
import { ProductionSiteManager } from "./ProductionSiteManager";
import { LabTechnicianManager } from "./LabTechnicianManager";
import { TaskTemplateManager } from "./TaskTemplateManager";

export function SettingsPage() {
    return (
        <div className="p-8 space-y-6">
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
                    <p className="text-muted-foreground">Manage global application configurations and master data.</p>
                </div>
            </div>

            <Tabs defaultValue="types" className="space-y-4 mt-6">
                <TabsList>
                    <TabsTrigger value="types">Material Types</TabsTrigger>
                    <TabsTrigger value="processes">Processes</TabsTrigger>
                    <TabsTrigger value="sites">Production Sites</TabsTrigger>
                    <TabsTrigger value="technicians">Lab Technicians</TabsTrigger>
                    <TabsTrigger value="templates">Task Templates</TabsTrigger>
                </TabsList>

                <TabsContent value="types" className="space-y-4">
                    <MaterialTypeManager />
                </TabsContent>

                <TabsContent value="processes" className="space-y-4">
                    <ProcessManager />
                </TabsContent>

                <TabsContent value="sites" className="space-y-4">
                    <ProductionSiteManager />
                </TabsContent>

                <TabsContent value="technicians" className="space-y-4">
                    <LabTechnicianManager />
                </TabsContent>

                <TabsContent value="templates" className="space-y-4">
                    <TaskTemplateManager />
                </TabsContent>
            </Tabs>
        </div>
    );
}
