import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/providers/AuthProvider';
import { Search, Bell, User as UserIcon, LogOut } from 'lucide-react';

export default function Navbar() {
    const { user, profile, error: authError, signOut } = useAuth();
    const [pendingCount, setPendingCount] = useState(0);

    const handleLogout = async () => {
        try {
            await signOut();
            await supabase.auth.signOut();
            window.location.replace('/login');
        } catch (error) {
            console.error('Logout error:', error);
            window.location.replace('/login');
        }
    };

    const fetchPendingCount = async () => {
        const { count, error } = await supabase
            .from('perfiles')
            .select('*', { count: 'exact', head: true })
            .eq('status_acceso', 'PENDIENTE');

        if (!error) setPendingCount(count || 0);
    };

    useEffect(() => {
        if (!user || authError) return;

        const timer = setTimeout(() => {
            fetchPendingCount();
        }, 1000);

        // Subscribe to changes in perfiles table
        const channel = supabase
            .channel('perfiles-status-changes')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'perfiles'
                },
                () => {
                    fetchPendingCount();
                }
            )
            .subscribe();

        return () => {
            clearTimeout(timer);
            supabase.removeChannel(channel);
        };
    }, [user, authError, profile?.rol]);

    return (
        <header className="h-16 bg-surface/80 backdrop-blur-md border-b border-border flex items-center justify-between px-8 sticky top-0 z-10 transition-all">
            <div className="flex-1 max-w-xl">
                <div className="relative group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-accent transition-colors" size={18} />
                    <input
                        type="text"
                        placeholder="Buscar solicitudes, empresas, materiales..."
                        className="w-full bg-surface-2 border border-border rounded-xl py-2 pl-10 pr-4 focus:ring-1 focus:ring-accent focus:outline-none transition-all text-xs text-foreground placeholder:text-text-muted/50"
                    />
                </div>
            </div>

            <div className="flex items-center gap-6">
                <button className="text-text-muted hover:text-foreground transition-colors relative group">
                    <Bell size={20} className="group-hover:scale-110 transition-transform" />
                    {pendingCount > 0 && (
                        <span className="absolute -top-1 -right-1 w-4 h-4 bg-danger rounded-full border-2 border-surface text-[8px] font-bold text-white flex items-center justify-center animate-pulse">
                            {pendingCount}
                        </span>
                    )}
                </button>

                <div className="flex items-center gap-3 pl-6 border-l border-border">
                    <div className="text-right">
                        <p className="text-xs font-bold text-foreground leading-tight">
                            {profile?.nombre_completo || user?.email?.split('@')[0] || 'Usuario'}
                        </p>
                        <p className="text-[10px] text-text-muted uppercase tracking-wider font-medium flex items-center justify-end gap-1">
                            {authError ? (
                                <>
                                    <span className="text-danger truncate max-w-[150px]">{authError}</span>
                                    <button
                                        onClick={() => window.location.reload()}
                                        className="text-accent hover:underline ml-1"
                                    >
                                        Reintentar
                                    </button>
                                </>
                            ) : profile ? (
                                `Rol: ${profile.rol?.replace('_', ' ')}`
                            ) : profile === null ? (
                                'Invitado'
                            ) : (
                                <span className="flex items-center gap-1">
                                    <span className="w-1 h-1 bg-accent rounded-full animate-ping" />
                                    Cargando Perfil...
                                </span>
                            )}
                        </p>
                    </div>
                    <div className="w-9 h-9 rounded-xl bg-surface-2 border border-border flex items-center justify-center text-accent hover:border-accent transition-all cursor-pointer overflow-hidden active:scale-95">
                        {profile?.avatar_url ? (
                            <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                            <UserIcon size={18} />
                        )}
                    </div>
                </div>

                <button
                    onClick={handleLogout}
                    className="p-2 text-text-muted hover:text-danger hover:bg-danger/10 rounded-lg transition-colors group px-4"
                    title="Cerrar Sesión"
                >
                    <LogOut size={18} className="group-hover:scale-110 transition-transform" />
                </button>
            </div>
        </header>
    );
}
