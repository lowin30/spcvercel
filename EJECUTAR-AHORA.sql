-- ============================================
-- EJECUTAR EN SUPABASE AHORA
-- ============================================
-- URL: https://supabase.com/dashboard/project/fodyzgjwoccpsjmfinvm/sql/new

-- 1. Corregir tu color_perfil actual
UPDATE usuarios 
SET color_perfil = '#3498db' 
WHERE id = '1bcb4141-56ed-491a-9cd9-5b8aea700d56';

-- 2. Asegurar RLS policy correcta
DROP POLICY IF EXISTS "users_update_own_profile" ON usuarios;

CREATE POLICY "users_update_own_profile" 
ON usuarios
FOR UPDATE 
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- 3. Verificar que todo está OK
SELECT 
  id,
  email,
  color_perfil,
  '✅ Listo para probar' AS estado
FROM usuarios
WHERE id = '1bcb4141-56ed-491a-9cd9-5b8aea700d56';
