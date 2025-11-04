BEGIN;

-- RESTRICTIVE SELECT: admin, supervisor o trabajador (solo lectura para no-admin)
CREATE POLICY phase_c_administradores_restrictive_select
ON public.administradores
AS RESTRICTIVE
FOR SELECT
TO public
USING (
  check_user_role('admin'::text)
  OR check_user_role('supervisor'::text)
  OR check_user_role('trabajador'::text)
);

-- RESTRICTIVE INSERT: solo admin
CREATE POLICY phase_c_administradores_restrictive_insert
ON public.administradores
AS RESTRICTIVE
FOR INSERT
TO public
WITH CHECK (check_user_role('admin'::text));

-- RESTRICTIVE UPDATE: solo admin
CREATE POLICY phase_c_administradores_restrictive_update
ON public.administradores
AS RESTRICTIVE
FOR UPDATE
TO public
USING (check_user_role('admin'::text))
WITH CHECK (check_user_role('admin'::text));

-- RESTRICTIVE DELETE: solo admin
CREATE POLICY phase_c_administradores_restrictive_delete
ON public.administradores
AS RESTRICTIVE
FOR DELETE
TO public
USING (check_user_role('admin'::text));

COMMIT;
