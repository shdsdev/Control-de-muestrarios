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
import { useAuth } from '@/components/providers/AuthProvider';

const navItems = [
    { name: 'Panel Principal', viewName: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Solicitudes', viewName: 'Solicitudes', href: '/solicitudes', icon: ClipboardList },
    { name: 'Materia Prima', viewName: 'Materia Prima', href: '/materia-prima', icon: Package },
    { name: 'Empresas', viewName: 'Empresas', href: '/empresas', icon: Building2 },
    { name: 'Productos', viewName: 'Productos', href: '/productos', icon: BookOpen },
    { name: 'Usuarios', viewName: 'Usuarios', href: '/usuarios', icon: Users },
    { name: 'Reportes', viewName: 'Reportes', href: '/reportes', icon: BarChart3 },
];

export default function Sidebar({
    isCollapsed,
    setIsCollapsed
}: {
    isCollapsed: boolean;
    setIsCollapsed: (v: boolean) => void
}) {
    const pathname = usePathname();
    const { profile, signOut, error, refreshProfile } = useAuth();

    const handleLogout = async (e?: React.MouseEvent | React.PointerEvent) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }

        console.log('Logout Triggered: Initiating sequence...');

        // Immediate visual feedback
        const btn = document.getElementById('logout-btn-wrapper');
        if (btn) btn.style.opacity = '0.5';

        try {
            // Run everything in parallel to avoid hanging
            Promise.allSettled([
                signOut(),
                supabase.auth.signOut(),
                new Promise(resolve => {
                    localStorage.clear();
                    sessionStorage.clear();
                    document.cookie.split(";").forEach((c) => {
                        document.cookie = c
                            .replace(/^ +/, "")
                            .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
                    });
                    resolve(true);
                })
            ]);

            console.log('Logout: Cleanup initiated');
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            // Wait just a bit for states to sync before redirect
            setTimeout(() => {
                console.log('Logout: FINAL REDIRECT');
                window.location.replace('/login');
            }, 300);
        }
    };

    const canSeeView = (viewName: string) => {
        if (!profile) return false;
        if (profile.rol === 'super_usuario') return true;

        // View permissions are the source of truth for granular access
        return profile.permisos_vistas?.includes(viewName) || false;
    };

    const filteredItems = navItems.filter(item => canSeeView(item.viewName));

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

            <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto custom-scrollbar">
                {profile !== undefined ? (
                    filteredItems.length > 0 ? (
                        filteredItems.map((item) => {
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
                        })
                    ) : (
                        <div className="px-4 py-8 text-center text-[10px] text-text-muted uppercase tracking-widest opacity-50">
                            Sin accesos permitidos
                        </div>
                    )
                ) : (
                    <div className="px-4 py-8 flex flex-col items-center gap-3">
                        {error ? (
                            <>
                                <div className="text-danger mb-2 text-center text-[10px] uppercase font-bold px-4">{error}</div>
                                <button
                                    onClick={() => refreshProfile()}
                                    className="px-3 py-1.5 bg-accent/20 text-accent rounded-lg text-[10px] font-bold uppercase hover:bg-accent/30 transition-all border border-accent/30"
                                >
                                    Reintentar carga
                                </button>
                            </>
                        ) : (
                            <>
                                <div className="w-5 h-5 border-2 border-accent/20 border-t-accent rounded-full animate-spin" />
                                {!isCollapsed && <span className="text-[10px] text-text-muted uppercase tracking-widest animate-pulse">Cargando vistas...</span>}
                            </>
                        )}
                    </div>
                )}
            </nav>

            <div className="p-3 border-t border-border space-y-1">
                {canSeeView('Configuración') && (
                    <Link
                        href="/settings"
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-text-muted hover:bg-surface-2 hover:text-foreground transition-all"
                    >
                        <Settings size={20} />
                        {!isCollapsed && <span className="font-semibold text-sm">Configuración</span>}
                    </Link>
                )}
                <div
                    id="logout-btn-wrapper"
                    role="button"
                    tabIndex={0}
                    onPointerDown={(e) => {
                        console.log('Logout: PointerDown');
                        handleLogout(e);
                    }}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') handleLogout();
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-text-muted hover:bg-danger/10 hover:text-danger transition-all relative z-[100] cursor-pointer select-none active:scale-95"
                >
                    <LogOut size={20} />
                    {!isCollapsed && <span className="font-semibold text-sm pointer-events-none">Cerrar Sesión</span>}
                </div>
            </div>
        </aside>
    );
}
