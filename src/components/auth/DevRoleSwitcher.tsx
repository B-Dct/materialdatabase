import { useAuth, type UserRole } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Shield, Check } from 'lucide-react';

export function DevRoleSwitcher() {
    const { role, setRole } = useAuth();

    const roles: { id: UserRole, label: string }[] = [
        { id: 'viewer', label: 'Viewer (Read-only)' },
        { id: 'lab', label: 'Lab Technician' },
        { id: 'admin', label: 'Admin' },
    ];

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                    <Shield className="h-4 w-4" />
                    <span className="hidden md:inline">Role: {role.charAt(0).toUpperCase() + role.slice(1)}</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuLabel>Dev: Switch Role</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {roles.map((r) => (
                    <DropdownMenuItem key={r.id} onClick={() => setRole(r.id)}>
                        <div className="flex items-center justify-between w-full">
                            <span>{r.label}</span>
                            {role === r.id && <Check className="h-4 w-4" />}
                        </div>
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
