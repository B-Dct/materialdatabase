import { Card, CardContent, CardTitle, CardHeader } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAppStore } from '@/lib/store';
import { calculateDelta, formatDelta, getDeltaColor, normalizeEntityData } from '@/features/analysis/analysis-utils'; // Adjusted import path if needed
import { CheckCircle2, AlertTriangle, XCircle, Minus } from "lucide-react";

interface RequirementComplianceViewProps {
    entityId: string;
    entityType: 'material' | 'layup';
    profileId: string;
}

export function RequirementComplianceView({ entityId, entityType, profileId }: RequirementComplianceViewProps) {
    const { materials, layups, requirementProfiles, measurements, properties } = useAppStore();

    // Ensure data is loaded (though parent usually handles this)
    // useEffect logic for fetch can be here or parent.

    const profile = requirementProfiles.find(p => p.id === profileId);

    // Find Entity
    const entity = entityType === 'material'
        ? materials.find(m => m.id === entityId)
        : layups.find(l => l.id === entityId);

    if (!profile || !entity) return null;

    // Normalize Data
    const normalized = normalizeEntityData(entity as any, entityType, measurements, properties);

    return (
        <Card className="mt-4 border-2">
            <CardHeader className="py-3 bg-muted/20">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                    Compliance Check: {profile.name}
                </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[200px]">Property</TableHead>
                            <TableHead>Requirement</TableHead>
                            <TableHead>Actual</TableHead>
                            <TableHead className="text-right">Delta</TableHead>
                            <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {profile.rules.map(rule => {
                            const propDef = properties.find(p => p.id === rule.propertyId);
                            const propName = propDef?.name || rule.propertyId;
                            const unit = rule.unit || propDef?.unit || '';

                            // Get Actual Value
                            // Check Properties first, then Metrics
                            let actualVal: number | null = null;
                            if (normalized.properties[rule.propertyId]) {
                                actualVal = normalized.properties[rule.propertyId].value;
                            } else if (normalized.metrics[rule.propertyId] !== undefined) {
                                actualVal = normalized.metrics[rule.propertyId];
                            }

                            // Compliance Check
                            let status: 'pass' | 'fail' | 'warn' | 'unknown' = 'unknown';

                            if (actualVal !== null) {
                                status = 'pass';
                                if (rule.min !== undefined && actualVal < rule.min) status = 'fail';
                                if (rule.max !== undefined && actualVal > rule.max) status = 'fail';
                                // Target Logic: +/- 5% tolerance?
                                if (rule.target && typeof rule.target === 'number') {
                                    const dev = Math.abs((actualVal - rule.target) / rule.target);
                                    if (dev > 0.1) status = 'fail'; // >10% dev
                                    else if (dev > 0.05) status = 'warn'; // >5% dev
                                }
                            }

                            // Calculate Delta (relative to Target or Min/Max avg?)
                            // Use Target if available, else Average of Min/Max?
                            let baseline = null;
                            if (typeof rule.target === 'number') baseline = rule.target;
                            else if (rule.min !== undefined && rule.max !== undefined) baseline = (rule.min + rule.max) / 2;
                            else if (rule.min !== undefined) baseline = rule.min;
                            else if (rule.max !== undefined) baseline = rule.max;

                            const delta = calculateDelta(baseline, actualVal);

                            return (
                                <TableRow key={rule.propertyId}>
                                    <TableCell className="font-medium">{propName}</TableCell>
                                    <TableCell className="text-muted-foreground text-xs">
                                        {rule.target && <span>Target: {rule.target}</span>}
                                        {rule.min !== undefined && <span> Min: {rule.min}</span>}
                                        {rule.max !== undefined && <span> Max: {rule.max}</span>}
                                        {unit && <span className="ml-1 text-[10px]">{unit}</span>}
                                    </TableCell>
                                    <TableCell className="font-mono">
                                        {actualVal !== null ? Number(actualVal).toFixed(2) : '-'}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {delta !== null && (
                                            <span className={`text-xs ${getDeltaColor(delta, false)}`}>
                                                {formatDelta(delta)}
                                            </span>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        {status === 'pass' && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                                        {status === 'fail' && <XCircle className="h-4 w-4 text-red-500" />}
                                        {status === 'warn' && <AlertTriangle className="h-4 w-4 text-yellow-500" />}
                                        {status === 'unknown' && <Minus className="h-4 w-4 text-muted-foreground" />}
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
