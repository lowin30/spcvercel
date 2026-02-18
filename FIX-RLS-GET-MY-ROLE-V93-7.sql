-- SPC REPAIR SCRIPT v93.7: RLS SCHEMA QUALIFICATION
-- Descripcion: Corrige el error 42883 (function get_my_role() does not exist)
-- calificando explicitamente el esquema 'public' en las politicas de RLS.

BEGIN;

-- 1. Asegurar la definicion de la funcion con Search Path robusto
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT rol FROM public.usuarios WHERE id = auth.uid();
$$;

-- 2. Otorgar permisos basicos
GRANT EXECUTE ON FUNCTION public.get_my_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_role() TO service_role;
GRANT EXECUTE ON FUNCTION public.get_my_role() TO anon;

-- 3. Actualizar Politicas en presupuestos_finales
DROP POLICY IF EXISTS "Admin puede gestionar todos los presupuestos finales" ON public.presupuestos_finales;
CREATE POLICY "Admin puede gestionar todos los presupuestos finales" 
ON public.presupuestos_finales 
FOR ALL 
TO authenticated, service_role 
USING (public.get_my_role() = 'admin'::text)
WITH CHECK (public.get_my_role() = 'admin'::text);

-- 4. Actualizar Politicas en items (Presupuesto)
DROP POLICY IF EXISTS "admin_all_items" ON public.items;
CREATE POLICY "admin_all_items" 
ON public.items 
FOR ALL 
TO authenticated, service_role 
USING (public.get_my_role() = 'admin'::text)
WITH CHECK (public.get_my_role() = 'admin'::text);

-- 5. Actualizar Politicas en presupuestos_base (Consistencia)
DROP POLICY IF EXISTS "Admin puede gestionar todos los presupuestos base" ON public.presupuestos_base;
CREATE POLICY "Admin puede gestionar todos los presupuestos base" 
ON public.presupuestos_base 
FOR ALL 
TO authenticated, service_role 
USING (public.get_my_role() = 'admin'::text)
WITH CHECK (public.get_my_role() = 'admin'::text);

COMMIT;
