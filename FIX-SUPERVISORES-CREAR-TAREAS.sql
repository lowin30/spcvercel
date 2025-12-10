-- ✅ PERMITIR A SUPERVISORES CREAR TAREAS
-- Ejecutar en: SQL Editor de Supabase
-- Fecha: 9 de Diciembre, 2025

-- Verificar políticas actuales de INSERT en tareas
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
WHERE tablename = 'tareas' 
  AND cmd = 'INSERT';

-- ====================================
-- SOLUCIÓN: Agregar política para supervisores
-- ====================================

-- Si solo existe una política de INSERT para admin, necesitamos agregar una para supervisor
-- O modificar la existente para incluir ambos roles

-- OPCIÓN A: Crear política específica para supervisores (RECOMENDADO)
CREATE POLICY "Supervisores pueden crear tareas"
ON tareas
FOR INSERT
TO authenticated
WITH CHECK (
  get_my_role() = 'supervisor'
);

-- OPCIÓN B (Alternativa): Si prefieres una sola política para ambos
-- Primero eliminar la política existente de admin si existe:
-- DROP POLICY IF EXISTS "Admin puede gestionar todas las tareas" ON tareas;
-- 
-- Y crear una nueva que incluya ambos:
-- CREATE POLICY "Admin y Supervisores pueden crear tareas"
-- ON tareas
-- FOR INSERT
-- TO authenticated
-- WITH CHECK (
--   get_my_role() IN ('admin', 'supervisor')
-- );

-- ====================================
-- VERIFICACIÓN
-- ====================================

-- Verificar que la política se creó correctamente
SELECT 
  policyname, 
  cmd,
  with_check
FROM pg_policies 
WHERE tablename = 'tareas' 
  AND cmd = 'INSERT';

-- Resultado esperado: Deberías ver 2 políticas de INSERT:
-- 1. Una para admin
-- 2. Una nueva para supervisor
