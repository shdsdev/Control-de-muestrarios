'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Loader2, User, Mail, Lock, ArrowRight } from 'lucide-react';
import Logo from '@/assets/Shades C.svg';
import GoogleSignInButton from '@/components/auth/GoogleSignInButton';

export default function RegisterPage() {
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' | null }>({ text: '', type: null });
    const router = useRouter();

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage({ text: '', type: null });

        const { error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: fullName,
                },
                emailRedirectTo: `${window.location.origin}/auth/callback`,
            },
        });

        if (error) {
            setMessage({ text: `Error: ${error.message}`, type: 'error' });
            setLoading(false);
        } else {
            // Sign out immediately to prevent auto-session creation
            await supabase.auth.signOut();
            router.push('/registro-exitoso');
        }
    };

    return (
        <div data-theme="shades-dark" className="min-h-screen flex items-center justify-center bg-background text-foreground p-4 font-sans selection:bg-primary/30 relative overflow-hidden">
            {/* Top-Center Ultra-Visible Glow */}
            <div className="absolute top-[-15%] left-1/2 -translate-x-1/2 w-[120%] h-[60%] bg-[#a3e635]/30 blur-[140px] rounded-full -z-10 animate-pulse duration-[10s]"></div>
            <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-[#a3e635]/15 blur-[100px] rounded-full -z-10"></div>

            <div className="w-full max-w-md space-y-8 glass p-8 md:p-10 rounded-[2.5rem] border border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.9)] animate-in fade-in slide-in-from-bottom-4 duration-700 relative z-10 backdrop-blur-3xl">
                <div className="text-center mb-10">
                    <div className="inline-block px-4 py-1.5 rounded-full bg-primary/20 border border-primary/30 text-primary text-[10px] font-black uppercase tracking-[0.3em] mb-4">
                        Registro de Nuevo Usuario
                    </div>
                    <div className="flex justify-center mb-6 relative">
                        <div className="absolute inset-0 blur-3xl bg-white/5 rounded-full scale-150 transform -z-10"></div>
                        <Image
                            src={Logo}
                            alt="Shades Logo"
                            width={320}
                            height={100}
                            className="invert brightness-0 invert-[1] drop-shadow-[0_0_15px_rgba(255,255,255,0.4)] transition-all duration-500 hover:scale-[1.02]"
                        />
                    </div>
                </div>

                <form onSubmit={handleRegister} className="space-y-6">
                    <div className="space-y-2">
                        <label className="block text-[11px] font-black text-zinc-400 uppercase tracking-[0.2em] ml-1 transition-colors group-focus-within:text-white">
                            Nombre Completo
                        </label>
                        <div className="relative group">
                            <User className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-primary transition-all duration-300 transform group-focus-within:scale-110" size={16} />
                            <input
                                type="text"
                                required
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                className="w-full bg-zinc-950/50 border border-white/5 rounded-2xl px-12 py-4.5 text-white focus:ring-[3px] focus:ring-primary/20 focus:border-primary/40 focus:bg-zinc-900/80 focus:outline-none transition-all duration-300 placeholder:text-zinc-600 text-sm font-medium shadow-inner"
                                placeholder="Escribe tu nombre completo"
                            />
                        </div>
                    </div>

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

                    <div className="space-y-2">
                        <label className="block text-[11px] font-black text-zinc-400 uppercase tracking-[0.2em] ml-1 transition-colors group-focus-within:text-white">
                            Contraseña
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

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-primary hover:bg-[#bbf346] text-black font-black py-5 rounded-2xl shadow-[0_10px_30px_rgba(163,230,53,0.2)] hover:shadow-[0_15px_40px_rgba(163,230,53,0.4)] transition-all duration-300 disabled:opacity-50 active:scale-[0.97] hover:scale-[1.01] uppercase tracking-[0.3em] text-xs mt-6 flex items-center justify-center gap-3 group relative overflow-hidden"
                    >
                        {/* Shimmer effect inside button */}
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-shimmer"></div>

                        {loading ? (
                            <Loader2 className="animate-spin" size={20} />
                        ) : (
                            <>
                                <span className="relative z-10">Solicitar Acceso</span>
                                <ArrowRight size={18} className="group-hover:translate-x-1.5 transition-transform relative z-10" />
                            </>
                        )}
                    </button>
                </form>

                <div className="relative py-4">
                    <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-white/5"></div>
                    </div>
                    <div className="relative flex justify-center text-[10px] uppercase tracking-widest font-bold">
                        <span className="bg-[#000000] px-4 text-zinc-600">O registrarse con</span>
                    </div>
                </div>

                <div className="pt-2">
                    <GoogleSignInButton />
                </div>

                {message.text && (
                    <div className={`p-4 rounded-2xl text-[11px] font-bold border animate-in zoom-in-95 duration-300 uppercase tracking-widest ${message.type === 'error' ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-primary/5 border-primary/20 text-primary-foreground'}`}>
                        {message.text}
                    </div>
                )}

                <div className="pt-8 text-center border-t border-white/[0.05]">
                    <p className="text-[8px] text-zinc-700 uppercase tracking-[0.5em] font-black">
                        Excelencia Operativa • Control de Muestrarios 2026
                    </p>
                </div>
            </div>
        </div>
    );
}
