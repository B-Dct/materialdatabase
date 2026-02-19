import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// import { ScrollArea } from "@/components/ui/scroll-area";
import { History, Send, User, Trash2 } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { format } from "date-fns";

interface HistoryLogProps {
    entityId: string;
    entityType: 'material' | 'layup' | 'assembly';
}

export function HistoryLog({ entityId, entityType }: HistoryLogProps) {
    const { history, fetchHistory, addHistoryEntry, deleteHistoryEntry } = useAppStore();
    const [newComment, setNewComment] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (entityId) {
            fetchHistory(entityId, entityType);
        }
    }, [entityId, entityType, fetchHistory]);

    const handleSubmit = async () => {
        if (!newComment.trim()) return;
        setIsSubmitting(true);
        try {
            await addHistoryEntry({
                entityId,
                entityType,
                content: newComment
            });
            setNewComment("");
        } catch (error) {
            console.error("Failed to add comment:", error);
            alert("Could not save comment. Check if you are logged in or have permissions.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this comment?")) return;
        try {
            await deleteHistoryEntry(id);
        } catch (error) {
            console.error("Failed to delete comment:", error);
            alert("Could not delete comment.");
        }
    };

    const sortedHistory = [...history].sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return (
        <Card className="h-full flex flex-col">
            <CardHeader className="pb-3 border-b bg-muted/20">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <History className="h-4 w-4" />
                    History & Comments
                </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 p-0 flex flex-col min-h-[300px]">
                <div className="flex-1 p-4 overflow-y-auto max-h-[500px]">
                    <div className="space-y-6">
                        {sortedHistory.length === 0 ? (
                            <p className="text-xs text-muted-foreground text-center py-8">
                                No history yet. Add a comment to start.
                            </p>
                        ) : (
                            sortedHistory.map((item) => (
                                <div key={item.id} className="relative pl-6 pb-2 last:pb-0 group">
                                    {/* Timeline line */}
                                    <div className="absolute left-0 top-1 bottom-0 w-px bg-border" />
                                    <div className="absolute left-[-4px] top-1.5 h-2 w-2 rounded-full bg-primary" />

                                    <div className="flex flex-col gap-1">
                                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                                            <div className="flex items-center gap-2">
                                                <span className="font-mono">{format(new Date(item.createdAt), "yyyy-MM-dd HH:mm")}</span>
                                                <span>•</span>
                                                <span className="flex items-center gap-1">
                                                    <User className="h-3 w-3" />
                                                    User
                                                </span>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                                onClick={() => handleDelete(item.id)}
                                            >
                                                <Trash2 className="h-3 w-3 text-destructive" />
                                            </Button>
                                        </div>
                                        <div className="text-sm bg-muted/30 p-2 rounded-md border">
                                            {item.content}
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                <div className="p-4 border-t bg-background mt-auto">
                    <div className="flex gap-2">
                        <Textarea
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            placeholder="Add a remark..."
                            className="min-h-[40px] h-[40px] resize-none py-2 text-sm"
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSubmit();
                                }
                            }}
                        />
                        <Button
                            size="icon"
                            onClick={handleSubmit}
                            disabled={!newComment.trim() || isSubmitting}
                        >
                            <Send className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
