-- SPC REPAIR SCRIPT: RESTORE get_my_role()
-- Descripcion: Restaura la funcion critica get_my_role() necesaria para las politicas de RLS.
-- Ejecutar este script en el SQL Editor de Supabase.

BEGIN;

CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT rol FROM public.usuarios WHERE id = auth.uid();
$$;

-- Otorgar permisos basicos
GRANT EXECUTE ON FUNCTION public.get_my_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_role() TO service_role;
GRANT EXECUTE ON FUNCTION public.get_my_role() TO anon;

COMMIT;
