'use client';

import Link from 'next/link';
import { ArrowRight, CheckCircle2 } from 'lucide-react';

export default function RegistroExitosoPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-[#050505] text-foreground p-4 font-sans selection:bg-primary/30">
            <div className="w-full max-w-md space-y-8 glass p-10 rounded-[2.5rem] border border-white/20 shadow-[0_0_50px_rgba(0,0,0,0.8)] text-center animate-in zoom-in-95 duration-500">
                <div className="flex justify-center">
                    <div className="w-20 h-20 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center text-primary mb-6 shadow-[0_0_30px_rgba(163,230,53,0.2)]">
                        <CheckCircle2 size={40} />
                    </div>
                </div>

                <h1 className="text-3xl font-black tracking-tighter text-white mb-2 uppercase italic">SHADES</h1>
                <h2 className="text-xl font-bold text-zinc-400 mb-6 uppercase tracking-widest">Solicitud Registrada</h2>

                <div className="space-y-6">
                    <p className="text-zinc-200 text-sm leading-relaxed">
                        Tus datos han sido registrados correctamente.
                    </p>

                    <div className="bg-white/[0.05] border border-white/10 rounded-2xl p-8 relative overflow-hidden group">
                        <div className="absolute top-0 left-0 w-1 h-full bg-primary/50"></div>
                        <p className="text-[10px] text-primary font-black uppercase tracking-[0.3em] mb-3">Aviso de Seguridad</p>
                        <p className="text-xs text-zinc-300 font-medium leading-relaxed text-left">
                            El administrador debe aprobar tu acceso. <br /><br /> Recibirás el enlace cuando tu cuenta sea activada. Actualmente tu acceso se encuentra restringido por motivos de control interno.
                        </p>
                    </div>

                    <div className="pt-4">
                        <Link href="/login" className="inline-flex items-center gap-2 text-zinc-500 hover:text-white font-bold text-[10px] uppercase tracking-[0.2em] transition-all group">
                            Regresar al Inicio <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                        </Link>
                    </div>
                </div>

                <div className="pt-10 text-center border-t border-white/[0.05]">
                    <p className="text-[8px] text-zinc-800 uppercase tracking-[0.5em] font-black">
                        Excelencia Operativa • Muestrarios 2026
                    </p>
                </div>
            </div>
        </div>
    );
}
