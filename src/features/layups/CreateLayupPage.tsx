import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { LayupStackEditor } from './LayupStackEditor';
import { Link } from 'react-router-dom';

export function CreateLayupPage() {
    const navigate = useNavigate();

    const handleSaveSuccess = () => {
        // Navigate back to list on success
        navigate('/layups');
    };

    return (
        <div className="flex flex-col h-full bg-background animate-in fade-in">
            {/* Header */}
            <div className="border-b px-6 py-4 flex items-center justify-between bg-card text-card-foreground shadow-sm">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" asChild>
                        <Link to="/layups">
                            <ArrowLeft className="h-5 w-5" />
                        </Link>
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Create New Layup</h1>
                        <p className="text-sm text-muted-foreground">Define stack sequence and properties.</p>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden p-6">
                <LayupStackEditor
                    readonly={false}
                    onSaveSuccess={handleSaveSuccess}
                />
            </div>
        </div>
    );
}
