'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Clock, ArrowLeft } from 'lucide-react';
import Logo from '@/assets/Shades C.svg';

export default function PendingApprovalPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-[#000000] text-foreground p-4 font-sans selection:bg-primary/30 relative overflow-hidden">
            {/* Top-Center Ultra-Visible Glow */}
            <div className="absolute top-[-15%] left-1/2 -translate-x-1/2 w-[120%] h-[60%] bg-[#a3e635]/20 blur-[140px] rounded-full -z-10 animate-pulse duration-[10s]"></div>

            <div className="w-full max-w-md space-y-8 glass p-8 md:p-10 rounded-[2.5rem] border border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.8)] animate-in fade-in zoom-in-95 duration-700 relative z-10 backdrop-blur-2xl text-center">
                <div className="flex justify-center mb-10 relative">
                    <div className="absolute inset-0 blur-3xl bg-white/5 rounded-full scale-150 transform -z-10"></div>
                    <Image
                        src={Logo}
                        alt="Shades Logo"
                        width={280}
                        height={80}
                        className="invert brightness-0 invert-[1] drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]"
                    />
                </div>

                <div className="space-y-6">
                    <div className="flex justify-center">
                        <div className="w-20 h-20 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center relative group">
                            <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full scale-125 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                            <Clock className="text-primary relative z-10" size={32} />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <h1 className="text-xl font-black text-white uppercase tracking-widest">
                            Acceso en Revisión
                        </h1>
                        <p className="text-sm text-zinc-500 font-medium leading-relaxed">
                            Tu solicitud de acceso está siendo procesada. Un administrador debe validar tu perfil antes de que puedas ingresar a la plataforma.
                        </p>
                    </div>

                    <div className="pt-4">
                        <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-[0.2em] mb-8">
                            Recibirás una notificación cuando tu cuenta esté activa.
                        </p>

                        <Link
                            href="/login"
                            className="inline-flex items-center gap-2 text-[11px] font-black text-primary hover:text-[#bbf346] uppercase tracking-[0.2em] transition-all group"
                        >
                            <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
                            Regresar al Inicio
                        </Link>
                    </div>
                </div>

                <div className="pt-10 border-t border-white/[0.05]">
                    <p className="text-[8px] text-zinc-800 uppercase tracking-[0.5em] font-black">
                        Excelencia Operativa • Shades de México 2026
                    </p>
                </div>
            </div>
        </div>
    );
}
