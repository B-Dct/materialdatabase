import { useAuth } from '@/lib/auth';
import { type ReactNode } from 'react';

interface ProtectProps {
    permission: 'view:materials' | 'create:material' | 'delete:material' | 'import:data' | 'manage:users' | 'manage:settings';
    children: ReactNode;
    fallback?: ReactNode;
}

export function Protect({ permission, children, fallback = null }: ProtectProps) {
    const { can } = useAuth();

    if (!can(permission)) {
        return <>{fallback}</>;
    }

    return <>{children}</>;
}
