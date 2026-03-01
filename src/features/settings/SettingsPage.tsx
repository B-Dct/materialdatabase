import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MaterialTypeManager } from "./MaterialTypeManager";
import { ProcessManager } from "./ProcessManager";

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
                </TabsList>

                <TabsContent value="types" className="space-y-4">
                    <MaterialTypeManager />
                </TabsContent>

                <TabsContent value="processes" className="space-y-4">
                    <ProcessManager />
                </TabsContent>
            </Tabs>
        </div>
    );
}
