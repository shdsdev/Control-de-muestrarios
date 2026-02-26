'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { LucideIcon, Image as ImageIcon } from 'lucide-react';

interface ImageWithFallbackProps {
    src?: string | null;
    alt?: string;
    className?: string;
    fallbackIcon?: LucideIcon;
    iconClassName?: string;
}

export function ImageWithFallback({
    src,
    alt = '',
    className,
    fallbackIcon: FallbackIcon = ImageIcon,
    iconClassName
}: ImageWithFallbackProps) {
    const [error, setError] = useState(false);
    const [loading, setLoading] = useState(true);

    // Validate URL: check if it's a valid string and not a placeholder like "null" or empty
    const isValidUrl = src &&
        src !== 'null' &&
        src !== 'undefined' &&
        src.trim() !== '' &&
        (src.startsWith('http') || src.startsWith('/'));

    useEffect(() => {
        // Reset state when src changes
        setError(false);
        setLoading(true);
    }, [src]);

    if (!isValidUrl || error) {
        return (
            <div className={cn(
                "flex items-center justify-center bg-surface-2 text-text-muted/20 w-full h-full",
                className
            )}>
                <FallbackIcon className={cn("w-1/3 h-1/3", iconClassName)} />
            </div>
        );
    }

    return (
        <div className={cn("relative overflow-hidden w-full h-full", className)}>
            {loading && (
                <div className="absolute inset-0 bg-surface-2 animate-pulse flex items-center justify-center">
                    <FallbackIcon className="w-1/3 h-1/3 text-text-muted/10" />
                </div>
            )}
            <img
                src={src!}
                alt={alt}
                loading="lazy"
                className={cn(
                    "w-full h-full object-cover transition-opacity duration-300",
                    loading ? "opacity-0" : "opacity-100"
                )}
                onLoad={() => setLoading(false)}
                onError={() => {
                    setError(true);
                    setLoading(false);
                }}
            />
        </div>
    );
}
