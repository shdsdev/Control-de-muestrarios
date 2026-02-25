// Shared Types for Shades Swatch Platform

export type UserRole =
    | 'super_usuario'
    | 'administrador'
    | 'solicitante'
    | 'validador_sac'
    | 'proveedor'
    | 'repartidor'
    | 'receptor'
    | 'auditor_mostrador_c6';

export type SolicitudEstado =
    | 'BORRADOR'
    | 'ENVIADA'
    | 'VALIDADA'
    | 'EN_PRODUCCION'
    | 'PRODUCCION_TERMINADA'
    | 'EN_TRASLADO_INTERNO'
    | 'RECIBIDA_ALMACEN'
    | 'LISTA_PARA_ENVIO'
    | 'ENVIADA_CLIENTE'
    | 'ENTREGADA'
    | 'CERRADA'
    | 'RECHAZADA'
    | 'CANCELADA';

export type MateriaPrimaEstado =
    | 'BORRADOR'
    | 'ENVIADA'
    | 'APROBADA'
    | 'RECHAZADA'
    | 'EN_PREPARACION'
    | 'EN_TRANSITO'
    | 'RECIBIDA'
    | 'CERRADA';

export type SLAStatus = 'EN_TIEMPO' | 'AJUSTADO' | 'ATRASADO';

export interface Profile {
    id: string;
    email: string;
    nombre_completo: string | null;
    rol: UserRole;
    region_id: string | null;
}

export interface Solicitud {
    id: string;
    correlativo: number;
    empresa_id: string;
    tipo_id: string;
    solicitante_id: string;
    proveedor_id: string | null;
    region_id: string;
    estado: SolicitudEstado;
    sla_dias: number;
    fecha_promesa: string | null;
    ajuste_urgencia: boolean;
    motivo_ajuste: string | null;
    costo_total_solicitud: number;
    fecha_inicio_produccion: string | null;
    fecha_fin_produccion: string | null;
    created_at: string;
    updated_at: string;
    solicitud_padre_id: string | null;
}
