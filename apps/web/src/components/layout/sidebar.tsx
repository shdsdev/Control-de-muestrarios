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
    Users
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
                "h-screen bg-[#020202] border-r border-border/40 flex flex-col fixed left-0 top-0 transition-all duration-300 z-50",
                isCollapsed ? "w-20" : "w-64"
            )}
        >
            <div className="p-6 flex items-center justify-between">
                {!isCollapsed && <h1 className="text-xl font-black tracking-tighter text-white italic">SHADES</h1>}
                <button
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-primary transition-colors"
                >
                    {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
                </button>
            </div>

            <nav className="flex-1 px-3 space-y-1 mt-4">
                {navItems.map((item) => {
                    const isActive = pathname.startsWith(item.href);
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            title={isCollapsed ? item.name : ''}
                            className={cn(
                                "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group relative",
                                isActive
                                    ? "bg-primary/10 text-primary"
                                    : "text-muted-foreground hover:bg-secondary hover:text-white"
                            )}
                        >
                            <item.icon size={20} className={cn(isActive ? "text-primary" : "group-hover:text-white")} />
                            {!isCollapsed && <span className="font-semibold text-sm">{item.name}</span>}
                            {isActive && !isCollapsed && (
                                <div className="absolute right-2 w-1.5 h-1.5 rounded-full bg-primary" />
                            )}
                        </Link>
                    );
                })}
            </nav>

            <div className="p-3 border-t border-border space-y-1">
                <Link
                    href="/settings"
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-muted-foreground hover:bg-secondary hover:text-white transition-all"
                >
                    <Settings size={20} />
                    {!isCollapsed && <span className="font-semibold text-sm">Configuración</span>}
                </Link>
                <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-muted-foreground hover:bg-red-500/10 hover:text-red-400 transition-all"
                >
                    <LogOut size={20} />
                    {!isCollapsed && <span className="font-semibold text-sm">Cerrar Sesión</span>}
                </button>
            </div>
        </aside>
    );
}
