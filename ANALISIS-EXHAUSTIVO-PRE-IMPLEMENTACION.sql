-- =====================================================
-- ANÁLISIS EXHAUSTIVO PRE-IMPLEMENTACIÓN
-- Consultar TODO antes de implementar "Mis Liquidaciones"
-- =====================================================

-- ========================================
-- 1. ESTRUCTURA TABLA partes_de_trabajo
-- ========================================
SELECT 
  '=== TABLA partes_de_trabajo ===' as seccion,
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'partes_de_trabajo'
ORDER BY ordinal_position;

-- ========================================
-- 2. VERIFICAR SI EXISTE VISTA DE PARTES
-- ========================================
SELECT 
  table_name as vista_nombre,
  view_definition
FROM information_schema.views
WHERE table_schema = 'public'
  AND (table_name LIKE '%partes%' OR table_name LIKE '%jornales%')
ORDER BY table_name;

-- ========================================
-- 3. ESTRUCTURA vista_gastos_tarea_completa
-- ========================================
SELECT 
  '=== VISTA vista_gastos_tarea_completa ===' as seccion,
  column_name, 
  data_type
FROM information_schema.columns
WHERE table_name = 'vista_gastos_tarea_completa'
ORDER BY ordinal_position;

-- ========================================
-- 4. TABLA liquidaciones_trabajadores
-- ========================================
SELECT 
  '=== TABLA liquidaciones_trabajadores ===' as seccion,
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns
WHERE table_name = 'liquidaciones_trabajadores'
ORDER BY ordinal_position;

-- ========================================
-- 5. TABLA liquidaciones_nuevas
-- ========================================
SELECT 
  '=== TABLA liquidaciones_nuevas ===' as seccion,
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns
WHERE table_name = 'liquidaciones_nuevas'
ORDER BY ordinal_position;

-- ========================================
-- 6. TABLA configuracion_trabajadores
-- ========================================
SELECT 
  '=== TABLA configuracion_trabajadores ===' as seccion,
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns
WHERE table_name = 'configuracion_trabajadores'
ORDER BY ordinal_position;

-- ========================================
-- 7. RELACIONES DE partes_de_trabajo
-- ========================================
SELECT
  '=== FOREIGN KEYS partes_de_trabajo ===' as seccion,
  tc.table_name as tabla_origen,
  kcu.column_name as columna_fk,
  ccu.table_name as tabla_destino,
  ccu.column_name as columna_destino
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name = 'partes_de_trabajo'
ORDER BY kcu.column_name;

-- ========================================
-- 8. DATOS DE EJEMPLO - partes_de_trabajo
-- ========================================
SELECT 
  '=== EJEMPLO partes_de_trabajo ===' as seccion,
  id,
  fecha,
  tipo_jornada,
  id_trabajador,
  id_tarea,
  id_liquidacion,
  created_at
FROM partes_de_trabajo
ORDER BY created_at DESC
LIMIT 5;

-- ========================================
-- 9. DATOS DE EJEMPLO - liquidaciones_trabajadores
-- ========================================
SELECT 
  '=== EJEMPLO liquidaciones_trabajadores ===' as seccion,
  id,
  id_trabajador,
  gastos_reembolsados,
  total_jornales,
  total_general,
  created_at
FROM liquidaciones_trabajadores
ORDER BY created_at DESC
LIMIT 3;

-- ========================================
-- 10. VERIFICAR USO DE id_liquidacion EN partes
-- ========================================
SELECT 
  '=== PARTES CON LIQUIDACION ===' as seccion,
  COUNT(*) as total_partes,
  COUNT(id_liquidacion) as partes_liquidados,
  COUNT(*) - COUNT(id_liquidacion) as partes_pendientes
FROM partes_de_trabajo;

-- ========================================
-- 11. VERIFICAR PÁGINAS QUE USAN partes_de_trabajo
-- ========================================
-- Nota: Esta query es para revisar manualmente en el código

-- ========================================
-- 12. TODAS LAS VISTAS DISPONIBLES
-- ========================================
SELECT 
  '=== TODAS LAS VISTAS ===' as seccion,
  table_name
FROM information_schema.views
WHERE table_schema = 'public'
ORDER BY table_name;

-- ========================================
-- 13. VERIFICAR SUPERVISORES_TAREAS
-- ========================================
SELECT 
  '=== TABLA supervisores_tareas ===' as seccion,
  column_name, 
  data_type
FROM information_schema.columns
WHERE table_name = 'supervisores_tareas'
ORDER BY ordinal_position;

-- ========================================
-- 14. VERIFICAR TRABAJADORES_TAREAS
-- ========================================
SELECT 
  '=== TABLA trabajadores_tareas ===' as seccion,
  column_name, 
  data_type
FROM information_schema.columns
WHERE table_name = 'trabajadores_tareas'
ORDER BY ordinal_position;

-- ========================================
-- 15. POLÍTICAS RLS DE partes_de_trabajo
-- ========================================
SELECT 
  '=== POLÍTICAS RLS partes_de_trabajo ===' as seccion,
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'partes_de_trabajo'
ORDER BY policyname;

-- ========================================
-- 16. VERIFICAR DIFERENCIAS liquidaciones_trabajadores vs liquidaciones_nuevas
-- ========================================
-- ¿Cuál se usa actualmente? ¿Cuál debería usarse?

SELECT 
  '=== CONTEO liquidaciones_trabajadores ===' as seccion,
  COUNT(*) as total
FROM liquidaciones_trabajadores;

SELECT 
  '=== CONTEO liquidaciones_nuevas ===' as seccion,
  COUNT(*) as total
FROM liquidaciones_nuevas;

-- =====================================================
-- EJECUTAR EN SUPABASE SQL EDITOR
-- Copiar resultados para análisis
-- =====================================================
