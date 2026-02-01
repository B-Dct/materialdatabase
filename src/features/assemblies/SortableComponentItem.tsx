import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Trash2, Box, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

import type { ComponentConfig } from '@/types/domain';

interface SortableComponentItemProps {
    id: string;
    componentType: 'layup' | 'material';
    componentName: string;
    quantity: number;
    position?: string;
    config?: ComponentConfig;
    materialType?: string;
    readonly?: boolean;
    onRemove: (id: string) => void;
    onUpdate?: (id: string, updates: any) => void;
}

export function SortableComponentItem({
    id, componentType, componentName, quantity, position, config, materialType, readonly, onRemove, onUpdate
}: SortableComponentItemProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id, disabled: readonly });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    // Helper to update config safely
    const updateConfig = (key: keyof ComponentConfig, subKey: 'min' | 'max', value: string) => {
        if (!onUpdate) return;
        const num = parseFloat(value);
        const newConfig = { ...config };

        // Ensure sub-object exists (though it should be init)
        if (key === 'coatingThickness') {
            newConfig.coatingThickness = {
                min: 0, max: 0, unit: 'µm',
                ...newConfig.coatingThickness,
                [subKey]: isNaN(num) ? 0 : num
            };
        }
        if (key === 'adhesiveGrammage') {
            newConfig.adhesiveGrammage = {
                min: 0, max: 0, unit: 'g/m²',
                ...newConfig.adhesiveGrammage,
                [subKey]: isNaN(num) ? 0 : num
            };
        }

        onUpdate(id, { config: newConfig });
    };

    // Detect if we should show inputs based on config presence OR materialType hints
    // Ideally rely on config being present (initialized by parent)
    const showCoating = !!config?.coatingThickness;
    const showAdhesive = !!config?.adhesiveGrammage;

    return (
        <div ref={setNodeRef} style={style} className="flex items-start gap-3 bg-background border rounded-md p-3 shadow-sm group">
            {!readonly && (
                <div {...attributes} {...listeners} className="mt-2 cursor-grab text-muted-foreground hover:text-foreground">
                    <GripVertical className="h-5 w-5" />
                </div>
            )}

            <div className={`mt-1 p-2 rounded-md ${componentType === 'layup' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>
                {componentType === 'layup' ? <Layers className="h-5 w-5" /> : <Box className="h-5 w-5" />}
            </div>

            <div className="flex-1 min-w-0 space-y-2">
                <div className="flex items-center gap-2">
                    <span className="font-medium text-sm truncate">{componentName}</span>
                    <Badge variant="outline" className="text-[10px] uppercase">{componentType}</Badge>
                    {materialType && <Badge variant="secondary" className="text-[10px]">{materialType}</Badge>}
                </div>

                {/* Standard Qty/Pos - Read Only for now? Or editable? Keeping basic text as per previous design unless requested */}
                <div className="text-xs text-muted-foreground">
                    Qty: {quantity} {position ? `• Pos: ${position}` : ''}
                </div>

                {/* Specific Config Inputs */}
                {showCoating && (
                    <div className="grid grid-cols-2 gap-2 bg-muted/30 p-2 rounded text-xs">
                        <div className="col-span-2 font-medium text-muted-foreground">Coating Thickness (µm)</div>
                        <div className="flex items-center gap-1">
                            <span className="w-6">Min:</span>
                            <Input
                                type="number"
                                className="h-6 text-xs"
                                value={config?.coatingThickness?.min || ''}
                                onChange={e => updateConfig('coatingThickness', 'min', e.target.value)}
                                disabled={readonly}
                            />
                        </div>
                        <div className="flex items-center gap-1">
                            <span className="w-6">Max:</span>
                            <Input
                                type="number"
                                className="h-6 text-xs"
                                value={config?.coatingThickness?.max || ''}
                                onChange={e => updateConfig('coatingThickness', 'max', e.target.value)}
                                disabled={readonly}
                            />
                        </div>
                    </div>
                )}

                {showAdhesive && (
                    <div className="grid grid-cols-2 gap-2 bg-muted/30 p-2 rounded text-xs">
                        <div className="col-span-2 font-medium text-muted-foreground">Grammage (g/m²)</div>
                        <div className="flex items-center gap-1">
                            <span className="w-6">Min:</span>
                            <Input
                                type="number"
                                className="h-6 text-xs"
                                value={config?.adhesiveGrammage?.min || ''}
                                onChange={e => updateConfig('adhesiveGrammage', 'min', e.target.value)}
                                disabled={readonly}
                            />
                        </div>
                        <div className="flex items-center gap-1">
                            <span className="w-6">Max:</span>
                            <Input
                                type="number"
                                className="h-6 text-xs"
                                value={config?.adhesiveGrammage?.max || ''}
                                onChange={e => updateConfig('adhesiveGrammage', 'max', e.target.value)}
                                disabled={readonly}
                            />
                        </div>
                    </div>
                )}
            </div>

            {!readonly && (
                <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => onRemove(id)}>
                    <Trash2 className="h-4 w-4" />
                </Button>
            )}
        </div>
    );
}
