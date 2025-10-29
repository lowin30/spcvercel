-- FASE A - USUARIOS (NO DESTRUCTIVO)
-- Triggers de sincronización auth.users -> public.usuarios y políticas RLS RESTRICTIVE

BEGIN;

-- 1) Trigger: crear perfil básico en public.usuarios tras alta en auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.usuarios (id, email, rol)
  VALUES (NEW.id, NEW.email, 'trabajador')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2) Trigger: sincronizar email si cambia en auth.users
CREATE OR REPLACE FUNCTION public.sync_user_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.usuarios
     SET email = NEW.email
   WHERE id = NEW.id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_updated_email ON auth.users;
CREATE TRIGGER on_auth_user_updated_email
AFTER UPDATE OF email ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.sync_user_email();

-- 3) Políticas RESTRICTIVE para endurecer sin romper lo existente
-- SELECT: admin todo, supervisor lectura, usuario su propio perfil. Bloquea anon.
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

-- INSERT: admin o perfil propio (neutraliza INSERT amplio existente)
CREATE POLICY phase_a_users_restrictive_insert_own_or_admin
ON public.usuarios
AS RESTRICTIVE
FOR INSERT
TO authenticated
WITH CHECK (
  check_user_role('admin'::text)
  OR (id = auth.uid())
);

-- UPDATE: admin o perfil propio
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

-- DELETE: admin o perfil propio (si aplica)
CREATE POLICY phase_a_users_restrictive_delete_own_or_admin
ON public.usuarios
AS RESTRICTIVE
FOR DELETE
TO authenticated
USING (
  check_user_role('admin'::text)
  OR (id = auth.uid())
);

-- 4) RPC opcional para invitaciones: setear rol deseado de forma idempotente
CREATE OR REPLACE FUNCTION public.upsert_usuario_rol(p_id uuid, p_email text, p_rol text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO public.usuarios (id, email, rol)
  VALUES (p_id, p_email, p_rol)
  ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        rol   = EXCLUDED.rol;
$$;

COMMIT;
