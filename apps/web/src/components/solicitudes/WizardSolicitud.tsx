'use client';

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import {
    X,
    ChevronRight,
    ChevronLeft,
    Search,
    Building2,
    Package,
    Zap,
    Calendar,
    User,
    Check,
    Palette,
    Upload,
    ArrowRight,
    Loader2,
    CheckCircle2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getMuestrariosCreadosByEmpresa, type MuestrarioCreado } from '@/lib/data/empresas';

interface WizardSolicitudProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    defaultEmpresaId?: string | null;
}

type Step = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

const PRIVILEGED_ROLES = ['super_usuario', 'superusuario', 'super_user', 'owner', 'admin', 'administrador'];
const isPrivilegedRole = (role?: string | null): boolean => {
    if (!role) return false;
    return PRIVILEGED_ROLES.includes(role.toLowerCase().trim());
};

export default function WizardSolicitud({ isOpen, onClose, onSuccess, defaultEmpresaId }: WizardSolicitudProps) {
    const [currentStep, setCurrentStep] = useState<Step>(1);
    const [loading, setLoading] = useState(false);
    const [userProfile, setUserProfile] = useState<any>(null);
    const [isAdmin, setIsAdmin] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        solicitante_id: '',
        empresa_id: '',
        tipo_solicitud: '' as 'fabricacion' | 'diseno' | '',
        categoria_id: '',
        producto_id: '',
        modelo_id: '',
        logo_url: '',
        colores: [] as string[],
        cantidad: 1,
        fast_track: false,
        notas: ''
    });

    // Data lists
    const [empresas, setEmpresas] = useState<any[]>([]);
    const [tiposMuestrario, setTiposMuestrario] = useState<any[]>([]);
    const [perfiles, setPerfiles] = useState<any[]>([]);

    // Toast State
    const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);

    const showToast = (message: string, type: 'success' | 'error' = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 5000);
    };

    // State for Dynamic Lists
    const [subEmpresas, setSubEmpresas] = useState<any[]>([]);
    const [inventarioEmpresa, setInventarioEmpresa] = useState<any[]>([]);
    const [categoriasDisponibles, setCategoriasDisponibles] = useState<string[]>([]);

    // Search & View Mode for Empresa
    const [empresaSearch, setEmpresaSearch] = useState('');
    const [empresaViewMode, setEmpresaViewMode] = useState<'grid' | 'list'>('list');
    const [brokenLogos, setBrokenLogos] = useState<Set<string>>(new Set());

    const handleLogoError = (url: string) => {
        setBrokenLogos(prev => {
            const next = new Set(prev);
            next.add(url);
            return next;
        });
    };


    useEffect(() => {
        if (isOpen) {
            fetchInitialData();
            resetForm();
        }
    }, [isOpen]);

    // Fetch sub-brands when a parent company is selected
    useEffect(() => {
        if (formData.empresa_id) {
            const selectedEmpresa = empresas.find(e => e.id === formData.empresa_id);

            // Only fetch subs if this IS a parent company
            // If it's already a child, we keep the siblings in the list
            if (selectedEmpresa && !selectedEmpresa.marca_padre_id) {
                const fetchSubs = async () => {
                    const { data } = await supabase
                        .from('empresas')
                        .select('*')
                        .eq('marca_padre_id', formData.empresa_id)
                        .order('nombre');
                    setSubEmpresas(data || []);
                };
                fetchSubs();
            }

            // If in Fabricacion flow, fetch their assigned inventory
            if (formData.tipo_solicitud === 'fabricacion') {
                fetchInventario(formData.empresa_id);
            }
        }
    }, [formData.empresa_id, formData.tipo_solicitud, empresas]);


    const fetchInventario = async (empresaId: string) => {
        setLoading(true);
        console.log('[Wizard] empresaSeleccionadaId', empresaId);

        try {
            const companyMuestrarios = await getMuestrariosCreadosByEmpresa(empresaId);

            console.log('[Wizard] companyMuestrarios length', companyMuestrarios.length);
            console.log('[Wizard] companyMuestrarios sample', companyMuestrarios.slice(0, 3));

            setInventarioEmpresa(companyMuestrarios);
            const cats = Array.from(new Set(companyMuestrarios.map((item: any) => item.muestrarios_tipos?.categoria).filter(Boolean))) as string[];
            setCategoriasDisponibles(cats);
        } catch (error) {
            console.error('[Wizard] Error fetching inventario:', error);
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setCurrentStep(1);
        setFormData({
            solicitante_id: userProfile?.id || '',
            empresa_id: defaultEmpresaId || '',
            tipo_solicitud: '',
            categoria_id: '',
            producto_id: '',
            modelo_id: '',
            logo_url: '',
            colores: [],
            cantidad: 1,
            fast_track: false,
            notas: ''
        });
        setSubEmpresas([]);
        setInventarioEmpresa([]);
    };

    const fetchInitialData = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
            const { data: profile } = await supabase
                .from('perfiles')
                .select('*')
                .eq('id', session.user.id)
                .single();

            // DEBUG: role detection
            const detectedRole = profile?.rol || profile?.role;
            console.log('[Wizard] rol:', detectedRole, '| privileged:', isPrivilegedRole(detectedRole));

            setUserProfile(profile);
            setFormData(prev => ({ ...prev, solicitante_id: profile.id }));

            if (isPrivilegedRole(detectedRole)) {
                setIsAdmin(true);
                const { data: allProfiles, error: profilesError } = await supabase
                    .from('perfiles')
                    .select('id, nombre_completo, email, rol')
                    .eq('status_acceso', 'ACTIVO')
                    .order('nombre_completo');

                if (profilesError) {
                    console.error('[Wizard] Error listando perfiles:', profilesError.code, profilesError.message, profilesError.details);
                    showToast('No tienes permisos para listar usuarios.', 'error');
                } else {
                    setPerfiles(allProfiles || []);
                }
            }

        }

        const { data: empresasData } = await supabase.from('empresas').select('*').order('nombre');
        setEmpresas(empresasData || []);

        const { data: tiposData } = await supabase.from('muestrarios_tipos').select('*').order('nombre');
        setTiposMuestrario(tiposData || []);
    };

    const handleSubmit = async () => {
        // Pre-submission validation
        if (!formData.empresa_id) return showToast('Error: Debes seleccionar una empresa', 'error');
        if (!formData.tipo_solicitud) return showToast('Error: Debes seleccionar el tipo de solicitud', 'error');
        if (!formData.producto_id) return showToast('Error: Debes seleccionar un producto', 'error');
        if (formData.cantidad < 1) return showToast('Error: La cantidad mínima es 1', 'error');

        setLoading(true);

        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.user) throw new Error('No session');

            // Fetch region_id (consistent with previous NewRequestDrawer)
            const { data: regionData } = await supabase.from('regiones').select('id').limit(1).single();

            // 1. Insert main solicitud
            const selectedType = tiposMuestrario.find(t => t.id === formData.producto_id);
            const slaDays = formData.fast_track ? 2 : (selectedType?.sla_dias_estandar || 5);
            const fechaPromesa = new Date();
            fechaPromesa.setDate(fechaPromesa.getDate() + slaDays);

            // Format observations
            let finalNotas = formData.notas;
            if (formData.tipo_solicitud === 'diseno') {
                const designInfo = `\n--- DETALLES DE DISEÑO ---\nColores: ${formData.colores.join(', ')}\nLogo: ${formData.logo_url || 'No proporcionado'}`;
                finalNotas = finalNotas ? `${finalNotas}\n${designInfo}` : designInfo;
            }

            const { data: newSolicitud, error: solicError } = await supabase
                .from('solicitudes')
                .insert({
                    empresa_id: formData.empresa_id,
                    tipo_id: formData.producto_id,
                    solicitante_id: formData.solicitante_id,
                    ajuste_urgencia: formData.fast_track,
                    observaciones: finalNotas,
                    estado: 'ENVIADA',
                    region_id: regionData?.id,
                    sla_dias: slaDays,
                    fecha_promesa: fechaPromesa.toISOString().split('T')[0]
                })
                .select()
                .single();

            if (solicError) {
                const fullError = JSON.parse(JSON.stringify(solicError, Object.getOwnPropertyNames(solicError)));
                console.error('SUPABASE ERROR (solicitudes):', fullError);
                throw new Error(`Error en tabla solicitudes: ${solicError.message || 'Error desconocido'}`);
            }

            // 2. Insert item details
            const { error: itemError } = await supabase
                .from('solicitudes_items')
                .insert({
                    solicitud_id: newSolicitud.id,
                    cantidad: formData.cantidad,
                    sku: 'GENERAL'
                });

            if (itemError) {
                const fullError = JSON.parse(JSON.stringify(itemError, Object.getOwnPropertyNames(itemError)));
                console.error('SUPABASE ERROR (items):', fullError);
                throw new Error(`Error en tabla items: ${itemError.message || 'Error desconocido'}`);
            }

            showToast('¡Solicitud creada exitosamente!', 'success');
            setTimeout(() => {
                onSuccess();
                onClose();
            }, 1500);

        } catch (err: any) {
            console.error('Final Error Catch:', err);
            const errorMsg = err.message || JSON.stringify(err);
            showToast(`Error: ${errorMsg}`, 'error');
        } finally {
            setLoading(false);
        }
    };

    const nextStep = () => {
        if (currentStep === 3) {
            if (formData.tipo_solicitud === 'fabricacion') setCurrentStep(4);
            else setCurrentStep(6);
        } else if (currentStep === 5 && formData.tipo_solicitud === 'fabricacion') {
            setCurrentStep(8);
        } else if (currentStep === 7 && formData.tipo_solicitud === 'diseno') {
            setCurrentStep(8);
        } else if (currentStep === 9) {
            handleSubmit();
        } else {
            setCurrentStep((prev) => (prev + 1) as Step);
        }
    };

    const prevStep = () => {
        if (currentStep === 4 && formData.tipo_solicitud === 'fabricacion') setCurrentStep(3);
        else if (currentStep === 6 && formData.tipo_solicitud === 'diseno') setCurrentStep(3);
        else if (currentStep === 8) {
            if (formData.tipo_solicitud === 'fabricacion') setCurrentStep(5);
            else setCurrentStep(7);
        }
        else setCurrentStep((prev) => (prev - 1) as Step);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-3xl p-4 md:p-8 animate-in fade-in duration-500">
            <div className="w-full max-w-5xl h-full max-h-[90vh] bg-surface/80 border border-border rounded-[2.5rem] flex flex-col overflow-hidden shadow-2xl relative glass">

                {/* Header */}
                <div className="p-8 border-b border-border flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-accent/10 flex items-center justify-center">
                            <Package className="text-accent" size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-foreground tracking-tight uppercase">
                                Nueva Solicitud
                                {formData.tipo_solicitud === 'fabricacion' && <span className="text-accent ml-2">· Fabricación</span>}
                                {formData.tipo_solicitud === 'diseno' && <span className="text-violet-400 ml-2">· Diseño propio</span>}
                            </h2>
                            <p className="text-[10px] text-text-muted font-black uppercase tracking-[0.2em] mt-1">
                                Paso {currentStep} de 9
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-3 hover:bg-surface-2 rounded-full text-text-muted hover:text-foreground transition-all">
                        <X size={24} />
                    </button>
                </div>

                <div className="px-8 py-4 flex gap-2 shrink-0 overflow-x-auto no-scrollbar">
                    {Array.from({ length: 9 }).map((_, i) => (
                        <div
                            key={i}
                            className={cn(
                                "h-1.5 flex-1 min-w-[30px] rounded-full transition-all duration-500",
                                currentStep > i + 1 ? "bg-accent" : currentStep === i + 1 ? "bg-accent shadow-[0_0_15px_var(--glow)]" : "bg-surface-2"
                            )}
                        />
                    ))}
                </div>

                {/* Body Content */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
                    {currentStep === 1 && (
                        <div className="max-w-xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="text-center space-y-2">
                                <h3 className="text-2xl font-bold text-foreground uppercase tracking-tight">¿Quién solicita?</h3>
                                <p className="text-xs text-text-muted uppercase tracking-widest leading-loose">Confirma el usuario titular de este pedido</p>
                            </div>

                            <div className="grid gap-4">
                                <div className="p-6 rounded-3xl bg-accent/5 border border-accent/20 flex items-center gap-6">
                                    <div className="w-16 h-16 rounded-2xl bg-surface-2 border border-border flex items-center justify-center shrink-0 shadow-sm">
                                        <User className="text-accent" size={28} />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-sm font-bold text-foreground">{userProfile?.nombre_completo || 'Usuario'}</p>
                                        <p className="text-[10px] text-accent font-black uppercase tracking-widest mt-1">Sesión Activa · {userProfile?.email}</p>
                                    </div>
                                    <CheckCircle2 className="text-accent" size={24} />
                                </div>

                                {isAdmin && (
                                    <div className="pt-4 space-y-4">
                                        <div className="relative group">
                                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" size={16} />
                                            <select
                                                value={formData.solicitante_id}
                                                onChange={(e) => setFormData(prev => ({ ...prev, solicitante_id: e.target.value }))}
                                                className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-xs focus:ring-1 focus:ring-primary focus:outline-none transition-all text-white shadow-inner appearance-none cursor-pointer"
                                            >
                                                <option value="" disabled className="bg-zinc-900">Seleccionar otro solicitante...</option>
                                                {perfiles.map(p => (
                                                    <option key={p.id} value={p.id} className="bg-zinc-900">
                                                        {p.nombre_completo} ({p.email}) · {p.rol || 'sin rol'}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <p className="text-[9px] text-zinc-500 uppercase tracking-widest text-center italic">
                                            * Modo Administrador: Puedes emitir solicitudes en nombre de otros usuarios.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {currentStep === 2 && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 flex flex-col h-[600px] min-h-0">
                            <div className="text-center space-y-2 shrink-0">
                                <h3 className="text-2xl font-bold text-foreground uppercase tracking-tight">Selección de Empresa</h3>
                                <p className="text-xs text-text-muted uppercase tracking-widest leading-loose">¿Para qué marca es este producto?</p>
                            </div>

                            {/* Sticky Search Bar */}
                            <div className="sticky top-0 z-10 bg-surface/80 backdrop-blur-xl p-4 rounded-3xl border border-border flex flex-col md:flex-row gap-4 items-center justify-between max-w-4xl mx-auto w-full shadow-2xl shrink-0">
                                <div className="relative flex-1 w-full">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
                                    <input
                                        type="text"
                                        placeholder="Buscar empresa o sub-marca..."
                                        value={empresaSearch}
                                        onChange={(e) => setEmpresaSearch(e.target.value)}
                                        className="w-full bg-surface-2 border border-border rounded-2xl py-3 pl-12 pr-4 text-xs focus:ring-1 focus:ring-accent focus:outline-none transition-all text-foreground placeholder:text-text-muted/50 shadow-inner"
                                    />
                                </div>
                                <div className="flex bg-surface-2 p-1 rounded-xl border border-border shrink-0">
                                    <button
                                        onClick={() => setEmpresaViewMode('grid')}
                                        className={cn(
                                            "px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                                            empresaViewMode === 'grid' ? "bg-accent text-text-inverse shadow-lg" : "text-text-muted hover:text-foreground"
                                        )}
                                    >Grid</button>
                                    <button
                                        onClick={() => setEmpresaViewMode('list')}
                                        className={cn(
                                            "px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                                            empresaViewMode === 'list' ? "bg-accent text-text-inverse shadow-lg" : "text-text-muted hover:text-foreground"
                                        )}
                                    >Lista</button>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto custom-scrollbar px-2 pb-8 overscroll-contain">
                                {empresaViewMode === 'grid' ? (
                                    <div className="space-y-8">
                                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                            {empresas
                                                .filter(e => !e.marca_padre_id && (e.nombre.toLowerCase().includes(empresaSearch.toLowerCase()) || (empresas.some(sub => sub.marca_padre_id === e.id && sub.nombre.toLowerCase().includes(empresaSearch.toLowerCase())))))
                                                .slice(0, empresaSearch ? 20 : 50)
                                                .map(empresa => (
                                                    <div
                                                        key={empresa.id}
                                                        onClick={() => setFormData(prev => ({ ...prev, empresa_id: empresa.id }))}
                                                        className={cn(
                                                            "group p-4 rounded-3xl border transition-all duration-300 cursor-pointer flex flex-col items-center gap-4 hover:shadow-[0_0_30px_var(--glow)]",
                                                            formData.empresa_id === empresa.id ? "bg-accent/10 border-accent shadow-[0_0_20px_var(--glow)]" : "bg-surface-2/40 border-border hover:border-accent/50"
                                                        )}
                                                    >
                                                        <div className="w-16 h-16 rounded-2xl bg-surface-2 border border-border flex items-center justify-center overflow-hidden shrink-0 shadow-lg group-hover:scale-105 transition-transform">
                                                            {(empresaSearch && empresa.logo_url && !brokenLogos.has(empresa.logo_url)) ? (
                                                                <img
                                                                    src={empresa.logo_url}
                                                                    className="w-full h-full object-contain p-2"
                                                                    alt=""
                                                                    onError={() => handleLogoError(empresa.logo_url!)}
                                                                />
                                                            ) : (
                                                                <Building2 className="text-text-muted opacity-50" size={24} />
                                                            )}
                                                        </div>
                                                        <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest text-center group-hover:text-foreground transition-colors">{empresa.nombre}</span>
                                                    </div>
                                                ))}
                                        </div>

                                        {subEmpresas.length > 0 && (
                                            <div className="pt-8 border-t border-border space-y-6 animate-in fade-in slide-in-from-top-4 duration-500">
                                                <h4 className="text-[10px] font-black text-text-muted uppercase tracking-[0.3em] text-center italic">Sub-marcas vinculadas</h4>
                                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                                    {subEmpresas
                                                        .filter(sub => sub.nombre.toLowerCase().includes(empresaSearch.toLowerCase()))
                                                        .map(sub => (
                                                            <div
                                                                key={sub.id}
                                                                onClick={() => setFormData(prev => ({ ...prev, empresa_id: sub.id }))}
                                                                className={cn(
                                                                    "group p-4 rounded-3xl border transition-all duration-300 cursor-pointer flex flex-col items-center gap-4",
                                                                    formData.empresa_id === sub.id ? "bg-violet-500/10 border-violet-500 shadow-[0_0_20px_rgba(168,85,247,0.1)]" : "bg-surface-2/40 border-border hover:border-accent/50"
                                                                )}
                                                            >
                                                                <div className="w-12 h-12 rounded-xl bg-surface-2 border border-border flex items-center justify-center overflow-hidden shrink-0 group-hover:scale-105 transition-transform">
                                                                    {(empresaSearch && sub.logo_url && !brokenLogos.has(sub.logo_url)) ? (
                                                                        <img
                                                                            src={sub.logo_url}
                                                                            className="w-full h-full object-contain p-1"
                                                                            alt=""
                                                                            onError={() => handleLogoError(sub.logo_url!)}
                                                                        />
                                                                    ) : (
                                                                        <Building2 className="text-text-muted opacity-50" size={20} />
                                                                    )}
                                                                </div>
                                                                <span className="text-[9px] font-bold text-text-muted uppercase tracking-widest text-center group-hover:text-foreground transition-colors">{sub.nombre}</span>
                                                            </div>
                                                        ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="max-w-4xl mx-auto bg-white/[0.02] border border-white/5 rounded-[2rem] overflow-hidden">
                                        <div className="divide-y divide-white/5">
                                            {empresas
                                                .filter(e => !e.marca_padre_id && (e.nombre.toLowerCase().includes(empresaSearch.toLowerCase()) || (empresas.some(sub => sub.marca_padre_id === e.id && sub.nombre.toLowerCase().includes(empresaSearch.toLowerCase())))))
                                                .slice(0, empresaSearch ? 20 : 50)
                                                .map(empresa => (
                                                    <div key={empresa.id} className="group">
                                                        <div
                                                            onClick={() => setFormData(prev => ({ ...prev, empresa_id: empresa.id }))}
                                                            className={cn(
                                                                "p-4 flex items-center gap-4 cursor-pointer transition-all",
                                                                formData.empresa_id === empresa.id ? "bg-primary/5" : "hover:bg-white/[0.03]"
                                                            )}
                                                        >
                                                            <div className={cn("w-2 h-2 rounded-full", formData.empresa_id === empresa.id ? "bg-primary shadow-[0_0_8px_rgba(212,255,112,0.5)]" : "bg-zinc-800")} />
                                                            <div className="w-10 h-10 rounded-lg bg-zinc-900 border border-white/5 flex items-center justify-center overflow-hidden shrink-0">
                                                                {(empresaSearch && empresa.logo_url && !brokenLogos.has(empresa.logo_url)) ? (
                                                                    <img
                                                                        src={empresa.logo_url}
                                                                        className="w-full h-full object-contain p-1"
                                                                        alt=""
                                                                        onError={() => handleLogoError(empresa.logo_url!)}
                                                                    />
                                                                ) : (
                                                                    <Building2 className="text-zinc-800" size={16} />
                                                                )}
                                                            </div>
                                                            <span className={cn("text-xs font-bold uppercase tracking-widest", formData.empresa_id === empresa.id ? "text-primary" : "text-white")}>{empresa.nombre}</span>
                                                        </div>

                                                        {/* Nested Sub-brands */}
                                                        {empresas
                                                            .filter(sub => sub.marca_padre_id === empresa.id && (empresaSearch === '' || sub.nombre.toLowerCase().includes(empresaSearch.toLowerCase())))
                                                            .map(sub => (
                                                                <div
                                                                    key={sub.id}
                                                                    onClick={() => setFormData(prev => ({ ...prev, empresa_id: sub.id }))}
                                                                    className={cn(
                                                                        "p-3 ml-12 border-l border-white/5 flex items-center gap-4 cursor-pointer transition-all",
                                                                        formData.empresa_id === sub.id ? "bg-violet-500/5" : "hover:bg-white/[0.02]"
                                                                    )}
                                                                >
                                                                    <div className={cn("w-1.5 h-1.5 rounded-full", formData.empresa_id === sub.id ? "bg-violet-400 shadow-[0_0_8px_rgba(168,85,247,0.5)]" : "bg-zinc-800")} />
                                                                    <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-white/5 flex items-center justify-center overflow-hidden shrink-0">
                                                                        {(empresaSearch && sub.logo_url && !brokenLogos.has(sub.logo_url)) ? (
                                                                            <img
                                                                                src={sub.logo_url}
                                                                                className="w-full h-full object-contain p-1"
                                                                                alt=""
                                                                                onError={() => handleLogoError(sub.logo_url!)}
                                                                            />
                                                                        ) : (
                                                                            <Building2 className="text-zinc-800" size={14} />
                                                                        )}
                                                                    </div>
                                                                    <span className={cn("text-[10px] font-semibold uppercase tracking-widest", formData.empresa_id === sub.id ? "text-violet-400" : "text-zinc-400")}>{sub.nombre}</span>
                                                                    <span className="text-[8px] text-zinc-600 font-black uppercase ml-auto">Sub-marca</span>
                                                                </div>
                                                            ))}
                                                    </div>
                                                ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}


                    {currentStep === 3 && (
                        <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pt-8">
                            <div className="text-center space-y-2">
                                <h3 className="text-2xl font-bold text-foreground uppercase tracking-tight">Tipo de Solicitud</h3>
                                <p className="text-xs text-text-muted uppercase tracking-widest leading-loose">Selecciona el flujo de trabajo</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                                <div
                                    onClick={() => setFormData(prev => ({ ...prev, tipo_solicitud: 'fabricacion' }))}
                                    className={cn(
                                        "group p-8 rounded-[2rem] border transition-all duration-500 cursor-pointer relative overflow-hidden flex flex-col gap-6",
                                        formData.tipo_solicitud === 'fabricacion' ? "bg-accent/10 border-accent" : "bg-surface-2/40 border-border hover:border-accent/50"
                                    )}
                                >
                                    <div className={cn(
                                        "w-16 h-16 rounded-3xl flex items-center justify-center shrink-0 transition-all duration-500",
                                        formData.tipo_solicitud === 'fabricacion' ? "bg-accent text-text-inverse" : "bg-surface-2 text-text-muted group-hover:text-foreground"
                                    )}>
                                        <Package size={32} />
                                    </div>
                                    <div className="space-y-3">
                                        <h4 className="text-xl font-bold text-foreground uppercase tracking-tight">Fabricación</h4>
                                        <p className="text-xs text-text-muted uppercase tracking-widest leading-relaxed">Pedido de modelos ya existentes en el inventario de la marca.</p>
                                    </div>
                                    {formData.tipo_solicitud === 'fabricacion' && <div className="absolute top-4 right-4 text-accent"><CheckCircle2 size={24} /></div>}
                                </div>

                                <div
                                    onClick={() => setFormData(prev => ({ ...prev, tipo_solicitud: 'diseno' }))}
                                    className={cn(
                                        "group p-8 rounded-[2rem] border transition-all duration-500 cursor-pointer relative overflow-hidden flex flex-col gap-6",
                                        formData.tipo_solicitud === 'diseno' ? "bg-accent/10 border-accent" : "bg-surface-2/40 border-border hover:border-accent/50"
                                    )}
                                >
                                    <div className={cn(
                                        "w-16 h-16 rounded-3xl flex items-center justify-center shrink-0 transition-all duration-500",
                                        formData.tipo_solicitud === 'diseno' ? "bg-accent text-text-inverse" : "bg-surface-2 text-text-muted group-hover:text-foreground"
                                    )}>
                                        <Palette size={32} />
                                    </div>
                                    <div className="space-y-3">
                                        <h4 className="text-xl font-bold text-foreground uppercase tracking-tight">Diseño de Propuesta</h4>
                                        <p className="text-xs text-text-muted uppercase tracking-widest leading-relaxed">Creación de un nuevo modelo con branding y colores personalizados.</p>
                                    </div>
                                    {formData.tipo_solicitud === 'diseno' && <div className="absolute top-4 right-4 text-accent"><CheckCircle2 size={24} /></div>}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Context breadcrumb for Fabricación flow */}
                    {currentStep >= 4 && formData.tipo_solicitud === 'fabricacion' && (() => {
                        const selectedEmpresa = empresas.find(e => e.id === formData.empresa_id);
                        const isSubEmpresa = !!selectedEmpresa?.marca_padre_id;
                        const selectedProducto = inventarioEmpresa.find(
                            item => item.muestrarios_tipos?.id === formData.producto_id
                        )?.muestrarios_tipos;
                        return (
                            <div className="flex items-center justify-center gap-2 flex-wrap py-3 px-4 rounded-2xl bg-surface-2/40 border border-border animate-in fade-in duration-300">
                                {selectedEmpresa && (
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-border text-[10px] font-bold text-text-muted uppercase tracking-widest">
                                        <Building2 size={12} className="text-accent shrink-0" />
                                        {selectedEmpresa.nombre}
                                        {isSubEmpresa && (
                                            <span className="ml-1 px-1.5 py-0.5 rounded bg-accent/10 text-accent text-[8px] font-black tracking-wider">SUB</span>
                                        )}
                                    </span>
                                )}
                                {formData.categoria_id && (
                                    <>
                                        <span className="text-text-muted/50 text-[10px]">•</span>
                                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-border text-[10px] font-bold text-text-muted uppercase tracking-widest">
                                            <Package size={12} className="text-accent shrink-0" />
                                            {formData.categoria_id}
                                        </span>
                                    </>
                                )}
                                {selectedProducto && (
                                    <>
                                        <span className="text-text-muted/50 text-[10px]">•</span>
                                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-accent/30 bg-accent/5 text-[10px] font-bold text-accent uppercase tracking-widest">
                                            <CheckCircle2 size={12} className="shrink-0" />
                                            {selectedProducto.nombre}
                                        </span>
                                    </>
                                )}
                            </div>
                        );
                    })()}

                    {currentStep === 4 && formData.tipo_solicitud === 'fabricacion' && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pt-8">
                            <div className="text-center space-y-2">
                                <h3 className="text-2xl font-bold text-foreground uppercase tracking-tight">Categorías en Inventario</h3>
                                <p className="text-xs text-text-muted uppercase tracking-widest leading-loose">Productos asignados a {empresas.find(e => e.id === formData.empresa_id)?.nombre}</p>
                            </div>

                            {categoriasDisponibles.length > 0 ? (
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    {categoriasDisponibles.map(cat => (
                                        <div
                                            key={cat}
                                            onClick={() => setFormData(prev => ({ ...prev, categoria_id: cat }))}
                                            className={cn(
                                                "p-6 rounded-3xl border transition-all duration-300 cursor-pointer text-center flex flex-col items-center gap-4",
                                                formData.categoria_id === cat ? "bg-accent/10 border-accent shadow-[0_0_20px_var(--glow)]" : "bg-surface-2/40 border-border hover:border-accent/50"
                                            )}
                                        >
                                            <div className="w-12 h-12 rounded-xl bg-surface-2 flex items-center justify-center">
                                                <Package className={cn(formData.categoria_id === cat ? "text-accent" : "text-text-muted")} size={20} />
                                            </div>
                                            <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest">{cat}</span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="py-24 text-center">
                                    <div className="flex flex-col items-center gap-4 opacity-40">
                                        <Package size={48} className="text-text-muted" />
                                        <p className="text-xs font-bold text-text-muted uppercase tracking-widest max-w-sm mx-auto">Esta empresa aún no tiene productos fabricados o asignados.</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {currentStep === 5 && formData.tipo_solicitud === 'fabricacion' && (() => {
                        const filteredProducts = inventarioEmpresa.filter(item => item.muestrarios_tipos?.categoria === formData.categoria_id);
                        const empresaNombre = empresas.find(e => e.id === formData.empresa_id)?.nombre || 'empresa';
                        return (
                            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pt-8">
                                <div className="text-center space-y-2">
                                    <h3 className="text-2xl font-bold text-foreground uppercase tracking-tight">Seleccionar Producto</h3>
                                    <p className="text-xs text-text-muted uppercase tracking-widest leading-loose">
                                        Mostrando {filteredProducts.length} producto{filteredProducts.length !== 1 ? 's' : ''} de {empresaNombre}
                                    </p>
                                </div>

                                {filteredProducts.length > 0 ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {filteredProducts.map(item => (
                                            <div
                                                key={item.id}
                                                onClick={() => setFormData(prev => ({ ...prev, producto_id: item.muestrarios_tipos?.id }))}
                                                className={cn(
                                                    "group p-6 rounded-3xl border transition-all duration-500 cursor-pointer flex flex-col gap-4",
                                                    formData.producto_id === item.muestrarios_tipos?.id ? "bg-accent/10 border-accent shadow-[0_8px_40px_var(--glow)]" : "bg-surface-2/40 border-border hover:border-accent/50 hover:scale-[1.02]"
                                                )}
                                            >
                                                <div className="aspect-square rounded-2xl bg-surface-2 border border-border overflow-hidden relative">
                                                    {/* Prioritize custom proposal image over template image */}
                                                    {(item.imagen_propuesta_url || item.muestrarios_tipos?.imagen_url) && !brokenLogos.has(item.imagen_propuesta_url || item.muestrarios_tipos?.imagen_url || '') ? (
                                                        <img
                                                            src={item.imagen_propuesta_url || item.muestrarios_tipos?.imagen_url || ''}
                                                            className="w-full h-full object-cover"
                                                            alt=""
                                                            loading="lazy"
                                                            onError={() => {
                                                                const url = item.imagen_propuesta_url || item.muestrarios_tipos?.imagen_url;
                                                                if (url && process.env.NODE_ENV === 'development') {
                                                                    console.warn('[Wizard] imagen failed:', url);
                                                                }
                                                                if (url) handleLogoError(url);
                                                            }}
                                                        />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center"><Package className="text-text-muted/20" size={40} /></div>
                                                    )}
                                                </div>
                                                <div className="space-y-1">
                                                    <p className="text-sm font-bold text-foreground uppercase tracking-tight">{item.muestrarios_tipos?.nombre}</p>
                                                    <p className="text-[10px] text-text-muted font-bold uppercase tracking-widest">Versión {item.muestrarios_tipos?.version || '1.0'}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="py-24 text-center">
                                        <div className="flex flex-col items-center gap-4 opacity-40">
                                            <Package size={48} className="text-zinc-600" />
                                            <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest max-w-sm mx-auto">No hay productos en esta categoría para {empresaNombre}.</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })()}

                    {currentStep === 6 && formData.tipo_solicitud === 'diseno' && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pt-8">
                            <div className="text-center space-y-2">
                                <h3 className="text-2xl font-bold text-foreground uppercase tracking-tight">Tipo de Muestrario</h3>
                                <p className="text-xs text-text-muted uppercase tracking-widest leading-loose">Selecciona la base para tu diseño</p>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                                {tiposMuestrario.map(tipo => (
                                    <div
                                        key={tipo.id}
                                        onClick={() => setFormData(prev => ({ ...prev, producto_id: tipo.id }))}
                                        className={cn(
                                            "p-6 rounded-3xl border transition-all duration-300 cursor-pointer text-center flex flex-col items-center gap-4",
                                            formData.producto_id === tipo.id ? "bg-accent/10 border-accent" : "bg-surface-2/40 border-border hover:border-accent/50"
                                        )}
                                    >
                                        <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest">{tipo.nombre}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Step 7 Design Model/Logo/Colors */}
                    {currentStep === 7 && formData.tipo_solicitud === 'diseno' && (
                        <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="text-center space-y-2">
                                <h3 className="text-2xl font-bold text-foreground uppercase tracking-tight">Personalización de Marca</h3>
                                <p className="text-xs text-text-muted uppercase tracking-widest">Activos y Estética de la Propuesta</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                                {/* Logo Group */}
                                <div className="space-y-6">
                                    <h4 className="text-[10px] font-black text-text-muted uppercase tracking-[0.3em]">Gestión de Branding</h4>
                                    <div className="space-y-4">
                                        <div className="p-6 rounded-3xl bg-surface-2/40 border border-border flex items-center gap-4 group hover:border-accent/30 transition-all cursor-pointer">
                                            <div className="w-12 h-12 rounded-xl bg-surface-2 border border-border flex items-center justify-center shrink-0">
                                                <Building2 className="text-text-muted" size={20} />
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-xs font-bold text-foreground">Logo Actual de Empresa</p>
                                                <p className="text-[9px] text-text-muted mt-1">Usar archivo predeterminado</p>
                                            </div>
                                            <div className="w-5 h-5 rounded-full border border-border flex items-center justify-center"><Check className="text-accent hidden group-hover:block" size={12} /></div>
                                        </div>
                                        <div className="p-6 rounded-3xl bg-surface-2/40 border border-dashed border-border flex items-center gap-4 hover:border-accent/50 transition-all cursor-pointer">
                                            <div className="w-12 h-12 rounded-xl bg-surface-2 border border-border flex items-center justify-center shrink-0">
                                                <Upload className="text-text-muted" size={20} />
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-xs font-bold text-foreground">Subir Nuevo Activo</p>
                                                <p className="text-[9px] text-text-muted mt-1">Soporte SVG, PNG (Max 5MB)</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Colors Group */}
                                <div className="space-y-6">
                                    <h4 className="text-[10px] font-black text-text-muted uppercase tracking-[0.3em]">Paleta de Colores (Max 3)</h4>
                                    <div className="grid grid-cols-4 gap-3">
                                        {['#000000', '#ffffff', '#FF5733', '#33FF57', '#3357FF', '#F333FF', '#33FFF3', '#F3FF33'].map(color => (
                                            <div
                                                key={color}
                                                onClick={() => {
                                                    setFormData(prev => ({
                                                        ...prev,
                                                        colores: prev.colores.includes(color)
                                                            ? prev.colores.filter(c => c !== color)
                                                            : prev.colores.length < 3 ? [...prev.colores, color] : prev.colores
                                                    }))
                                                }}
                                                className={cn(
                                                    "aspect-square rounded-2xl border transition-all cursor-pointer relative",
                                                    formData.colores.includes(color) ? "border-accent scale-110 shadow-[0_0_15px_var(--glow)]" : "border-border"
                                                )}
                                                style={{ backgroundColor: color }}
                                            >
                                                {formData.colores.includes(color) && (
                                                    <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-2xl text-white">
                                                        <Check size={16} />
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {currentStep === 8 && (
                        <div className="max-w-2xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500 pt-8">
                            <div className="text-center space-y-2">
                                <h3 className="text-2xl font-bold text-foreground uppercase tracking-tight">Detalles de Entrega</h3>
                                <p className="text-xs text-text-muted uppercase tracking-widest leading-loose">Cantidad e Intensidad de Producción</p>
                            </div>

                            <div className="grid gap-8">
                                <div className="space-y-4">
                                    <label className="text-[10px] font-black text-text-muted uppercase tracking-[0.3em]">Cantidad de Unidades</label>
                                    <div className="flex items-center gap-6">
                                        <button
                                            onClick={() => setFormData(prev => ({ ...prev, cantidad: Math.max(1, prev.cantidad - 1) }))}
                                            className="w-14 h-14 rounded-2xl bg-surface-2/40 border border-border flex items-center justify-center text-foreground hover:bg-surface-2 active:scale-95 transition-all"
                                        >-</button>
                                        <div className="flex-1 relative">
                                            <input
                                                type="number"
                                                value={formData.cantidad}
                                                onChange={(e) => {
                                                    const val = parseInt(e.target.value);
                                                    setFormData(prev => ({ ...prev, cantidad: isNaN(val) ? 0 : val }));
                                                }}
                                                onBlur={(e) => {
                                                    let val = parseInt(e.target.value);
                                                    const MAX_QTY = 5000;
                                                    if (isNaN(val) || val < 1) val = 1;
                                                    if (val > MAX_QTY) val = MAX_QTY;
                                                    setFormData(prev => ({ ...prev, cantidad: val }));
                                                }}
                                                className="w-full bg-surface-2/40 border border-border rounded-2xl h-14 flex items-center justify-center text-2xl font-black text-foreground text-center focus:ring-1 focus:ring-accent focus:outline-none transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                            />
                                        </div>
                                        <button
                                            onClick={() => setFormData(prev => ({ ...prev, cantidad: Math.min(5000, formData.cantidad + 1) }))}
                                            className="w-14 h-14 rounded-2xl bg-surface-2/40 border border-border flex items-center justify-center text-foreground hover:bg-surface-2 active:scale-95 transition-all"
                                        >+</button>
                                    </div>
                                    <p className="text-[9px] text-text-muted uppercase tracking-widest text-center">Mínimo 1 · Máximo 5000 unidades</p>
                                </div>

                                <div
                                    onClick={() => setFormData(prev => ({ ...prev, fast_track: !prev.fast_track }))}
                                    className={cn(
                                        "p-8 rounded-[2rem] border transition-all duration-500 cursor-pointer flex items-center justify-between",
                                        formData.fast_track ? "bg-amber-500/10 border-amber-500/50 shadow-[0_0_30px_rgba(245,158,11,0.1)]" : "bg-surface-2/40 border-border hover:border-amber-500/30"
                                    )}
                                >
                                    <div className="flex items-center gap-6">
                                        <div className={cn(
                                            "w-16 h-16 rounded-3xl flex items-center justify-center transition-all",
                                            formData.fast_track ? "bg-amber-500 text-black shadow-[0_0_20px_rgba(245,158,11,0.4)]" : "bg-surface-2 text-text-muted"
                                        )}>
                                            <Zap size={28} fill={formData.fast_track ? "currentColor" : "none"} />
                                        </div>
                                        <div>
                                            <h4 className={cn("text-xl font-bold uppercase tracking-tight", formData.fast_track ? "text-amber-500" : "text-foreground")}>Fast Track</h4>
                                            <p className="text-[10px] text-text-muted uppercase tracking-widest mt-1">Producción prioritaria · SLA reducido a 2 días</p>
                                        </div>
                                    </div>
                                    <div className={cn(
                                        "w-12 h-6 rounded-full relative transition-all duration-500",
                                        formData.fast_track ? "bg-amber-500" : "bg-surface-2"
                                    )}>
                                        <div className={cn(
                                            "absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform duration-500",
                                            formData.fast_track ? "translate-x-6" : "translate-x-0"
                                        )} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {currentStep === 9 && (
                        <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="text-center space-y-2">
                                <h3 className="text-2xl font-bold text-foreground uppercase tracking-tight">Resumen de Solicitud</h3>
                                <p className="text-xs text-text-muted uppercase tracking-widest leading-loose">Verifica los detalles antes de enviar</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                                <div className="p-8 rounded-[2rem] bg-surface-2/40 border border-border space-y-6">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-surface-2 flex items-center justify-center"><Building2 className="text-accent" size={20} /></div>
                                        <div>
                                            <p className="text-[10px] font-black text-text-muted uppercase tracking-widest">Empresa / Marca</p>
                                            <p className="text-sm font-bold text-foreground uppercase">{empresas.find(e => e.id === formData.empresa_id)?.nombre}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-surface-2 flex items-center justify-center"><Package className="text-accent" size={20} /></div>
                                        <div>
                                            <p className="text-[10px] font-black text-text-muted uppercase tracking-widest">Producto / Modelo</p>
                                            <p className="text-sm font-bold text-foreground uppercase">
                                                {formData.tipo_solicitud === 'fabricacion'
                                                    ? tiposMuestrario.find(t => t.id === formData.producto_id)?.nombre
                                                    : 'Diseño Personalizado (' + (tiposMuestrario.find(t => t.id === formData.producto_id)?.nombre || 'Sin Base') + ')'}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="p-8 rounded-[2rem] bg-surface-2/40 border border-border space-y-6">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-surface-2 flex items-center justify-center">
                                            {formData.tipo_solicitud === 'fabricacion' ? <Package className="text-accent" size={20} /> : <Palette className="text-violet-400" size={20} />}
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black text-text-muted uppercase tracking-widest">Tipo de Flujo</p>
                                            <p className={cn("text-sm font-bold uppercase", formData.tipo_solicitud === 'fabricacion' ? "text-accent" : "text-violet-400")}>
                                                {formData.tipo_solicitud === 'fabricacion' ? 'Fabricación' : 'Propuesta de Diseño'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-surface-2 flex items-center justify-center"><Zap className="text-amber-500" size={20} /></div>
                                        <div>
                                            <p className="text-[10px] font-black text-text-muted uppercase tracking-widest">Prioridad</p>
                                            <p className={cn("text-sm font-bold uppercase", formData.fast_track ? "text-amber-500" : "text-foreground")}>
                                                {formData.fast_track ? 'Fast Track (Prioritario)' : 'Estándar'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-surface-2 flex items-center justify-center"><Calendar className="text-accent" size={20} /></div>
                                        <div>
                                            <p className="text-[10px] font-black text-text-muted uppercase tracking-widest">Fecha Estimada de Entrega</p>
                                            <p className="text-sm font-bold text-foreground uppercase">
                                                {new Date(Date.now() + (formData.fast_track ? 2 : 15) * 86400000).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-8">
                                <textarea
                                    placeholder="Notas adicionales o instrucciones especiales..."
                                    className="w-full bg-surface-2/40 border border-border rounded-[2rem] p-8 text-sm text-foreground focus:outline-none focus:border-accent/30 transition-all custom-scrollbar h-32"
                                    value={formData.notas}
                                    onChange={(e) => setFormData(prev => ({ ...prev, notas: e.target.value }))}
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Controls */}
                <div className="p-8 border-t border-border bg-surface/50 flex items-center justify-between shrink-0">
                    <button
                        onClick={prevStep}
                        disabled={currentStep === 1}
                        className="px-8 py-4 rounded-2xl border border-border text-text-muted hover:text-foreground hover:bg-surface-2 transition-all text-xs font-black uppercase tracking-widest disabled:opacity-0 flex items-center gap-2"
                    >
                        <ChevronLeft size={16} /> Atrás
                    </button>

                    <div className="flex items-center gap-6">
                        <p className="text-[10px] text-text-muted font-bold uppercase tracking-widest hidden md:block">Progreso del Pedido: {Math.round((currentStep / 9) * 100)}%</p>
                        <button
                            onClick={nextStep}
                            className="bg-accent hover:bg-accent/90 text-text-inverse font-black px-10 py-4 rounded-2xl flex items-center gap-2 transition-all active:scale-95 shadow-[0_0_20px_var(--glow)] text-xs uppercase tracking-widest"
                        >
                            {currentStep === 9 ? 'Confirmar Pedido' : 'Continuar'} <ChevronRight size={18} />
                        </button>
                    </div>
                </div>

                {/* Toast Notification Overlay */}
                {toast && (
                    <div className={cn(
                        "fixed bottom-8 right-8 z-[200] px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-4 animate-in slide-in-from-right-10 duration-300",
                        toast.type === 'success' ? "bg-accent text-text-inverse" : "bg-danger text-white"
                    )}>
                        {toast.type === 'success' ? <CheckCircle2 size={24} /> : <X size={24} />}
                        <span className="text-sm font-bold uppercase tracking-tight">{toast.message}</span>
                    </div>
                )}
            </div>
        </div>
    );
}
