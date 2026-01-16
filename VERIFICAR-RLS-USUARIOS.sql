-- ============================================
-- VERIFICAR RLS POLICIES EN TABLA USUARIOS
-- ============================================

-- 1. Ver todas las policies de la tabla usuarios
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'usuarios'
ORDER BY policyname;

-- 2. Verificar que tu usuario puede actualizar su propio perfil
-- Reemplaza '1bcb4141-56ed-491a-9cd9-5b8aea700d56' con tu user ID
SELECT 
  id,
  email,
  rol,
  color_perfil,
  auth.uid() = id AS puede_actualizar
FROM usuarios
WHERE id = '1bcb4141-56ed-491a-9cd9-5b8aea700d56';

-- ============================================
-- SOLUCIÓN: Si la policy no existe o está mal
-- ============================================

-- Crear o reemplazar policy para que usuarios actualicen su propio perfil
DROP POLICY IF EXISTS "users_update_own_profile" ON usuarios;

CREATE POLICY "users_update_own_profile" 
ON usuarios
FOR UPDATE 
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());
