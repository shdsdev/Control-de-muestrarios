'use client';

import { useState } from 'react';
import {
    Package,
    Plus,
    Search,
    ArrowRight,
    History,
    CheckCircle2,
    Clock,
    AlertTriangle
} from 'lucide-react';
import { cn } from '@/lib/utils';

const mpRequestsMock = [
    { id: 'MP-5021', status: 'EN_CAMINO', material: 'Seda Milan Pewter', cantidad: '150m', fecha: '2024-09-12' },
    { id: 'MP-5022', status: 'APROBADA', material: 'Blackout Montreal Grey', cantidad: '200m', fecha: '2024-09-13' },
    { id: 'MP-5023', status: 'BORRADOR', material: 'Lino Premium White', cantidad: '100m', fecha: '2024-09-14' },
];

const mpStatusStyles: Record<string, string> = {
    BORRADOR: 'border-status-yellow/30 text-status-yellow bg-status-yellow/5',
    APROBADA: 'border-status-teal/30 text-status-teal bg-status-teal/5',
    EN_CAMINO: 'border-status-blue/30 text-status-blue bg-status-blue/5 shadow-[0_0_15px_rgba(59,130,246,0.1)]',
    RECIBIDA: 'border-status-teal/30 text-status-teal bg-status-teal/5',
};

export default function MateriaPrimaPage() {
    return (
        <div className="space-y-8 animate-in fade-in duration-500 max-w-[1400px] mx-auto w-full">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-white uppercase tracking-tight">Materia Prima</h2>
                    <p className="text-muted-foreground text-[10px] uppercase tracking-[0.1em] font-medium mt-1">Flujo de reabastecimiento de inventario</p>
                </div>
                <button className="btn-neon-aqua px-5 py-3 rounded-xl font-bold flex items-center gap-2 transition-all active:scale-95 text-xs uppercase tracking-wider">
                    <Plus size={18} />
                    Nueva Solicitud MP
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main List */}
                <div className="lg:col-span-2 space-y-4">
                    <div className="flex items-center justify-between bg-secondary/40 p-4 rounded-2xl border border-border/50">
                        <h3 className="text-sm font-bold text-white flex items-center gap-2 uppercase tracking-widest">
                            <History className="text-primary" size={18} />
                            Solicitudes Recientes
                        </h3>
                        <div className="relative w-48">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={12} />
                            <input type="text" placeholder="Buscar MP..." className="w-full bg-[#09090b] border border-border rounded-lg py-1.5 pl-8 pr-3 text-[10px] focus:ring-1 focus:ring-primary focus:outline-none transition-all text-white" />
                        </div>
                    </div>

                    <div className="space-y-3">
                        {mpRequestsMock.map((req) => (
                            <div key={req.id} className="bg-secondary/20 p-5 rounded-2xl border border-border/50 hover:border-primary/30 transition-all group flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-primary/5 flex items-center justify-center text-primary border border-primary/10">
                                        <Package size={22} />
                                    </div>
                                    <div>
                                        <h4 className="text-white font-bold font-mono">#{req.id}</h4>
                                        <p className="text-xs text-zinc-400 font-medium">{req.material} • <span className="text-primary font-bold">{req.cantidad}</span></p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-6">
                                    <div className="text-right">
                                        <p className="text-[9px] uppercase tracking-widest text-muted-foreground font-bold mb-1">Estado</p>
                                        <span className={cn("px-3 py-1 rounded-lg text-[9px] font-black border uppercase tracking-tighter", mpStatusStyles[req.status])}>
                                            {req.status.replace('_', ' ')}
                                        </span>
                                    </div>
                                    <button className="p-2 rounded-lg hover:bg-white/5 text-muted-foreground hover:text-white transition-all">
                                        <ArrowRight size={18} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Sidebar Info */}
                <div className="space-y-6">
                    <div className="bg-secondary/30 p-6 rounded-3xl border border-primary/20 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-3xl -mr-16 -mt-16"></div>
                        <h3 className="text-sm font-bold text-white mb-4 uppercase tracking-[0.2em]">Estado de Inventario</h3>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-widest">
                                <span className="text-muted-foreground">Solicitudes Abiertas</span>
                                <span className="text-white">12</span>
                            </div>
                            <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-widest">
                                <span className="text-muted-foreground">En Tránsito</span>
                                <span className="text-blue-400">5</span>
                            </div>
                            <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-widest">
                                <span className="text-muted-foreground">Alertas Stock Bajo</span>
                                <span className="text-red-400">3</span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-secondary/30 p-6 rounded-3xl border border-border/50">
                        <h3 className="text-sm font-bold text-white mb-4 uppercase tracking-[0.2em]">Seguimiento</h3>
                        <div className="relative pl-6 space-y-6 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[1px] before:bg-border/50">
                            <div className="relative">
                                <div className="absolute -left-[30px] top-1 w-3 h-3 rounded-full bg-primary shadow-[0_0_12px_rgba(212,255,112,0.5)]"></div>
                                <p className="text-[10px] text-primary font-black uppercase tracking-widest">EN TRÁNSITO</p>
                                <p className="text-xs text-white font-semibold mt-0.5">MP-5021: Llegada estimada hoy</p>
                            </div>
                            <div className="relative opacity-50">
                                <div className="absolute -left-[30px] top-1 w-3 h-3 border-2 border-border rounded-full bg-background"></div>
                                <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">PENDIENTE</p>
                                <p className="text-xs text-zinc-400 font-semibold mt-0.5">MP-5023: Esperando aprobación SAC</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
