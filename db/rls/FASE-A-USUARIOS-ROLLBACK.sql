-- FASE A - USUARIOS (ROLLBACK)
-- Revierte únicamente lo agregado por FASE-A-USUARIOS.sql

BEGIN;

-- 1) Eliminar triggers y funciones de sincronización
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_updated_email ON auth.users;

DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS public.sync_user_email();

-- 2) Eliminar RPC opcional
DROP FUNCTION IF EXISTS public.upsert_usuario_rol(uuid, text, text);

-- 3) Eliminar políticas RESTRICTIVE agregadas en Fase A
DROP POLICY IF EXISTS phase_a_users_restrictive_select ON public.usuarios;
DROP POLICY IF EXISTS phase_a_users_restrictive_insert_own_or_admin ON public.usuarios;
DROP POLICY IF EXISTS phase_a_users_restrictive_update_own_or_admin ON public.usuarios;
DROP POLICY IF EXISTS phase_a_users_restrictive_delete_own_or_admin ON public.usuarios;

COMMIT;
