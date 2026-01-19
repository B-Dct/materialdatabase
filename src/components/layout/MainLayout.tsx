import { Outlet, Link, useLocation } from "react-router-dom";
import { LayoutDashboard, Layers as LayersIcon, Atom, Settings, ClipboardList, Menu, Activity, FlaskConical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { DevRoleSwitcher } from "@/components/auth/DevRoleSwitcher";

const SidebarItem = ({ href, icon: Icon, label, active }: { href: string; icon: any; label: string; active: boolean }) => (
    <Link to={href}>
        <Button variant={active ? "secondary" : "ghost"} className={cn("w-full justify-start gap-2", active && "bg-muted")}>
            <Icon className="h-4 w-4" />
            {label}
        </Button>
    </Link>
);

export function MainLayout() {
    const { can } = useAuth();
    const location = useLocation();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    interface NavItem {
        href: string;
        label: string;
        icon: any;
        permission?: string;
    }

    const mainFnItems: NavItem[] = [
        { href: "/", label: "Dashboard", icon: LayoutDashboard },
        { href: "/materials", label: "Materials", icon: Atom },
        { href: "/layups", label: "Layups", icon: LayersIcon },
        { href: "/assemblies", label: "Assemblies", icon: LayersIcon },
        { href: "/quality/analysis", label: "Analysis", icon: Activity },
    ];

    const configItems: NavItem[] = [
        { href: "/quality/measurements", label: "Measurements", icon: FlaskConical },
        { href: "/standards", label: "Standards", icon: ClipboardList },
        { href: "/imports", label: "Data Imports", icon: ClipboardList, permission: 'import:data' },
    ];

    return (
        <div className="min-h-screen flex bg-background">
            {/* Sidebar Desktop */}
            <aside className="hidden md:flex flex-col w-64 border-r p-4 gap-4 sticky top-0 h-screen">
                <div className="flex items-center gap-2 px-2 py-4">
                    <div className="h-8 w-8 bg-primary rounded flex items-center justify-center text-primary-foreground font-bold">M</div>
                    <span className="font-bold text-lg tracking-tight">AerospaceDB</span>
                </div>

                <nav className="flex flex-col gap-1 flex-1 overflow-auto">
                    {/* Main Functions */}
                    <div className="space-y-1">
                        {mainFnItems.map((item) => {
                            if (item.permission && !can(item.permission as any)) return null;
                            return (
                                <SidebarItem
                                    key={item.href}
                                    href={item.href}
                                    icon={item.icon}
                                    label={item.label}
                                    active={location.pathname === item.href || (item.href !== '/' && location.pathname.startsWith(item.href))}
                                />
                            )
                        })}
                    </div>

                    {/* Configuration Section */}
                    <div className="mt-8">
                        <h4 className="px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                            Master Data
                        </h4>
                        <div className="space-y-1">
                            {configItems.map((item) => {
                                if (item.permission && !can(item.permission as any)) return null;
                                return (
                                    <SidebarItem
                                        key={item.href}
                                        href={item.href}
                                        icon={item.icon}
                                        label={item.label}
                                        active={location.pathname === item.href || (item.href !== '/' && location.pathname.startsWith(item.href))}
                                    />
                                )
                            })}
                        </div>
                    </div>

                    {/* Settings at Bottom */}
                    <div className="mt-auto pt-4">
                        {can('manage:settings') && (
                            <SidebarItem
                                href="/settings"
                                icon={Settings}
                                label="Settings"
                                active={location.pathname === '/settings'}
                            />
                        )}
                    </div>
                </nav>

                <div className="border-t pt-4">
                    <div className="px-2 text-xs text-muted-foreground uppercase font-bold mb-2">User</div>
                    <div className="px-2 mb-2">
                        <DevRoleSwitcher />
                    </div>
                    <div className="flex items-center gap-2 px-2 mb-2">
                        <div className="h-8 w-8 rounded-full bg-zinc-200 dark:bg-zinc-800" />
                        <div className="text-sm">
                            <p className="font-medium">Engineer</p>
                            <p className="text-xs text-muted-foreground">Admin Access</p>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Mobile Header */}
            <div className="flex-1 flex flex-col">
                <header className="md:hidden border-b p-4 flex items-center justify-between bg-background sticky top-0 z-10">
                    <div className="font-bold">AerospaceDB</div>
                    <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
                        <Menu className="h-5 w-5" />
                    </Button>
                </header>

                {/* Mobile Menu */}
                {mobileMenuOpen && (
                    <div className="md:hidden border-b p-4 bg-background animate-in slide-in-from-top-2">
                        <nav className="flex flex-col gap-2">
                            {[...mainFnItems, ...configItems].map((item) => {
                                if (item.permission && !can(item.permission as any)) return null;
                                return (
                                    <Link key={item.href} to={item.href} onClick={() => setMobileMenuOpen(false)}>
                                        <Button variant="ghost" className="w-full justify-start">{item.label}</Button>
                                    </Link>
                                )
                            })}
                        </nav>
                    </div>
                )}

                <main className="flex-1 overflow-auto">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
