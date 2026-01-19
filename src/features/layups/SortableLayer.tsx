import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SortableLayerProps {
    id: string;
    variantName: string;
    orientation: number;
    index: number;
    onRemove: (id: string) => void;
    onOrientationChange: (id: string, newOrientation: number) => void;
    materialType?: string;
    readonly?: boolean;
}

export function SortableLayer({ id, variantName, orientation, index, onRemove, onOrientationChange, materialType, readonly }: SortableLayerProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
    } = useSortable({ id, disabled: readonly }); // Disable drag if readonly

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    // Check if orientation should be visible
    // "Prepreg" or "Gewebe" (Fabric)
    const typeLower = (materialType || "").toLowerCase();
    const showOrientation = typeLower.includes("prepreg") || typeLower.includes("gewebe") || typeLower.includes("fabric");

    return (
        <div ref={setNodeRef} style={style} className="flex items-center gap-4 p-2 bg-card border rounded-md mb-2">
            {!readonly && (
                <div {...attributes} {...listeners} className="cursor-grab text-muted-foreground hover:text-foreground">
                    <GripVertical className="h-5 w-5" />
                </div>
            )}

            <div className="flex-1">
                <div className="text-sm font-medium">Layer {index + 1}: {variantName}</div>
                {materialType && <div className="text-xs text-muted-foreground">{materialType}</div>}
            </div>

            {showOrientation && (
                <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Orientation:</span>
                    {readonly ? (
                        <span className="text-sm font-medium">{orientation}°</span>
                    ) : (
                        <select
                            className="h-8 rounded border bg-background px-2 text-sm"
                            value={orientation}
                            onChange={(e) => onOrientationChange(id, Number(e.target.value))}
                        >
                            <option value={0}>0°</option>
                            <option value={45}>+45°</option>
                            <option value={-45}>-45°</option>
                            <option value={90}>90°</option>
                        </select>
                    )}
                </div>
            )}

            {!readonly && (
                <Button variant="ghost" size="icon" onClick={() => onRemove(id)} className="text-destructive hover:text-destructive hover:bg-destructive/10">
                    <X className="h-4 w-4" />
                </Button>
            )}
        </div>
    );
}
