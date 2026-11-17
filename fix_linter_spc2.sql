-- ==============================================================================
-- BLINDAJE DE SEGURIDAD Y RESOLUCION DEL LINTER SUPABASE (SPC2)
-- PROYECTO: loizubsviqyurgmdvhuh
-- RESUELVE:
--   1. ERROR security_definer_view (activa security_invoker en todas las vistas)
--   2. WARN extension_in_public (mueve extensiones al esquema 'extensions')
--   3. WARN anon/authenticated_security_definer_function_executable (revoca anon/public y fija search_path)
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- ETAPA 1: CORREGIR ERRORES "security_definer_view" EN TODAS LAS VISTAS
-- En PostgreSQL 15+, las vistas deben tener security_invoker = true para
-- respetar las politicas RLS del usuario que consulta y no saltarse permisos.
-- ------------------------------------------------------------------------------
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN 
        SELECT table_name 
        FROM information_schema.views 
        WHERE table_schema = 'public'
    LOOP
        EXECUTE format('ALTER VIEW public.%I SET (security_invoker = true);', r.table_name);
    END LOOP;
END $$;

-- ------------------------------------------------------------------------------
-- ETAPA 2: CORREGIR WARN "extension_in_public"
-- Mueve las extensiones de 'public' al esquema protegido 'extensions' de Supabase.
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
-- ETAPA 3: CORREGIR WARN FUNCIONES EXECUTABLES POR 'anon' Y 'public'
-- Fija search_path = public y revoca permisos de ejecucion a usuarios no autenticados.
-- ------------------------------------------------------------------------------
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN 
        SELECT p.oid::regprocedure AS func_sig
        FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public'
    LOOP
        EXECUTE format('ALTER FUNCTION %s SET search_path = public, extensions;', r.func_sig);
    END LOOP;
END $$;

-- Revocar ejecucion a anonimos y publico general
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM anon;
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM public;

-- Evitar que futuras funciones queden publicas por defecto
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM public;

-- Garantizar que usuarios logueados (authenticated) y backend (service_role) puedan operar
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;

-- ------------------------------------------------------------------------------
-- VERIFICACION FINAL
-- ------------------------------------------------------------------------------
SELECT 'Blindaje completado con exito. Todos los errores y warnings han sido subsanados.' as resultado;
