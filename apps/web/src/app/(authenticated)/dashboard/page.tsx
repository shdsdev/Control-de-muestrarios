'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import {
    ClipboardList,
    AlertCircle,
    Clock,
    DollarSign,
    TrendingUp,
    ArrowRight,
    BarChart3,
    Calendar
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { CustomSelect } from '@/components/ui/custom-select';

type DashboardStats = {
    active_requests: number;
    delayed_requests: number;
    avg_production_days: number;
    monthly_costs: number;
};

type RecentSolicitud = {
    id: string;
    correlativo: string;
    empresa: { nombre: string };
    estado: string;
};

export default function DashboardPage() {
    const [statsData, setStatsData] = useState<DashboardStats | null>(null);
    const [recentSolicitudes, setRecentSolicitudes] = useState<RecentSolicitud[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchDashboardData() {
            setLoading(true);

            // Fetch stats from the view we created
            const { data: stats, error: statsError } = await supabase
                .from('dashboard_stats')
                .select('*')
                .single();

            if (!statsError && stats) {
                setStatsData(stats);
            }

            // Fetch recent solicitudes
            const { data: recent, error: recentError } = await supabase
                .from('solicitudes')
                .select(`
          id,
          correlativo,
          empresa:empresas(nombre),
          estado
        `)
                .order('created_at', { ascending: false })
                .limit(5);

            if (!recentError && recent) {
                setRecentSolicitudes(recent as any);
            }

            setLoading(false);
        }

        fetchDashboardData();
    }, []);

    const stats = [
        {
            name: 'Solicitudes Activas',
            value: statsData?.active_requests.toString() || '0',
            trend: 'En Vivo',
            icon: ClipboardList,
            color: 'text-primary',
            bg: 'bg-primary/10'
        },
        {
            name: 'Retrasadas (SLA)',
            value: statsData?.delayed_requests.toString() || '0',
            trend: statsData?.delayed_requests ? 'Acción Requerida' : 'En Tiempo',
            icon: AlertCircle,
            color: statsData?.delayed_requests ? 'text-red-400' : 'text-zinc-500',
            bg: statsData?.delayed_requests ? 'bg-red-500/10' : 'bg-zinc-500/10'
        },
        {
            name: 'Promedio Producción',
            value: `${statsData?.avg_production_days.toFixed(1) || '0.0'} Días`,
            trend: 'Eficiencia',
            icon: Clock,
            color: 'text-primary',
            bg: 'bg-primary/10'
        },
        {
            name: 'Costos Mensuales',
            value: new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(statsData?.monthly_costs || 0),
            trend: 'Mes Actual',
            icon: DollarSign,
            color: 'text-primary',
            bg: 'bg-primary/10'
        },
    ];

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div>
                <h2 className="text-2xl font-bold text-white uppercase tracking-tight">Panel General</h2>
                <p className="text-muted-foreground text-[10px] uppercase tracking-[0.1em] font-medium mt-1">Rendimiento operativo y estado en tiempo real</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {stats.map((stat) => (
                    <div key={stat.name} className="bg-secondary/40 p-6 rounded-2xl border border-border/50 hover:border-primary/30 transition-all group active:scale-[0.98]">
                        <div className="flex items-center justify-between mb-4">
                            <div className={cn("p-2.5 rounded-xl transition-colors", stat.bg)}>
                                <stat.icon className={stat.color} size={20} />
                            </div>
                            <span className={cn(
                                "text-[9px] uppercase tracking-widest font-black px-2 py-1 rounded-md",
                                stat.name === 'Retrasadas (SLA)' && statsData?.delayed_requests ? "bg-red-500/20 text-red-300" : "bg-primary/10 text-primary"
                            )}>
                                {stat.trend}
                            </span>
                        </div>
                        <div>
                            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mb-1">{stat.name}</p>
                            {loading ? (
                                <div className="h-8 w-24 bg-white/5 animate-pulse rounded-lg mt-1" />
                            ) : (
                                <p className="text-3xl font-black text-white tracking-tighter">{stat.value}</p>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Chart Area */}
                <div className="lg:col-span-2 bg-secondary/20 p-8 rounded-3xl min-h-[400px] border border-border/50 flex flex-col">
                    <div className="flex items-center justify-between mb-8">
                        <h3 className="text-lg font-bold text-white flex items-center gap-2 uppercase tracking-tighter">
                            <TrendingUp className="text-primary" size={18} />
                            Resumen de Estados
                        </h3>
                        <CustomSelect
                            className="w-48"
                            value="30"
                            onChange={() => { }}
                            icon={Calendar}
                            options={[
                                { value: '30', label: 'Últimos 30 días' },
                                { value: '90', label: 'Último Trimestre' },
                            ]}
                        />
                    </div>
                    <div className="flex-1 flex items-center justify-center border border-dashed border-primary/10 rounded-2xl bg-primary/[0.01]">
                        <div className="text-center">
                            <div className="w-12 h-12 rounded-full bg-primary/5 flex items-center justify-center mx-auto mb-3">
                                <BarChart3 className="text-primary/20" size={24} />
                            </div>
                            <p className="text-muted-foreground text-[10px] uppercase tracking-[0.2em] font-bold">Gráfico de Producción</p>
                            <p className="text-white/20 text-[9px] uppercase tracking-widest mt-1">Integración en curso</p>
                        </div>
                    </div>
                </div>

                {/* Action Sidebar Area */}
                <div className="space-y-6">
                    <div className="bg-secondary/40 p-6 rounded-3xl border border-border/50">
                        <h3 className="text-sm font-black text-white mb-4 uppercase tracking-[0.2em]">Acciones Rápidas</h3>
                        <div className="space-y-3">
                            <button className="w-full btn-neon-aqua py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.97] text-xs uppercase tracking-wider">
                                Nueva Solicitud
                                <ArrowRight size={16} />
                            </button>
                            <button className="w-full bg-secondary hover:bg-zinc-800 text-white py-3.5 rounded-xl border border-border font-bold transition-all active:scale-[0.97] text-xs uppercase tracking-wider">
                                Exportar Reportes
                            </button>
                        </div>
                    </div>

                    <div className="bg-secondary/40 p-6 rounded-3xl border border-border/50">
                        <h3 className="text-sm font-black text-white mb-4 uppercase tracking-[0.2em]">Actividad Reciente</h3>
                        <div className="space-y-3">
                            {loading ? (
                                [1, 2, 3].map(i => (
                                    <div key={i} className="flex gap-4 p-3 animate-pulse">
                                        <div className="w-2 h-2 rounded-full bg-white/10 mt-2" />
                                        <div className="flex-1 space-y-2">
                                            <div className="h-4 bg-white/10 rounded w-1/2" />
                                            <div className="h-3 bg-white/10 rounded w-3/4" />
                                        </div>
                                    </div>
                                ))
                            ) : recentSolicitudes.length > 0 ? (
                                recentSolicitudes.map((sol) => (
                                    <div key={sol.id} className="flex gap-4 p-3 rounded-xl hover:bg-primary/5 transition-all group cursor-pointer border border-transparent hover:border-primary/10">
                                        <div className={cn(
                                            "w-1.5 h-1.5 rounded-full mt-2 shrink-0 shadow-lg",
                                            sol.estado === 'EN_PRODUCCION' ? "bg-status-amber shadow-status-amber/50" :
                                                sol.estado === 'BORRADOR' ? "bg-status-yellow" :
                                                    sol.estado === 'ENVIADA' ? "bg-status-teal" :
                                                        sol.estado === 'PRODUCCION_TERMINADA' ? "bg-status-teal shadow-status-teal/50" :
                                                            sol.estado === 'ENTREGADA' ? "bg-status-blue shadow-status-blue/50" :
                                                                "bg-zinc-600"
                                        )}></div>
                                        <div>
                                            <p className="text-xs font-bold text-white group-hover:text-primary transition-colors">Solicitud {sol.correlativo}</p>
                                            <p className="text-[10px] text-muted-foreground mt-0.5 uppercase tracking-tighter font-medium">{sol.empresa?.nombre} • {sol.estado.replace(/_/g, ' ')}</p>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="text-center text-[10px] uppercase tracking-widest text-muted-foreground py-8 font-bold opacity-30">Sin actividad reciente</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
