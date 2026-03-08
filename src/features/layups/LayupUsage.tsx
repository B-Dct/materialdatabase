import { useState, useEffect } from "react";
import { Briefcase, Loader2 } from "lucide-react";
import type { Layup } from "@/types/domain";
import type { MaterialUsageRecord } from "@/lib/storage/types";
import { storage } from "@/lib/store";
import { Link } from "react-router-dom";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface LayupUsageProps {
    layup: Layup;
}

export function LayupUsage({ layup }: LayupUsageProps) {
    const [records, setRecords] = useState<MaterialUsageRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;
        const fetchUsage = async () => {
            setIsLoading(true);
            try {
                const data = await storage.getLayupProjectUsage(layup.id);
                if (isMounted) {
                    setRecords(data);
                }
            } catch (error) {
                console.error("Failed to load layup project usage", error);
            } finally {
                if (isMounted) {
                    setIsLoading(false);
                }
            }
        };

        if (layup.id) {
            fetchUsage();
        } else {
            setIsLoading(false);
        }

        return () => {
            isMounted = false;
        };
    }, [layup.id]);

    if (isLoading) {
        return (
            <div className="py-12 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    if (records.length === 0) {
        return (
            <div className="py-12 text-center border-2 border-dashed rounded-lg bg-muted/10 text-muted-foreground">
                <Briefcase className="mx-auto h-12 w-12 opacity-50 mb-3" />
                <h3 className="text-lg font-medium">No Project usage found</h3>
                <p className="text-sm">This layup is not currently assigned to any projects.</p>
            </div>
        );
    }

    return (
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Project Name</TableHead>
                        <TableHead>Project Status</TableHead>
                        <TableHead>List Name</TableHead>
                        <TableHead>List Revision</TableHead>
                        <TableHead>List Status</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {records.map((record) => (
                        <TableRow key={record.listId}>
                            <TableCell className="font-medium">
                                <Link to={`/projects/${record.projectId}`} className="text-primary hover:underline">
                                    {record.projectName}
                                </Link>
                            </TableCell>
                            <TableCell>
                                <Badge variant="outline">{record.projectStatus}</Badge>
                            </TableCell>
                            <TableCell>{record.listName}</TableCell>
                            <TableCell>Issue {record.listRevision}</TableCell>
                            <TableCell>
                                <Badge variant={record.listStatus === 'approved' ? 'default' : record.listStatus === 'frozen' ? 'secondary' : 'outline'}>
                                    {record.listStatus}
                                </Badge>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
