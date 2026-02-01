import { useState, useEffect } from "react";

import { useAppStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Award, Plus, X, ChevronDown, ChevronRight, FileText } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import { Fragment } from "react";

interface EntityStandardsManagerProps {
    assignedProfileIds: string[];
    onAssign: (profileId: string) => Promise<void>;
    onUnassign: (profileId: string) => Promise<void>;
    title?: string;
    description?: string;
}

export function EntityStandardsManager({
    assignedProfileIds = [],
    onAssign,
    onUnassign,
    title = "Assigned Standards & Requirements",
    description = "Manage compliance profiles and standards assigned to this item."
}: EntityStandardsManagerProps) {
    const { requirementProfiles, fetchRequirementProfiles, properties, fetchProperties } = useAppStore();
    const [isAssignOpen, setIsAssignOpen] = useState(false);
    const [expandedProfileId, setExpandedProfileId] = useState<string | null>(null);

    useEffect(() => {
        if (requirementProfiles.length === 0) fetchRequirementProfiles();
        if (properties.length === 0) fetchProperties();
    }, [requirementProfiles.length, properties.length, fetchRequirementProfiles, fetchProperties]);

    const assignedProfiles = requirementProfiles.filter(p => assignedProfileIds.includes(p.id));
    const availableProfiles = requirementProfiles.filter(p => !assignedProfileIds.includes(p.id));

    const handleAssign = async (profileId: string) => {
        await onAssign(profileId);
        setIsAssignOpen(false);
    };

    const handleUnassign = async (e: React.MouseEvent, profileId: string) => {
        e.stopPropagation();
        await onUnassign(profileId);
    };

    const toggleExpand = (profileId: string) => {
        setExpandedProfileId(current => current === profileId ? null : profileId);
    };

    const getPropertyName = (id: string) => properties.find(p => p.id === id)?.name || id;

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>{title}</CardTitle>
                    <CardDescription>{description}</CardDescription>
                </div>
                <Dialog open={isAssignOpen} onOpenChange={setIsAssignOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="mr-2 h-4 w-4" /> Assign Standard
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[600px]">
                        <DialogHeader>
                            <DialogTitle>Assign Standard</DialogTitle>
                            <DialogDescription>
                                Select a requirement profile to assign.
                            </DialogDescription>
                        </DialogHeader>
                        <Command className="rounded-lg border shadow-md">
                            <CommandInput placeholder="Search standards..." />
                            <CommandList className="max-h-[500px]">
                                <CommandEmpty>No fitting standard found.</CommandEmpty>
                                <CommandGroup heading="Available Standards">
                                    {availableProfiles.map((profile) => (
                                        <CommandItem
                                            key={profile.id}
                                            value={`${profile.name} ${profile.description || ""} ${profile.id}`}
                                            onSelect={() => handleAssign(profile.id)}
                                            className="cursor-pointer py-3 aria-selected:bg-accent"
                                        >
                                            <div
                                                className="flex items-center justify-between w-full gap-4 pointer-events-auto"
                                                onClick={(e) => {
                                                    // Force selection on click if CommandItem doesn't trigger
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    handleAssign(profile.id);
                                                }}
                                            >
                                                <div className="flex flex-col gap-1 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <Award className="h-4 w-4 text-primary shrink-0" />
                                                        <span className="font-medium truncate">{profile.name}</span>
                                                    </div>
                                                    {profile.description && (
                                                        <span className="text-xs text-muted-foreground ml-6 line-clamp-1 truncate">
                                                            {profile.description}
                                                        </span>
                                                    )}
                                                </div>
                                                <Badge variant="secondary" className="shrink-0">
                                                    {profile.rules?.length || 0} Req.
                                                </Badge>
                                            </div>
                                        </CommandItem>
                                    ))}
                                </CommandGroup>
                            </CommandList>
                        </Command>
                    </DialogContent>
                </Dialog>
            </CardHeader>
            <CardContent>
                {assignedProfiles.length === 0 ? (
                    <div className="text-center py-12 border-2 border-dashed rounded-lg bg-muted/10">
                        <Award className="mx-auto h-12 w-12 text-muted-foreground/50 mb-3" />
                        <h3 className="text-lg font-medium text-muted-foreground">No Standards Assigned</h3>
                        <p className="text-sm text-muted-foreground mt-1 mb-4">
                            Assign a standard to define requirement rules.
                        </p>
                    </div>
                ) : (
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[30px]"></TableHead>
                                    <TableHead>Standard Name</TableHead>
                                    <TableHead>Description</TableHead>
                                    <TableHead>Requirements</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {assignedProfiles.map((profile) => {
                                    const isExpanded = expandedProfileId === profile.id;
                                    return (
                                        <Fragment key={profile.id}>
                                            <TableRow
                                                className="cursor-pointer hover:bg-muted/50 data-[state=selected]:bg-muted"
                                                onClick={() => toggleExpand(profile.id)}
                                                data-state={isExpanded ? "selected" : undefined}
                                            >
                                                <TableCell>
                                                    {isExpanded ? (
                                                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                                    ) : (
                                                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                                    )}
                                                </TableCell>
                                                <TableCell className="font-medium">
                                                    <div className="flex items-center gap-2">
                                                        <Award className="h-4 w-4 text-primary" />
                                                        {profile.name}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-muted-foreground">
                                                    {profile.description || "-"}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="secondary">
                                                        {profile.rules?.length || 0} Rules
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="text-muted-foreground hover:text-destructive"
                                                        onClick={(e) => handleUnassign(e, profile.id)}
                                                    >
                                                        <X className="h-4 w-4" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>

                                            {/* Collapsible Content Row */}
                                            {isExpanded && (
                                                <TableRow className="hover:bg-transparent bg-muted/30">
                                                    <TableCell colSpan={5} className="p-4 pt-2">
                                                        <div className="pl-9 space-y-3">
                                                            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                                                                <FileText className="h-3 w-3" /> Requirement Rules
                                                            </h4>
                                                            <div className="rounded-md border bg-background">
                                                                <Table>
                                                                    <TableHeader>
                                                                        <TableRow className="h-8 hover:bg-transparent">
                                                                            <TableHead className="h-8 text-xs font-semibold">Property</TableHead>
                                                                            <TableHead className="h-8 text-xs font-semibold">Target</TableHead>
                                                                            <TableHead className="h-8 text-xs font-semibold">Min</TableHead>
                                                                            <TableHead className="h-8 text-xs font-semibold">Max</TableHead>
                                                                            <TableHead className="h-8 text-xs font-semibold">Unit</TableHead>
                                                                            <TableHead className="h-8 text-xs font-semibold">Method</TableHead>
                                                                        </TableRow>
                                                                    </TableHeader>
                                                                    <TableBody>
                                                                        {profile.rules?.map((rule, idx) => (
                                                                            <TableRow key={idx} className="h-9 hover:bg-transparent">
                                                                                <TableCell className="py-1 font-medium text-sm">
                                                                                    {getPropertyName(rule.propertyId)}
                                                                                </TableCell>
                                                                                <TableCell className="py-1 text-sm">{rule.target ?? "-"}</TableCell>
                                                                                <TableCell className="py-1 text-sm">{rule.min ?? "-"}</TableCell>
                                                                                <TableCell className="py-1 text-sm">{rule.max ?? "-"}</TableCell>
                                                                                <TableCell className="py-1 text-xs text-muted-foreground">{rule.unit ?? "-"}</TableCell>
                                                                                <TableCell className="py-1 text-xs text-muted-foreground">{rule.method ?? "-"}</TableCell>
                                                                            </TableRow>
                                                                        ))}
                                                                        {(!profile.rules || profile.rules.length === 0) && (
                                                                            <TableRow>
                                                                                <TableCell colSpan={6} className="text-center text-muted-foreground py-4 text-xs">
                                                                                    No rules defined.
                                                                                </TableCell>
                                                                            </TableRow>
                                                                        )}
                                                                    </TableBody>
                                                                </Table>
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </Fragment>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
