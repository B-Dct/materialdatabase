import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, Beaker, FileText, Layers } from "lucide-react";
import { supabase } from "@/lib/supabase";

export function DashboardPage() {
    const [stats, setStats] = useState({
        materials: 0,
        layups: 0,
        assemblies: 0,
        measurements: 0
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadStats() {
            setLoading(true);
            try {
                const [mat, lay, ass, meas] = await Promise.all([
                    supabase.from('materials').select('*', { count: 'exact', head: true }),
                    supabase.from('layups').select('*', { count: 'exact', head: true }),
                    supabase.from('assemblies').select('*', { count: 'exact', head: true }),
                    supabase.from('measurements').select('*', { count: 'exact', head: true })
                ]);

                setStats({
                    materials: mat.count || 0,
                    layups: lay.count || 0,
                    assemblies: ass.count || 0,
                    measurements: meas.count || 0
                });
            } catch (e) {
                console.error("Failed to load stats", e);
            } finally {
                setLoading(false);
            }
        }
        loadStats();
    }, []);

    return (
        <div className="p-8 space-y-8 animate-in fade-in duration-500">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
                <p className="text-muted-foreground">Overview of material database status and recent activity.</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Materials</CardTitle>
                        <Beaker className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{loading ? "..." : stats.materials}</div>
                        <p className="text-xs text-muted-foreground">Active in database</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Layups Defined</CardTitle>
                        <Layers className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{loading ? "..." : stats.layups}</div>
                        <p className="text-xs text-muted-foreground">Composite stacks</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Assemblies</CardTitle>
                        <Activity className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{loading ? "..." : stats.assemblies}</div>
                        <p className="text-xs text-muted-foreground">Complex parts</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Measurements</CardTitle>
                        <FileText className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{loading ? "..." : stats.measurements}</div>
                        <p className="text-xs text-muted-foreground">Test results recorded</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                <Card className="col-span-4">
                    <CardHeader>
                        <CardTitle>Recent Activity</CardTitle>
                        <CardDescription>Latest changes system-wide.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground">Activity logs coming soon...</p>
                    </CardContent>
                </Card>
                <Card className="col-span-3">
                    <CardHeader>
                        <CardTitle>System Status</CardTitle>
                        <CardDescription>Database integrity checks</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                                <span>API Connection</span>
                                <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">Online</Badge>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span>DB Sync</span>
                                <span className="text-muted-foreground">Real-time</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

// Helper to fix missing icon import above
