-- SHADES SWATCH MANUFACTURING PLATFORM - DATABASE SCHEMA

-- 1. ENUMS
CREATE TYPE user_role AS ENUM (
    'super_usuario', 
    'administrador', 
    'solicitante', 
    'validador_sac', 
    'proveedor', 
    'repartidor', 
    'receptor', 
    'auditor_mostrador_c6'
);

CREATE TYPE solicitud_estado AS ENUM (
    'BORRADOR',
    'ENVIADA',
    'VALIDADA',
    'EN_PRODUCCION',
    'PRODUCCION_TERMINADA',
    'EN_TRASLADO_INTERNO',
    'RECIBIDA_ALMACEN',
    'LISTA_PARA_ENVIO',
    'ENVIADA_CLIENTE',
    'ENTREGADA',
    'CERRADA',
    'RECHAZADA',
    'CANCELADA'
);

CREATE TYPE materia_prima_estado AS ENUM (
    'BORRADOR',
    'ENVIADA',
    'APROBADA',
    'RECHAZADA',
    'EN_PREPARACION',
    'EN_TRANSITO',
    'RECIBIDA',
    'CERRADA'
);

CREATE TYPE sla_status AS ENUM (
    'EN_TIEMPO',
    'AJUSTADO',
    'ATRASADO'
);

-- 2. CORE TABLES
CREATE TABLE regiones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE perfiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    nombre_completo TEXT,
    rol user_role NOT NULL DEFAULT 'solicitante',
    region_id UUID REFERENCES regiones(id),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE empresas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre TEXT NOT NULL,
    codigo_cliente TEXT UNIQUE,
    region_id UUID REFERENCES regiones(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE muestrarios_tipos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre TEXT NOT NULL,
    sla_dias_estandar INTEGER NOT NULL DEFAULT 5,
    costo_base NUMERIC(15,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE materiales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre TEXT NOT NULL,
    codigo_material TEXT UNIQUE,
    costo_referencia NUMERIC(15,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. WORKFLOW TABLES (SWATCH PRODUCTION)
CREATE TABLE solicitudes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    correlativo SERIAL UNIQUE,
    empresa_id UUID NOT NULL REFERENCES empresas(id),
    tipo_id UUID NOT NULL REFERENCES muestrarios_tipos(id),
    solicitante_id UUID NOT NULL REFERENCES perfiles(id),
    proveedor_id UUID REFERENCES perfiles(id), -- Assigned provider
    region_id UUID NOT NULL REFERENCES regiones(id),
    
    estado solicitud_estado NOT NULL DEFAULT 'BORRADOR',
    
    -- SLA info
    sla_dias INTEGER NOT NULL,
    fecha_promesa DATE,
    ajuste_urgencia BOOLEAN DEFAULT FALSE,
    motivo_ajuste TEXT,
    
    -- Costs
    costo_total_solicitud NUMERIC(15,2) DEFAULT 0,
    
    -- Timestamps
    fecha_inicio_produccion TIMESTAMPTZ,
    fecha_fin_produccion TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Relationships
    solicitud_padre_id UUID REFERENCES solicitudes(id) -- For REIMPRESION
);

CREATE TABLE solicitudes_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    solicitud_id UUID NOT NULL REFERENCES solicitudes(id) ON DELETE CASCADE,
    sku TEXT,
    cantidad INTEGER NOT NULL DEFAULT 1,
    costo_unitario NUMERIC(15,2) DEFAULT 0,
    costo_total NUMERIC(15,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE bitacora_eventos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    solicitud_id UUID REFERENCES solicitudes(id) ON DELETE CASCADE,
    solicitud_mp_id UUID, -- For raw material workflow
    usuario_id UUID NOT NULL REFERENCES perfiles(id),
    estado_anterior TEXT,
    estado_nuevo TEXT NOT NULL,
    comentario TEXT,
    metadatos JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. RAW MATERIAL WORKFLOW
CREATE TABLE solicitudes_materia_prima (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    proveedor_id UUID NOT NULL REFERENCES perfiles(id),
    estado materia_prima_estado NOT NULL DEFAULT 'BORRADOR',
    fecha_requerida DATE,
    fecha_envio_estimada DATE,
    fecha_recibida_estimada DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE solicitud_mp_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    solicitud_mp_id UUID NOT NULL REFERENCES solicitudes_materia_prima(id) ON DELETE CASCADE,
    material_id UUID NOT NULL REFERENCES materiales(id),
    cantidad NUMERIC(15,2) NOT NULL,
    unidad TEXT NOT NULL DEFAULT 'metros',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. RLS LOGIC (BASIC SKELETON)
ALTER TABLE perfiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE solicitudes ENABLE ROW LEVEL SECURITY;
ALTER TABLE solicitudes_materia_prima ENABLE ROW LEVEL SECURITY;

-- Dynamic status check function
CREATE OR REPLACE FUNCTION get_sla_status(fecha_promesa DATE, ajuste_urgencia BOOLEAN)
RETURNS sla_status AS $$
BEGIN
    IF ajuste_urgencia THEN RETURN 'AJUSTADO'; END IF;
    IF CURRENT_DATE > fecha_promesa THEN RETURN 'ATRASADO'; END IF;
    RETURN 'EN_TIEMPO';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 6. VIEWS FOR DASHBOARD
CREATE VIEW view_solicitudes_resumen AS
SELECT 
    s.*,
    e.nombre AS empresa_nombre,
    mt.nombre AS tipo_muestrario,
    p.nombre_completo AS solicitante_nombre,
    get_sla_status(s.fecha_promesa, s.ajuste_urgencia) AS estado_sla
FROM solicitudes s
JOIN empresas e ON s.empresa_id = e.id
JOIN muestrarios_tipos mt ON s.tipo_id = mt.id
JOIN perfiles p ON s.solicitante_id = p.id;
