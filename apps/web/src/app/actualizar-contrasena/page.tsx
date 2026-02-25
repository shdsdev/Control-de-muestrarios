'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Loader2, Lock, ArrowRight, CheckCircle2 } from 'lucide-react';
import Logo from '@/assets/Shades C.svg';

export default function ActualizarContrasenaPage() {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' | null }>({ text: '', type: null });
    const router = useRouter();

    useEffect(() => {
        // En Next.js con Auth Helpers, el intercambio de código ya ocurrió en auth/callback
        // Pero debemos verificar si tenemos una sesión válida para poder actualizar
        const checkSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                // Si no hay sesión, el link expiró o no pasó por el callback
                setMessage({ text: 'El enlace de recuperación es inválido o ha expirado.', type: 'error' });
            }
        };
        checkSession();
    }, []);

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();

        if (password !== confirmPassword) {
            setMessage({ text: 'Las contraseñas no coinciden.', type: 'error' });
            return;
        }

        if (password.length < 6) {
            setMessage({ text: 'La contraseña debe tener al menos 6 caracteres.', type: 'error' });
            return;
        }

        setLoading(true);
        setMessage({ text: '', type: null });

        try {
            const { error } = await supabase.auth.updateUser({
                password: password,
            });

            if (error) {
                setMessage({ text: `Error: ${error.message}`, type: 'error' });
            } else {
                setSuccess(true);
                // Cerrar sesión para obligar a re-identificarse y pasar por el control de acceso
                await supabase.auth.signOut();

                setTimeout(() => {
                    router.push('/login?message=password_updated');
                }, 3000);
            }
        } catch (error) {
            setMessage({ text: 'Ocurrió un error inesperado.', type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#000000] text-foreground p-4 font-sans selection:bg-primary/30 relative overflow-hidden">
                <div className="absolute top-[-15%] left-1/2 -translate-x-1/2 w-[120%] h-[60%] bg-[#a3e635]/20 blur-[140px] rounded-full -z-10 animate-pulse duration-[10s]"></div>

                <div className="w-full max-w-md space-y-8 glass p-10 rounded-[2.5rem] border border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.8)] animate-in fade-in zoom-in-95 duration-700 relative z-10 backdrop-blur-2xl text-center">
                    <div className="flex justify-center mb-6">
                        <CheckCircle2 className="text-primary size-16" />
                    </div>
                    <h2 className="text-2xl font-black text-white uppercase tracking-widest leading-tight">
                        ¡Contraseña Actualizada!
                    </h2>
                    <p className="text-zinc-500 text-sm font-medium">
                        Tu contraseña se ha cambiado con éxito. Serás redirigido al inicio de sesión en unos segundos.
                    </p>
                    <div className="flex justify-center pt-4">
                        <Loader2 className="animate-spin text-primary" size={24} />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#000000] text-foreground p-4 font-sans selection:bg-primary/30 relative overflow-hidden">
            {/* Top-Center Ultra-Visible Glow */}
            <div className="absolute top-[-15%] left-1/2 -translate-x-1/2 w-[120%] h-[60%] bg-[#a3e635]/20 blur-[140px] rounded-full -z-10 animate-pulse duration-[10s]"></div>

            <div className="w-full max-w-md space-y-8 glass p-8 md:p-10 rounded-[2.5rem] border border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.8)] animate-in fade-in slide-in-from-bottom-4 duration-700 relative z-10 backdrop-blur-2xl">
                <div className="text-center mb-8">
                    <div className="flex justify-center mb-6 relative">
                        <div className="absolute inset-0 blur-3xl bg-white/5 rounded-full scale-150 transform -z-10"></div>
                        <Image
                            src={Logo}
                            alt="Shades Logo"
                            width={320}
                            height={100}
                            className="invert brightness-0 invert-[1] drop-shadow-[0_0_15px_rgba(255,255,255,0.4)]"
                        />
                    </div>
                    <div className="inline-block px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-black uppercase tracking-[0.3em] mb-4">
                        Establecer Nueva Contraseña
                    </div>
                </div>

                <form onSubmit={handleUpdate} className="space-y-6">
                    <div className="space-y-2">
                        <label className="block text-[11px] font-black text-zinc-400 uppercase tracking-[0.2em] ml-1 transition-colors group-focus-within:text-white">
                            Nueva Contraseña
                        </label>
                        <div className="relative group">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-primary transition-all duration-300 transform group-focus-within:scale-110" size={16} />
                            <input
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-zinc-950/50 border border-white/5 rounded-2xl px-12 py-4.5 text-white focus:ring-[3px] focus:ring-primary/20 focus:border-primary/40 focus:bg-zinc-900/80 focus:outline-none transition-all duration-300 placeholder:text-zinc-600 text-sm font-medium shadow-inner"
                                placeholder="Mínimo 6 caracteres"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="block text-[11px] font-black text-zinc-400 uppercase tracking-[0.2em] ml-1 transition-colors group-focus-within:text-white">
                            Confirmar Contraseña
                        </label>
                        <div className="relative group">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-primary transition-all duration-300 transform group-focus-within:scale-110" size={16} />
                            <input
                                type="password"
                                required
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="w-full bg-zinc-950/50 border border-white/5 rounded-2xl px-12 py-4.5 text-white focus:ring-[3px] focus:ring-primary/20 focus:border-primary/40 focus:bg-zinc-900/80 focus:outline-none transition-all duration-300 placeholder:text-zinc-600 text-sm font-medium shadow-inner"
                                placeholder="Repite tu contraseña"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-primary hover:bg-[#bbf346] text-black font-black py-5 rounded-2xl shadow-[0_10px_30px_rgba(163,230,53,0.2)] hover:shadow-[0_15px_40px_rgba(163,230,53,0.4)] transition-all duration-300 disabled:opacity-50 active:scale-[0.97] hover:scale-[1.01] uppercase tracking-[0.3em] text-xs mt-4 flex items-center justify-center gap-3 group relative overflow-hidden"
                    >
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-shimmer"></div>

                        {loading ? (
                            <Loader2 className="animate-spin" size={20} />
                        ) : (
                            <>
                                <span className="relative z-10">Actualizar Contraseña</span>
                                <ArrowRight size={18} className="group-hover:translate-x-1.5 transition-transform relative z-10" />
                            </>
                        )}
                    </button>
                </form>

                {message.text && (
                    <div className={`p-4 rounded-2xl text-[11px] font-bold border animate-in zoom-in-95 duration-300 uppercase tracking-widest text-center ${message.type === 'error' ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-primary/5 border-primary/20 text-primary-foreground'}`}>
                        {message.text}
                    </div>
                )}

                <div className="pt-8 text-center border-t border-white/[0.05]">
                    <p className="text-[8px] text-zinc-700 uppercase tracking-[0.5em] font-black">
                        Excelencia Operativa • Muestrarios 2026
                    </p>
                </div>
            </div>
        </div>
    );
}
