'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import {
    X,
    Search,
    Check,
    AlertCircle,
    Loader2,
    Command,
    Building2,
    Package,
    Calendar,
    Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';

type CatalogItem = {
    id: string;
    nombre: string;
};

type EmpresaItem = CatalogItem & {
    codigo_cliente: string;
};

type MuestrarioTipo = CatalogItem & {
    sla_dias_estandar: number;
};

interface NewRequestDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    defaultEmpresaId?: string | null;
}

export default function NewRequestDrawer({ isOpen, onClose, onSuccess, defaultEmpresaId }: NewRequestDrawerProps) {
    const [loading, setLoading] = useState(false);
    const [catalogsLoading, setCatalogsLoading] = useState(true);

    // Catalogs
    const [empresas, setEmpresas] = useState<EmpresaItem[]>([]);
    const [tipos, setTipos] = useState<MuestrarioTipo[]>([]);

    // Search state
    const [empresaSearch, setEmpresaSearch] = useState('');
    const [isEmpresaOpen, setIsEmpresaOpen] = useState(false);

    // Form state
    const [selectedEmpresa, setSelectedEmpresa] = useState<EmpresaItem | null>(null);
    const [selectedTipo, setSelectedTipo] = useState<MuestrarioTipo | null>(null);
    const [urgencia, setUrgencia] = useState(false);
    const [cantidad, setCantidad] = useState(1);
    const [notas, setNotas] = useState('');

    useEffect(() => {
        if (isOpen) {
            fetchCatalogs();
            // Reset state
            setSelectedTipo(null);
            setUrgencia(false);
            setCantidad(1);
            setNotas('');

            // Set default empresa if provided
            if (defaultEmpresaId) {
                // We'll find it in the catalogs after fetch
            } else {
                setSelectedEmpresa(null);
            }
        }
    }, [isOpen, defaultEmpresaId]);

    // Handle selecting default empresa once catalogs are loaded
    useEffect(() => {
        if (isOpen && defaultEmpresaId && empresas.length > 0) {
            const found = empresas.find(e => e.id === defaultEmpresaId);
            if (found) {
                setSelectedEmpresa(found);
            }
        }
    }, [empresas, defaultEmpresaId, isOpen]);

    async function fetchCatalogs() {
        setCatalogsLoading(true);

        const [empRes, tipoRes] = await Promise.all([
            supabase.from('empresas').select('id, nombre, codigo_cliente').order('nombre'),
            supabase.from('muestrarios_tipos').select('id, nombre, sla_dias_estandar').order('nombre')
        ]);

        if (empRes.data) setEmpresas(empRes.data);
        if (tipoRes.data) setTipos(tipoRes.data);

        setCatalogsLoading(false);
    }

    const filteredEmpresas = empresas.filter(e =>
        e.nombre.toLowerCase().includes(empresaSearch.toLowerCase()) ||
        e.codigo_cliente.toLowerCase().includes(empresaSearch.toLowerCase())
    ).slice(0, 10);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedEmpresa || !selectedTipo) return;

        setLoading(true);

        // In a real app, we'd get the region from the user's profile
        // For now, we'll pick the first region or a default
        const { data: regionData } = await supabase.from('regiones').select('id').limit(1).single();

        const { error } = await supabase.from('solicitudes').insert({
            empresa_id: selectedEmpresa.id,
            tipo_id: selectedTipo.id,
            ajuste_urgencia: urgencia,
            region_id: regionData?.id,
            observaciones: notas,
            estado: 'ENVIADA'
        });

        if (error) {
            console.error('Error creating request:', error);
            alert('Error creating request. Please try again.');
        } else {
            onSuccess();
            onClose();
        }
        setLoading(false);
    };

    if (!isOpen) return null;

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] transition-opacity duration-300"
                onClick={onClose}
            />

            {/* Drawer */}
            <div className={cn(
                "fixed right-0 top-0 h-full w-full max-w-md bg-secondary/95 backdrop-blur-xl border-l border-white/10 shadow-2xl z-[101] transition-transform duration-500 ease-in-out transform",
                isOpen ? "translate-x-0" : "translate-x-full"
            )}>
                <div className="flex flex-col h-full">
                    {/* Header */}
                    <div className="p-6 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary/20 rounded-xl">
                                <Command className="text-primary" size={20} />
                            </div>
                            <h3 className="text-xl font-bold text-white tracking-tight">New Solicitud</h3>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-white/5 rounded-full transition-colors text-muted-foreground hover:text-white"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* Form Content */}
                    <form className="flex-1 overflow-y-auto p-6 space-y-8" onSubmit={handleSubmit}>

                        {/* Empresa Selection */}
                        <div className="space-y-3">
                            <label className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
                                <Building2 size={14} />
                                Select Client/Company
                            </label>

                            <div className="relative">
                                <div
                                    className={cn(
                                        "glass w-full p-4 rounded-2xl border border-white/10 cursor-pointer hover:border-primary/50 transition-all flex items-center justify-between",
                                        selectedEmpresa && "border-primary/40 bg-primary/5"
                                    )}
                                    onClick={() => setIsEmpresaOpen(!isEmpresaOpen)}
                                >
                                    {selectedEmpresa ? (
                                        <div className="flex flex-col">
                                            <span className="text-white font-semibold">{selectedEmpresa.nombre}</span>
                                            <span className="text-xs text-primary font-mono">{selectedEmpresa.codigo_cliente}</span>
                                        </div>
                                    ) : (
                                        <span className="text-muted-foreground">Select a business...</span>
                                    )}
                                    <Search size={18} className="text-muted-foreground" />
                                </div>

                                {isEmpresaOpen && (
                                    <div className="absolute top-full left-0 w-full mt-2 glass border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-10 animate-in fade-in slide-in-from-top-2">
                                        <div className="p-3 border-b border-white/5">
                                            <input
                                                autoFocus
                                                type="text"
                                                placeholder="Filter by name or code..."
                                                className="w-full bg-white/5 border border-white/10 rounded-xl py-2 px-3 text-sm text-white focus:outline-none focus:border-primary/50"
                                                value={empresaSearch}
                                                onChange={(e) => setEmpresaSearch(e.target.value)}
                                            />
                                        </div>
                                        <div className="max-h-60 overflow-y-auto py-2">
                                            {catalogsLoading ? (
                                                <div className="p-4 text-center"><Loader2 className="animate-spin inline text-primary" size={20} /></div>
                                            ) : filteredEmpresas.map(emp => (
                                                <div
                                                    key={emp.id}
                                                    className="px-4 py-3 hover:bg-primary/20 cursor-pointer flex items-center justify-between group transition-colors"
                                                    onClick={() => {
                                                        setSelectedEmpresa(emp);
                                                        setIsEmpresaOpen(false);
                                                    }}
                                                >
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-medium text-gray-200 group-hover:text-white">{emp.nombre}</span>
                                                        <span className="text-[10px] text-muted-foreground font-mono uppercase">{emp.codigo_cliente}</span>
                                                    </div>
                                                    {selectedEmpresa?.id === emp.id && <Check size={16} className="text-primary" />}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Product Type */}
                        <div className="space-y-3">
                            <label className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
                                <Package size={14} />
                                Swatch Type
                            </label>
                            <div className="grid grid-cols-2 gap-3">
                                {tipos.map(tipo => (
                                    <div
                                        key={tipo.id}
                                        onClick={() => setSelectedTipo(tipo)}
                                        className={cn(
                                            "p-4 rounded-2xl border transition-all cursor-pointer text-center flex flex-col items-center gap-2",
                                            selectedTipo?.id === tipo.id
                                                ? "bg-primary/20 border-primary shadow-[0_0_15px_rgba(59,130,246,0.3)]"
                                                : "glass border-white/10 hover:border-white/30 text-muted-foreground hover:text-gray-300"
                                        )}
                                    >
                                        <span className={cn(
                                            "text-sm font-semibold tracking-tight",
                                            selectedTipo?.id === tipo.id ? "text-white" : ""
                                        )}>{tipo.nombre}</span>
                                        <span className="text-[10px] uppercase font-bold opacity-60">{tipo.sla_dias_estandar} Days SLA</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Urgency Trigger */}
                        <div className="glass p-5 rounded-3xl border border-white/10 flex items-center justify-between group hover:border-amber-500/50 transition-all cursor-pointer"
                            onClick={() => setUrgencia(!urgencia)}>
                            <div className="flex items-center gap-4">
                                <div className={cn(
                                    "p-3 rounded-2xl transition-all",
                                    urgencia ? "bg-amber-500/20 text-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.2)]" : "bg-white/5 text-muted-foreground"
                                )}>
                                    <Zap size={20} fill={urgencia ? "currentColor" : "none"} />
                                </div>
                                <div className="flex flex-col">
                                    <span className={cn("text-sm font-bold tracking-tight", urgencia ? "text-amber-200" : "text-white")}>
                                        Fast Track / Priority
                                    </span>
                                    <span className="text-xs text-muted-foreground">Adjusts delivery SLA for immediate production.</span>
                                </div>
                            </div>
                            <div className={cn(
                                "w-12 h-6 rounded-full relative transition-colors duration-300",
                                urgencia ? "bg-amber-500" : "bg-white/10"
                            )}>
                                <div className={cn(
                                    "absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform duration-300",
                                    urgencia ? "translate-x-6" : "translate-x-0"
                                )} />
                            </div>
                        </div>

                        {/* Quantity and Notes */}
                        <div className="grid grid-cols-3 gap-6">
                            <div className="space-y-3 col-span-1">
                                <label className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">Qty</label>
                                <input
                                    type="number"
                                    min="1"
                                    className="w-full glass border-white/10 rounded-2xl p-4 text-white focus:outline-none focus:border-primary/50 text-center font-bold"
                                    value={cantidad}
                                    onChange={(e) => setCantidad(parseInt(e.target.value))}
                                />
                            </div>
                            <div className="space-y-3 col-span-2">
                                <label className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">Notes / Extra Info</label>
                                <textarea
                                    rows={1}
                                    placeholder="Special instructions..."
                                    className="w-full glass border-white/10 rounded-2xl p-4 text-white focus:outline-none focus:border-primary/50 text-sm"
                                    value={notas}
                                    onChange={(e) => setNotas(e.target.value)}
                                />
                            </div>
                        </div>

                        {/* Estimated Delivery Preview */}
                        {selectedTipo && (
                            <div className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl flex items-center gap-4">
                                <Calendar className="text-emerald-400" size={20} />
                                <div className="flex flex-col">
                                    <span className="text-[10px] uppercase font-bold text-emerald-500 tracking-widest">Estimated Commitment</span>
                                    <span className="text-sm font-semibold text-emerald-200">
                                        {new Date(Date.now() + (urgencia ? 2 : selectedTipo.sla_dias_estandar) * 86400000).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
                                    </span>
                                </div>
                            </div>
                        )}
                    </form>

                    {/* Footer Actions */}
                    <div className="p-6 border-t border-white/10 bg-white/[0.02] flex gap-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-3 rounded-xl border border-white/10 text-white font-medium hover:bg-white/5 transition-all"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={loading || !selectedEmpresa || !selectedTipo}
                            className="flex-1 px-4 py-3 rounded-xl bg-primary hover:bg-blue-600 text-white font-bold transition-all shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {loading && <Loader2 className="animate-spin" size={18} />}
                            {loading ? "Creating..." : "Create Request"}
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}
