'use client';

import { useState } from 'react';
import { Settings, ChevronRight, BadgeCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CustomSelectProps {
    label?: string;
    value: string;
    onChange: (val: string) => void;
    options: { value: string, label: string }[];
    placeholder?: string;
    icon?: any;
    className?: string;
}

export function CustomSelect({
    label,
    value,
    onChange,
    options,
    placeholder = "Seleccionar...",
    icon: Icon = Settings,
    className
}: CustomSelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const selectedOption = options.find(o => o.value === value);

    return (
        <div className={cn("space-y-2 relative", className)}>
            {label && <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">{label}</label>}
            <div className="relative">
                <button
                    type="button"
                    onClick={() => setIsOpen(!isOpen)}
                    className={cn(
                        "w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3.5 text-sm text-left transition-all flex items-center justify-between",
                        isOpen ? "border-primary ring-1 ring-primary shadow-[0_0_15px_rgba(212,255,112,0.1)]" : "hover:border-white/20",
                        !selectedOption ? "text-zinc-500" : "text-white font-medium"
                    )}
                >
                    <div className="flex items-center gap-2">
                        {selectedOption ? <Icon size={14} className="text-primary/70" /> : null}
                        {selectedOption ? selectedOption.label : placeholder}
                    </div>
                    <ChevronRight size={16} className={cn("transition-transform duration-300", isOpen ? "rotate-90 text-primary" : "rotate-0 text-zinc-500")} />
                </button>

                {isOpen && (
                    <>
                        <div className="fixed inset-0 z-[60]" onClick={() => setIsOpen(false)} />
                        <div className="absolute top-full left-0 w-full mt-2 bg-[#0c0c0e] border border-white/10 rounded-2xl overflow-hidden shadow-2xl z-[70] animate-in slide-in-from-top-2 duration-200">
                            <div className="p-1.5 max-h-[220px] overflow-y-auto custom-scrollbar">
                                {options.map((opt) => (
                                    <button
                                        key={opt.value}
                                        type="button"
                                        onClick={() => {
                                            onChange(opt.value);
                                            setIsOpen(false);
                                        }}
                                        className={cn(
                                            "w-full px-4 py-2.5 rounded-xl text-left text-xs transition-all flex items-center justify-between group",
                                            value === opt.value
                                                ? "bg-primary/10 text-primary font-bold"
                                                : "text-zinc-400 hover:bg-white/5 hover:text-white"
                                        )}
                                    >
                                        {opt.label}
                                        {value === opt.value && <BadgeCheck size={14} className="text-primary" />}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
