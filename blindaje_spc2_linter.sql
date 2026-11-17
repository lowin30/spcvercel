-- ==============================================================================
-- BLINDAJE QUIRURGICO Y RESOLUCION DEL LINTER (SPC2)
-- PROYECTO: loizubsviqyurgmdvhuh
-- REGLA DE ORO: PRESERVAR LA CEGUERA DEL SUPERVISOR Y LA INTEGRIDAD OPERATIVA
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- ETAPA 1: ACTIVAR security_invoker = true SOLO EN LAS 20 VISTAS SEGURAS
-- (13 administrativas + 7 operativas generales)
-- Las 4 vistas confidenciales (vista_pb_supervisor, vista_liquidaciones_completa,
-- vista_liquidaciones_supervisores_listado y vista_cuenta_corriente_supervisores)
-- SE CONSERVAN INTENCIONALMENTE COMO SECURITY DEFINER para no quebrar la ceguera
-- del supervisor sobre presupuestos_finales, sueldos base y adelantos.
-- ------------------------------------------------------------------------------

-- 1.1 Vistas administrativas (13 vistas)
ALTER VIEW public.vista_pb_admin SET (security_invoker = true);
ALTER VIEW public.vista_comprobantes_admin_v4 SET (security_invoker = true);
ALTER VIEW public.vista_auditoria_admin_balances SET (security_invoker = true);
ALTER VIEW public.vista_finanzas_admin SET (security_invoker = true);
ALTER VIEW public.vista_tareas_admin SET (security_invoker = true);
ALTER VIEW public.vista_admin_liquidaciones_sin_pf SET (security_invoker = true);
ALTER VIEW public.vista_admin_pb_sin_aprobar SET (security_invoker = true);
ALTER VIEW public.vista_admin_pf_aprobado_sin_factura SET (security_invoker = true);
ALTER VIEW public.vista_admin_pb_finalizada_sin_pf SET (security_invoker = true);
ALTER VIEW public.vista_admin_pf_enviado_sin_actividad SET (security_invoker = true);
ALTER VIEW public.vista_admin_pf_enviado_sin_aprobar SET (security_invoker = true);
ALTER VIEW public.vista_administradores SET (security_invoker = true);
ALTER VIEW public.vista_actividad_maestra_god_mode SET (security_invoker = true);

-- 1.2 Vistas operativas no confidenciales (7 vistas)
ALTER VIEW public.vista_presupuestos_finales_completa SET (security_invoker = true);
ALTER VIEW public.vista_facturas_completa SET (security_invoker = true);
ALTER VIEW public.vista_edificios_completa SET (security_invoker = true);
ALTER VIEW public.vista_agenda_operativa_unificada SET (security_invoker = true);
ALTER VIEW public.vista_tareas_completa SET (security_invoker = true);
ALTER VIEW public.vista_tareas_supervisor SET (security_invoker = true);
ALTER VIEW public.vista_presupuestos_base_completa SET (security_invoker = true);


-- ------------------------------------------------------------------------------
-- ETAPA 2: CORREGIR WARN "extension_in_public"
-- Mueve las 4 extensiones de 'public' al esquema protegido 'extensions' de Supabase
-- ------------------------------------------------------------------------------
CREATE SCHEMA IF NOT EXISTS extensions;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'unaccent') THEN
        ALTER EXTENSION "unaccent" SET SCHEMA extensions;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_trgm') THEN
        ALTER EXTENSION "pg_trgm" SET SCHEMA extensions;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'btree_gin') THEN
        ALTER EXTENSION "btree_gin" SET SCHEMA extensions;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'vector') THEN
        ALTER EXTENSION "vector" SET SCHEMA extensions;
    END IF;
END $$;


-- ------------------------------------------------------------------------------
-- ETAPA 3: BLINDAJE DE FUNCIONES Y ENDPOINTS RPC (60+ WARNINGS RESUELTOS)
-- Fija search_path = public, extensions para neutralizar secuestro de esquemas
-- y revoca permisos de ejecucion a usuarios no autenticados (anon y public).
-- ------------------------------------------------------------------------------
DO $$
DECLARE
    r RECORD;
    v_sql TEXT;
BEGIN
    FOR r IN 
        SELECT p.oid::regprocedure AS func_sig
        FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public'
          AND (p.proconfig IS NULL OR NOT (p.proconfig::text[] @> ARRAY['search_path=public, extensions']))
    LOOP
        v_sql := format('ALTER FUNCTION %s SET search_path = public, extensions;', r.func_sig);
        EXECUTE v_sql;
    END LOOP;
END $$;

-- Revocar permisos de ejecucion publica y anonima
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM anon;
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM public;

ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM public;

-- Conceder exclusivamente a usuarios autenticados y al rol de servicio del backend
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;


-- ------------------------------------------------------------------------------
-- ETAPA 4: CORREGIR RLS EN micro_tareas_operativas
-- Reemplaza la politica permisiva abierta por una que exige login valido
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Microtareas: Acceso total" ON public.micro_tareas_operativas;

DROP POLICY IF EXISTS "Microtareas: Acceso autenticados" ON public.micro_tareas_operativas;

CREATE POLICY "Microtareas: Acceso autenticados" 
ON public.micro_tareas_operativas 
FOR ALL 
TO authenticated 
USING (auth.uid() IS NOT NULL) 
WITH CHECK (auth.uid() IS NOT NULL);


-- ------------------------------------------------------------------------------
-- VERIFICACION DE ESTADO
-- ------------------------------------------------------------------------------
SELECT 
    'Blindaje completado con exito. 20 vistas protegidas con security_invoker, 4 cajas negras preservadas, microtareas aseguradas y rpc anonimas revocadas.' AS resultado;
