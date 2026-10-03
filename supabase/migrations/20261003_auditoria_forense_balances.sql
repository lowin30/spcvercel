-- ==============================================================================
-- MIGRACION: AUDITORIA FORENSE INMUTABLE Y BALANCES EJECUTIVOS (SPC PLATINUM V3.0)
-- Fecha: 2026-10-03
-- Descripcion: 
--   1. Tabla inmutable 'auditoria_forense_logs' para registrar UPDATE y DELETE en tablas criticas.
--   2. Triggers inmutables sobre liquidaciones_nuevas, facturas, pagos_facturas y ajustes_facturas.
--   3. Vista SQL dedicada de auditoria 'vista_auditoria_admin_balances'.
-- ==============================================================================

BEGIN;

-- 1. TABLA DE AUDITORIA FORENSE INMUTABLE
CREATE TABLE IF NOT EXISTS public.auditoria_forense_logs (
    id BIGSERIAL PRIMARY KEY,
    tabla_afectada VARCHAR(60) NOT NULL,
    id_registro VARCHAR(60) NOT NULL,
    operacion VARCHAR(10) NOT NULL, -- 'UPDATE' o 'DELETE'
    datos_anteriores JSONB NOT NULL,
    datos_nuevos JSONB,
    usuario_id UUID,
    usuario_email VARCHAR(255),
    ip_origen VARCHAR(45),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Indice para busquedas rapidas de trazabilidad
CREATE INDEX IF NOT EXISTS idx_auditoria_forense_tabla_registro 
ON public.auditoria_forense_logs (tabla_afectada, id_registro);

CREATE INDEX IF NOT EXISTS idx_auditoria_forense_created_at 
ON public.auditoria_forense_logs (created_at DESC);

-- RLS: Solo lectura estricta para rol admin
ALTER TABLE public.auditoria_forense_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Solo admin puede leer logs de auditoria" ON public.auditoria_forense_logs;
CREATE POLICY "Solo admin puede leer logs de auditoria" 
ON public.auditoria_forense_logs
FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.usuarios u 
        WHERE u.id = auth.uid() AND u.rol = 'admin'
    )
);

-- Prohibir INSERT/UPDATE/DELETE manuales via RLS a usuarios comunes
DROP POLICY IF EXISTS "Prohibir mutacion manual de logs" ON public.auditoria_forense_logs;
CREATE POLICY "Prohibir mutacion manual de logs" 
ON public.auditoria_forense_logs
FOR ALL 
USING (false);

-- 2. FUNCION GENERICA TRIGGER DE AUDITORIA FORENSE
CREATE OR REPLACE FUNCTION public.fn_auditoria_forense_captura()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_usuario_id UUID;
    v_usuario_email VARCHAR(255);
    v_id_registro VARCHAR(60);
BEGIN
    v_usuario_id := auth.uid();
    
    -- Obtener email si existe sesion
    IF v_usuario_id IS NOT NULL THEN
        SELECT email INTO v_usuario_email FROM public.usuarios WHERE id = v_usuario_id LIMIT 1;
    END IF;

    IF TG_OP = 'DELETE' THEN
        v_id_registro := OLD.id::text;
        INSERT INTO public.auditoria_forense_logs (
            tabla_afectada,
            id_registro,
            operacion,
            datos_anteriores,
            datos_nuevos,
            usuario_id,
            usuario_email
        ) VALUES (
            TG_TABLE_NAME,
            v_id_registro,
            'DELETE',
            to_jsonb(OLD),
            NULL,
            v_usuario_id,
            v_usuario_email
        );
        RETURN OLD;
    ELSIF TG_OP = 'UPDATE' THEN
        v_id_registro := NEW.id::text;
        -- Solo registrar si hubo cambios efectivos en los datos
        IF to_jsonb(OLD) IS DISTINCT FROM to_jsonb(NEW) THEN
            INSERT INTO public.auditoria_forense_logs (
                tabla_afectada,
                id_registro,
                operacion,
                datos_anteriores,
                datos_nuevos,
                usuario_id,
                usuario_email
            ) VALUES (
                TG_TABLE_NAME,
                v_id_registro,
                'UPDATE',
                to_jsonb(OLD),
                to_jsonb(NEW),
                v_usuario_id,
                v_usuario_email
            );
        END IF;
        RETURN NEW;
    END IF;

    RETURN NULL;
END;
$$;

-- 3. ASIGNACION DE TRIGGERS INMUTABLES A TABLAS CRITICAS
DROP TRIGGER IF EXISTS trg_auditoria_liquidaciones_nuevas ON public.liquidaciones_nuevas;
CREATE TRIGGER trg_auditoria_liquidaciones_nuevas
AFTER UPDATE OR DELETE ON public.liquidaciones_nuevas
FOR EACH ROW EXECUTE FUNCTION public.fn_auditoria_forense_captura();

DROP TRIGGER IF EXISTS trg_auditoria_facturas ON public.facturas;
CREATE TRIGGER trg_auditoria_facturas
AFTER UPDATE OR DELETE ON public.facturas
FOR EACH ROW EXECUTE FUNCTION public.fn_auditoria_forense_captura();

DROP TRIGGER IF EXISTS trg_auditoria_pagos_facturas ON public.pagos_facturas;
CREATE TRIGGER trg_auditoria_pagos_facturas
AFTER UPDATE OR DELETE ON public.pagos_facturas
FOR EACH ROW EXECUTE FUNCTION public.fn_auditoria_forense_captura();

DROP TRIGGER IF EXISTS trg_auditoria_ajustes_facturas ON public.ajustes_facturas;
CREATE TRIGGER trg_auditoria_ajustes_facturas
AFTER UPDATE OR DELETE ON public.ajustes_facturas
FOR EACH ROW EXECUTE FUNCTION public.fn_auditoria_forense_captura();


-- 4. VISTA DEDICADA DE AUDITORIA: BALANCES COMPLETOS PB -> PF -> FACTURADO -> COBRADO
-- No sustituye ni altera ninguna vista existente de supervisores.
CREATE OR REPLACE VIEW public.vista_auditoria_admin_balances AS
SELECT 
    t.id AS id_tarea,
    t.code AS codigo_tarea,
    t.titulo AS titulo_tarea,
    t.created_at AS fecha_tarea,
    t.finalizada AS tarea_finalizada,
    
    -- Edificio y Administrador
    e.id AS id_edificio,
    e.nombre AS nombre_edificio,
    adm.id AS id_administrador,
    adm.nombre AS nombre_administrador,

    -- Supervisor asignado
    st.id_supervisor,
    u_sup.email AS email_supervisor,
    u_sup.nombre AS nombre_supervisor,
    COALESCE(u_sup.es_propietario, false) AS supervisor_es_propietario,

    -- 1. Presupuesto Base (PB)
    pb.id AS id_presupuesto_base,
    pb.code AS codigo_presupuesto_base,
    COALESCE(pb.total, 0)::numeric AS total_pb,

    -- 2. Presupuesto Final (PF)
    pf.id AS id_presupuesto_final,
    pf.code AS codigo_presupuesto_final,
    COALESCE(pf.total, 0)::numeric AS total_pf,
    pf.aprobado AS pf_aprobado,

    -- 3. Liquidacion (si existe)
    ln.id AS id_liquidacion,
    ln.code AS codigo_liquidacion,
    ln.created_at AS fecha_liquidacion,
    COALESCE(ln.gastos_reales, 0)::numeric AS gastos_reales_liquidacion,
    COALESCE(ln.ganancia_neta, 0)::numeric AS ganancia_neta_liquidacion,
    COALESCE(ln.ganancia_supervisor, 0)::numeric AS ganancia_supervisor,
    COALESCE(ln.ganancia_admin, 0)::numeric AS ganancia_admin,
    COALESCE(ln.total_supervisor, 0)::numeric AS total_transferido_supervisor,
    COALESCE(ln.sobrecosto, false) AS hay_sobrecosto,
    COALESCE(ln.monto_sobrecosto, 0)::numeric AS monto_sobrecosto,

    -- 4. Factura asociada (si existe)
    f.id AS id_factura,
    f.code AS codigo_factura,
    f.created_at AS fecha_factura,
    f.datos_afip,
    COALESCE(f.total, 0)::numeric AS total_factura_base,
    f.pagada AS factura_pagada,
    f.saldo_pendiente::numeric AS saldo_pendiente_factura,

    -- Ajustes aprobados
    COALESCE((
        SELECT SUM(aj.monto_ajuste)
        FROM public.ajustes_facturas aj
        WHERE aj.id_factura = f.id AND aj.aprobado = true
    ), 0)::numeric AS total_ajustes_aprobados,

    -- Facturado Total Real = Total Base Factura + Ajustes Aprobados
    (COALESCE(f.total, 0) + COALESCE((
        SELECT SUM(aj.monto_ajuste)
        FROM public.ajustes_facturas aj
        WHERE aj.id_factura = f.id AND aj.aprobado = true
    ), 0))::numeric AS total_facturado_neto,

    -- 5. Pagos Cobrados Reales
    COALESCE((
        SELECT SUM(p.monto_pagado)
        FROM public.pagos_facturas p
        WHERE p.id_factura = f.id
    ), 0)::numeric AS total_cobrado_real,

    -- Diferencia Comercial: PF vs PB
    (COALESCE(pf.total, 0) - COALESCE(pb.total, 0))::numeric AS margen_comercial_pf_pb,

    -- Ganancia Liquida Real SPC de la Obra = Cobrado Real - Gastos Reales
    (COALESCE((
        SELECT SUM(p.monto_pagado)
        FROM public.pagos_facturas p
        WHERE p.id_factura = f.id
    ), 0) - COALESCE(ln.gastos_reales, 0))::numeric AS ganancia_liquida_obra

FROM public.tareas t
LEFT JOIN public.edificios e ON t.id_edificio = e.id
LEFT JOIN public.administradores adm ON e.id_administrador = adm.id
LEFT JOIN public.supervisores_tareas st ON st.id_tarea = t.id
LEFT JOIN public.usuarios u_sup ON st.id_supervisor = u_sup.id
LEFT JOIN public.presupuestos_base pb ON pb.id_tarea = t.id
LEFT JOIN public.presupuestos_finales pf ON pf.id_tarea = t.id
LEFT JOIN public.liquidaciones_nuevas ln ON ln.id_tarea = t.id
LEFT JOIN public.facturas f ON f.id_presupuesto_final = pf.id;

COMMIT;
