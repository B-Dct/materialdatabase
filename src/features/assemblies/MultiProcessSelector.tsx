import { useState, useEffect } from "react";
import { useAppStore } from "@/lib/store";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";

interface MultiProcessSelectorProps {
    selectedIds: string[];
    onChange: (ids: string[]) => void;
    readonly?: boolean;
}

export function MultiProcessSelector({ selectedIds, onChange, readonly = false }: MultiProcessSelectorProps) {
    const { processes, fetchProcesses } = useAppStore();
    const [open, setOpen] = useState(false);

    useEffect(() => {
        if (processes.length === 0) fetchProcesses();
    }, [fetchProcesses, processes.length]);

    const selectedProcesses = processes.filter(p => selectedIds.includes(p.id));

    if (readonly) {
        if (selectedIds.length === 0) return <span className="text-sm text-muted-foreground">-</span>;
        return (
            <div className="flex flex-wrap gap-1">
                {selectedProcesses.map(p => (
                    <Badge key={p.id} variant="outline">{p.name}</Badge>
                ))}
            </div>
        );
    }

    const toggleProcess = (id: string) => {
        if (selectedIds.includes(id)) {
            onChange(selectedIds.filter(i => i !== id));
        } else {
            onChange([...selectedIds, id]);
        }
    };

    return (
        <div className="space-y-2">
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button variant="outline" role="combobox" aria-expanded={open} className="w-full justify-between">
                        {selectedIds.length > 0 ? `${selectedIds.length} processes selected` : "Select processes..."}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[300px] p-0">
                    <Command>
                        <CommandInput placeholder="Search process..." />
                        <CommandList>
                            <CommandEmpty>No process found.</CommandEmpty>
                            <CommandGroup>
                                {processes.map((process) => (
                                    <CommandItem
                                        key={process.id}
                                        value={process.name}
                                        onSelect={() => toggleProcess(process.id)}
                                    >
                                        <Check
                                            className={cn(
                                                "mr-2 h-4 w-4",
                                                selectedIds.includes(process.id) ? "opacity-100" : "opacity-0"
                                            )}
                                        />
                                        {process.name}
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        </CommandList>
                    </Command>
                </PopoverContent>
            </Popover>

            {/* Selected Tags Display */}
            <div className="flex flex-wrap gap-2">
                {selectedProcesses.map(p => (
                    <Badge key={p.id} variant="secondary" className="pl-2 pr-1 py-1">
                        {p.name}
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-4 w-4 ml-1 hover:bg-transparent text-muted-foreground hover:text-foreground"
                            onClick={() => toggleProcess(p.id)}
                        >
                            <X className="h-3 w-3" />
                        </Button>
                    </Badge>
                ))}
            </div>
        </div>
    );
}
