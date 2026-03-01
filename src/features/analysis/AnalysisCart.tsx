import { useAppStore } from "@/lib/store";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { X, Beaker, Layers, Box } from "lucide-react";

export function AnalysisCart() {
    const { analysisCart, removeFromAnalysisCart, materials, layups, assemblies } = useAppStore();

    if (analysisCart.length === 0) {
        return (
            <div className="flex items-center justify-center p-4 border border-dashed rounded-lg bg-muted/20 text-muted-foreground text-sm italic h-[60px]">
                No items selected for analysis. Use the Finder to add materials, layups, or assemblies.
            </div>
        );
    }

    return (
        <div className="flex flex-wrap gap-2 p-3 bg-card border rounded-lg shadow-sm min-h-[60px] items-center">
            {analysisCart.map(item => {
                // Find name based on type
                let name = 'Unknown';
                let Icon = Beaker;
                if (item.type === 'material') {
                    name = materials.find(m => m.id === item.id)?.name || 'Unknown Material';
                    Icon = Beaker;
                } else if (item.type === 'layup') {
                    name = layups.find(l => l.id === item.id)?.name || 'Unknown Layup';
                    Icon = Layers;
                } else if (item.type === 'assembly') {
                    name = assemblies.find(a => a.id === item.id)?.name || 'Unknown Assembly';
                    Icon = Box;
                }

                return (
                    <Badge
                        key={`${item.type}-${item.id}`}
                        variant="outline"
                        className={`flex items-center gap-1.5 py-1.5 pl-3 pr-1 bg-background border-l-4`}
                        style={{ borderLeftColor: `var(--${item.color.replace('bg-', '')})` }} // Fallback if using tailwind colors directly: we can map the class or use it directly via CSS variables if configured. For reliable UI, let's just use the strict tailwind class on a dot
                    >
                        <div className={`w-2.5 h-2.5 rounded-full ${item.color}`} />
                        <Icon className="w-3.5 h-3.5 text-muted-foreground ml-1" />
                        <span className="font-medium mr-1 text-sm max-w-[200px] truncate" title={name}>{name}</span>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5 rounded-full hover:bg-destructive/10 hover:text-destructive shrink-0"
                            onClick={() => removeFromAnalysisCart(item.id)}
                        >
                            <X className="h-3.5 w-3.5" />
                        </Button>
                    </Badge>
                );
            })}
            {analysisCart.length < 6 && (
                <div className="text-xs text-muted-foreground ml-2">
                    {analysisCart.length} / 6 Selected
                </div>
            )}
            {analysisCart.length >= 6 && (
                <div className="text-xs text-amber-600 ml-2 font-medium">
                    Cart Full (6/6)
                </div>
            )}
        </div>
    );
}
