import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Material } from "@/types/domain";
import { Activity, ClipboardCheck, Calendar, FlaskConical, FileCheck } from "lucide-react";

interface MaterialStatisticsProps {
    material: Material;
}

export function MaterialStatistics({ material }: MaterialStatisticsProps) {
    // 1. Specifications/Standards
    const standardCount = material.assignedProfileIds?.length || 0;

    // 2. Properties (Specs)
    // Counting properties that have a "specification" field filled or simple count
    const propertyCount = material.properties?.length || 0;
    const specifiedProperties = material.properties?.filter(p => p.specification).length || 0;

    // 3. Tests
    const testCount = material.measurements?.length || 0;

    // 4. Last Test Date
    const lastTestDate = material.measurements?.length
        ? new Date(Math.max(...material.measurements.map(m => new Date(m.date).getTime()))).toLocaleDateString()
        : 'N/A';

    // 5. Creation Age
    const creationDate = material.createdAt ? new Date(material.createdAt) : new Date();
    const isValidDate = !isNaN(creationDate.getTime());
    const daysSinceCreation = isValidDate
        ? Math.floor((new Date().getTime() - creationDate.getTime()) / (1000 * 3600 * 24))
        : 0;
    const creationDateString = isValidDate ? creationDate.toLocaleDateString() : 'Unknown';

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Defined Properties</CardTitle>
                    <ClipboardCheck className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{propertyCount}</div>
                    <p className="text-xs text-muted-foreground">
                        {specifiedProperties} with specific context
                    </p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Assigned Standards</CardTitle>
                    <FileCheck className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{standardCount}</div>
                    <p className="text-xs text-muted-foreground">
                        Compliance profiles
                    </p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Tests Performed</CardTitle>
                    <FlaskConical className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{testCount}</div>
                    <p className="text-xs text-muted-foreground">
                        Last test: {lastTestDate}
                    </p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Material Age</CardTitle>
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{daysSinceCreation} Days</div>
                    <p className="text-xs text-muted-foreground">
                        Created on {creationDateString}
                    </p>
                </CardContent>
            </Card>

            {/* Reliability Score Placeholder */}
            <Card className="col-span-full md:col-span-2">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Data Completeness</CardTitle>
                    <Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">
                        {Math.min(100, (propertyCount * 10) + (testCount * 5))}%
                    </div>
                    <div className="h-2 w-full bg-secondary mt-2 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-primary transition-all"
                            style={{ width: `${Math.min(100, (propertyCount * 10) + (testCount * 5))}%` }}
                        />
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                        Based on defined properties and test coverage.
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
