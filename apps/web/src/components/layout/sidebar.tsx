'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    LayoutDashboard,
    ClipboardList,
    Package,
    Building2,
    BookOpen,
    BarChart3,
    Settings,
    ChevronLeft,
    ChevronRight,
    LogOut,
    Users,
    Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';

const navItems = [
    { name: 'Panel Principal', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Solicitudes', href: '/solicitudes', icon: ClipboardList },
    { name: 'Materia Prima', href: '/materia-prima', icon: Package },
    { name: 'Empresas', href: '/empresas', icon: Building2 },
    { name: 'Productos', href: '/productos', icon: BookOpen },
    { name: 'Usuarios', href: '/usuarios', icon: Users },
    { name: 'Reportes', href: '/reportes', icon: BarChart3 },
];

export default function Sidebar({
    isCollapsed,
    setIsCollapsed
}: {
    isCollapsed: boolean;
    setIsCollapsed: (v: boolean) => void
}) {
    const pathname = usePathname();

    const handleLogout = async () => {
        await supabase.auth.signOut();
        window.location.href = '/login';
    };

    return (
        <aside
            className={cn(
                "h-screen bg-surface border-r border-border flex flex-col fixed left-0 top-0 transition-all duration-300 z-50",
                isCollapsed ? "w-20" : "w-64"
            )}
        >
            <div className={cn(
                "p-6 flex items-center transition-all duration-300",
                isCollapsed ? "justify-center p-4" : "gap-4"
            )}>
                <div className={cn(
                    "relative flex items-center justify-center transition-all duration-300",
                    isCollapsed ? "w-10 h-10" : "w-full"
                )}>
                    <img
                        src="/shades-logo.svg"
                        alt="SHADES Logo"
                        className={cn(
                            "w-full h-auto sidebar-logo",
                            isCollapsed ? "scale-[1.5]" : ""
                        )}
                        style={{
                            maxWidth: isCollapsed ? '32px' : '100%',
                            maxHeight: isCollapsed ? '32px' : 'none',
                        }}
                    />
                </div>
            </div>

            <nav className="flex-1 px-3 py-4 space-y-1">
                {navItems.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group relative",
                                isActive
                                    ? "bg-accent/10 text-accent font-bold"
                                    : "text-text-muted hover:bg-surface-2 hover:text-foreground"
                            )}
                        >
                            <item.icon size={20} className={cn(
                                "transition-transform group-hover:scale-110",
                                isActive ? "scale-110" : ""
                            )} />
                            {!isCollapsed && <span className="text-sm tracking-tight">{item.name}</span>}
                            {isActive && !isCollapsed && (
                                <div className="absolute right-2 w-1.5 h-1.5 rounded-full bg-accent" />
                            )}
                        </Link>
                    );
                })}
            </nav>

            <div className="p-3 border-t border-border space-y-1">
                <Link
                    href="/settings"
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-text-muted hover:bg-surface-2 hover:text-foreground transition-all"
                >
                    <Settings size={20} />
                    {!isCollapsed && <span className="font-semibold text-sm">Configuración</span>}
                </Link>
                <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-text-muted hover:bg-danger/10 hover:text-danger transition-all"
                >
                    <LogOut size={20} />
                    {!isCollapsed && <span className="font-semibold text-sm">Cerrar Sesión</span>}
                </button>
            </div>
        </aside>
    );
}
