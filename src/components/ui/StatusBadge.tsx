import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { EntityStatus } from "@/types/domain";

interface StatusBadgeProps {
    status: EntityStatus | string;
    className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
    const getStyle = (s: string) => {
        switch (s) {
            case 'active':
                return "bg-green-100 text-green-800 hover:bg-green-100/80 border-transparent"; // Active: Dunkelgrüne Schrift auf hellgrünem Hintergrund
            case 'standard':
                return "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200"; // Standard: Softer emerald style
            case 'obsolete':
                return "bg-black text-red-500 hover:bg-black/80 border-transparent"; // Obsolete: Rote Schrift auf schwarzem Hintergrund
            case 'engineering':
                return "bg-gray-200 text-black hover:bg-gray-200/80 border-transparent"; // Engineering: Schwarze Schrift auf hellgrauem Hintergrund
            case 'restricted':
                return "bg-red-100 text-red-800 hover:bg-red-100/80 border-transparent"; // Restricted: Dunkelrote Schrift auf hellrotem Hintergrund
            default:
                return "bg-secondary text-secondary-foreground hover:bg-secondary/80 border-transparent";
        }
    };

    return (
        <Badge className={cn("uppercase font-medium", getStyle(status), className)} variant="outline">
            {status}
        </Badge>
    );
}
