'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

type Theme = 'shades-dark' | 'shades-light' | 'sage-dashboard';

interface ThemeContextType {
    theme: Theme;
    setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [theme, setThemeState] = useState<Theme>('shades-dark');

    useEffect(() => {
        // 1. Try to get from localStorage on mount
        const savedTheme = localStorage.getItem('shades-theme') as Theme;
        if (savedTheme) {
            setThemeState(savedTheme);
            document.documentElement.setAttribute('data-theme', savedTheme);
        }

        // 2. Bonus: Try to get from Supabase if user is logged in
        const syncThemeFromDB = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
                const { data: profile } = await supabase
                    .from('perfiles')
                    .select('tema')
                    .eq('id', session.user.id)
                    .single();

                if (profile?.tema && profile.tema !== savedTheme) {
                    setThemeState(profile.tema as Theme);
                    document.documentElement.setAttribute('data-theme', profile.tema);
                    localStorage.setItem('shades-theme', profile.tema);
                }
            }
        };

        syncThemeFromDB();
    }, []);

    const setTheme = async (newTheme: Theme) => {
        setThemeState(newTheme);
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('shades-theme', newTheme);

        // Sync with Supabase if possible
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
            await supabase
                .from('perfiles')
                .update({ tema: newTheme })
                .eq('id', session.user.id);
        }
    };

    return (
        <ThemeContext.Provider value={{ theme, setTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
}
