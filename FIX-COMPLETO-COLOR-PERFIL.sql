-- ============================================
-- FIX COMPLETO: Color de Perfil
-- ============================================
-- Ejecutar en: https://supabase.com/dashboard/project/fodyzgjwoccpsjmfinvm/sql/new

-- PASO 1: Ver el problema actual
SELECT 
  id, 
  email, 
  color_perfil,
  CASE 
    WHEN color_perfil ~ '^#[0-9a-fA-F]{6}$' THEN '✅ Válido'
    ELSE '❌ Inválido'
  END AS validacion
FROM usuarios
WHERE id = '1bcb4141-56ed-491a-9cd9-5b8aea700d56';

-- PASO 2: Actualizar tu color a uno válido (esto lo harás desde la app después)
-- Si tu color_perfil actual es inválido, cámbialo temporalmente:
UPDATE usuarios 
SET color_perfil = '#3498db' 
WHERE id = '1bcb4141-56ed-491a-9cd9-5b8aea700d56'
  AND (color_perfil IS NULL OR color_perfil !~ '^#[0-9a-fA-F]{6}$');

-- PASO 3: Verificar RLS policies
SELECT 
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'usuarios'
  AND cmd = 'UPDATE';

-- PASO 4: Asegurar que la policy de UPDATE existe
DROP POLICY IF EXISTS "users_update_own_profile" ON usuarios;

CREATE POLICY "users_update_own_profile" 
ON usuarios
FOR UPDATE 
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- PASO 5: Verificar que todo está OK
SELECT 
  '✅ CHECK constraint' AS componente,
  pg_get_constraintdef(oid) AS estado
FROM pg_constraint
WHERE conname = 'usuarios_color_perfil_check'

UNION ALL

SELECT 
  '✅ RLS Policy UPDATE' AS componente,
  'Existe' AS estado
FROM pg_policies
WHERE tablename = 'usuarios' 
  AND policyname = 'users_update_own_profile'

UNION ALL

SELECT 
  '✅ Tu color_perfil' AS componente,
  color_perfil AS estado
FROM usuarios
WHERE id = '1bcb4141-56ed-491a-9cd9-5b8aea700d56';

-- ============================================
-- RESULTADO ESPERADO:
-- - CHECK constraint acepta #RRGGBB
-- - RLS Policy permite UPDATE a tu propio usuario
-- - Tu color_perfil es #3498db o similar
-- ============================================
