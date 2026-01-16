-- ============================================
-- FIX URGENTE: Permitir colores hexadecimales en color_perfil
-- ============================================
-- Ejecutar en: https://supabase.com/dashboard/project/fodyzgjwoccpsjmfinvm/sql/new

-- Paso 1: Eliminar el constraint restrictivo actual
ALTER TABLE usuarios DROP CONSTRAINT IF EXISTS usuarios_color_perfil_check;

-- Paso 2: Agregar constraint flexible que acepta formato #RRGGBB
ALTER TABLE usuarios ADD CONSTRAINT usuarios_color_perfil_check 
  CHECK (color_perfil IS NULL OR color_perfil ~ '^#[0-9a-fA-F]{6}$');

-- Paso 3: Verificar que funcionó
SELECT 
  conname AS constraint_name,
  pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conname = 'usuarios_color_perfil_check';

-- ============================================
-- RESULTADO ESPERADO:
-- constraint_name: usuarios_color_perfil_check
-- constraint_definition: CHECK ((color_perfil IS NULL) OR (color_perfil ~ '^#[0-9a-fA-F]{6}$'::text))
-- ============================================
-- Esto permite: #3498db, #10b981, #9333ea, etc.
-- Rechaza: 'blue', 'green', '#abc', '#1234567', etc.
-- ============================================
