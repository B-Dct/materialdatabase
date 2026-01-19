import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Layup } from "@/types/domain";
import { Activity, Layers, Scale, Ruler } from "lucide-react";

interface LayupStatisticsProps {
    layup: Layup;
}

export function LayupStatistics({ layup }: LayupStatisticsProps) {
    const layerCount = layup.layers?.length || 0;

    // Safely calculate creation date
    const creationDate = layup.createdAt ? new Date(layup.createdAt) : new Date();
    const isValidDate = !isNaN(creationDate.getTime());


    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Layers</CardTitle>
                    <Layers className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{layerCount}</div>
                    <p className="text-xs text-muted-foreground">
                        Stack count
                    </p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Thickness</CardTitle>
                    <Ruler className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{(layup.totalThickness || 0).toFixed(2)} mm</div>
                    <p className="text-xs text-muted-foreground">
                        Theoretical
                    </p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Weight</CardTitle>
                    <Scale className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{(layup.totalWeight || 0).toFixed(0)} g</div>
                    <p className="text-xs text-muted-foreground">
                        / m² estimate
                    </p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Tests Performed</CardTitle>
                    <Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{layup.measurements?.length || 0}</div>
                    <p className="text-xs text-muted-foreground">
                        Since {isValidDate ? creationDate.toLocaleDateString() : '-'}
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
