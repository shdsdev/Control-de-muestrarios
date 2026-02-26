'use client';

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { ESTADO_NAMES, MEXICO_STATES } from '@/lib/mexico-geo';
import {
    Filter,
    LayoutGrid,
    List,
    ChevronRight,
    Search,
    Building2,
    MapPin,
    Loader2,
    X,
    Mail,
    Phone,
    User,
    Edit2,
    Trash2,
    Save,
    Upload,
    History,
    Package,
    GitBranch,
    Clock,
    ShoppingBag,
    ExternalLink,
    Plus,
    MessageCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ImageWithFallback } from '@/components/ui/image-with-fallback';

type Empresa = {
    id: string;
    nombre: string;
    codigo_cliente: string | null;
    region_id: string | null;
    marca_padre_id: string | null;
    logo_url: string | null;
    email: string | null;
    contacto_nombre: string | null;
    contacto_telefono: string | null;
    estado_direccion: string | null;
    municipio: string | null;
    ubicacion: string | null;
    status: string | null;
    sac: string | null;
    created_at: string;
    regiones: { nombre: string } | null;
};

type MuestrarioEmpresa = {
    id: string;
    empresa_id: string;
    tipo_id: string;
    link_drive: string | null;
    imagen_propuesta_url: string | null;
    created_at: string;
    muestrarios_tipos: {
        nombre: string;
        version: string;
        imagen_url: string | null;
    };
};

type MuestrarioTipo = {
    id: string;
    nombre: string;
    version: string;
};

const statusStyles: Record<string, string> = {
    ACTIVO: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    'CLIENTE ACTUAL': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    'Activo': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    NUEVO: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
    'NUEVA ALTA': 'bg-violet-500/10 text-violet-400 border-violet-500/30',
    INGRESO: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
};

export default function EmpresasPage() {
    const [empresas, setEmpresas] = useState<Empresa[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [sacFilter, setSacFilter] = useState<string>('TODOS');


    // Modal states
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<'create' | 'edit' | 'detail' | 'create-sub'>('detail');
    const [selectedEmpresa, setSelectedEmpresa] = useState<Empresa | null>(null);
    const [parentForSub, setParentForSub] = useState<Empresa | null>(null);
    const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    // Form
    const [formData, setFormData] = useState<Partial<Empresa>>({});
    const [uploading, setUploading] = useState(false);

    const router = useRouter();

    // Detail data
    const [solicitudes, setSolicitudes] = useState<any[]>([]);
    const [loadingSolicitudes, setLoadingSolicitudes] = useState(false);
    const [subMarcas, setSubMarcas] = useState<Empresa[]>([]);
    const [muestrariosEmpresa, setMuestrariosEmpresa] = useState<MuestrarioEmpresa[]>([]);
    const [allMuestrarioTypes, setAllMuestrarioTypes] = useState<MuestrarioTipo[]>([]);
    const [isAssigningMuestrario, setIsAssigningMuestrario] = useState(false);
    const [editingMuestrarioId, setEditingMuestrarioId] = useState<string | null>(null);
    const [assignData, setAssignData] = useState({
        tipo_id: '',
        link_drive: '',
        proposal_file: null as File | null,
        existing_proposal_url: ''
    });

    // Geo
    const municipios = useMemo(() => {
        if (!formData.estado_direccion) return [];
        return MEXICO_STATES[formData.estado_direccion] || [];
    }, [formData.estado_direccion]);

    const fetchEmpresas = async () => {
        setLoading(true);
        const { data } = await supabase.from('empresas').select('*, regiones(nombre)').order('nombre');
        if (data) setEmpresas(data as any);
        setLoading(false);
    };

    const fetchSolicitudes = async (empresaId: string) => {
        setLoadingSolicitudes(true);
        const { data } = await supabase
            .from('solicitudes')
            .select('id, correlativo, estado, created_at, muestrarios_tipos(nombre, version)')
            .eq('empresa_id', empresaId)
            .order('created_at', { ascending: false })
            .limit(10);
        setSolicitudes(data || []);
        setLoadingSolicitudes(false);
    };

    const fetchSubMarcas = async (parentId: string) => {
        const { data } = await supabase.from('empresas').select('*').eq('marca_padre_id', parentId).order('nombre');
        setSubMarcas(data || []);
    };

    const fetchMuestrariosEmpresa = async (empresaId: string) => {
        const { data } = await supabase
            .from('muestrarios_empresa')
            .select('*, muestrarios_tipos(nombre, version, imagen_url)')
            .eq('empresa_id', empresaId)
            .order('created_at', { ascending: false });
        setMuestrariosEmpresa(data || []);
    };

    const fetchAllMuestrarioTypes = async () => {
        const { data, error } = await supabase.from('muestrarios_tipos').select('id, nombre, version');
        if (error) console.error('Error fetching muestrarios_tipos:', error);
        setAllMuestrarioTypes(data || []);
    };

    useEffect(() => {
        fetchEmpresas();
        fetchAllMuestrarioTypes();
    }, []);

    // Unique SAC values
    const sacValues = useMemo(() => {
        const set = new Set<string>();
        empresas.forEach(e => { if (e.sac) set.add(e.sac.toUpperCase()); });
        return Array.from(set).sort();
    }, [empresas]);

    // Parent brands
    const parentEmpresas = useMemo(() => empresas.filter(e => !e.marca_padre_id), [empresas]);

    const childCount = useMemo(() => {
        const map = new Map<string, number>();
        empresas.filter(e => e.marca_padre_id).forEach(c => map.set(c.marca_padre_id!, (map.get(c.marca_padre_id!) || 0) + 1));
        return map;
    }, [empresas]);

    // Filter
    const filtered = parentEmpresas.filter(e => {
        const matchSearch = e.nombre.toLowerCase().includes(search.toLowerCase()) ||
            e.contacto_nombre?.toLowerCase().includes(search.toLowerCase()) ||
            e.codigo_cliente?.toLowerCase().includes(search.toLowerCase());
        const matchSac = sacFilter === 'TODOS' || (e.sac && e.sac.toUpperCase() === sacFilter);
        return matchSearch && matchSac;
    });

    const showNotification = (msg: string, type: 'success' | 'error' = 'success') => {
        setNotification({ message: msg, type });
        setTimeout(() => setNotification(null), 4000);
    };

    const handleOpenDetail = (empresa: Empresa) => {
        setSolicitudes([]);
        setSubMarcas([]);
        setMuestrariosEmpresa([]);
        setSelectedEmpresa(empresa);
        setModalMode('detail');
        fetchSolicitudes(empresa.id);
        fetchSubMarcas(empresa.id);
        fetchMuestrariosEmpresa(empresa.id);
        setIsModalOpen(true);
        setIsAssigningMuestrario(false);
    };

    const handleOpenCreate = (parent?: Empresa) => {
        if (parent) {
            setParentForSub(parent);
            setFormData({ marca_padre_id: parent.id });
            setModalMode('create-sub');
        } else {
            setParentForSub(null);
            setFormData({});
            setModalMode('create');
        }
        setSelectedEmpresa(null);
        setIsModalOpen(true);
    };

    const handleOpenEdit = (empresa: Empresa) => {
        setFormData({ ...empresa });
        setModalMode('edit');
        setSelectedEmpresa(null);
        setIsModalOpen(true);
    };

    const handleSave = async () => {
        if (!formData.nombre) { showNotification('El nombre es obligatorio', 'error'); return; }
        const payload = {
            nombre: formData.nombre,
            email: formData.email || null,
            contacto_nombre: formData.contacto_nombre || null,
            contacto_telefono: formData.contacto_telefono || null,
            estado_direccion: formData.estado_direccion || null,
            municipio: formData.municipio || null,
            status: formData.status || 'ACTIVO',
            sac: formData.sac || null,
            logo_url: formData.logo_url || null,
            marca_padre_id: formData.marca_padre_id || null,
        };

        if (modalMode === 'edit' && formData.id) {
            const { error } = await supabase.from('empresas').update(payload).eq('id', formData.id);
            if (error) { showNotification('Error: ' + error.message, 'error'); return; }
            showNotification('Empresa actualizada');
        } else {
            const { error } = await supabase.from('empresas').insert(payload);
            if (error) { showNotification('Error: ' + error.message, 'error'); return; }
            showNotification(formData.marca_padre_id ? 'Sub-marca creada' : 'Empresa creada');
        }
        setIsModalOpen(false);
        fetchEmpresas();
    };

    const handleDelete = async (id: string) => {
        if (!confirm('¿Eliminar esta empresa y sus sub-marcas?')) return;
        await supabase.from('empresas').delete().eq('marca_padre_id', id);
        const { error } = await supabase.from('empresas').delete().eq('id', id);
        if (error) showNotification('Error: ' + error.message, 'error');
        else { showNotification('Empresa eliminada'); setIsModalOpen(false); fetchEmpresas(); }
    };

    const handleAssignMuestrario = async () => {
        if (!assignData.tipo_id || !selectedEmpresa) return;

        let proposalUrl = assignData.existing_proposal_url || '';
        if (assignData.proposal_file) {
            const file = assignData.proposal_file;
            const fileExt = file.name.split('.').pop();
            const fileName = `${selectedEmpresa.id}-${Date.now()}.${fileExt}`;
            const filePath = `propuestas/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('empresa-logos')
                .upload(filePath, file);

            if (uploadError) {
                showNotification('Error subiendo imagen: ' + uploadError.message, 'error');
                return;
            }

            const { data: urlData } = supabase.storage.from('empresa-logos').getPublicUrl(filePath);
            proposalUrl = urlData.publicUrl;
        }

        const payload = {
            empresa_id: selectedEmpresa.id,
            tipo_id: assignData.tipo_id,
            link_drive: assignData.link_drive || null,
            imagen_propuesta_url: proposalUrl || null
        };

        if (editingMuestrarioId) {
            const { error } = await supabase
                .from('muestrarios_empresa')
                .update(payload)
                .eq('id', editingMuestrarioId);

            if (error) showNotification('Error al actualizar: ' + error.message, 'error');
            else {
                showNotification('Muestrario actualizado');
                setIsAssigningMuestrario(false);
                setEditingMuestrarioId(null);
                setAssignData({ tipo_id: '', link_drive: '', proposal_file: null, existing_proposal_url: '' });
                fetchMuestrariosEmpresa(selectedEmpresa.id);
            }
        } else {
            const { error } = await supabase.from('muestrarios_empresa').insert(payload);
            if (error) showNotification('Error al asignar: ' + error.message, 'error');
            else {
                showNotification('Muestrario asignado correctamente');
                setIsAssigningMuestrario(false);
                setAssignData({ tipo_id: '', link_drive: '', proposal_file: null, existing_proposal_url: '' });
                fetchMuestrariosEmpresa(selectedEmpresa.id);
            }
        }
    };

    const handleEditMuestrario = (item: MuestrarioEmpresa) => {
        setAssignData({
            tipo_id: item.tipo_id,
            link_drive: item.link_drive || '',
            proposal_file: null,
            existing_proposal_url: item.imagen_propuesta_url || ''
        });
        setEditingMuestrarioId(item.id);
        setIsAssigningMuestrario(true);
    };

    const handleDeleteMuestrario = async (id: string) => {
        if (!confirm('¿Eliminar este muestrario del inventario de la marca?')) return;
        const { error } = await supabase.from('muestrarios_empresa').delete().eq('id', id);
        if (error) showNotification('Error: ' + error.message, 'error');
        else {
            showNotification('Item eliminado');
            if (selectedEmpresa) fetchMuestrariosEmpresa(selectedEmpresa.id);
        }
    };

    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploading(true);
        const ext = file.name.split('.').pop();
        const path = `logos/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error: uploadError } = await supabase.storage.from('empresa-logos').upload(path, file);
        if (uploadError) { showNotification('Error: ' + uploadError.message, 'error'); setUploading(false); return; }
        const { data: urlData } = supabase.storage.from('empresa-logos').getPublicUrl(path);
        setFormData(prev => ({ ...prev, logo_url: urlData.publicUrl }));
        setUploading(false);
    };

    const handleSendWhatsApp = (item: MuestrarioEmpresa) => {
        if (!selectedEmpresa?.contacto_telefono) {
            showNotification('La empresa no tiene teléfono registrado', 'error');
            return;
        }

        const phone = selectedEmpresa.contacto_telefono.replace(/\D/g, '');
        const productInfo = `${item.muestrarios_tipos?.nombre} v${item.muestrarios_tipos?.version}`;
        const imageUrl = item.imagen_propuesta_url || item.muestrarios_tipos?.imagen_url || '';

        let message = `Hola ${selectedEmpresa.contacto_nombre || 'cliente'}, te comparto la propuesta de ${productInfo} para ${selectedEmpresa.nombre}.`;
        if (imageUrl) message += `\n\nPropuesta Visual en el link: ${imageUrl}`;
        if (item.link_drive) message += `\n\nCarpeta Drive: ${item.link_drive}`;

        const encodedMsg = encodeURIComponent(message);
        window.open(`https://wa.me/${phone}?text=${encodedMsg}`, '_blank');
    };

    const getStatusStyle = (status: string | null) =>
        (status && statusStyles[status]) || 'bg-zinc-800/50 text-zinc-500 border-zinc-700/50';

    // ── Render ──────────────────────────────────────────────────────────

    return (
        <div className="space-y-5 animate-in fade-in duration-500">
            {/* Notification */}
            {notification && (
                <div className={cn(
                    "fixed top-6 right-6 z-[200] px-6 py-4 rounded-2xl border backdrop-blur-xl shadow-2xl animate-in slide-in-from-top-5 duration-300",
                    notification.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-red-500/10 border-red-500/30 text-red-400'
                )}>
                    <span className="text-xs font-bold uppercase tracking-wider">{notification.message}</span>
                </div>
            )}

            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-white uppercase tracking-tight">Empresas</h2>
                    <p className="text-muted-foreground text-[10px] uppercase tracking-[0.1em] font-medium mt-1">
                        {parentEmpresas.length} marcas padre · {empresas.filter(e => e.marca_padre_id).length} sub-marcas
                    </p>
                </div>
                <button
                    onClick={() => handleOpenCreate()}
                    className="btn-neon-aqua px-5 py-3 rounded-xl font-bold flex items-center gap-2 transition-all active:scale-95 text-xs uppercase tracking-wider"
                >
                    <Plus size={18} /> Nueva Empresa
                </button>
            </div>

            {/* SAC Filter Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
                <button
                    onClick={() => setSacFilter('TODOS')}
                    className={cn(
                        "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all whitespace-nowrap shrink-0",
                        sacFilter === 'TODOS'
                            ? 'bg-primary/10 border-primary/30 text-primary shadow-[0_0_12px_rgba(163,230,53,0.1)]'
                            : 'bg-zinc-900/50 border-zinc-800/50 text-zinc-600 hover:text-zinc-400 hover:border-zinc-600/50'
                    )}
                >
                    Todos ({parentEmpresas.length})
                </button>
                <button
                    onClick={() => setSacFilter('SIN_SAC')}
                    className={cn(
                        "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all whitespace-nowrap shrink-0",
                        sacFilter === 'SIN_SAC'
                            ? 'bg-zinc-500/10 border-zinc-500/30 text-zinc-300'
                            : 'bg-zinc-900/50 border-zinc-800/50 text-zinc-600 hover:text-zinc-400 hover:border-zinc-600/50'
                    )}
                >
                    Sin SAC
                </button>
                {sacValues.map(sac => {
                    const count = parentEmpresas.filter(e => e.sac?.toUpperCase() === sac).length;
                    return (
                        <button
                            key={sac}
                            onClick={() => setSacFilter(sac)}
                            className={cn(
                                "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all whitespace-nowrap shrink-0",
                                sacFilter === sac
                                    ? 'bg-violet-500/10 border-violet-500/30 text-violet-400'
                                    : 'bg-zinc-900/50 border-zinc-800/50 text-zinc-600 hover:text-zinc-400 hover:border-zinc-600/50'
                            )}
                        >
                            {sac} ({count})
                        </button>
                    );
                })}
            </div>

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
                <input
                    type="text"
                    placeholder="Buscar por nombre, contacto o código..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full bg-zinc-900/60 border border-border/50 rounded-xl py-3 pl-10 pr-4 text-xs focus:ring-1 focus:ring-primary focus:outline-none transition-all text-white placeholder:text-zinc-700"
                />
            </div>

            {/* Logo Card Grid */}
            {loading ? (
                <div className="flex flex-col items-center justify-center h-[400px] text-muted-foreground gap-4">
                    <Loader2 className="animate-spin text-primary" size={32} />
                    <p className="text-[10px] font-bold uppercase tracking-[0.3em] animate-pulse">Cargando directorio...</p>
                </div>
            ) : (filtered.length > 0 || (sacFilter === 'SIN_SAC')) ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-3">
                    {(sacFilter === 'SIN_SAC'
                        ? parentEmpresas.filter(e => !e.sac && e.nombre.toLowerCase().includes(search.toLowerCase()))
                        : filtered
                    ).map((empresa) => {
                        const subs = childCount.get(empresa.id) || 0;
                        return (
                            <div
                                key={empresa.id}
                                onClick={() => handleOpenDetail(empresa)}
                                className="group relative bg-zinc-900/60 rounded-2xl border border-white/[0.04] hover:border-primary/30 transition-all duration-300 cursor-pointer overflow-hidden hover:shadow-[0_0_30px_rgba(163,230,53,0.06)]"
                            >
                                {/* Logo */}
                                <div className="aspect-square w-full bg-zinc-950/80 flex items-center justify-center p-4 relative overflow-hidden">
                                    <ImageWithFallback
                                        src={empresa.logo_url}
                                        alt={empresa.nombre}
                                        fallbackIcon={Building2}
                                        className="transition-transform duration-500 group-hover:scale-110"
                                        iconClassName="text-zinc-800 group-hover:text-zinc-700 transition-colors"
                                    />

                                    {subs > 0 && (
                                        <div className="absolute top-2 right-2 flex items-center gap-1 px-1.5 py-0.5 bg-violet-500/20 border border-violet-500/30 rounded-md backdrop-blur-sm">
                                            <GitBranch size={8} className="text-violet-400" />
                                            <span className="text-[8px] text-violet-300 font-black">{subs}</span>
                                        </div>
                                    )}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                </div>
                                <div className="px-3 py-2.5 border-t border-white/[0.03]">
                                    <p className="text-[11px] text-zinc-400 font-semibold truncate group-hover:text-white transition-colors">{empresa.nombre}</p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="py-24 text-center text-muted-foreground">
                    <div className="opacity-20 flex flex-col items-center">
                        <Building2 size={48} className="mb-4" />
                        <p className="text-[10px] font-black uppercase tracking-[0.3em]">No se encontraron empresas</p>
                    </div>
                </div>
            )}

            {/* ── Modal ────────────────────────────────────────────────────── */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200" onClick={() => setIsModalOpen(false)}>
                    <div className={cn(
                        "bg-[#0a0a0b] w-full rounded-3xl border border-border/50 shadow-2xl animate-in zoom-in-95 duration-300 max-h-[90vh] flex flex-col transition-all",
                        modalMode === 'detail' ? "max-w-5xl" : "max-w-2xl"
                    )} onClick={e => e.stopPropagation()}>

                        {/* Header */}
                        <div className="flex items-center justify-between p-6 border-b border-border/30 shrink-0">
                            <div>
                                <h3 className="text-lg font-bold text-white uppercase tracking-tight">
                                    {modalMode === 'create' ? 'Nueva Empresa' :
                                        modalMode === 'create-sub' ? `Sub-marca de ${parentForSub?.nombre}` :
                                            modalMode === 'edit' ? 'Editar Empresa' : selectedEmpresa?.nombre}
                                </h3>
                                <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-black mt-1">
                                    {modalMode === 'detail' ? 'Detalles y historial' : 'Completa la información'}
                                </p>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white/5 rounded-full text-zinc-500 hover:text-white transition-all"><X size={24} /></button>
                        </div>

                        {/* Body */}
                        <div className="p-0 overflow-hidden flex-1 flex flex-col">
                            {modalMode === 'detail' && selectedEmpresa ? (
                                <div className="grid grid-cols-1 md:grid-cols-12 h-full overflow-hidden">
                                    {/* Left Column: Info & History */}
                                    <div className="md:col-span-7 p-6 overflow-y-auto custom-scrollbar border-r border-white/[0.03] space-y-6">
                                        <div className="flex items-start gap-5">
                                            <div className="w-24 h-24 rounded-2xl bg-zinc-900 border border-white/5 flex items-center justify-center overflow-hidden shrink-0 shadow-2xl">
                                                <ImageWithFallback
                                                    src={selectedEmpresa.logo_url}
                                                    alt={selectedEmpresa.nombre}
                                                    fallbackIcon={Building2}
                                                    className="p-2"
                                                    iconClassName="text-zinc-700"
                                                />
                                            </div>

                                            <div className="flex-1 space-y-3">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className={cn("px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border", getStatusStyle(selectedEmpresa.status))}>
                                                        {selectedEmpresa.status || 'N/A'}
                                                    </span>
                                                    {selectedEmpresa.sac && (
                                                        <span className="px-2 py-1 bg-primary/10 border border-primary/20 rounded-lg text-[9px] text-primary font-bold">SAC: {selectedEmpresa.sac}</span>
                                                    )}
                                                    {selectedEmpresa.marca_padre_id && (
                                                        <span className="px-2 py-1 bg-violet-500/10 border border-violet-500/20 rounded-lg text-[9px] text-violet-400 font-bold flex items-center gap-1"><GitBranch size={9} /> Sub-marca</span>
                                                    )}
                                                </div>
                                                <div className="grid grid-cols-2 gap-3">
                                                    {selectedEmpresa.contacto_nombre && (
                                                        <div className="flex items-center gap-2 text-xs text-zinc-400"><User size={12} className="text-zinc-600" /><span>{selectedEmpresa.contacto_nombre}</span></div>
                                                    )}
                                                    {selectedEmpresa.email && (
                                                        <div className="flex items-center gap-2 text-xs text-zinc-400"><Mail size={12} className="text-zinc-600" /><span>{selectedEmpresa.email}</span></div>
                                                    )}
                                                    {selectedEmpresa.contacto_telefono && (
                                                        <div className="flex items-center gap-2 text-xs text-zinc-400"><Phone size={12} className="text-zinc-600" /><span>{selectedEmpresa.contacto_telefono}</span></div>
                                                    )}
                                                    {selectedEmpresa.estado_direccion && (
                                                        <div className="flex items-center gap-2 text-xs text-zinc-400"><MapPin size={12} className="text-zinc-600" /><span>{selectedEmpresa.municipio ? `${selectedEmpresa.municipio}, ` : ''}{selectedEmpresa.estado_direccion}</span></div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Sub-brands */}
                                        {subMarcas.length > 0 && (
                                            <div className="bg-surface-2/20 rounded-2xl p-4 border border-border">
                                                <h4 className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] mb-3 flex items-center gap-2"><GitBranch size={12} />Sub-marcas ({subMarcas.length})</h4>
                                                <div className="grid grid-cols-2 gap-2">
                                                    {subMarcas.map(sub => (
                                                        <div key={sub.id} onClick={() => handleOpenDetail(sub)}
                                                            className="bg-surface-2/50 rounded-xl border border-border p-3 flex items-center gap-3 cursor-pointer hover:border-accent/30 transition-all group">
                                                            <div className="w-10 h-10 rounded-lg bg-surface-2 border border-border flex items-center justify-center overflow-hidden shrink-0">
                                                                <ImageWithFallback
                                                                    src={sub.logo_url}
                                                                    alt={sub.nombre}
                                                                    fallbackIcon={Building2}
                                                                    className="p-1"
                                                                    iconClassName="text-text-muted"
                                                                />
                                                            </div>

                                                            <span className="text-[11px] text-text-muted font-semibold truncate group-hover:text-foreground transition-colors">{sub.nombre}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Order History */}
                                        <div className="space-y-3">
                                            <h4 className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] flex items-center gap-2"><History size={12} />Historial de Pedidos</h4>
                                            {loadingSolicitudes ? (
                                                <div className="flex items-center gap-2 py-4 text-text-muted"><Loader2 size={14} className="animate-spin" /><span className="text-[10px] uppercase tracking-widest">Cargando...</span></div>
                                            ) : solicitudes.length > 0 ? (
                                                <div className="space-y-1">
                                                    {solicitudes.map(s => (
                                                        <div key={s.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-surface-2/30 hover:bg-surface-2/60 transition-colors">
                                                            <Package size={14} className="text-text-muted shrink-0" />
                                                            <span className="text-xs text-foreground font-bold">#{s.correlativo}</span>
                                                            <span className="text-[10px] text-text-muted">{s.muestrarios_tipos?.nombre}</span>
                                                            {s.muestrarios_tipos?.version && <span className="text-[9px] text-text-muted bg-surface-2 px-1.5 py-0.5 rounded border border-border">v{s.muestrarios_tipos.version}</span>}
                                                            <span className="ml-auto text-[9px] text-text-muted flex items-center gap-1"><Clock size={9} />{new Date(s.created_at).toLocaleDateString()}</span>
                                                            <span className="text-[9px] px-2 py-0.5 rounded bg-surface-2 text-text-muted font-bold uppercase border border-border">{s.estado}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <p className="text-[10px] text-text-muted uppercase tracking-widest py-4 text-center bg-surface-2/20 rounded-2xl border border-dashed border-border">Sin pedidos registrados</p>
                                            )}
                                        </div>

                                        {/* Actions */}
                                        <div className="grid grid-cols-4 gap-2 pt-2">
                                            <button onClick={() => handleOpenEdit(selectedEmpresa)}
                                                className="bg-surface-2 hover:bg-surface-2/80 text-foreground font-bold py-3 rounded-2xl border border-border transition-all flex items-center justify-center gap-2 active:scale-95 text-[10px] uppercase tracking-widest">
                                                <Edit2 size={14} /> Editar
                                            </button>
                                            <button onClick={() => handleOpenCreate(selectedEmpresa)}
                                                className="bg-surface-2/50 hover:bg-accent/10 text-accent font-bold py-3 rounded-2xl border border-border transition-all flex items-center justify-center gap-2 active:scale-95 text-[10px] uppercase tracking-widest">
                                                <Plus size={14} /> Sub-marca
                                            </button>
                                            <button onClick={() => {
                                                router.push(`/solicitudes?empresa_id=${selectedEmpresa.id}&empresa_nombre=${encodeURIComponent(selectedEmpresa.nombre)}`);
                                            }}
                                                className="bg-accent hover:brightness-110 text-text-inverse font-extrabold py-3 rounded-2xl transition-all flex items-center justify-center gap-2 active:scale-95 text-[10px] uppercase tracking-widest shadow-[0_0_15px_var(--glow)]">
                                                <ShoppingBag size={14} /> Nuevo Pedido
                                            </button>
                                            <button onClick={() => handleDelete(selectedEmpresa.id)}
                                                className="bg-danger/10 hover:bg-danger/20 text-danger rounded-2xl transition-all flex items-center justify-center active:scale-95 py-3 border border-danger/20">
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Right Column: Inventory */}
                                    <div className="md:col-span-12 lg:col-span-5 p-6 overflow-y-auto custom-scrollbar bg-surface/40">
                                        <div className="flex items-center justify-between mb-4">
                                            <h4 className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] flex items-center gap-2">
                                                <Package size={12} /> Muestrarios Creados ({muestrariosEmpresa.length})
                                            </h4>
                                            <button
                                                onClick={() => {
                                                    if (isAssigningMuestrario) {
                                                        setIsAssigningMuestrario(false);
                                                        setEditingMuestrarioId(null);
                                                        setAssignData({ tipo_id: '', link_drive: '', proposal_file: null, existing_proposal_url: '' });
                                                    } else {
                                                        setIsAssigningMuestrario(true);
                                                    }
                                                }}
                                                className="px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5 shadow-[0_0_15px_rgba(16,185,129,0.05)]"
                                            >
                                                {isAssigningMuestrario ? <X size={12} /> : <Plus size={12} />}
                                                {isAssigningMuestrario ? 'Cancelar' : 'Asignar'}
                                            </button>
                                        </div>

                                        {isAssigningMuestrario && (
                                            <div className="bg-emerald-500/[0.03] border border-emerald-500/20 rounded-2xl p-4 mb-4 space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                                                <h5 className="text-[10px] font-black text-emerald-500/70 uppercase tracking-widest mb-1">
                                                    {editingMuestrarioId ? 'Editar Asignación' : 'Nueva Asignación'}
                                                </h5>
                                                <div className="space-y-3">
                                                    <div className="space-y-1.5">
                                                        <label className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest pl-1">Tipo de Muestrario</label>
                                                        <select
                                                            value={assignData.tipo_id}
                                                            onChange={e => setAssignData({ ...assignData, tipo_id: e.target.value })}
                                                            className="w-full bg-card border border-border/50 rounded-xl px-3 py-2.5 text-xs text-foreground focus:ring-1 focus:ring-primary outline-none appearance-none"
                                                        >
                                                            <option value="">Selecciona producto...</option>
                                                            {allMuestrarioTypes.map(t => (
                                                                <option key={t.id} value={t.id}>{t.nombre} v{t.version}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        <label className="text-[9px] text-text-muted font-bold uppercase tracking-widest pl-1">Link Carpeta Drive</label>
                                                        <input
                                                            type="text"
                                                            value={assignData.link_drive}
                                                            onChange={e => setAssignData({ ...assignData, link_drive: e.target.value })}
                                                            placeholder="https://drive.google.com/..."
                                                            className="w-full bg-surface-2 border border-border rounded-xl px-3 py-2.5 text-xs text-foreground focus:ring-1 focus:ring-accent outline-none placeholder:text-text-muted/50"
                                                        />
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        <label className="text-[9px] text-text-muted font-bold uppercase tracking-widest pl-1">Imagen de Propuesta</label>
                                                        <div className="flex items-center gap-3">
                                                            <label className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-surface-2 border border-dashed border-border rounded-xl cursor-pointer hover:border-accent/50 transition-all text-text-muted hover:text-foreground">
                                                                <Upload size={14} />
                                                                <span className="text-[9px] font-black uppercase tracking-widest truncate">
                                                                    {assignData.proposal_file ? assignData.proposal_file.name : 'Subir imagen'}
                                                                </span>
                                                                <input
                                                                    type="file"
                                                                    className="hidden"
                                                                    accept="image/*"
                                                                    onChange={e => setAssignData({ ...assignData, proposal_file: e.target.files?.[0] || null })}
                                                                />
                                                            </label>
                                                            {assignData.proposal_file && (
                                                                <button onClick={() => setAssignData({ ...assignData, proposal_file: null })} className="p-3 bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500/20 transition-all">
                                                                    <X size={14} />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={handleAssignMuestrario}
                                                        disabled={!assignData.tipo_id}
                                                        className="w-full bg-emerald-500 hover:bg-emerald-600 text-black font-black py-2.5 rounded-xl text-[10px] uppercase tracking-[0.2em] transition-all active:scale-[0.98] disabled:opacity-50"
                                                    >
                                                        {editingMuestrarioId ? 'Guardar Cambios' : 'Confirmar'}
                                                    </button>
                                                </div>
                                            </div>
                                        )}

                                        {muestrariosEmpresa.length > 0 ? (
                                            <div className="grid grid-cols-1 gap-2.5">
                                                {muestrariosEmpresa.map((item) => (
                                                    <div key={item.id} className="group relative rounded-2xl bg-white/[0.02] border border-white/[0.04] p-3 hover:bg-white/[0.04] hover:border-white/[0.08] transition-all duration-300">
                                                        <div className="flex items-center gap-4">
                                                            <div className="w-14 h-14 rounded-xl bg-zinc-950 border border-white/5 flex items-center justify-center overflow-hidden shrink-0 shadow-lg">
                                                                <ImageWithFallback
                                                                    src={item.imagen_propuesta_url || item.muestrarios_tipos?.imagen_url}
                                                                    alt={item.muestrarios_tipos?.nombre}
                                                                    fallbackIcon={Package}
                                                                    iconClassName="text-zinc-800"
                                                                />
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-center justify-between mb-1">
                                                                    <h5 className="text-[11px] font-bold text-white truncate">{item.muestrarios_tipos?.nombre}</h5>
                                                                </div>
                                                                <div className="flex flex-wrap gap-x-3 gap-y-1 items-center">
                                                                    {item.link_drive ? (
                                                                        <a href={item.link_drive} target="_blank" rel="noopener noreferrer" className="text-[9px] text-primary hover:text-primary-foreground hover:bg-primary/10 px-1.5 py-0.5 rounded transition-all flex items-center gap-1">
                                                                            <ExternalLink size={8} /> Drive
                                                                        </a>
                                                                    ) : (
                                                                        <span className="text-[8px] text-zinc-700 uppercase font-black">Sin Drive</span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                                                <button
                                                                    onClick={() => handleSendWhatsApp(item)}
                                                                    className="p-2 text-emerald-500/70 hover:text-emerald-400 active:scale-90 transition-all rounded-lg"
                                                                    title="Enviar por WhatsApp"
                                                                >
                                                                    <MessageCircle size={14} />
                                                                </button>
                                                                <button
                                                                    onClick={() => handleEditMuestrario(item)}
                                                                    className="p-2 text-zinc-700 hover:text-primary active:scale-90 transition-all rounded-lg"
                                                                    title="Editar"
                                                                >
                                                                    <Edit2 size={12} />
                                                                </button>
                                                                <button
                                                                    onClick={() => handleDeleteMuestrario(item.id)}
                                                                    className="p-2 text-zinc-700 hover:text-red-400 active:scale-90 transition-all rounded-lg"
                                                                    title="Eliminar"
                                                                >
                                                                    <Trash2 size={12} />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="py-12 border-2 border-dashed border-zinc-900/50 rounded-3xl text-center bg-zinc-900/10">
                                                <p className="text-[10px] text-zinc-700 uppercase tracking-[0.2em] font-black">Inventario vacío</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                /* ── Create / Edit / Sub-brand Form ────────────── */
                                <div className="p-6 overflow-y-auto custom-scrollbar space-y-5">
                                    {/* Logo Upload */}
                                    <div className="flex items-center gap-4">
                                        <div className="w-20 h-20 rounded-2xl bg-zinc-900 border border-dashed border-zinc-700 flex items-center justify-center overflow-hidden relative cursor-pointer">
                                            {formData.logo_url ? <img src={formData.logo_url} className="w-full h-full object-contain p-2" alt="" /> : <Upload size={20} className="text-zinc-700" />}
                                            <input type="file" accept="image/*" onChange={handleLogoUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
                                            {uploading && <div className="absolute inset-0 bg-black/60 flex items-center justify-center"><Loader2 size={16} className="animate-spin text-primary" /></div>}
                                        </div>
                                        <div className="flex-1">
                                            <label className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest block mb-1.5">Nombre de la Marca *</label>
                                            <input type="text" value={formData.nombre || ''} onChange={e => setFormData({ ...formData, nombre: e.target.value })}
                                                className="w-full bg-zinc-900/50 border border-border/50 rounded-xl px-4 py-3 text-sm text-white focus:ring-1 focus:ring-primary focus:outline-none transition-all" placeholder="Nombre de la empresa o marca" />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest block mb-1.5">Contacto</label>
                                            <input type="text" value={formData.contacto_nombre || ''} onChange={e => setFormData({ ...formData, contacto_nombre: e.target.value })}
                                                className="w-full bg-zinc-900/50 border border-border/50 rounded-xl px-4 py-3 text-sm text-white focus:ring-1 focus:ring-primary focus:outline-none transition-all" placeholder="Nombre del contacto" />
                                        </div>
                                        <div>
                                            <label className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest block mb-1.5">Email</label>
                                            <input type="email" value={formData.email || ''} onChange={e => setFormData({ ...formData, email: e.target.value })}
                                                className="w-full bg-zinc-900/50 border border-border/50 rounded-xl px-4 py-3 text-sm text-white focus:ring-1 focus:ring-primary focus:outline-none transition-all" placeholder="correo@ejemplo.com" />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest block mb-1.5">Teléfono</label>
                                            <input type="text" value={formData.contacto_telefono || ''} onChange={e => setFormData({ ...formData, contacto_telefono: e.target.value })}
                                                className="w-full bg-zinc-900/50 border border-border/50 rounded-xl px-4 py-3 text-sm text-white focus:ring-1 focus:ring-primary focus:outline-none transition-all" placeholder="Teléfono" />
                                        </div>
                                        <div>
                                            <label className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest block mb-1.5">SAC Asignado</label>
                                            <input type="text" value={formData.sac || ''} onChange={e => setFormData({ ...formData, sac: e.target.value })}
                                                className="w-full bg-zinc-900/50 border border-border/50 rounded-xl px-4 py-3 text-sm text-white focus:ring-1 focus:ring-primary focus:outline-none transition-all" placeholder="Nombre SAC" />
                                        </div>
                                    </div>

                                    {/* State & Municipality dropdowns */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest block mb-1.5">Estado</label>
                                            <select
                                                value={formData.estado_direccion || ''}
                                                onChange={e => setFormData({ ...formData, estado_direccion: e.target.value, municipio: '' })}
                                                className="w-full bg-zinc-900/50 border border-border/50 rounded-xl px-4 py-3 text-sm text-white focus:ring-1 focus:ring-primary focus:outline-none transition-all appearance-none"
                                            >
                                                <option value="">Selecciona un estado</option>
                                                {ESTADO_NAMES.map(st => (
                                                    <option key={st} value={st}>{st}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest block mb-1.5">Municipio / Ciudad</label>
                                            <select
                                                value={formData.municipio || ''}
                                                onChange={e => setFormData({ ...formData, municipio: e.target.value })}
                                                disabled={!formData.estado_direccion}
                                                className={cn(
                                                    "w-full bg-zinc-900/50 border border-border/50 rounded-xl px-4 py-3 text-sm text-white focus:ring-1 focus:ring-primary focus:outline-none transition-all appearance-none",
                                                    !formData.estado_direccion && 'opacity-40 cursor-not-allowed'
                                                )}
                                            >
                                                <option value="">{formData.estado_direccion ? 'Selecciona municipio' : 'Primero elige un estado'}</option>
                                                {municipios.map(m => (
                                                    <option key={m} value={m}>{m}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    {/* Status */}
                                    <div>
                                        <label className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest block mb-1.5">Status</label>
                                        <select value={formData.status || 'ACTIVO'} onChange={e => setFormData({ ...formData, status: e.target.value })}
                                            className="w-full bg-zinc-900/50 border border-border/50 rounded-xl px-4 py-3 text-sm text-white focus:ring-1 focus:ring-primary focus:outline-none transition-all appearance-none">
                                            <option value="ACTIVO">Activo</option>
                                            <option value="NUEVO">Nuevo</option>
                                            <option value="NUEVA ALTA">Nueva Alta</option>
                                            <option value="INGRESO">Ingreso</option>
                                            <option value="CLIENTE ACTUAL">Cliente Actual</option>
                                            <option value="INACTIVO">Inactivo</option>
                                        </select>
                                    </div>

                                    <button onClick={handleSave}
                                        className="w-full btn-neon-aqua py-4 rounded-2xl font-bold flex items-center justify-center gap-2 text-xs uppercase tracking-wider active:scale-95 transition-all">
                                        <Save size={18} />
                                        {modalMode === 'edit' ? 'Guardar Cambios' : modalMode === 'create-sub' ? 'Crear Sub-marca' : 'Crear Empresa'}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
