'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import {
    Plus,
    Search,
    BookOpen,
    Edit2,
    Trash2,
    Loader2,
    CheckCircle2,
    AlertCircle,
    X,
    Image as ImageIcon,
    ExternalLink,
    ChevronRight,
    Save,
    Upload,
    Layers,
    Shield
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { CustomSelect } from '@/components/ui/custom-select';
import { ImageWithFallback } from '@/components/ui/image-with-fallback';

type Producto = {
    id: string;
    nombre: string;
    version: string;
    precio: number;
    descripcion: string;
    status: string;
    sla_dias_estandar: number;
    categoria: string;
    imagen_url: string;
    ficha_tecnica_url: string;
};

const statusColors: Record<string, string> = {
    activo: 'border-[#14b899]/50 text-[#14b899] bg-[#14b899]/5 shadow-[0_0_15px_rgba(20,184,153,0.15)]',
    descontinuado: 'border-status-red/40 text-status-red bg-status-red/10 shadow-[0_0_15px_rgba(239,68,68,0.1)]',
    proximamente: 'border-status-amber/40 text-status-amber bg-status-amber/10 shadow-[0_0_15px_rgba(245,158,11,0.1)]',
};

export default function ProductosPage() {
    const [productos, setProductos] = useState<Producto[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    // Modal states
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<'create' | 'edit' | 'detail'>('detail');
    const [selectedProducto, setSelectedProducto] = useState<Producto | null>(null);
    const [notification, setNotification] = useState<{ message: string, type: 'success' | 'error' } | null>(null);

    // Form states
    const [formData, setFormData] = useState<Partial<Producto>>({});
    const [uploading, setUploading] = useState(false);

    const fetchProductos = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('muestrarios_tipos')
            .select(`
                id, nombre, version, precio, descripcion, 
                status, sla_dias_estandar, categoria, 
                imagen_url, ficha_tecnica_url
            `)
            .order('nombre');

        if (!error && data) {
            setProductos(data);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchProductos();
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
            const filePath = `product-images/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('productos')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('productos')
                .getPublicUrl(filePath);

            setFormData(prev => ({ ...prev, imagen_url: publicUrl }));
            showNotification('Imagen subida correctamente');
        } catch (error: any) {
            showNotification(error.message || 'Error al subir la imagen', 'error');
        } finally {
            setUploading(false);
        }
    };

    const handleOpenModal = (mode: 'create' | 'edit' | 'detail', producto?: Producto) => {
        setModalMode(mode);
        setSelectedProducto(producto || null);
        setFormData(producto || {
            status: 'activo',
            categoria: 'Muestrarios',
            sla_dias_estandar: 5
        });
        setIsModalOpen(true);
    };

    const handleSave = async () => {
        try {
            const payload = {
                ...formData,
                nombre: formData.nombre?.trim(),
                version: formData.version?.trim(),
            };

            let error;
            if (modalMode === 'create') {
                const { error: err } = await supabase.from('muestrarios_tipos').insert([payload]);
                error = err;
            } else {
                const { error: err } = await supabase.from('muestrarios_tipos').update(payload).eq('id', selectedProducto?.id);
                error = err;
            }

            if (error) throw error;

            showNotification(`Producto ${modalMode === 'create' ? 'creado' : 'actualizado'} exitosamente`);
            setIsModalOpen(false);
            fetchProductos();
        } catch (error: any) {
            showNotification(error.message || 'Error al guardar el producto', 'error');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('¿Estás seguro de eliminar este producto?')) return;

        try {
            const { error } = await supabase.from('muestrarios_tipos').delete().eq('id', id);
            if (error) throw error;
            showNotification('Producto eliminado exitosamente');
            setIsModalOpen(false);
            fetchProductos();
        } catch (error: any) {
            showNotification(error.message || 'Error al eliminar el producto', 'error');
        }
    };

    const filtered = productos.filter(p =>
        p.nombre.toLowerCase().includes(search.toLowerCase()) ||
        p.descripcion?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="space-y-6 animate-in fade-in duration-500 max-w-[1400px] mx-auto w-full">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-white uppercase tracking-tight">Catálogo de Productos</h2>
                    <p className="text-muted-foreground text-[10px] uppercase tracking-[0.1em] font-medium mt-1">Administración de tipos de muestrarios y precios</p>
                </div>
                <button
                    onClick={() => handleOpenModal('create')}
                    className="btn-neon-aqua px-5 py-3 rounded-xl font-bold flex items-center gap-2 transition-all active:scale-95 text-xs uppercase tracking-wider"
                >
                    <Plus size={18} />
                    Agregar Producto
                </button>
            </div>

            {/* Filter Bar */}
            <div className="bg-secondary/40 p-2 rounded-2xl border border-border/50 flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="relative flex-1 md:w-96 p-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
                    <input
                        type="text"
                        placeholder="Buscar por nombre o descripción..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full bg-[#09090b] border border-border rounded-xl py-2.5 pl-10 pr-4 text-xs focus:ring-1 focus:ring-primary focus:outline-none transition-all text-white placeholder:text-zinc-700"
                    />
                </div>
            </div>

            {/* Content Table */}
            <div className="bg-secondary/20 rounded-3xl overflow-hidden border border-border/50 shadow-2xl">
                {loading ? (
                    <div className="flex flex-col items-center justify-center h-[400px] text-muted-foreground gap-4">
                        <Loader2 className="animate-spin text-primary" size={32} />
                        <p className="text-[10px] font-bold uppercase tracking-[0.3em] animate-pulse">Cargando catálogo...</p>
                    </div>
                ) : (
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-border/50 bg-white/[0.01]">
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground w-20">Imagen</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Producto / Versión</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Descripción</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground text-center">SLA Estandar</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Precio</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Estatus</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground text-center">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/20">
                            {filtered.length > 0 ? (
                                filtered.map((item) => (
                                    <tr
                                        key={item.id}
                                        className="hover:bg-white/[0.02] transition-colors group cursor-pointer border-b border-white/5 last:border-0"
                                        onClick={() => handleOpenModal('detail', item)}
                                    >
                                        <td className="px-6 py-4">
                                            <div className="w-12 h-12 bg-zinc-900 rounded-xl border border-white/5 flex items-center justify-center overflow-hidden shrink-0 group-hover:border-primary/30 transition-colors">
                                                <ImageWithFallback
                                                    src={item.imagen_url}
                                                    alt={item.nombre}
                                                    fallbackIcon={ImageIcon}
                                                    iconClassName="text-zinc-800"
                                                />
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="flex flex-col">
                                                <span className="text-white font-bold text-sm">{item.nombre}</span>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <span className="text-[10px] text-zinc-400 font-black uppercase tracking-widest px-1.5 py-0.5 bg-white/5 rounded">v{item.version || '1.0'}</span>
                                                    <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-tight">{item.categoria}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <p className="text-xs text-zinc-400 max-w-xs truncate">{item.descripcion || 'Sin descripción'}</p>
                                        </td>
                                        <td className="px-6 py-5 text-center">
                                            <span className="text-xs text-zinc-300 font-mono font-bold">{item.sla_dias_estandar} días</span>
                                        </td>
                                        <td className="px-6 py-5">
                                            <span className="text-xs text-zinc-200 font-bold">
                                                {new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(item.precio || 0)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-5">
                                            <span className={cn(
                                                "px-2.5 py-1 rounded-lg text-[9px] font-black tracking-widest border transition-all uppercase",
                                                statusColors[item.status?.toLowerCase() || 'activo']
                                            )}>
                                                {item.status || 'ACTIVO'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-5 text-center" onClick={(e) => e.stopPropagation()}>
                                            <div className="flex items-center justify-center gap-1">
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
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={7} className="px-6 py-24 text-center text-muted-foreground">
                                        <div className="opacity-20 flex flex-col items-center">
                                            <BookOpen size={48} className="mb-4" />
                                            <p className="text-[10px] font-black uppercase tracking-[0.3em]">No hay productos registrados</p>
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
                        {notification.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
                        <span className="text-sm font-bold tracking-tight">{notification.message}</span>
                    </div>
                </div>
            )}

            {/* Product Modal */}
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
                                    {modalMode === 'create' ? 'Agregar Nuevo Producto' : selectedProducto?.nombre}
                                </h3>
                                <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-black mt-1">
                                    {modalMode === 'create' ? 'Configura las especificaciones técnicas' :
                                        modalMode === 'edit' ? 'Editando Especificaciones' : 'Detalles Técnicos del Producto'}
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
                                        <div className="w-48 h-48 bg-zinc-900 rounded-3xl border border-white/5 flex items-center justify-center overflow-hidden shrink-0 group">
                                            <ImageWithFallback
                                                src={selectedProducto?.imagen_url}
                                                alt={selectedProducto?.nombre}
                                                fallbackIcon={ImageIcon}
                                                iconClassName="text-zinc-800"
                                            />
                                        </div>
                                        <div className="flex-1 space-y-4">
                                            <div className="flex items-center gap-3">
                                                <span className="px-2.5 py-1 bg-white/5 text-zinc-300 text-[10px] font-black tracking-widest rounded-lg border border-white/10 uppercase">
                                                    {selectedProducto?.categoria}
                                                </span>
                                                <span className={cn(
                                                    "px-2.5 py-1 text-[10px] font-black tracking-widest border rounded-lg uppercase",
                                                    statusColors[selectedProducto?.status?.toLowerCase() || 'activo']
                                                )}>
                                                    {selectedProducto?.status}
                                                </span>
                                            </div>
                                            <p className="text-sm text-zinc-400 leading-relaxed italic pr-4">
                                                "{selectedProducto?.descripcion || 'Sin descripción disponible para este producto.'}"
                                            </p>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="bg-white/5 p-3 rounded-2xl border border-white/5">
                                                    <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest block mb-1">Precio Unitario</span>
                                                    <span className="text-lg font-bold text-white">
                                                        {new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(selectedProducto?.precio || 0)}
                                                    </span>
                                                </div>
                                                <div className="bg-white/5 p-3 rounded-2xl border border-white/5">
                                                    <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest block mb-1">SLA Producción</span>
                                                    <span className="text-lg font-bold text-white">{selectedProducto?.sla_dias_estandar} Días</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {selectedProducto?.ficha_tecnica_url && (
                                        <a
                                            href={selectedProducto.ficha_tecnica_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center justify-between p-5 bg-white/[0.03] rounded-3xl border border-white/10 hover:bg-white/5 transition-all group"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-zinc-400 group-hover:scale-110 transition-transform">
                                                    <BookOpen size={24} />
                                                </div>
                                                <div>
                                                    <h4 className="text-sm font-bold text-white">Ficha Técnica Oficial</h4>
                                                    <p className="text-[10px] text-zinc-500 font-medium uppercase tracking-wider mt-0.5">Especificaciones, materiales y garantías</p>
                                                </div>
                                            </div>
                                            <ExternalLink size={20} className="text-zinc-500 opacity-50 group-hover:opacity-100 transition-opacity" />
                                        </a>
                                    )}

                                    <div className="flex items-center gap-3 pt-4">
                                        <button
                                            onClick={() => setModalMode('edit')}
                                            className="flex-1 bg-white/5 hover:bg-white/10 text-white font-bold py-4 rounded-2xl transition-all flex items-center justify-center gap-2 active:scale-95"
                                        >
                                            <Edit2 size={18} />
                                            Editar Producto
                                        </button>
                                        <button
                                            onClick={() => selectedProducto && handleDelete(selectedProducto.id)}
                                            className="w-16 h-14 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-2xl transition-all flex items-center justify-center active:scale-95"
                                        >
                                            <Trash2 size={20} />
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    <div className="grid grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Nombre del Producto</label>
                                            <input
                                                type="text"
                                                className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3.5 text-sm text-white focus:ring-1 focus:ring-primary focus:outline-none transition-all"
                                                value={formData.nombre || ''}
                                                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                                                placeholder="Ej. Blackout Premium"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Versión / Modelo</label>
                                            <input
                                                type="text"
                                                className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3.5 text-sm text-white focus:ring-1 focus:ring-primary focus:outline-none transition-all"
                                                value={formData.version || ''}
                                                onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                                                placeholder="Ej. v2.0"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-6">
                                        <CustomSelect
                                            label="Categoría"
                                            value={formData.categoria || 'Muestrarios'}
                                            onChange={(val) => setFormData({ ...formData, categoria: val })}
                                            icon={Layers}
                                            options={[
                                                { value: 'Laminas', label: 'Láminas' },
                                                { value: 'Contrapeso', label: 'Contrapeso' },
                                                { value: 'Muestrarios', label: 'Muestrarios' },
                                            ]}
                                        />
                                        <CustomSelect
                                            label="Estatus"
                                            value={formData.status || 'activo'}
                                            onChange={(val) => setFormData({ ...formData, status: val })}
                                            icon={Shield}
                                            options={[
                                                { value: 'activo', label: 'Activo' },
                                                { value: 'descontinuado', label: 'Descontinuado' },
                                                { value: 'proximamente', label: 'Próximamente' },
                                            ]}
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Precio (MXN)</label>
                                            <input
                                                type="number"
                                                className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3.5 text-sm text-white focus:ring-1 focus:ring-primary focus:outline-none transition-all"
                                                value={formData.precio || ''}
                                                onChange={(e) => setFormData({ ...formData, precio: parseFloat(e.target.value) })}
                                                placeholder="0.00"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">SLA (Días)</label>
                                            <input
                                                type="number"
                                                className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3.5 text-sm text-white focus:ring-1 focus:ring-primary focus:outline-none transition-all"
                                                value={formData.sla_dias_estandar || ''}
                                                onChange={(e) => setFormData({ ...formData, sla_dias_estandar: parseInt(e.target.value) })}
                                                placeholder="5"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Descripción Detallada</label>
                                        <textarea
                                            className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3.5 text-sm text-white focus:ring-1 focus:ring-primary focus:outline-none transition-all h-24 resize-none"
                                            value={formData.descripcion || ''}
                                            onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                                            placeholder="Detalles sobre el material, uso y calidad..."
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Imagen del Producto</label>
                                            <div className="relative group">
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={handleImageUpload}
                                                    className="hidden"
                                                    id="image-upload"
                                                    disabled={uploading}
                                                />
                                                <label
                                                    htmlFor="image-upload"
                                                    className={cn(
                                                        "w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3.5 text-xs text-zinc-400 cursor-pointer flex items-center justify-between hover:bg-white/10 transition-all",
                                                        uploading && "opacity-50 cursor-not-allowed"
                                                    )}
                                                >
                                                    <span className="truncate">
                                                        {uploading ? 'Subiendo...' : formData.imagen_url ? 'Imagen seleccionada' : 'Seleccionar imagen...'}
                                                    </span>
                                                    {uploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                                                </label>
                                                {formData.imagen_url && !uploading && (
                                                    <div className="mt-2 w-20 h-20 rounded-xl overflow-hidden border border-white/10">
                                                        <ImageWithFallback src={formData.imagen_url} alt="Preview" />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">URL Ficha Técnica</label>
                                            <input
                                                type="text"
                                                className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3.5 text-sm text-white focus:ring-1 focus:ring-primary focus:outline-none transition-all"
                                                value={formData.ficha_tecnica_url || ''}
                                                onChange={(e) => setFormData({ ...formData, ficha_tecnica_url: e.target.value })}
                                                placeholder="https://..."
                                            />
                                        </div>
                                    </div>

                                    <button
                                        onClick={handleSave}
                                        className="w-full btn-neon-aqua font-bold py-5 rounded-2xl transition-all flex items-center justify-center gap-2 mt-4"
                                    >
                                        <Save size={20} />
                                        {modalMode === 'create' ? 'Guardar Producto' : 'Actualizar Cambios'}
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
