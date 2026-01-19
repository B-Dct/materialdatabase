import { createContext, useContext, useState, type ReactNode } from 'react';

export type UserRole = 'viewer' | 'lab' | 'admin';

export interface User {
    id: string;
    name: string;
    role: UserRole;
}

type Permission =
    | 'view:materials'
    | 'create:material'
    | 'delete:material'
    | 'manage:materials'
    | 'import:data'
    | 'manage:users'
    | 'manage:settings'
    | 'manage:properties';

const ROLES: Record<UserRole, Permission[]> = {
    viewer: ['view:materials'],
    lab: ['view:materials', 'create:material', 'import:data', 'manage:properties'],
    admin: ['view:materials', 'create:material', 'delete:material', 'manage:materials', 'import:data', 'manage:users', 'manage:settings', 'manage:properties']
};

interface AuthContextType {
    user: User | null;
    role: UserRole;
    setRole: (role: UserRole) => void;
    can: (permission: Permission) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    // Mock user for prototype
    const [role, setRole] = useState<UserRole>('admin');

    const user: User = {
        id: 'mock-user-1',
        name: 'Demo User',
        role: role
    };

    const can = (permission: Permission) => {
        return ROLES[role].includes(permission);
    };

    return (
        <AuthContext.Provider value={{ user, role, setRole, can }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
