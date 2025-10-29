-- FASE B - USUARIOS (ROLLBACK)
-- Restaura el estado previo a Fase B (post-Fase A):
--   - Re-crea políticas PERMISSIVE eliminadas en Fase B
--   - Re-crea políticas RESTRICTIVE de Fase A
--   - No toca las canónicas existentes: admin_all_usuarios, "Supervisores pueden ver usuarios",
--     "Permitir a usuarios gestionar su propio perfil"

BEGIN;

-- 1) Re-crear políticas PERMISSIVE previamente existentes

-- Lectura pública (anon) - PELIGROSA, solo para volver exactamente al estado anterior si es necesario
CREATE POLICY "Permitir lectura de usuarios a anonimos"
ON public.usuarios
AS PERMISSIVE
FOR SELECT
TO anon
USING (true);

-- Insert amplio (authenticated)
CREATE POLICY "Insert users"
ON public.usuarios
AS PERMISSIVE
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Select propio (authenticated)
CREATE POLICY "Select users"
ON public.usuarios
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (((SELECT auth.uid() AS uid) = id));

-- Select propio (authenticated) duplicada anterior
CREATE POLICY "users_select_own_profile"
ON public.usuarios
AS PERMISSIVE
FOR SELECT
TO authenticated
USING ((id = auth.uid()));

-- Update propio (authenticated)
CREATE POLICY "Update users"
ON public.usuarios
AS PERMISSIVE
FOR UPDATE
TO authenticated
USING (((SELECT auth.uid() AS uid) = id))
WITH CHECK (true);

-- Update propio (authenticated) duplicada anterior
CREATE POLICY "users_update_own_profile"
ON public.usuarios
AS PERMISSIVE
FOR UPDATE
TO authenticated
USING ((id = auth.uid()));

-- Delete propio (authenticated)
CREATE POLICY "Delete users"
ON public.usuarios
AS PERMISSIVE
FOR DELETE
TO authenticated
USING (((SELECT auth.uid() AS uid) = id));

-- Select supervisor duplicada anterior
CREATE POLICY "supervisor_select_usuarios"
ON public.usuarios
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (check_user_role('supervisor'::text));

-- Nota: "Supervisores pueden ver usuarios" ya existe y se mantiene.
-- Nota: "admin_all_usuarios" y "Permitir a usuarios gestionar su propio perfil" también se mantienen.

-- 2) Re-crear políticas RESTRICTIVE de Fase A

CREATE POLICY phase_a_users_restrictive_select
ON public.usuarios
AS RESTRICTIVE
FOR SELECT
TO public
USING (
  check_user_role('admin'::text)
  OR check_user_role('supervisor'::text)
  OR (id = auth.uid())
);

CREATE POLICY phase_a_users_restrictive_insert_own_or_admin
ON public.usuarios
AS RESTRICTIVE
FOR INSERT
TO authenticated
WITH CHECK (
  check_user_role('admin'::text)
  OR (id = auth.uid())
);

CREATE POLICY phase_a_users_restrictive_update_own_or_admin
ON public.usuarios
AS RESTRICTIVE
FOR UPDATE
TO authenticated
USING (
  check_user_role('admin'::text)
  OR (id = auth.uid())
)
WITH CHECK (
  check_user_role('admin'::text)
  OR (id = auth.uid())
);

CREATE POLICY phase_a_users_restrictive_delete_own_or_admin
ON public.usuarios
AS RESTRICTIVE
FOR DELETE
TO authenticated
USING (
  check_user_role('admin'::text)
  OR (id = auth.uid())
);

COMMIT;
