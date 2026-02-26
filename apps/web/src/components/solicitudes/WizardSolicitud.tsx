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
    CheckCircle2,
    Plus,
    ExternalLink
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getMuestrariosCreadosByEmpresa, type MuestrarioCreado } from '@/lib/data/empresas';
import { ImageWithFallback } from '@/components/ui/image-with-fallback';

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
        proyecto_nombre: '', // For design folders
        logo_url: '',
        colores: [] as string[],
        cantidad: 1,
        fast_track: false,
        notas: ''
    });

    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [isCreatingEmpresa, setIsCreatingEmpresa] = useState(false);
    const [newEmpresaData, setNewEmpresaData] = useState({ nombre: '', region_id: '' });
    const [regiones, setRegiones] = useState<any[]>([]);
    const [driveLoading, setDriveLoading] = useState(false);
    const [successData, setSuccessData] = useState<{ url: string, codigo: string } | null>(null);

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
    const [isSearchingEmpresas, setIsSearchingEmpresas] = useState(false);
    const [empresaPage, setEmpresaPage] = useState(1);
    const [hasMoreEmpresas, setHasMoreEmpresas] = useState(true);
    const EMPRESAS_PER_PAGE = 30;


    const handleCreateEmpresa = async () => {
        if (!newEmpresaData.nombre) return showToast('El nombre es obligatorio', 'error');
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('empresas')
                .insert({
                    nombre: newEmpresaData.nombre,
                    region_id: newEmpresaData.region_id || null
                })
                .select()
                .single();

            if (error) throw error;

            showToast('Empresa creada exitosamente');
            setEmpresas(prev => [...prev, data].sort((a, b) => a.nombre.localeCompare(b.nombre)));
            setFormData(prev => ({ ...prev, empresa_id: data.id }));
            setIsCreatingEmpresa(false);
            setNewEmpresaData({ nombre: '', region_id: '' });
            setCurrentStep(3); // Auto-advance to next step
        } catch (error: any) {
            console.error('Error creating empresa:', error);
            showToast('Error al crear empresa: ' + error.message, 'error');
        } finally {
            setLoading(false);
        }
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
            proyecto_nombre: '',
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
            setFormData(prev => ({ ...prev, solicitante_id: profile.id, proyecto_nombre: '' }));

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

        const { data: regionesData } = await supabase.from('regiones').select('*').order('nombre');
        setRegiones(regionesData || []);

        const { data: tiposData } = await supabase.from('muestrarios_tipos').select('*').order('nombre');
        setTiposMuestrario(tiposData || []);

        // Initial fetch of companies (top 50)
        await searchEmpresas('');
    };

    const searchEmpresas = async (term: string, page: number = 1) => {
        setIsSearchingEmpresas(true);
        try {
            const start = (page - 1) * EMPRESAS_PER_PAGE;
            const end = start + EMPRESAS_PER_PAGE - 1;

            let query = supabase.from('empresas').select('*', { count: 'exact' });

            if (term) {
                query = query.ilike('nombre', `%${term}%`);
            } else {
                query = query.is('marca_padre_id', null);
            }

            const { data, count } = await query
                .order('nombre')
                .range(start, end);

            const newEmpresas = data || [];
            if (page === 1) {
                setEmpresas(newEmpresas);
            } else {
                setEmpresas(prev => {
                    // Filter out duplicates just in case
                    const existingIds = new Set(prev.map(e => e.id));
                    return [...prev, ...newEmpresas.filter(e => !existingIds.has(e.id))];
                });
            }

            setHasMoreEmpresas(count ? (start + newEmpresas.length < count) : false);
            setEmpresaPage(page);
        } catch (error) {
            console.error('Error searching empresas:', error);
        } finally {
            setIsSearchingEmpresas(false);
        }
    };

    const handleLoadMoreEmpresas = () => {
        if (!isSearchingEmpresas && hasMoreEmpresas) {
            searchEmpresas(empresaSearch, empresaPage + 1);
        }
    };

    // Debounced search for empresas
    useEffect(() => {
        if (!isOpen) return;
        const timer = setTimeout(() => {
            searchEmpresas(empresaSearch);
        }, 300);
        return () => clearTimeout(timer);
    }, [empresaSearch, isOpen]);

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

            // 3. IF Design Proposal -> Call Drive Factory
            if (formData.tipo_solicitud === 'diseno') {
                setDriveLoading(true);
                try {
                    const empresaNombre = empresas.find(e => e.id === formData.empresa_id)?.nombre || 'CLIENTE';
                    const tipoProducto = tiposMuestrario.find(t => t.id === formData.producto_id)?.nombre || 'GENERAL';

                    const body = new FormData();
                    body.append('solicitudId', newSolicitud.id);
                    body.append('empresaId', formData.empresa_id);
                    body.append('empresaNombre', empresaNombre);
                    body.append('codigo', newSolicitud.codigo);
                    body.append('clienteNombre', empresaNombre); // Keep for compatibility if needed elsewhere
                    body.append('tipoProducto', tipoProducto);

                    if (logoFile) body.append('logoFile', logoFile);

                    const driveRes = await fetch('/api/drive/setup', {
                        method: 'POST',
                        body: body
                    });

                    const driveData = await driveRes.json();

                    if (driveData.success) {
                        setSuccessData({
                            url: driveData.folderUrl,
                            codigo: newSolicitud.codigo
                        });
                    } else {
                        console.warn('Drive setup returned fail:', driveData);
                        showToast('Advertencia: Carpeta de Drive no creada automáticamente.', 'error');
                    }
                } catch (driveErr) {
                    console.error('Drive Setup Catch:', driveErr);
                } finally {
                    setDriveLoading(false);
                }
            } else {
                // Fabricacion success
                setSuccessData({ url: '', codigo: newSolicitud.codigo });
            }

            // showToast('¡Solicitud creada exitosamente!', 'success');
            // Success step handled by successData presence

        } catch (err: any) {
            console.error('Final Error Catch:', err);
            const errorMsg = err.message || JSON.stringify(err);
            showToast(`Error: ${errorMsg}`, 'error');
        } finally {
            setLoading(false);
        }
    };

    const nextStep = () => {
        if (currentStep === 2 && !formData.empresa_id) return showToast('Error: Debes seleccionar o crear una empresa', 'error');

        if (currentStep === 3) {
            if (formData.tipo_solicitud === 'fabricacion') setCurrentStep(4);
            else setCurrentStep(6);
        } else if (currentStep === 5 && formData.tipo_solicitud === 'fabricacion') {
            setCurrentStep(8);
        } else if (currentStep === 6 && formData.tipo_solicitud === 'diseno') {
            setCurrentStep(7);
        } else if (currentStep === 7 && formData.tipo_solicitud === 'diseno') {
            if (!logoFile) return showToast('Error: El logo es obligatorio para propuestas de diseño', 'error');
            if (formData.colores.length === 0) return showToast('Error: Selecciona al menos 1 color para el branding', 'error');
            setCurrentStep(8);
        } else if (currentStep === 8) {
            setCurrentStep(9);
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
                                <div className="relative flex-1 w-full flex gap-3">
                                    <div className="relative flex-1">
                                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
                                        <input
                                            type="text"
                                            placeholder="Buscar empresa o sub-marca..."
                                            value={empresaSearch}
                                            onChange={(e) => setEmpresaSearch(e.target.value)}
                                            className="w-full bg-surface-2 border border-border rounded-2xl py-3 pl-12 pr-4 text-xs focus:ring-1 focus:ring-accent focus:outline-none transition-all text-foreground placeholder:text-text-muted/50 shadow-inner"
                                        />
                                    </div>
                                    {isSearchingEmpresas && (
                                        <div className="absolute right-16 top-1/2 -translate-y-1/2">
                                            <Loader2 className="animate-spin text-accent" size={16} />
                                        </div>
                                    )}
                                    <button
                                        onClick={() => setIsCreatingEmpresa(!isCreatingEmpresa)}
                                        className={cn(
                                            "px-4 rounded-2xl border transition-all flex items-center gap-2 text-[10px] font-black uppercase tracking-widest",
                                            isCreatingEmpresa ? "bg-danger/10 border-danger text-danger" : "bg-accent/10 border-accent text-accent hover:bg-accent hover:text-white"
                                        )}
                                    >
                                        {isCreatingEmpresa ? <X size={16} /> : <><Plus size={16} /> Nueva</>}
                                    </button>
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
                                {isCreatingEmpresa ? (
                                    <div className="max-w-xl mx-auto p-8 bg-surface-2/40 border border-border rounded-[2.5rem] animate-in fade-in slide-in-from-top-4 duration-500 space-y-8">
                                        <div className="text-center space-y-2">
                                            <h4 className="text-xl font-bold text-foreground uppercase tracking-tight">Nueva Empresa</h4>
                                            <p className="text-[10px] text-text-muted uppercase tracking-[0.2em]">Registro rápido de marca</p>
                                        </div>
                                        <div className="space-y-6">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-1">Nombre Comercial</label>
                                                <input
                                                    type="text"
                                                    value={newEmpresaData.nombre}
                                                    onChange={(e) => setNewEmpresaData(prev => ({ ...prev, nombre: e.target.value }))}
                                                    className="w-full bg-surface-2 border border-border rounded-2xl py-4 px-6 text-sm focus:ring-1 focus:ring-accent focus:outline-none transition-all"
                                                    placeholder="Ej. Shades Luxury"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-1">Región de Operación</label>
                                                <select
                                                    value={newEmpresaData.region_id}
                                                    onChange={(e) => setNewEmpresaData(prev => ({ ...prev, region_id: e.target.value }))}
                                                    className="w-full bg-surface-2 border border-border rounded-2xl py-4 px-6 text-sm focus:ring-1 focus:ring-accent focus:outline-none transition-all appearance-none cursor-pointer"
                                                >
                                                    <option value="">Seleccionar región...</option>
                                                    {regiones.map(r => (
                                                        <option key={r.id} value={r.id}>{r.nombre}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <button
                                                onClick={handleCreateEmpresa}
                                                disabled={loading}
                                                className="w-full bg-accent text-text-inverse font-black py-5 rounded-2xl flex items-center justify-center gap-3 transition-all active:scale-[0.98] shadow-lg text-[10px] uppercase tracking-[0.2em]"
                                            >
                                                {loading ? <Loader2 className="animate-spin" size={20} /> : <><Check size={20} /> Guardar Marca</>}
                                            </button>
                                        </div>
                                    </div>
                                ) : empresaViewMode === 'grid' ? (
                                    <div className="space-y-8">
                                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                            {empresas
                                                .filter(e => !e.marca_padre_id)
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
                                                            <ImageWithFallback
                                                                src={empresa.logo_url}
                                                                alt={empresa.nombre}
                                                                fallbackIcon={Building2}
                                                                className="p-2"
                                                                iconClassName="text-text-muted opacity-50"
                                                            />
                                                        </div>
                                                        <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest text-center group-hover:text-foreground transition-colors">{empresa.nombre}</span>
                                                    </div>
                                                ))}
                                        </div>

                                        {empresas.filter(e => !e.marca_padre_id).length === 0 && !isSearchingEmpresas && (
                                            <div className="flex flex-col items-center justify-center py-12 px-4 space-y-4 bg-surface-2/20 border border-dashed border-border rounded-[2rem] animate-in fade-in zoom-in-95 duration-500 max-w-xl mx-auto">
                                                <div className="w-16 h-16 rounded-full bg-surface-2 flex items-center justify-center border border-border">
                                                    <Building2 className="text-text-muted/40" size={32} />
                                                </div>
                                                <div className="text-center space-y-1">
                                                    <p className="text-sm font-bold text-foreground uppercase tracking-tight">No se encontró la empresa</p>
                                                    <p className="text-[10px] text-text-muted uppercase tracking-widest">¿Deseas registrarla rápidamente?</p>
                                                </div>
                                                <button
                                                    onClick={() => setIsCreatingEmpresa(true)}
                                                    className="px-8 py-3 bg-accent text-text-inverse rounded-2xl text-[10px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-[0_0_20px_var(--glow)]"
                                                >
                                                    Crear Marca Ahora
                                                </button>
                                            </div>
                                        )}

                                        {hasMoreEmpresas && (
                                            <div className="flex justify-center pt-4">
                                                <button
                                                    onClick={handleLoadMoreEmpresas}
                                                    disabled={isSearchingEmpresas}
                                                    className="px-6 py-2.5 rounded-xl border border-border bg-surface-2/40 text-[10px] font-black uppercase tracking-widest text-text-muted hover:text-foreground hover:border-accent/50 transition-all disabled:opacity-50"
                                                >
                                                    {isSearchingEmpresas ? <Loader2 className="animate-spin" size={14} /> : 'Cargar más empresas'}
                                                </button>
                                            </div>
                                        )}

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
                                                                    <ImageWithFallback
                                                                        src={sub.logo_url}
                                                                        alt={sub.nombre}
                                                                        fallbackIcon={Building2}
                                                                        className="p-1"
                                                                        iconClassName="text-text-muted opacity-50"
                                                                    />
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
                                                .filter(e => !e.marca_padre_id)
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
                                                                <ImageWithFallback
                                                                    src={empresa.logo_url}
                                                                    alt={empresa.nombre}
                                                                    fallbackIcon={Building2}
                                                                    className="p-1"
                                                                    iconClassName="text-zinc-800"
                                                                />
                                                            </div>
                                                            <span className={cn("text-xs font-bold uppercase tracking-widest", formData.empresa_id === empresa.id ? "text-primary" : "text-white")}>{empresa.nombre}</span>
                                                        </div>

                                                        {/* Nested Sub-brands */}
                                                        {empresas
                                                            .filter(sub => sub.marca_padre_id === empresa.id)
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
                                                                        <ImageWithFallback
                                                                            src={sub.logo_url}
                                                                            alt={sub.nombre}
                                                                            fallbackIcon={Building2}
                                                                            className="p-1"
                                                                            iconClassName="text-zinc-800"
                                                                        />
                                                                    </div>
                                                                    <span className={cn("text-[10px] font-semibold uppercase tracking-widest", formData.empresa_id === sub.id ? "text-violet-400" : "text-zinc-400")}>{sub.nombre}</span>
                                                                    <span className="text-[8px] text-zinc-600 font-black uppercase ml-auto">Sub-marca</span>
                                                                </div>
                                                            ))}
                                                    </div>
                                                ))}
                                        </div>

                                        {hasMoreEmpresas && (
                                            <div className="p-4 border-t border-white/5 flex justify-center">
                                                <button
                                                    onClick={handleLoadMoreEmpresas}
                                                    disabled={isSearchingEmpresas}
                                                    className="px-6 py-2.5 rounded-xl border border-white/5 bg-white/[0.02] text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-white hover:border-white/10 transition-all disabled:opacity-50"
                                                >
                                                    {isSearchingEmpresas ? <Loader2 className="animate-spin" size={14} /> : 'Cargar más empresas'}
                                                </button>
                                            </div>
                                        )}

                                        {hasMoreEmpresas && (
                                            <div className="p-4 border-t border-white/5 flex justify-center">
                                                <button
                                                    onClick={handleLoadMoreEmpresas}
                                                    disabled={isSearchingEmpresas}
                                                    className="px-6 py-2.5 rounded-xl border border-white/5 bg-white/[0.02] text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-white hover:border-white/10 transition-all disabled:opacity-50"
                                                >
                                                    {isSearchingEmpresas ? <Loader2 className="animate-spin" size={14} /> : 'Cargar más empresas'}
                                                </button>
                                            </div>
                                        )}
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
                                                    <ImageWithFallback
                                                        src={item.imagen_propuesta_url || item.muestrarios_tipos?.imagen_url}
                                                        alt={item.muestrarios_tipos?.nombre}
                                                        fallbackIcon={Package}
                                                        iconClassName="text-text-muted/20"
                                                    />
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
                        <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500 pt-8">
                            <div className="text-center space-y-2">
                                <h3 className="text-2xl font-bold text-foreground uppercase tracking-tight">Personalización de Marca</h3>
                                <p className="text-xs text-text-muted uppercase tracking-widest leading-loose">Activos y Estética de la Propuesta</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                                {/* Logo Group */}
                                <div className="space-y-6">
                                    <h4 className="text-[10px] font-black text-text-muted uppercase tracking-[0.3em]">Logo de la Marca (Obligatorio)</h4>
                                    <div className="space-y-4">
                                        <label className={cn(
                                            "relative p-8 rounded-[2rem] border-2 border-dashed transition-all cursor-pointer flex flex-col items-center justify-center gap-4 group",
                                            logoFile ? "bg-accent/5 border-accent/40" : "bg-surface-2/40 border-border hover:border-accent/40"
                                        )}>
                                            <input
                                                type="file"
                                                className="hidden"
                                                accept=".pdf,.svg,.png,.jpg,.jpeg"
                                                onChange={(e) => setLogoFile(e.target.files?.[0] || null)}
                                            />
                                            <div className={cn(
                                                "w-16 h-16 rounded-3xl flex items-center justify-center transition-all",
                                                logoFile ? "bg-accent text-white shadow-[0_0_20px_var(--glow)]" : "bg-surface-2 text-text-muted group-hover:bg-accent/10 group-hover:text-accent"
                                            )}>
                                                {logoFile ? <Check size={32} /> : <Upload size={32} />}
                                            </div>
                                            <div className="text-center">
                                                <p className="text-xs font-bold text-foreground truncate max-w-[200px]">
                                                    {logoFile ? logoFile.name : 'Seleccionar Archivo'}
                                                </p>
                                                <p className="text-[10px] text-text-muted mt-1 uppercase tracking-widest">
                                                    PDF, SVG, PNG o JPG (Max 10MB)
                                                </p>
                                            </div>
                                            {logoFile && (
                                                <button
                                                    onClick={(e) => { e.preventDefault(); setLogoFile(null); }}
                                                    className="absolute top-4 right-4 p-2 bg-danger/10 text-danger rounded-xl hover:bg-danger hover:text-white transition-all"
                                                >
                                                    <X size={14} />
                                                </button>
                                            )}
                                        </label>

                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-1">Nombre del Proyecto / Propuesta</label>
                                            <input
                                                type="text"
                                                value={formData.proyecto_nombre}
                                                onChange={(e) => setFormData(prev => ({ ...prev, proyecto_nombre: e.target.value }))}
                                                className="w-full bg-surface-2 border border-border rounded-2xl py-4 px-6 text-sm focus:ring-1 focus:ring-accent focus:outline-none transition-all placeholder:text-text-muted/30"
                                                placeholder="Ej. Colección Verano 2025"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Colors Group */}
                                <div className="space-y-6">
                                    <div className="flex items-center justify-between">
                                        <h4 className="text-[10px] font-black text-text-muted uppercase tracking-[0.3em]">Paleta de Colores (1-3)</h4>
                                        <span className="text-[10px] font-bold text-accent uppercase tracking-widest">{formData.colores.length}/3</span>
                                    </div>
                                    <div className="grid grid-cols-4 gap-3">
                                        {[
                                            { hex: '#000000' },
                                            { hex: '#FFFFFF' },
                                            { hex: '#4B5563' },
                                            { hex: '#1D4ED8' },
                                            { hex: '#B45309' },
                                            { hex: '#991B1B' },
                                            { hex: '#065F46' },
                                            { hex: 'CUSTOM' }
                                        ].map((item, idx) => {
                                            if (item.hex === 'CUSTOM') {
                                                return (
                                                    <div key="custom" className="relative group aspect-square rounded-2xl border border-border bg-surface-2/40 flex items-center justify-center cursor-pointer hover:border-accent/40 transition-all overflow-hidden">
                                                        <Plus size={20} className="text-text-muted group-hover:text-accent" />
                                                        <input
                                                            type="color"
                                                            className="absolute inset-0 opacity-0 cursor-pointer"
                                                            onChange={(e) => {
                                                                const color = e.target.value;
                                                                if (!formData.colores.includes(color) && formData.colores.length < 3) {
                                                                    setFormData(prev => ({ ...prev, colores: [...prev.colores, color] }));
                                                                }
                                                            }}
                                                        />
                                                    </div>
                                                );
                                            }
                                            return (
                                                <div
                                                    key={idx}
                                                    onClick={() => {
                                                        setFormData(prev => ({
                                                            ...prev,
                                                            colores: prev.colores.includes(item.hex)
                                                                ? prev.colores.filter(c => c !== item.hex)
                                                                : prev.colores.length < 3 ? [...prev.colores, item.hex] : prev.colores
                                                        }))
                                                    }}
                                                    className={cn(
                                                        "aspect-square rounded-2xl border transition-all cursor-pointer relative flex items-center justify-center group",
                                                        formData.colores.includes(item.hex) ? "border-accent scale-105 shadow-[0_0_15px_var(--glow)]" : "border-border hover:border-accent/30"
                                                    )}
                                                    style={{ backgroundColor: item.hex }}
                                                >
                                                    {formData.colores.includes(item.hex) && (
                                                        <div className="bg-black/10 w-full h-full rounded-2xl flex items-center justify-center">
                                                            <Check size={16} className={cn(item.hex === '#FFFFFF' ? "text-black" : "text-white")} />
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                    <div className="flex gap-2 flex-wrap min-h-[40px] p-4 bg-surface-2/20 border border-border rounded-2xl">
                                        {formData.colores.length === 0 && <p className="text-[10px] text-text-muted/40 uppercase tracking-widest flex items-center h-full">Selecciona colores para el branding...</p>}
                                        {formData.colores.map(c => (
                                            <div key={c} className="px-3 py-1.5 rounded-full bg-accent/20 border border-accent/30 text-accent text-[9px] font-black uppercase tracking-widest flex items-center gap-2 animate-in zoom-in duration-300">
                                                <div className="w-2.5 h-2.5 rounded-full border border-white/20" style={{ backgroundColor: c }} />
                                                {c}
                                                <X size={10} className="cursor-pointer hover:text-danger transition-colors" onClick={() => setFormData(prev => ({ ...prev, colores: prev.colores.filter(x => x !== c) }))} />
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

                    {currentStep === 9 && !successData && (
                        <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pt-8">
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

                    {successData && (
                        <div className="max-w-2xl mx-auto py-12 flex flex-col items-center text-center space-y-10 animate-in zoom-in-95 duration-700">
                            <div className="relative">
                                <div className="absolute inset-0 bg-accent/20 blur-3xl rounded-full scale-150 animate-pulse" />
                                <div className="relative w-32 h-32 bg-accent rounded-[2.5rem] flex items-center justify-center shadow-[0_0_50px_var(--glow)]">
                                    <CheckCircle2 size={64} className="text-text-inverse" />
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h3 className="text-4xl font-bold text-foreground uppercase tracking-tight">¡Solicitud Enviada!</h3>
                                <p className="text-xl font-bold text-accent tracking-[0.2em]">{successData.codigo}</p>
                                <p className="text-sm text-text-muted max-w-sm mx-auto uppercase tracking-widest leading-loose">
                                    Tu solicitud ha sido registrada correctamente y está en proceso de aprobación técnica.
                                </p>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full pt-4">
                                {successData.url && (
                                    <a
                                        href={successData.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="bg-white/5 border border-white/10 hover:bg-white/10 text-white font-black py-5 rounded-[2rem] flex items-center justify-center gap-3 transition-all active:scale-[0.98] shadow-xl text-[10px] uppercase tracking-[0.2em]"
                                    >
                                        <ExternalLink size={18} /> Abrir Carpeta Drive
                                    </a>
                                )}
                                <button
                                    onClick={() => { onClose(); onSuccess(); }}
                                    className="bg-accent text-text-inverse font-black py-5 rounded-[2rem] flex items-center justify-center gap-3 transition-all active:scale-[0.98] shadow-[0_0_30px_var(--glow)] text-[10px] uppercase tracking-[0.2em]"
                                >
                                    Cerrar y Salir
                                </button>
                            </div>

                            {driveLoading && (
                                <p className="text-[10px] text-accent font-black uppercase tracking-[0.3em] flex items-center gap-2">
                                    <Loader2 className="animate-spin" size={12} /> Sincronizando Activos...
                                </p>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer Controls */}
                {!successData && (
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
                                onClick={currentStep === 9 ? handleSubmit : nextStep}
                                disabled={loading || driveLoading}
                                className="bg-accent hover:bg-accent/90 text-text-inverse font-black px-10 py-4 rounded-2xl flex items-center gap-2 transition-all active:scale-95 shadow-[0_0_20px_var(--glow)] text-xs uppercase tracking-widest disabled:opacity-50"
                            >
                                {loading || driveLoading ? <Loader2 className="animate-spin" size={18} /> : (currentStep === 9 ? 'Confirmar Pedido' : 'Continuar')}
                                {!(loading || driveLoading) && <ChevronRight size={18} />}
                            </button>
                        </div>
                    </div>
                )}

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
