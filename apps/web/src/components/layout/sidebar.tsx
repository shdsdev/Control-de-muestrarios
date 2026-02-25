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
            <div className="p-6 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center shrink-0 shadow-[0_0_15px_var(--glow)]">
                    <Zap className="text-text-inverse fill-text-inverse" size={18} />
                </div>
                {!isCollapsed && (
                    <span className="font-black text-xl text-foreground tracking-tighter uppercase italic">SHADES</span>
                )}
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
