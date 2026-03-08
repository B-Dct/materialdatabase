import { Outlet, Link, useLocation } from "react-router-dom";
import { LayoutDashboard, Layers as LayersIcon, Atom, Settings, ClipboardList, Menu, Activity, FlaskConical, Nut, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { DevRoleSwitcher } from "@/components/auth/DevRoleSwitcher";
import { useAppStore } from "@/lib/store";

const SidebarItem = ({ href, icon: Icon, label, active, badge }: { href: string; icon: any; label: string; active: boolean; badge?: number }) => (
    <Link to={href} className="w-full block">
        <Button variant={active ? "secondary" : "ghost"} className={cn("w-full justify-start gap-2", active && "bg-muted")}>
            <Icon className="h-4 w-4" />
            <span className="flex-1 text-left">{label}</span>
            {badge !== undefined && badge > 0 && (
                <span className="bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400 text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-5 text-center">
                    {badge}
                </span>
            )}
        </Button>
    </Link>
);

export function MainLayout() {
    const { can } = useAuth();
    const location = useLocation();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    const { testRequests, fetchTestRequests } = useAppStore();

    useEffect(() => {
        if (testRequests.length === 0) fetchTestRequests();
    }, [fetchTestRequests, testRequests.length]);

    const newRequestsCount = testRequests.filter(req => req.status === 'requested').length;

    interface NavItem {
        href: string;
        label: string;
        icon: any;
        permission?: string;
        badge?: number;
    }

    interface NavGroup {
        title: string;
        items: NavItem[];
    }

    const navGroups: NavGroup[] = [
        {
            title: "Overview",
            items: [
                { href: "/", label: "Dashboard", icon: LayoutDashboard },
            ]
        },
        {
            title: "Engineering",
            items: [
                { href: "/projects", label: "Projects", icon: Briefcase },
                { href: "/assemblies", label: "Assemblies", icon: LayersIcon },
                { href: "/layups", label: "Layups", icon: LayersIcon },
            ]
        },
        {
            title: "Database",
            items: [
                { href: "/materials", label: "Materials", icon: Atom },
                { href: "/parts", label: "Standard Parts", icon: Nut },
                { href: "/standards", label: "Standards", icon: ClipboardList },
                { href: "/database/properties", label: "Properties", icon: ClipboardList },
            ]
        },
        {
            title: "Lab",
            items: [
                { href: "/quality/analysis", label: "Analysis", icon: Activity },
                { href: "/quality/requests", label: "Requests", icon: ClipboardList, badge: newRequestsCount },
                { href: "/quality/measurements", label: "Measurements", icon: FlaskConical },
                { href: "/quality/test-methods", label: "Test Methods", icon: FlaskConical },
                { href: "/quality/laboratories", label: "Laboratories", icon: FlaskConical },
            ]
        },
        {
            title: "System",
            items: [
                { href: "/imports", label: "Data Imports", icon: ClipboardList, permission: 'import:data' },
            ]
        }
    ];

    return (
        <div className="min-h-screen flex bg-background">
            {/* Sidebar Desktop */}
            <aside className="hidden md:flex flex-col w-64 border-r p-4 gap-4 sticky top-0 h-screen">
                <div className="flex items-center gap-2 px-2 py-4">
                    <div className="h-8 w-8 bg-primary rounded flex items-center justify-center text-primary-foreground font-bold">M</div>
                    <span className="font-bold text-lg tracking-tight">AerospaceDB</span>
                </div>

                <nav className="flex flex-col gap-4 flex-1 overflow-auto py-2">
                    {navGroups.map((group, idx) => (
                        <div key={idx} className="space-y-1">
                            {group.title !== "Overview" && (
                                <h4 className="px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 mt-2">
                                    {group.title}
                                </h4>
                            )}
                            {group.items.map((item) => {
                                if (item.permission && !can(item.permission as any)) return null;
                                return (
                                    <SidebarItem
                                        key={item.href}
                                        href={item.href}
                                        icon={item.icon}
                                        label={item.label}
                                        active={location.pathname === item.href || (item.href !== '/' && location.pathname.startsWith(item.href))}
                                        badge={item.badge}
                                    />
                                )
                            })}
                        </div>
                    ))}

                    {/* Settings at Bottom */}
                    <div className="mt-auto pt-4 border-t">
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
                            {navGroups.flatMap(g => g.items).map((item) => {
                                if (item.permission && !can(item.permission as any)) return null;
                                return (
                                    <Link key={item.href} to={item.href} onClick={() => setMobileMenuOpen(false)} className="w-full block">
                                        <Button variant="ghost" className="w-full justify-start gap-2">
                                            <item.icon className="h-4 w-4" />
                                            <span className="flex-1 text-left">{item.label}</span>
                                            {item.badge !== undefined && item.badge > 0 && (
                                                <span className="bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400 text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-5 text-center">
                                                    {item.badge}
                                                </span>
                                            )}
                                        </Button>
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
