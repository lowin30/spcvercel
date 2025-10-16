-- =====================================================
-- SCRIPT: Análisis completo de estructura de base de datos
-- FECHA: 2025-10-16
-- USO: Ejecutar en Supabase SQL Editor para ver todos los campos disponibles
-- =====================================================

-- ========================================
-- 1. ESTRUCTURA DE FACTURAS
-- ========================================
SELECT 
  '=== TABLA FACTURAS ===' as info,
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'facturas'
ORDER BY ordinal_position;

-- ========================================
-- 2. ESTRUCTURA DE VISTA_FACTURAS_COMPLETA
-- ========================================
SELECT 
  '=== VISTA FACTURAS COMPLETA ===' as info,
  column_name, 
  data_type
FROM information_schema.columns
WHERE table_name = 'vista_facturas_completa'
ORDER BY ordinal_position;

-- ========================================
-- 3. ESTRUCTURA DE PRESUPUESTOS_FINALES
-- ========================================
SELECT 
  '=== TABLA PRESUPUESTOS FINALES ===' as info,
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns
WHERE table_name = 'presupuestos_finales'
ORDER BY ordinal_position;

-- ========================================
-- 4. ESTRUCTURA DE EDIFICIOS
-- ========================================
SELECT 
  '=== TABLA EDIFICIOS ===' as info,
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns
WHERE table_name = 'edificios'
ORDER BY ordinal_position;

-- ========================================
-- 5. ESTRUCTURA DE TAREAS
-- ========================================
SELECT 
  '=== TABLA TAREAS ===' as info,
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns
WHERE table_name = 'tareas'
ORDER BY ordinal_position;

-- ========================================
-- 6. ESTRUCTURA DE PRODUCTOS
-- ========================================
SELECT 
  '=== TABLA PRODUCTOS ===' as info,
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns
WHERE table_name = 'productos'
ORDER BY ordinal_position;

-- ========================================
-- 7. EJEMPLO DE DATOS REALES - FACTURAS
-- ========================================
SELECT 
  id,
  code,
  nombre,
  total,
  datos_afip,
  nombre_edificio,
  direccion_edificio,
  cuit_edificio,
  titulo_tarea,
  code_tarea,
  presupuesto_final_code,
  estado_nombre,
  created_at
FROM vista_facturas_completa
LIMIT 3;

-- ========================================
-- 8. EJEMPLO DE DATOS REALES - PRESUPUESTOS FINALES
-- ========================================
SELECT 
  id,
  code,
  total,
  id_tarea,
  id_edificio,
  id_estado,
  created_at
FROM presupuestos_finales
LIMIT 3;

-- ========================================
-- 9. RELACIONES ENTRE TABLAS
-- ========================================
SELECT
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
  AND tc.table_name IN ('facturas', 'presupuestos_finales', 'productos', 'tareas', 'edificios')
ORDER BY tc.table_name, kcu.column_name;

-- ========================================
-- 10. VISTAS DISPONIBLES
-- ========================================
SELECT 
  table_name,
  view_definition
FROM information_schema.views
WHERE table_schema = 'public'
  AND table_name LIKE '%factura%'
ORDER BY table_name;

-- =====================================================
-- EJECUTAR TODO JUNTO O POR SECCIONES
-- =====================================================
