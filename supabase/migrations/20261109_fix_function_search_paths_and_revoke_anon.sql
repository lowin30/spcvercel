-- migracion: blindaje de funciones publicas en supabase
-- protocolo platinum: minusculas, cero impacto en login/sesion, maxima seguridad

-- etapa 1: fijar search_path = public en todas las funciones del esquema public
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
          AND (p.proconfig IS NULL OR NOT (p.proconfig::text[] @> ARRAY['search_path=public']))
    LOOP
        v_sql := format('ALTER FUNCTION %s SET search_path = public;', r.func_sig);
        EXECUTE v_sql;
    END LOOP;
END $$;

-- etapa 2: blindaje contra ejecucion rpc anonima
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM anon;
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM public;

ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM public;

GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;
