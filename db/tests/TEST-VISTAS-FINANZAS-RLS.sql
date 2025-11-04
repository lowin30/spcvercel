-- =====================================================
-- TEST VISTAS FINANZAS (RLS por rol)
-- Ejecutar en Supabase SQL Editor
-- =====================================================

-- ADMIN
BEGIN;
SET LOCAL ROLE authenticated;
SET LOCAL row_security = on;
DO $$
DECLARE v_id uuid; v_claims text; BEGIN
  SELECT id INTO v_id FROM public.usuarios WHERE rol = 'admin' LIMIT 1;
  IF v_id IS NULL THEN RAISE NOTICE 'No hay usuario admin'; RETURN; END IF;
  v_claims := json_build_object('sub', v_id)::text;
  PERFORM set_config('request.jwt.claims', v_claims, true);
END $$;
SELECT 'ADMIN → vista_finanzas_admin' AS info;
SELECT * FROM public.vista_finanzas_admin;
COMMIT;

-- SUPERVISOR
BEGIN;
SET LOCAL ROLE authenticated;
SET LOCAL row_security = on;
DO $$
DECLARE v_id uuid; v_claims text; BEGIN
  SELECT id INTO v_id FROM public.usuarios WHERE rol = 'supervisor' LIMIT 1;
  IF v_id IS NULL THEN RAISE NOTICE 'No hay usuario supervisor'; RETURN; END IF;
  v_claims := json_build_object('sub', v_id)::text;
  PERFORM set_config('request.jwt.claims', v_claims, true);
END $$;
SELECT 'SUPERVISOR → vista_finanzas_supervisor' AS info;
SELECT * FROM public.vista_finanzas_supervisor LIMIT 1;
SELECT 'SUPERVISOR → vista_finanzas_admin (debe 0 filas)' AS info;
SELECT * FROM public.vista_finanzas_admin;
COMMIT;

-- TRABAJADOR
BEGIN;
SET LOCAL ROLE authenticated;
SET LOCAL row_security = on;
DO $$
DECLARE v_id uuid; v_claims text; BEGIN
  SELECT id INTO v_id FROM public.usuarios WHERE rol = 'trabajador' LIMIT 1;
  IF v_id IS NULL THEN RAISE NOTICE 'No hay usuario trabajador'; RETURN; END IF;
  v_claims := json_build_object('sub', v_id)::text;
  PERFORM set_config('request.jwt.claims', v_claims, true);
END $$;
SELECT 'TRABAJADOR → vista_finanzas_trabajador' AS info;
SELECT * FROM public.vista_finanzas_trabajador LIMIT 1;
SELECT 'TRABAJADOR → vista_finanzas_admin (debe 0 filas)' AS info;
SELECT * FROM public.vista_finanzas_admin;
COMMIT;
