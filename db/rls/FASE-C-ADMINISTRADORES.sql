BEGIN;

-- RESTRICTIVE SELECT: admin, supervisor o trabajador (solo lectura para no-admin)
CREATE POLICY phase_c_administradores_restrictive_select
ON public.administradores
AS RESTRICTIVE
FOR SELECT
TO public
USING (
  (jwt_rol() = 'admin'::text)
  OR (jwt_rol() = 'supervisor'::text)
  OR (jwt_rol() = 'trabajador'::text)
);

-- RESTRICTIVE INSERT: solo admin
CREATE POLICY phase_c_administradores_restrictive_insert
ON public.administradores
AS RESTRICTIVE
FOR INSERT
TO public
WITH CHECK ((jwt_rol() = 'admin'::text));

-- RESTRICTIVE UPDATE: solo admin
CREATE POLICY phase_c_administradores_restrictive_update
ON public.administradores
AS RESTRICTIVE
FOR UPDATE
TO public
USING ((jwt_rol() = 'admin'::text))
WITH CHECK ((jwt_rol() = 'admin'::text));

-- RESTRICTIVE DELETE: solo admin
CREATE POLICY phase_c_administradores_restrictive_delete
ON public.administradores
AS RESTRICTIVE
FOR DELETE
TO public
USING ((jwt_rol() = 'admin'::text));

COMMIT;
