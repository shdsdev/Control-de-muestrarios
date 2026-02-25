import { supabase } from '@/lib/supabase';

export type MuestrarioCreado = {
    id: string;
    empresa_id: string;
    tipo_id: string;
    link_drive: string | null;
    imagen_propuesta_url: string | null;
    created_at: string;
    muestrarios_tipos: {
        id: string;
        nombre: string;
        version: string;
        categoria: string | null;
        imagen_url: string | null;
    } | null;
};

/**
 * Fetches muestrarios created/assigned to a specific empresa.
 * Same query as the empresa detail modal's "Muestrarios creados" section.
 */
export async function getMuestrariosCreadosByEmpresa(empresaId: string): Promise<MuestrarioCreado[]> {
    const { data, error } = await supabase
        .from('muestrarios_empresa')
        .select('*, muestrarios_tipos(id, nombre, version, categoria, imagen_url)')
        .eq('empresa_id', empresaId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('[getMuestrariosCreadosByEmpresa] Error:', error.message);
        return [];
    }

    return (data || []) as MuestrarioCreado[];
}
