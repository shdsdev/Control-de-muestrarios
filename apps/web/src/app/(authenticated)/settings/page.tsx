'use client';

import { useState } from 'react';
import { useTheme } from '@/components/providers/ThemeProvider';
import { cn } from '@/lib/utils';
import {
    Palette,
    Moon,
    Sun,
    Leaf,
    CheckCircle2,
    Monitor
} from 'lucide-react';

const themes = [
    {
        id: 'shades-dark',
        name: 'Dark Luxury',
        description: 'El look original: elegante, oscuro y premium.',
        icon: Moon,
        colors: ['#09090b', '#121214', '#d4ff70'],
        className: 'bg-[#09090b]'
    },
    {
        id: 'shades-light',
        name: 'Light Neo',
        description: 'Limpio y moderno con grises suaves y acentos vibrantes.',
        icon: Sun,
        colors: ['#f8fafc', '#ffffff', '#a3e635'],
        className: 'bg-[#f8fafc]'
    },
    {
        id: 'sage-dashboard',
        name: 'Sage Dashboard',
        description: 'Estilo equilibrado con tonos verdes salvia y superficies suaves.',
        icon: Leaf,
        colors: ['#f1f5f2', '#ffffff', '#86a089'],
        className: 'bg-[#f1f5f2]'
    }
] as const;

export default function SettingsPage() {
    const { theme, setTheme } = useTheme();
    const [activeTab, setActiveTab] = useState<'themes' | 'profile'>('themes');

    return (
        <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-black text-white uppercase tracking-tighter">Configuración</h1>
                <p className="text-zinc-500 text-sm font-medium uppercase tracking-widest mt-1">Personaliza tu experiencia en la plataforma</p>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 p-1 bg-white/[0.02] border border-white/5 rounded-2xl w-fit">
                <button
                    onClick={() => setActiveTab('themes')}
                    className={cn(
                        "flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                        activeTab === 'themes' ? "bg-primary text-primary-foreground" : "text-zinc-500 hover:text-white hover:bg-white/5"
                    )}
                >
                    <Palette size={14} />
                    Temas
                </button>
                <button
                    onClick={() => setActiveTab('profile')}
                    className={cn(
                        "flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all opacity-50 cursor-not-allowed",
                        activeTab === 'profile' ? "bg-primary text-primary-foreground" : "text-zinc-500"
                    )}
                >
                    <Monitor size={14} />
                    Interfaz (Próximamente)
                </button>
            </div>

            {/* Content */}
            {activeTab === 'themes' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {themes.map((t) => (
                        <div
                            key={t.id}
                            onClick={() => setTheme(t.id)}
                            className={cn(
                                "group relative p-6 rounded-3xl border transition-all duration-500 cursor-pointer overflow-hidden flex flex-col gap-6",
                                theme === t.id
                                    ? "bg-primary/5 border-primary shadow-[0_0_40px_rgba(163,230,53,0.1)]"
                                    : "bg-white/[0.02] border-white/5 hover:border-white/20 hover:bg-white/[0.04]"
                            )}
                        >
                            {/* Selected Badge */}
                            {theme === t.id && (
                                <div className="absolute top-4 right-4 animate-in zoom-in duration-300">
                                    <CheckCircle2 size={24} className="text-primary fill-primary/10" />
                                </div>
                            )}

                            {/* Icon & Details */}
                            <div className="space-y-4">
                                <div className={cn(
                                    "w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500",
                                    theme === t.id ? "bg-primary text-primary-foreground rotate-12 scale-110" : "bg-zinc-900 text-zinc-500 group-hover:rotate-6"
                                )}>
                                    <t.icon size={24} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-white tracking-tight">{t.name}</h3>
                                    <p className="text-xs text-zinc-500 font-medium leading-relaxed mt-1">{t.description}</p>
                                </div>
                            </div>

                            {/* Color Swatch Preview */}
                            <div className="flex gap-2 p-3 rounded-2xl bg-black/20 border border-white/5 mt-auto">
                                {t.colors.map((c, i) => (
                                    <div
                                        key={i}
                                        className="w-full h-8 rounded-lg shadow-inner border border-white/5"
                                        style={{ backgroundColor: c }}
                                    />
                                ))}
                            </div>

                            {/* Glow Effect */}
                            {theme === t.id && (
                                <div className="absolute -bottom-20 -right-20 w-40 h-40 bg-primary/20 blur-[80px] pointer-events-none" />
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Active Theme Info */}
            <div className="p-6 rounded-3xl bg-white/[0.02] border border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Palette className="text-primary" size={20} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Tema Actualmente Activo</p>
                        <p className="text-white font-bold">{themes.find(t => t.id === theme)?.name}</p>
                    </div>
                </div>
                <div className="px-4 py-1.5 rounded-full border border-primary/30 bg-primary/5 text-primary text-[10px] font-black uppercase tracking-widest">
                    Persistente
                </div>
            </div>
        </div>
    );
}
