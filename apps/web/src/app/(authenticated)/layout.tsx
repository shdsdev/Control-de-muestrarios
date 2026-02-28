'use client';

import { useState, useEffect } from 'react';
import Sidebar from '@/components/layout/sidebar';
import Navbar from '@/components/layout/navbar';
import { cn } from '@/lib/utils';

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isLoaded, setIsLoaded] = useState(false);

    // Persistence logic
    useEffect(() => {
        const stored = localStorage.getItem('sidebar_collapsed');
        if (stored !== null) {
            setIsCollapsed(stored === 'true');
        }
        setIsLoaded(true);
    }, []);

    const toggleSidebar = (collapsed: boolean) => {
        setIsCollapsed(collapsed);
        localStorage.setItem('sidebar_collapsed', collapsed.toString());
    };

    if (!isLoaded) return <div className="min-h-screen bg-background" />;

    return (
        <div className="flex min-h-screen bg-background text-foreground">
            <Sidebar isCollapsed={isCollapsed} setIsCollapsed={toggleSidebar} />
            <div
                className={cn(
                    "flex-1 flex flex-col transition-all duration-300 min-w-0 overflow-x-hidden",
                    isCollapsed ? "ml-20" : "ml-64"
                )}
            >
                <Navbar />
                <main className="flex-1 p-8 overflow-y-auto overflow-x-hidden">
                    {children}
                </main>
            </div>
        </div>
    );
}
