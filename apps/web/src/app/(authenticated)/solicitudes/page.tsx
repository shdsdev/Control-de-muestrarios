'use client';

import { useState, useEffect, Suspense } from 'react';
import { supabase } from '@/lib/supabase';
import { useSearchParams, useRouter } from 'next/navigation';
import {
    Filter,
    Plus,
    Search,
    MoreVertical,
    Eye,
    Building2,
    ChevronDown,
    Loader2,
    Download,
    ClipboardList
} from 'lucide-react';
import { cn, downloadAsCsv } from '@/lib/utils';
import WizardSolicitud from '@/components/solicitudes/WizardSolicitud';

type SolicitudLive = {
    id: string;
    correlativo: number;
    empresa: { nombre: string; codigo_cliente: string } | null;
    muestrarios_tipos: { nombre: string } | null;
    perfiles: { nombre_completo: string; email: string } | null;
    estado: string;
    created_at: string;
    ajuste_urgencia: boolean;
    fecha_promesa: string | null;
};

const statusStyles: Record<string, string> = {
    BORRADOR: 'bg-status-yellow/10 text-status-yellow border-status-yellow/20',
    ENVIADA: 'bg-status-teal/10 text-status-teal border-status-teal/20',
    VALIDADA: 'bg-status-amber/10 text-status-amber border-status-amber/20',
    EN_PRODUCCION: 'bg-status-amber/20 text-status-amber border-status-amber/30 shadow-[0_0_15px_rgba(245,158,11,0.1)]',
    PRODUCCION_TERMINADA: 'bg-status-teal/20 text-status-teal border-status-teal/30 shadow-[0_0_15px_rgba(20,184,166,0.1)]',
    ENTREGADA: 'bg-status-blue/10 text-status-blue border-status-blue/20',
    CERRADA: 'bg-status-red/10 text-status-red border-status-red/20',
};

export default function SolicitudesPage() {
    return (
        <Suspense fallback={<div className="flex items-center justify-center h-full"><Loader2 className="animate-spin text-primary" size={32} /></div>}>
            <SolicitudesContent />
        </Suspense>
    );
}

function SolicitudesContent() {
    const [activeTab, setActiveTab] = useState('TODAS');
    const [search, setSearch] = useState('');
    const [solicitudes, setSolicitudes] = useState<SolicitudLive[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [preselectedEmpresaId, setPreselectedEmpresaId] = useState<string | null>(null);

    const searchParams = useSearchParams();
    const router = useRouter();

    useEffect(() => {
        const empresaId = searchParams.get('empresa_id');
        if (empresaId) {
            setPreselectedEmpresaId(empresaId);
            setIsDrawerOpen(true);

            // Optional: clean up the URL to avoid re-opening on refresh
            // const params = new URLSearchParams(searchParams);
            // params.delete('empresa_id');
            // params.delete('empresa_nombre');
            // router.replace(`/solicitudes?${params.toString()}`);
        }
    }, [searchParams]);

    const fetchSolicitudes = async () => {
        setLoading(true);

        try {
            let query = supabase
                .from('solicitudes')
                .select(`
                    id,
                    correlativo,
                    estado,
                    created_at,
                    ajuste_urgencia,
                    fecha_promesa,
                    empresa:empresas(nombre, codigo_cliente),
                    muestrarios_tipos:tipo_id(nombre),
                    perfiles:solicitante_id(nombre_completo, email)
                `);

            // Tab filtering
            if (activeTab === 'PENDIENTES') {
                query = query.in('estado', ['ENVIADA', 'VALIDADA']);
            } else if (activeTab === 'EN_PROGRESO') {
                query = query.in('estado', ['EN_PRODUCCION', 'PRODUCCION_TERMINADA', 'EN_TRASLADO_INTERNO']);
            } else if (activeTab === 'COMPLETADAS') {
                query = query.in('estado', ['RECIBIDA_ALMACEN', 'LISTA_PARA_ENVIO', 'ENVIADA_CLIENTE', 'ENTREGADA', 'CERRADA']);
            }

            const { data, error } = await query.order('correlativo', { ascending: false });

            if (error) {
                console.error('ERROR FETCHING SOLICITUDES:', error);
                throw error;
            }

            if (data) {
                setSolicitudes(data as any);
            }
        } catch (err) {
            console.error('CATCH FETCHING SOLICITUDES:', err);
        } finally {
            setLoading(false);
        }
    };


    useEffect(() => {
        fetchSolicitudes();
    }, [activeTab]);

    const filteredSolicitudes = solicitudes.filter(s => {
        if (!search) return true;
        const searchLower = search.toLowerCase();
        return (
            s.correlativo.toString().includes(searchLower) ||
            s.empresa?.nombre.toLowerCase().includes(searchLower) ||
            s.empresa?.codigo_cliente.toLowerCase().includes(searchLower)
        );
    });

    const handleExport = () => {
        const exportData = filteredSolicitudes.map(s => ({
            ID: `S-${s.correlativo}`,
            Empresa: s.empresa?.nombre || 'N/A',
            Codigo: s.empresa?.codigo_cliente || 'N/A',
            Tipo: s.muestrarios_tipos?.nombre || 'General',
            Estado: s.estado,
            SLA_Promesa: s.fecha_promesa || 'N/A',
            Solicitante: s.perfiles?.nombre_completo || s.perfiles?.email || 'Sistema',
            Fecha_Creacion: new Date(s.created_at).toLocaleDateString()
        }));
        downloadAsCsv(exportData, `solicitudes_shades_${new Date().toISOString().split('T')[0]}.csv`);
    };

    const getSlaStatus = (item: SolicitudLive) => {
        if (item.ajuste_urgencia) return { label: 'AJUSTADO', color: 'text-amber-400' };
        if (item.fecha_promesa && new Date(item.fecha_promesa) < new Date() && !['CERRADA', 'ENTREGADA'].includes(item.estado)) {
            return { label: 'ATRASADO', color: 'text-red-400' };
        }
        return { label: 'EN TIEMPO', color: 'text-primary' };
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-foreground uppercase tracking-tight">Solicitudes</h2>
                    <p className="text-text-muted text-[10px] uppercase tracking-[0.1em] font-medium mt-1">Gestión y seguimiento de ciclos de fabricación</p>
                </div>
                <button
                    onClick={() => setIsDrawerOpen(true)}
                    className="btn-neon-aqua px-5 py-3 rounded-xl font-bold flex items-center gap-2 transition-all active:scale-95 text-xs uppercase tracking-wider"
                >
                    <Plus size={18} />
                    Nueva Solicitud
                </button>
            </div>

            <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-surface-2/40 p-2 rounded-2xl border border-border">
                <div className="flex gap-1">
                    {[
                        { id: 'TODAS', label: 'Todas' },
                        { id: 'PENDIENTES', label: 'Pendientes' },
                        { id: 'EN_PROGRESO', label: 'En Progreso' },
                        { id: 'COMPLETADAS', label: 'Completadas' }
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={cn(
                                "px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all",
                                activeTab === tab.id
                                    ? "bg-accent/10 text-accent shadow-sm"
                                    : "text-text-muted hover:text-foreground hover:bg-surface-2"
                            )}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto px-2">
                    <div className="relative flex-1 md:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={14} />
                        <input
                            type="text"
                            placeholder="Buscar por ID o Empresa..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full bg-surface-2 border border-border rounded-xl py-2 pl-9 pr-4 text-xs focus:ring-1 focus:ring-accent focus:outline-none transition-all text-foreground placeholder:text-text-muted/50"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleExport}
                            className="p-2.5 rounded-xl border border-border hover:bg-accent/10 text-accent transition-all flex items-center gap-2 text-[10px] font-black uppercase tracking-widest"
                            title="Exportar CSV"
                        >
                            <Download size={16} />
                            <span className="hidden lg:inline">Exportar</span>
                        </button>
                        <button className="p-2.5 rounded-xl border border-border hover:bg-surface-2 text-text-muted hover:text-foreground transition-all">
                            <Filter size={16} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Requests Table */}
            <div className="bg-surface/40 rounded-3xl overflow-hidden border border-border shadow-2xl min-h-[400px]">
                {loading ? (
                    <div className="flex flex-col items-center justify-center h-[400px] text-text-muted gap-4">
                        <Loader2 className="animate-spin text-accent" size={32} />
                        <p className="text-[10px] font-bold uppercase tracking-[0.3em] animate-pulse">Sincronizando datos de producción...</p>
                    </div>
                ) : (
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-border bg-white/[0.01]">
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-text-muted">ID Solicitud</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-text-muted">Empresa</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-text-muted">Tipo Producto</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-text-muted">Estado</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-text-muted">Estado SLA</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-text-muted">Fecha</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-text-muted text-center">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/20">
                            {filteredSolicitudes.length > 0 ? (
                                filteredSolicitudes.map((item) => {
                                    const sla = getSlaStatus(item);
                                    return (
                                        <tr key={item.id} className="hover:bg-accent/[0.02] transition-colors group">
                                            <td className="px-6 py-5">
                                                <span className="text-foreground font-mono font-bold tracking-tight text-sm">S-{item.correlativo}</span>
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="flex items-center gap-2">
                                                    <Building2 size={14} className="text-text-muted" />
                                                    <span className="text-foreground text-xs font-semibold">{item.empresa?.nombre || 'Desconocida'}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <span className="text-text-muted text-xs font-medium">{item.muestrarios_tipos?.nombre || 'General'}</span>
                                            </td>
                                            <td className="px-6 py-5">
                                                <span className={cn(
                                                    "px-3 py-1 rounded-lg text-[9px] font-black tracking-widest border transition-all uppercase",
                                                    statusStyles[item.estado] || statusStyles.BORRADOR
                                                )}>
                                                    {item.estado.replace(/_/g, ' ')}
                                                </span>
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="flex items-center gap-2">
                                                    <div className={cn(
                                                        "w-1.5 h-1.5 rounded-full",
                                                        sla.label === 'ATRASADO' ? "bg-danger shadow-[0_0_8px_rgba(239,68,68,0.5)]" :
                                                            sla.label === 'AJUSTADO' ? "bg-amber-500" : "bg-accent shadow-[0_0_8px_var(--glow)]"
                                                    )} />
                                                    <span className={cn("text-[10px] font-black uppercase tracking-tight", sla.color)}>
                                                        {sla.label}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="flex flex-col">
                                                    <span className="text-xs text-foreground font-medium">{new Date(item.created_at).toLocaleDateString()}</span>
                                                    <span className="text-[9px] text-text-muted font-bold uppercase tracking-tighter opacity-50">{item.perfiles?.nombre_completo || item.perfiles?.email || 'Sistema'}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5 text-center">
                                                <div className="flex items-center justify-center gap-1">
                                                    <button className="p-2 rounded-lg hover:bg-accent/20 text-text-muted hover:text-accent transition-all active:scale-95">
                                                        <Eye size={16} />
                                                    </button>
                                                    <button className="p-2 rounded-lg hover:bg-surface-2 text-text-muted hover:text-foreground transition-all active:scale-95">
                                                        <MoreVertical size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan={7} className="px-6 py-24 text-center text-muted-foreground">
                                        <div className="opacity-20 flex flex-col items-center">
                                            <ClipboardList size={48} className="mb-4" />
                                            <p className="text-[10px] font-black uppercase tracking-[0.3em]">No se encontraron solicitudes</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                )}

                <div className="px-6 py-4 bg-white/[0.01] border-t border-border flex items-center justify-between">
                    <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Mostrando {filteredSolicitudes.length} resultados</p>
                    <div className="flex gap-2">
                        <button className="px-3 py-1 rounded-lg border border-border text-[10px] font-bold uppercase tracking-widest text-text-muted disabled:opacity-30" disabled>Anterior</button>
                        <button className="px-3 py-1 rounded-lg border border-border text-[10px] font-bold uppercase tracking-widest text-text-muted disabled:opacity-30" disabled>Siguiente</button>
                    </div>
                </div>
            </div>

            <WizardSolicitud
                isOpen={isDrawerOpen}
                onClose={() => {
                    setIsDrawerOpen(false);
                    setPreselectedEmpresaId(null);
                }}
                onSuccess={fetchSolicitudes}
                defaultEmpresaId={preselectedEmpresaId}
            />
        </div>
    );
}
