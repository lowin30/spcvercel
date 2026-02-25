-- ============================================
-- PASAPORTE DIGITAL: Enriquecimiento de tabla usuarios
-- ============================================
-- Fecha: 2026-02-25
-- Objetivo: Convertir la tabla usuarios en el "Pasaporte Digital"
--           de cada persona en el sistema.
--
-- CAMBIOS:
-- 1. Columna preferencias (JSONB) — reemplaza localStorage
-- 2. Columna ultimo_acceso (TIMESTAMPTZ) — presencia viva
-- 3. Trigger automático para actualizar ultimo_acceso en cada login
-- ============================================

BEGIN;

-- ============================================
-- 1. PREFERENCIAS JSONB
-- ============================================
-- Almacena configuraciones personales del usuario:
-- tema, font_size, idioma, notificaciones, etc.
-- Reemplaza localStorage para que las preferencias
-- viajen con el usuario a cualquier dispositivo.

ALTER TABLE public.usuarios
ADD COLUMN IF NOT EXISTS preferencias JSONB DEFAULT '{}';

COMMENT ON COLUMN public.usuarios.preferencias IS 
'Preferencias personales del usuario (tema, font_size, idioma). Reemplaza localStorage para persistencia cross-device.';

-- ============================================
-- 2. ÚLTIMO ACCESO
-- ============================================
-- Timestamp de la última vez que el usuario accedió.
-- Permite al admin ver la actividad del equipo.

ALTER TABLE public.usuarios
ADD COLUMN IF NOT EXISTS ultimo_acceso TIMESTAMPTZ;

COMMENT ON COLUMN public.usuarios.ultimo_acceso IS 
'Timestamp del último acceso del usuario. Se actualiza automáticamente vía trigger en auth.users.';

-- ============================================
-- 3. TRIGGER: Sincronizar último acceso
-- ============================================
-- Se ejecuta cuando auth.users actualiza last_sign_in_at
-- (cada vez que un usuario hace login).
-- Patrón copiado de sync_user_email (FASE-A-USUARIOS.sql).

CREATE OR REPLACE FUNCTION public.sync_ultimo_acceso()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Solo actualizar si last_sign_in_at cambió realmente
  IF NEW.last_sign_in_at IS DISTINCT FROM OLD.last_sign_in_at THEN
    UPDATE public.usuarios
       SET ultimo_acceso = NEW.last_sign_in_at
     WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_login ON auth.users;
CREATE TRIGGER on_auth_user_login
AFTER UPDATE OF last_sign_in_at ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.sync_ultimo_acceso();

-- ============================================
-- 4. DOCUMENTACIÓN
-- ============================================
COMMENT ON FUNCTION public.sync_ultimo_acceso() IS 
'Trigger que sincroniza el último acceso del usuario desde auth.users a public.usuarios. Se ejecuta en cada login.';

-- ============================================
-- 5. VERIFICAR que nombre existe (no-op si ya existe)
-- ============================================
ALTER TABLE public.usuarios
ADD COLUMN IF NOT EXISTS nombre TEXT;

COMMENT ON COLUMN public.usuarios.nombre IS 
'Nombre completo del usuario, editable desde la página de Perfil.';

COMMIT;
