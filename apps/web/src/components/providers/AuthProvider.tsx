'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { User } from '@supabase/supabase-js';

interface Profile {
    id: string;
    email: string;
    nombre_completo: string;
    rol: string;
    status_acceso: string;
    region_id?: string;
    avatar_url?: string;
    permisos_vistas: string[];
}

interface AuthContextType {
    user: User | null;
    profile: Profile | null | undefined;
    loading: boolean;
    error: string | null;
    signOut: () => Promise<void>;
    refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<Profile | null | undefined>(undefined);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Use a ref to track the last request ID to ignore stale results
    const lastRequestId = React.useRef(0);

    const fetchProfile = async (userId: string, showLoading = true) => {
        const requestId = ++lastRequestId.current;
        const maxRetries = 2; // Total 3 attempts
        let attempt = 0;

        console.log(`AuthProvider: Fetching profile for ${userId} (Request #${requestId}, UI Loading: ${showLoading})...`);

        if (showLoading) {
            setLoading(true);
            setError(null);
        }

        while (attempt <= maxRetries) {
            if (requestId !== lastRequestId.current) return;

            if (attempt > 0) {
                console.log(`AuthProvider: Retry attempt ${attempt} for request #${requestId}...`);
            }

            // Timeout guard increases with each attempt
            const timeoutDuration = 15000 + (attempt * 5000);
            const timeoutPromise = new Promise((resolve) =>
                setTimeout(() => resolve({ isTimeout: true }), timeoutDuration)
            );

            try {
                const queryPromise = supabase
                    .from('perfiles')
                    .select('*')
                    .eq('id', userId)
                    .maybeSingle();

                const result = await Promise.race([
                    queryPromise,
                    timeoutPromise
                ]) as any;

                if (requestId !== lastRequestId.current) return;

                if (result.isTimeout) {
                    console.warn(`AuthProvider: Profile fetch attempt ${attempt} timed out`);
                    attempt++;
                    if (attempt > maxRetries) {
                        if (showLoading) setError('La conexión es muy lenta. Por favor, revisa tu internet o intenta de nuevo.');
                        return;
                    }
                    continue; // Retry
                }

                const { data, error: profileError } = result;

                if (profileError) {
                    console.error(`AuthProvider: Error fetching profile (Attempt ${attempt}):`, profileError);
                    // For some errors, retry might help
                    if (profileError.message?.includes('FetchError') || profileError.code === '503') {
                        attempt++;
                        if (attempt <= maxRetries) {
                            await new Promise(r => setTimeout(r, 1000)); // Wait 1s before retry
                            continue;
                        }
                    }

                    if (showLoading) {
                        if (profileError.code === 'PGRST116') {
                            setError('Perfil no completado');
                        } else {
                            setError(profileError.message);
                        }
                        setProfile(null);
                    }
                    return;
                } else if (!data) {
                    console.warn('AuthProvider: Profile not found for ', userId);
                    if (showLoading) {
                        setError('Perfil no encontrado');
                        setProfile(null);
                    }
                    return;
                } else {
                    console.log('AuthProvider: Profile loaded successfully');
                    const profileData = {
                        ...data,
                        permisos_vistas: data.permisos_vistas || []
                    };
                    setProfile(profileData);
                    setError(null);
                    sessionStorage.setItem(`profile_${userId}`, JSON.stringify(profileData));
                    return; // Success!
                }
            } catch (err: any) {
                console.error(`AuthProvider: Unexpected error (Attempt ${attempt}):`, err);
                attempt++;
                if (attempt > maxRetries) {
                    if (requestId === lastRequestId.current && showLoading) {
                        setError('Error inesperado de conexión');
                        setProfile(null);
                    }
                    return;
                }
                await new Promise(r => setTimeout(r, 1000));
            } finally {
                if (requestId === lastRequestId.current && showLoading && attempt > maxRetries) {
                    setLoading(false);
                }
            }
        }

        if (requestId === lastRequestId.current && showLoading) {
            setLoading(false);
        }
    };

    const refreshProfile = async () => {
        if (user) {
            await fetchProfile(user.id);
        }
    };

    useEffect(() => {
        let mounted = true;

        const handleAuthChange = async (session: any) => {
            if (!mounted) return;

            if (session?.user) {
                const newUser = session.user;
                setUser(newUser);

                // Try to load from cache first for instant UI
                const cachedProfile = sessionStorage.getItem(`profile_${newUser.id}`);
                if (cachedProfile) {
                    try {
                        const parsed = JSON.parse(cachedProfile);
                        console.log('AuthProvider: Loaded profile from cache');
                        setProfile(parsed);
                        setLoading(false);
                        // Still fetch in background to ensure data is fresh, but don't set loading=true
                        fetchProfile(newUser.id, false);
                    } catch (e) {
                        await fetchProfile(newUser.id, true);
                    }
                } else {
                    await fetchProfile(newUser.id, true);
                }
            } else {
                setUser(null);
                setProfile(null);
                setLoading(false);
            }
        };

        const init = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            await handleAuthChange(session);
        };

        init();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            console.log(`AuthProvider: Auth State Change Event - ${event}`);
            if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
                await handleAuthChange(session);
            } else if (event === 'SIGNED_OUT') {
                setUser(null);
                setProfile(null);
                setLoading(false);
                sessionStorage.clear();
            }
        });

        // Debug helper
        if (typeof window !== 'undefined') {
            (window as any).DEBUG_AUTH = () => {
                console.log('Current Auth State:', { user, profile, loading, error });
            };
        }

        return () => {
            mounted = false;
            subscription.unsubscribe();
        };
    }, []);

    const signOut = async () => {
        console.log('AuthProvider: Starting signOut...');
        setLoading(true);
        try {
            const { error: signOutError } = await supabase.auth.signOut();
            if (signOutError) throw signOutError;
            console.log('AuthProvider: Supabase signOut successful');
            sessionStorage.clear();
        } catch (error) {
            console.error('AuthProvider: Error during sign out:', error);
        } finally {
            setUser(null);
            setProfile(null);
            setLoading(false);
            setError(null);
            sessionStorage.clear();
            console.log('AuthProvider: State cleared');
        }
    };

    return (
        <AuthContext.Provider value={{ user, profile, loading, error, signOut, refreshProfile }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
