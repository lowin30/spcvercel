-- ============================================
-- DIAGNOSTICAR PROBLEMA CON color_perfil
-- ============================================

-- 1. Ver la definición del CHECK constraint
SELECT 
  conname AS constraint_name,
  pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conname = 'usuarios_color_perfil_check';

-- 2. Ver valores actuales de color_perfil en la tabla
SELECT DISTINCT color_perfil 
FROM usuarios 
WHERE color_perfil IS NOT NULL
ORDER BY color_perfil;

-- 3. Ver la estructura completa de la columna
SELECT 
  column_name,
  data_type,
  character_maximum_length,
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'usuarios' 
  AND column_name = 'color_perfil';

-- 4. Ver todas las constraints en la tabla usuarios
SELECT 
  conname AS constraint_name,
  contype AS constraint_type,
  pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid = 'usuarios'::regclass;

-- ============================================
-- SOLUCIÓN: Si el constraint es muy restrictivo
-- ============================================

-- Opción 1: Eliminar el constraint (permite cualquier valor TEXT)
-- ALTER TABLE usuarios DROP CONSTRAINT IF EXISTS usuarios_color_perfil_check;

-- Opción 2: Recrear constraint con valores correctos
-- ALTER TABLE usuarios DROP CONSTRAINT IF EXISTS usuarios_color_perfil_check;
-- ALTER TABLE usuarios ADD CONSTRAINT usuarios_color_perfil_check 
--   CHECK (color_perfil ~ '^#[0-9a-fA-F]{6}$');
-- Esto valida formato hexadecimal: #3498db, #10b981, etc.
