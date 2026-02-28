'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import {
    Plus,
    Search,
    Users,
    Shield,
    Mail,
    Loader2,
    Settings,
    BadgeCheck,
    X,
    User,
    Edit2,
    Trash2,
    Save,
    Upload,
    ChevronRight,
    MapPin,
    Eye,
    Lock,
    Briefcase
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { CustomSelect } from '@/components/ui/custom-select';
import { ImageWithFallback } from '@/components/ui/image-with-fallback';
import { useAuth } from '@/components/providers/AuthProvider';

type Perfil = {
    id: string;
    email: string;
    nombre_completo: string;
    posicion: string | null;
    status_acceso: string;
    rol: string;
    region_id: string;
    avatar_url: string | null;
    permisos_vistas: string[];
    regiones: { nombre: string } | null;
};

// Role hierarchy: lower number = higher privilege
const ROLE_LEVELS: Record<string, number> = {
    super_usuario: 0,
    administrador: 1,
    validador_sac: 2,
    solicitante: 3,
    proveedor: 4,
    repartidor: 5,
    receptor: 5,
    auditor_mostrador_c6: 5,
};

const ALL_ROLES = [
    { value: 'administrador', label: 'Administrador', level: 1 },
    { value: 'validador_sac', label: 'Validador SAC', level: 2 },
    { value: 'solicitante', label: 'Solicitante', level: 3 },
    { value: 'proveedor', label: 'Proveedor', level: 4 },
    { value: 'repartidor', label: 'Repartidor', level: 5 },
    { value: 'receptor', label: 'Receptor', level: 5 },
    { value: 'auditor_mostrador_c6', label: 'Auditor Mostrador C6', level: 5 },
];

const roleStyles: Record<string, string> = {
    super_usuario: 'border-status-purple/40 text-status-purple bg-status-purple/10 shadow-[0_0_15px_rgba(168,85,247,0.1)]',
    administrador: 'border-status-blue/40 text-status-blue bg-status-blue/10 shadow-[0_0_15px_rgba(59,130,246,0.1)]',
    solicitante: 'border-zinc-500/40 text-zinc-400 bg-zinc-500/10',
    validador_sac: 'border-status-amber/40 text-status-amber bg-status-amber/10 shadow-[0_0_15px_rgba(245,158,11,0.1)]',
};

const statusStyles: Record<string, string> = {
    ACTIVO: 'border-primary/40 text-primary bg-primary/10 shadow-[0_0_15px_rgba(163,230,53,0.1)]',
    PENDIENTE: 'border-red-500/40 text-red-500 bg-red-500/10 shadow-[0_0_15px_rgba(239,68,68,0.1)]',
};

const vailableViews = [
    'Dashboard',
    'Solicitudes',
    'Materia Prima',
    'Productos',
    'Empresas',
    'Usuarios',
    'Reportes',
    'Configuración'
];

const avatarNeonColors = [
    { bg: 'bg-red-500/15', border: 'border-red-500/40', text: 'text-red-400', glow: 'shadow-[0_0_12px_rgba(239,68,68,0.25)]' },
    { bg: 'bg-pink-500/15', border: 'border-pink-500/40', text: 'text-pink-400', glow: 'shadow-[0_0_12px_rgba(236,72,153,0.25)]' },
    { bg: 'bg-violet-500/15', border: 'border-violet-500/40', text: 'text-violet-400', glow: 'shadow-[0_0_12px_rgba(139,92,246,0.25)]' },
    { bg: 'bg-blue-500/15', border: 'border-blue-500/40', text: 'text-blue-400', glow: 'shadow-[0_0_12px_rgba(59,130,246,0.25)]' },
    { bg: 'bg-cyan-400/15', border: 'border-cyan-400/40', text: 'text-cyan-400', glow: 'shadow-[0_0_12px_rgba(34,211,238,0.25)]' },
    { bg: 'bg-emerald-400/15', border: 'border-emerald-400/40', text: 'text-emerald-400', glow: 'shadow-[0_0_12px_rgba(52,211,153,0.25)]' },
    { bg: 'bg-amber-400/15', border: 'border-amber-400/40', text: 'text-amber-400', glow: 'shadow-[0_0_12px_rgba(251,191,36,0.25)]' },
    { bg: 'bg-zinc-400/15', border: 'border-zinc-400/40', text: 'text-zinc-300', glow: 'shadow-[0_0_12px_rgba(161,161,170,0.15)]' },
];

const getAvatarColor = (id: string) => {
    const index = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % avatarNeonColors.length;
    return avatarNeonColors[index];
};

export default function UsuariosPage() {
    const { user: authUser, refreshProfile } = useAuth();
    const [usuarios, setUsuarios] = useState<Perfil[]>([]);
    const [regiones, setRegiones] = useState<{ id: string, nombre: string }[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [currentUserRole, setCurrentUserRole] = useState<string>('solicitante');
    const [filterPending, setFilterPending] = useState(false);

    // Modal states
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<'create' | 'edit' | 'detail'>('detail');
    const [selectedUsuario, setSelectedUsuario] = useState<Perfil | null>(null);
    const [notification, setNotification] = useState<{ message: string, type: 'success' | 'error' } | null>(null);

    // Form states
    const [formData, setFormData] = useState<Partial<Perfil>>({});
    const [uploading, setUploading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Hierarchy helpers
    const myLevel = ROLE_LEVELS[currentUserRole] ?? 99;
    const canManage = myLevel <= 1; // only super_usuario and administrador can manage
    const allowedRoles = ALL_ROLES.filter(r => r.level > myLevel);

    const canEditUser = (targetRole: string) => {
        const targetLevel = ROLE_LEVELS[targetRole] ?? 99;
        return canManage && targetLevel > myLevel;
    };

    const fetchUsuarios = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('perfiles')
            .select(`
                *,
                regiones(nombre)
            `)
            .order('nombre_completo');

        if (!error && data) {
            setUsuarios(data as any);
        }
        setLoading(false);
    };

    const fetchRegiones = async () => {
        const { data } = await supabase.from('regiones').select('id, nombre').order('nombre');
        if (data) setRegiones(data);
    };

    const fetchCurrentUserRole = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const { data } = await supabase.from('perfiles').select('rol').eq('id', user.id).single();
            if (data) setCurrentUserRole(data.rol);
        }
    };

    useEffect(() => {
        fetchUsuarios();
        fetchRegiones();
        fetchCurrentUserRole();
    }, []);

    const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
        setNotification({ message, type });
        setTimeout(() => setNotification(null), 3000);
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
            const filePath = `avatars/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath);

            setFormData(prev => ({ ...prev, avatar_url: publicUrl }));
            showNotification('Imagen de perfil subida correctamente');
        } catch (error: any) {
            showNotification(error.message || 'Error al subir la imagen', 'error');
        } finally {
            setUploading(false);
        }
    };

    const handleOpenModal = (mode: 'create' | 'edit' | 'detail', usuario?: Perfil) => {
        setModalMode(mode);
        setSelectedUsuario(usuario || null);
        setFormData(usuario || {
            rol: 'solicitante',
            permisos_vistas: ['Dashboard', 'Solicitudes'],
        });
        setIsModalOpen(true);
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            if (modalMode === 'create') {
                // Use Edge Function to create auth user + profile atomically
                const { data: { session } } = await supabase.auth.getSession();
                if (!session?.access_token) throw new Error('No hay sesión activa');

                const res = await fetch(
                    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/create-user`,
                    {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${session.access_token}`,
                            'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
                        },
                        body: JSON.stringify({
                            email: formData.email?.trim(),
                            nombre_completo: formData.nombre_completo?.trim(),
                            rol: formData.rol || 'solicitante',
                            region_id: formData.region_id || null,
                            avatar_url: formData.avatar_url || null,
                            permisos_vistas: formData.permisos_vistas || [],
                        }),
                    }
                );

                const result = await res.json();
                if (!res.ok) throw new Error(result.error || 'Error al crear usuario');
            } else {
                // For edits, update directly (user already exists in auth)
                const payload = {
                    nombre_completo: formData.nombre_completo?.trim(),
                    email: formData.email?.trim(),
                    posicion: formData.posicion?.trim(),
                    status_acceso: formData.status_acceso,
                    rol: formData.rol,
                    region_id: formData.region_id,
                    avatar_url: formData.avatar_url,
                    permisos_vistas: formData.permisos_vistas,
                };
                const { error } = await supabase.from('perfiles').update(payload).eq('id', selectedUsuario?.id);
                if (error) throw error;
            }

            showNotification(`Usuario ${modalMode === 'create' ? 'agregado' : 'actualizado'} exitosamente`);
            setIsModalOpen(false);

            // If updating current user, refresh the global profile
            if (selectedUsuario?.id === authUser?.id) {
                console.log('UsuariosPage: Self-update detected, refreshing global profile');
                await refreshProfile();
            }

            fetchUsuarios();
        } catch (error: any) {
            showNotification(error.message || 'Error al guardar el usuario', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('¿Estás seguro de eliminar este usuario?')) return;

        try {
            const { error } = await supabase.from('perfiles').delete().eq('id', id);
            if (error) throw error;
            showNotification('Usuario eliminado exitosamente');
            setIsModalOpen(false);
            fetchUsuarios();
        } catch (error: any) {
            showNotification(error.message || 'Error al eliminar el usuario', 'error');
        }
    };

    const toggleViewPermission = (view: string) => {
        const current = formData.permisos_vistas || [];
        if (current.includes(view)) {
            setFormData({ ...formData, permisos_vistas: current.filter(v => v !== view) });
        } else {
            setFormData({ ...formData, permisos_vistas: [...current, view] });
        }
    };

    const filtered = usuarios
        .filter(u => {
            const matchesSearch = u.nombre_completo?.toLowerCase().includes(search.toLowerCase()) ||
                u.email?.toLowerCase().includes(search.toLowerCase());
            const matchesFilter = filterPending ? u.status_acceso === 'PENDIENTE' : true;
            return matchesSearch && matchesFilter;
        });

    return (
        <div className="space-y-6 animate-in fade-in duration-500 max-w-[1400px] mx-auto w-full">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-white uppercase tracking-tight">Usuarios</h2>
                    <p className="text-muted-foreground text-[10px] uppercase tracking-[0.1em] font-medium mt-1">Control de acceso y gestión de roles técnicos</p>
                </div>
                {canManage && (
                    <button
                        onClick={() => handleOpenModal('create')}
                        className="btn-neon-aqua px-5 py-3 rounded-xl font-bold flex items-center gap-2 transition-all active:scale-95 text-xs uppercase tracking-wider"
                    >
                        <Plus size={18} />
                        Nuevo Usuario
                    </button>
                )}
            </div>

            {/* Content Table */}
            <div className="bg-secondary/20 rounded-3xl overflow-hidden border border-border/50 shadow-2xl">
                <div className="p-4 border-b border-border/50 bg-white/[0.01] flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="relative w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
                            <input
                                type="text"
                                placeholder="Buscar usuario..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full bg-[#09090b] border border-border rounded-xl py-2 pl-9 pr-4 text-xs focus:ring-1 focus:ring-primary focus:outline-none transition-all text-white"
                            />
                        </div>
                        <button
                            onClick={() => setFilterPending(!filterPending)}
                            className={cn(
                                "flex items-center gap-2 px-4 py-2 rounded-xl border text-[10px] font-bold uppercase tracking-wider transition-all",
                                filterPending
                                    ? "bg-red-500/10 border-red-500/40 text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.1)]"
                                    : "bg-white/5 border-white/10 text-zinc-500 hover:border-white/20"
                            )}
                        >
                            <Loader2 size={12} className={cn(filterPending && "animate-spin")} />
                            Pendientes
                        </button>
                    </div>
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center h-[400px] text-muted-foreground gap-4">
                        <Loader2 className="animate-spin text-primary" size={32} />
                        <p className="text-[10px] font-bold uppercase tracking-[0.3em] animate-pulse">Sincronizando perfiles...</p>
                    </div>
                ) : (
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-white/[0.01]">
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Colaborador</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Posición</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Rol</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Estado</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground text-center">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/20">
                            {filtered.length > 0 ? (
                                filtered.map((item) => (
                                    <tr
                                        key={item.id}
                                        className="hover:bg-white/[0.02] transition-colors group cursor-pointer"
                                        onClick={() => handleOpenModal('detail', item)}
                                    >
                                        <td className="px-6 py-5">
                                            <div className="flex items-center gap-3">
                                                <ImageWithFallback
                                                    src={item.avatar_url}
                                                    alt={item.nombre_completo || ''}
                                                    className="w-10 h-10 rounded-full border border-white/10"
                                                    fallbackIcon={User}
                                                    iconClassName={cn(
                                                        "w-10 h-10 rounded-full border flex items-center justify-center transition-all",
                                                        getAvatarColor(item.id).bg,
                                                        getAvatarColor(item.id).border,
                                                        getAvatarColor(item.id).text,
                                                        getAvatarColor(item.id).glow
                                                    )}
                                                />
                                                <div className="flex flex-col">
                                                    <span className="text-white font-bold text-sm tracking-tight">{item.nombre_completo || 'Sin nombre'}</span>
                                                    <div className="flex items-center gap-1 text-[10px] text-zinc-500 font-medium">
                                                        <Mail size={10} />
                                                        {item.email}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <span className="text-xs text-zinc-400 font-bold uppercase tracking-tight">
                                                {item.posicion || 'Sin definir'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className={cn(
                                                "inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border text-[9px] font-black uppercase tracking-widest",
                                                roleStyles[item.rol] || roleStyles.solicitante
                                            )}>
                                                <Shield size={10} />
                                                {item.rol.replace(/_/g, ' ')}
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className={cn(
                                                "inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border text-[9px] font-black uppercase tracking-widest",
                                                statusStyles[item.status_acceso] || statusStyles.PENDIENTE
                                            )}>
                                                {item.status_acceso === 'ACTIVO' ? <BadgeCheck size={10} /> : <Loader2 size={10} className="animate-spin" />}
                                                {item.status_acceso}
                                            </div>
                                        </td>
                                        <td className="px-6 py-5 text-center" onClick={(e) => e.stopPropagation()}>
                                            <div className="flex items-center justify-center gap-1">
                                                {canEditUser(item.rol) ? (
                                                    <>
                                                        {item.status_acceso === 'PENDIENTE' && (
                                                            <button
                                                                onClick={() => {
                                                                    setFormData({ ...item, status_acceso: 'ACTIVO' });
                                                                    setSelectedUsuario(item);
                                                                    setModalMode('edit');
                                                                    handleSave(); // Note: handleSave uses formData and selectedUsuario
                                                                }}
                                                                title="Aprobar Acceso"
                                                                className="p-2 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary transition-all active:scale-95"
                                                            >
                                                                <BadgeCheck size={16} />
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={() => handleOpenModal('edit', item)}
                                                            className="p-2 rounded-lg hover:bg-white/10 text-muted-foreground hover:text-white transition-all active:scale-95"
                                                        >
                                                            <Edit2 size={16} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(item.id)}
                                                            className="p-2 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-all active:scale-95"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </>
                                                ) : (
                                                    <Lock size={14} className="text-zinc-600" />
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={5} className="px-6 py-24 text-center text-muted-foreground">
                                        <div className="opacity-20 flex flex-col items-center">
                                            <Users size={48} className="mb-4" />
                                            <p className="text-[10px] font-black uppercase tracking-[0.3em]">No se encontraron usuarios</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Notification Toast */}
            {notification && (
                <div className="fixed bottom-8 right-8 z-[100] toast-slide-in">
                    <div className={cn(
                        "flex items-center gap-3 px-6 py-4 rounded-2xl border shadow-2xl backdrop-blur-xl",
                        notification.type === 'success'
                            ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                            : "bg-red-500/10 border-red-500/20 text-red-400"
                    )}>
                        {notification.type === 'success' ? <BadgeCheck size={20} /> : <X size={20} />}
                        <span className="text-sm font-bold tracking-tight">{notification.message}</span>
                    </div>
                </div>
            )}

            {/* User Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop-blur animate-in fade-in duration-300">
                    <div
                        className="bg-[#0c0c0e]/95 w-full max-w-2xl rounded-[2.5rem] overflow-hidden modal-lime-stroke animate-in zoom-in-95 duration-300 relative"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Modal Header */}
                        <div className="p-8 border-b border-white/5 flex items-center justify-between">
                            <div>
                                <h3 className="text-xl font-bold text-white tracking-tight">
                                    {modalMode === 'create' ? 'Agregar Nuevo Usuario' : selectedUsuario?.nombre_completo || selectedUsuario?.email}
                                </h3>
                                <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-black mt-1">
                                    {modalMode === 'create' ? 'Configura el acceso y perfil' :
                                        modalMode === 'edit' ? 'Editando Perfil de Usuario' : 'Detalles de Perfil y Acceso'}
                                </p>
                            </div>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="p-2 hover:bg-white/5 rounded-full text-zinc-500 hover:text-white transition-all"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
                            {modalMode === 'detail' ? (
                                <div className="space-y-8">
                                    <div className="flex gap-8">
                                        <div className="w-48 h-48 rounded-3xl border border-white/5 flex items-center justify-center overflow-hidden shrink-0 group">
                                            <ImageWithFallback
                                                src={selectedUsuario?.avatar_url}
                                                alt={selectedUsuario?.nombre_completo || ''}
                                                fallbackIcon={User}
                                                iconClassName={(() => {
                                                    const c = selectedUsuario ? getAvatarColor(selectedUsuario.id) : avatarNeonColors[7];
                                                    return cn(
                                                        "w-full h-full flex items-center justify-center",
                                                        c.bg, c.text
                                                    );
                                                })()}
                                            />
                                        </div>
                                        <div className="flex-1 space-y-4">
                                            <div className="flex items-center gap-3">
                                                <div className={cn(
                                                    "inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border text-[9px] font-black uppercase tracking-widest",
                                                    selectedUsuario ? (roleStyles[selectedUsuario.rol] || roleStyles.solicitante) : ''
                                                )}>
                                                    <Shield size={10} />
                                                    {selectedUsuario?.rol.replace(/_/g, ' ')}
                                                </div>
                                                <span className="px-2.5 py-1 bg-white/5 text-zinc-300 text-[10px] font-black tracking-widest rounded-lg border border-white/10 uppercase flex items-center gap-1">
                                                    <MapPin size={10} />
                                                    {selectedUsuario?.regiones?.nombre || 'Global'}
                                                </span>
                                            </div>
                                            <div className="space-y-1">
                                                <h4 className="text-white font-bold text-lg">{selectedUsuario?.nombre_completo}</h4>
                                                <p className="text-zinc-500 text-sm flex items-center gap-1.5 italic">
                                                    <Mail size={12} />
                                                    {selectedUsuario?.email}
                                                </p>
                                            </div>

                                            <div className="pt-2">
                                                <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest block mb-2">Vistas con Acceso</span>
                                                <div className="flex flex-wrap gap-1.5">
                                                    {selectedUsuario?.permisos_vistas?.map(v => (
                                                        <span key={v} className="px-2 py-1 bg-primary/10 border border-primary/30 rounded-lg text-[10px] text-primary font-bold uppercase flex items-center gap-1">
                                                            <Eye size={10} />
                                                            {v}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {selectedUsuario && canEditUser(selectedUsuario.rol) ? (
                                        <div className="flex items-center gap-3 pt-4">
                                            <button
                                                onClick={() => setModalMode('edit')}
                                                className="flex-1 bg-white/5 hover:bg-white/10 text-white font-bold py-4 rounded-2xl transition-all flex items-center justify-center gap-2 active:scale-95"
                                            >
                                                <Edit2 size={18} />
                                                Editar Usuario
                                            </button>
                                            <button
                                                onClick={() => selectedUsuario && handleDelete(selectedUsuario.id)}
                                                className="w-16 h-14 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-2xl transition-all flex items-center justify-center active:scale-95"
                                            >
                                                <Trash2 size={20} />
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2 pt-4 px-4 py-3 bg-zinc-900/50 rounded-2xl border border-zinc-800">
                                            <Lock size={14} className="text-zinc-600" />
                                            <span className="text-[10px] text-zinc-600 font-bold uppercase tracking-wider">No tienes permisos para editar este usuario</span>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    <div className="grid grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Nombre Completo</label>
                                            <input
                                                type="text"
                                                className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3.5 text-sm text-white focus:ring-1 focus:ring-primary focus:outline-none transition-all"
                                                value={formData.nombre_completo || ''}
                                                onChange={(e) => setFormData({ ...formData, nombre_completo: e.target.value })}
                                                placeholder="Ej. Juan Pérez"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Email Corporativo</label>
                                            <input
                                                type="email"
                                                className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3.5 text-sm text-white focus:ring-1 focus:ring-primary focus:outline-none transition-all"
                                                value={formData.email || ''}
                                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                                placeholder="juan@empresa.com"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Posición / Cargo</label>
                                            <div className="relative group">
                                                <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-primary transition-colors" size={16} />
                                                <input
                                                    type="text"
                                                    className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-5 py-3.5 text-sm text-white focus:ring-1 focus:ring-primary focus:outline-none transition-all"
                                                    value={formData.posicion || ''}
                                                    onChange={(e) => setFormData({ ...formData, posicion: e.target.value })}
                                                    placeholder="Ej. SAC 1"
                                                />
                                            </div>
                                        </div>
                                        <CustomSelect
                                            label="Estado de Acceso"
                                            value={formData.status_acceso || 'PENDIENTE'}
                                            onChange={(val) => setFormData({ ...formData, status_acceso: val })}
                                            icon={Lock}
                                            options={[
                                                { value: 'ACTIVO', label: 'ACTIVO' },
                                                { value: 'PENDIENTE', label: 'PENDIENTE' }
                                            ]}
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-6">
                                        <CustomSelect
                                            label="Rol de Usuario"
                                            value={formData.rol || 'solicitante'}
                                            onChange={(val) => setFormData({ ...formData, rol: val })}
                                            icon={Shield}
                                            options={allowedRoles.map(r => ({ value: r.value, label: r.label }))}
                                        />
                                        <CustomSelect
                                            label="Región / Planta"
                                            value={formData.region_id || ''}
                                            onChange={(val) => setFormData({ ...formData, region_id: val })}
                                            placeholder="Acceso Global"
                                            icon={MapPin}
                                            options={[
                                                { value: '', label: 'Acceso Global' },
                                                ...regiones.map(r => ({ value: r.id, label: r.nombre }))
                                            ]}
                                        />
                                    </div>

                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Permisos de Vistas</label>
                                        <div className="grid grid-cols-3 gap-2">
                                            {vailableViews.map(view => (
                                                <button
                                                    key={view}
                                                    onClick={() => toggleViewPermission(view)}
                                                    className={cn(
                                                        "px-4 py-2.5 rounded-xl border text-[10px] font-bold uppercase tracking-wider transition-all flex items-center gap-2",
                                                        formData.permisos_vistas?.includes(view)
                                                            ? "bg-primary/10 border-primary/40 text-primary shadow-[0_0_15px_rgba(212,255,112,0.1)]"
                                                            : "bg-white/5 border-white/10 text-zinc-500 hover:border-white/20"
                                                    )}
                                                >
                                                    <Eye size={12} className={cn(formData.permisos_vistas?.includes(view) ? "opacity-100" : "opacity-30")} />
                                                    {view}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Imagen de Perfil</label>
                                        <div className="relative group">
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={handleImageUpload}
                                                className="hidden"
                                                id="avatar-upload"
                                                disabled={uploading}
                                            />
                                            <label
                                                htmlFor="avatar-upload"
                                                className={cn(
                                                    "w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3.5 text-xs text-zinc-400 cursor-pointer flex items-center justify-between hover:bg-white/10 transition-all",
                                                    uploading && "opacity-50 cursor-not-allowed"
                                                )}
                                            >
                                                <span className="truncate">
                                                    {uploading ? 'Subiendo...' : formData.avatar_url ? 'Imagen seleccionada' : 'Seleccionar fotografía...'}
                                                </span>
                                                {uploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                                            </label>
                                            {formData.avatar_url && !uploading && (
                                                <div className="mt-2 w-20 h-20 rounded-full overflow-hidden border border-white/10">
                                                    <ImageWithFallback src={formData.avatar_url} alt="Preview" fallbackIcon={User} />
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <button
                                        onClick={handleSave}
                                        disabled={isSaving || uploading}
                                        className={cn(
                                            "w-full btn-neon-aqua font-bold py-5 rounded-2xl transition-all flex items-center justify-center gap-2 mt-4",
                                            (isSaving || uploading) && "opacity-50 cursor-not-allowed"
                                        )}
                                    >
                                        {isSaving ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
                                        {modalMode === 'create' ? 'Agregar Usuario' : 'Actualizar Cambios'}
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
