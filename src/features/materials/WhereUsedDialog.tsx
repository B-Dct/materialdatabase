import { useState } from 'react';
import { useAppStore } from '@/lib/store';
import type { Layup } from '@/types/domain';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Layers } from 'lucide-react';

interface WhereUsedDialogProps {
    variantId: string;
    materialName: string;
}

export function WhereUsedDialog({ variantId, materialName }: WhereUsedDialogProps) {
    const { getLayupsByVariant } = useAppStore();
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [usageList, setUsageList] = useState<Layup[]>([]);

    const handleOpen = async (open: boolean) => {
        setIsOpen(open);
        if (open) {
            setLoading(true);
            try {
                const results = await getLayupsByVariant(variantId);
                setUsageList(results);
            } finally {
                setLoading(false);
            }
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <Layers className="h-4 w-4" />
                    <span className="sr-only">Check usage</span>
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Usage: {materialName}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                    {loading ? (
                        <div className="flex justify-center py-4">
                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                    ) : usageList.length === 0 ? (
                        <p className="text-center text-muted-foreground py-4">
                            This material is not used in any layups.
                        </p>
                    ) : (
                        <ul className="space-y-2">
                            {usageList.map((layup) => (
                                <li key={layup.id} className="p-2 border rounded-md flex justify-between items-center">
                                    <span className="font-medium">{layup.name}</span>
                                    <span className="text-xs text-muted-foreground">{layup.status}</span>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
