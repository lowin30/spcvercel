-- FASE B - USUARIOS (CLEANUP)
-- Objetivo: dejar solo 3 políticas canónicas en public.usuarios
--   1) admin_all_usuarios (ALL)
--   2) Supervisores pueden ver usuarios (SELECT)
--   3) Permitir a usuarios gestionar su propio perfil (ALL)
-- No toca triggers ni RPC. No crea nuevas políticas si ya existen.

BEGIN;

-- 1) Eliminar políticas peligrosas
DROP POLICY IF EXISTS "Permitir lectura de usuarios a anonimos" ON public.usuarios; -- SELECT anon true
DROP POLICY IF EXISTS "Insert users" ON public.usuarios; -- INSERT amplio (with_check true)

-- 2) Eliminar políticas duplicadas/solapadas (cubiertas por las 3 canónicas)
DROP POLICY IF EXISTS "Select users" ON public.usuarios;
DROP POLICY IF EXISTS "users_select_own_profile" ON public.usuarios;
DROP POLICY IF EXISTS "Update users" ON public.usuarios;
DROP POLICY IF EXISTS "users_update_own_profile" ON public.usuarios;
DROP POLICY IF EXISTS "Delete users" ON public.usuarios;
DROP POLICY IF EXISTS "supervisor_select_usuarios" ON public.usuarios; -- mantenemos "Supervisores pueden ver usuarios"

-- 3) Eliminar RESTRICTIVE agregadas en Fase A (ya no son necesarias al consolidar)
DROP POLICY IF EXISTS phase_a_users_restrictive_select ON public.usuarios;
DROP POLICY IF EXISTS phase_a_users_restrictive_insert_own_or_admin ON public.usuarios;
DROP POLICY IF EXISTS phase_a_users_restrictive_update_own_or_admin ON public.usuarios;
DROP POLICY IF EXISTS phase_a_users_restrictive_delete_own_or_admin ON public.usuarios;

-- Nota: Se conservan intactas las políticas canónicas existentes:
--   - admin_all_usuarios (ALL)
--   - Supervisores pueden ver usuarios (SELECT)
--   - Permitir a usuarios gestionar su propio perfil (ALL)

COMMIT;
