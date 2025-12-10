-- ✅ VERIFICACIÓN COMPLETA DE POLÍTICAS PARA CREAR TAREAS
-- Este script verifica TODAS las políticas necesarias para que supervisores puedan crear tareas
-- Fecha: 9 de Diciembre, 2025

-- ====================================
-- 1. VERIFICAR TABLA: tareas
-- ====================================
SELECT 
  'tareas' as tabla,
  policyname, 
  cmd,
  roles,
  with_check
FROM pg_policies 
WHERE tablename = 'tareas' 
  AND cmd = 'INSERT'
ORDER BY policyname;

-- Resultado esperado:
-- Debe haber al menos una política que permita INSERT con get_my_role() = 'supervisor'

-- ====================================
-- 2. VERIFICAR TABLA: supervisores_tareas
-- ====================================
SELECT 
  'supervisores_tareas' as tabla,
  policyname, 
  cmd,
  roles,
  with_check
FROM pg_policies 
WHERE tablename = 'supervisores_tareas' 
  AND cmd = 'INSERT'
ORDER BY policyname;

-- Resultado esperado:
-- Debe permitir INSERT a supervisores (get_my_role() = 'supervisor')

-- ====================================
-- 3. VERIFICAR TABLA: trabajadores_tareas
-- ====================================
SELECT 
  'trabajadores_tareas' as tabla,
  policyname, 
  cmd,
  roles,
  with_check
FROM pg_policies 
WHERE tablename = 'trabajadores_tareas' 
  AND cmd = 'INSERT'
ORDER BY policyname;

-- Resultado esperado:
-- Debe permitir INSERT a supervisores (get_my_role() = 'supervisor')

-- ====================================
-- 4. VERIFICAR TABLA: departamentos_tareas
-- ====================================
SELECT 
  'departamentos_tareas' as tabla,
  policyname, 
  cmd,
  roles,
  with_check
FROM pg_policies 
WHERE tablename = 'departamentos_tareas' 
  AND cmd = 'INSERT'
ORDER BY policyname;

-- Resultado esperado:
-- Debe permitir INSERT a supervisores (get_my_role() = 'supervisor')

-- ====================================
-- 5. SI FALTA ALGUNA POLÍTICA, CREARLAS:
-- ====================================

-- Para supervisores_tareas (si no existe)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'supervisores_tareas' 
      AND cmd = 'INSERT'
      AND with_check LIKE '%supervisor%'
  ) THEN
    CREATE POLICY "Supervisores pueden gestionar sus asignaciones"
    ON supervisores_tareas
    FOR INSERT
    TO authenticated
    WITH CHECK (
      get_my_role() IN ('admin', 'supervisor')
    );
  END IF;
END $$;

-- Para trabajadores_tareas (si no existe)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'trabajadores_tareas' 
      AND cmd = 'INSERT'
      AND with_check LIKE '%supervisor%'
  ) THEN
    CREATE POLICY "Supervisores pueden asignar trabajadores"
    ON trabajadores_tareas
    FOR INSERT
    TO authenticated
    WITH CHECK (
      get_my_role() IN ('admin', 'supervisor')
    );
  END IF;
END $$;

-- Para departamentos_tareas (si no existe)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'departamentos_tareas' 
      AND cmd = 'INSERT'
      AND with_check LIKE '%supervisor%'
  ) THEN
    CREATE POLICY "Supervisores pueden vincular departamentos"
    ON departamentos_tareas
    FOR INSERT
    TO authenticated
    WITH CHECK (
      get_my_role() IN ('admin', 'supervisor')
    );
  END IF;
END $$;

-- ====================================
-- 6. VERIFICACIÓN FINAL
-- ====================================
SELECT 
  tablename,
  COUNT(*) as politicas_insert
FROM pg_policies 
WHERE tablename IN ('tareas', 'supervisores_tareas', 'trabajadores_tareas', 'departamentos_tareas')
  AND cmd = 'INSERT'
GROUP BY tablename
ORDER BY tablename;

-- Resultado esperado: Cada tabla debe tener al menos 1 política de INSERT
