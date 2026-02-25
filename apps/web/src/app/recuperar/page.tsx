'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import Image from 'next/image';
import { Loader2, Mail, ArrowLeft, Send } from 'lucide-react';
import Logo from '@/assets/Shades C.svg';

const MAX_RECOVERY_ATTEMPTS = 3;
const COOLDOWN_RECOVERY_MS = 600000; // 10 minutes

export default function RecuperarPage() {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' | null }>({ text: '', type: null });

    // Honeypot
    const [website, setWebsite] = useState('');

    // Rate Limiting
    const [attempts, setAttempts] = useState(0);
    const [cooldownRemaining, setCooldownRemaining] = useState(0);

    useEffect(() => {
        // Load stats from localStorage
        const storedStats = localStorage.getItem('recovery_stats');
        if (storedStats) {
            const { count, lastTime } = JSON.parse(storedStats);
            const now = Date.now();
            if (now - lastTime < COOLDOWN_RECOVERY_MS) {
                setAttempts(count);
                if (count >= MAX_RECOVERY_ATTEMPTS) {
                    setCooldownRemaining(COOLDOWN_RECOVERY_MS - (now - lastTime));
                }
            } else {
                localStorage.removeItem('recovery_stats');
            }
        }
    }, []);

    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (cooldownRemaining > 0) {
            interval = setInterval(() => {
                setCooldownRemaining(prev => {
                    if (prev <= 1000) {
                        clearInterval(interval);
                        setAttempts(0);
                        localStorage.removeItem('recovery_stats');
                        return 0;
                    }
                    return prev - 1000;
                });
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [cooldownRemaining]);

    const handleRecovery = async (e: React.FormEvent) => {
        e.preventDefault();

        if (website) return;
        if (cooldownRemaining > 0) return;

        setLoading(true);
        setMessage({ text: '', type: null });

        // Update rate limiting
        const now = Date.now();
        const newAttempts = attempts + 1;
        setAttempts(newAttempts);
        localStorage.setItem('recovery_stats', JSON.stringify({ count: newAttempts, lastTime: now }));

        if (newAttempts >= MAX_RECOVERY_ATTEMPTS) {
            setCooldownRemaining(COOLDOWN_RECOVERY_MS);
        }

        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/actualizar-contrasena`,
            });

            // We ALWAYS show success to avoid email enumeration
            setMessage({
                text: 'Si el correo está registrado, recibirás un enlace para restablecer tu contraseña.',
                type: 'success'
            });

        } catch (error) {
            setMessage({ text: 'Ocurrió un error. Inténtalo más tarde.', type: 'error' });
        } finally {
            setLoading(false);
        }
    };

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
                        Recuperación de Acceso
                    </div>
                    <h2 className="text-zinc-400 text-[11px] font-bold uppercase tracking-widest px-4">
                        Ingresa tu correo para recibir las instrucciones de restauración
                    </h2>
                </div>

                <form onSubmit={handleRecovery} className="space-y-6">
                    {/* Honeypot field */}
                    <input
                        type="text"
                        name="website"
                        value={website}
                        onChange={(e) => setWebsite(e.target.value)}
                        className="hidden"
                        tabIndex={-1}
                        autoComplete="off"
                    />

                    <div className="space-y-2">
                        <label className="block text-[11px] font-black text-zinc-400 uppercase tracking-[0.2em] ml-1 transition-colors group-focus-within:text-white">
                            Correo Corporativo
                        </label>
                        <div className="relative group">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-primary transition-all duration-300 transform group-focus-within:scale-110" size={16} />
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full bg-zinc-950/50 border border-white/5 rounded-2xl px-12 py-4.5 text-white focus:ring-[3px] focus:ring-primary/20 focus:border-primary/40 focus:bg-zinc-900/80 focus:outline-none transition-all duration-300 placeholder:text-zinc-600 text-sm font-medium shadow-inner"
                                placeholder="usuario@shadesdemexico.com"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading || cooldownRemaining > 0}
                        className="w-full bg-primary hover:bg-[#bbf346] text-black font-black py-5 rounded-2xl shadow-[0_10px_30px_rgba(163,230,53,0.2)] hover:shadow-[0_15px_40px_rgba(163,230,53,0.4)] transition-all duration-300 disabled:opacity-50 active:scale-[0.97] hover:scale-[1.01] uppercase tracking-[0.3em] text-xs mt-4 flex items-center justify-center gap-3 group relative overflow-hidden"
                    >
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-shimmer"></div>

                        {loading ? (
                            <Loader2 className="animate-spin" size={20} />
                        ) : cooldownRemaining > 0 ? (
                            `Espera ${Math.ceil(cooldownRemaining / 60000)}m ${Math.ceil((cooldownRemaining % 60000) / 1000)}s`
                        ) : (
                            <>
                                <span className="relative z-10">Enviar Instrucciones</span>
                                <Send size={16} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform relative z-10" />
                            </>
                        )}
                    </button>
                </form>

                {message.text && (
                    <div className={`p-4 rounded-2xl text-[11px] font-bold border animate-in zoom-in-95 duration-300 uppercase tracking-widest leading-relaxed text-center ${message.type === 'error' ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-primary/5 border-primary/20 text-primary-foreground'}`}>
                        {message.text}
                    </div>
                )}

                <div className="pt-2 text-center">
                    <Link
                        href="/login"
                        className="inline-flex items-center gap-2 text-[10px] font-black text-zinc-500 hover:text-white uppercase tracking-[0.2em] transition-all group"
                    >
                        <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
                        Volver al Inicio
                    </Link>
                </div>

                <div className="pt-8 text-center border-t border-white/[0.05]">
                    <p className="text-[8px] text-zinc-700 uppercase tracking-[0.5em] font-black">
                        Excelencia Operativa • Muestrarios 2026
                    </p>
                </div>
            </div>
        </div>
    );
}
