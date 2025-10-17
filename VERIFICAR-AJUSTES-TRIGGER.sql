-- =====================================================
-- VERIFICACIÓN: Trigger y migración de ajustes
-- FECHA: 2025-10-16
-- PROPÓSITO: Verificar que el trigger y la migración funcionaron correctamente
-- =====================================================

-- ============================================
-- VERIFICACIÓN 1: Trigger instalado
-- ============================================
SELECT 
  '✅ TRIGGER INSTALADO' AS verificacion,
  tgname AS nombre_trigger,
  tgrelid::regclass AS tabla,
  CASE 
    WHEN tgenabled = 'O' THEN 'Activo'
    WHEN tgenabled = 'D' THEN 'Desactivado'
    ELSE 'Otro estado'
  END AS estado
FROM pg_trigger
WHERE tgname = 'trigger_auto_aprobar_ajustes';

-- Si no devuelve resultados, el trigger NO está instalado ❌

-- ============================================
-- VERIFICACIÓN 2: Función existe
-- ============================================
SELECT 
  '✅ FUNCIÓN CREADA' AS verificacion,
  proname AS nombre_funcion,
  prokind AS tipo,
  provolatile AS volatilidad
FROM pg_proc
WHERE proname = 'auto_aprobar_ajustes_factura_pagada';

-- ============================================
-- VERIFICACIÓN 3: No hay ajustes inconsistentes
-- ============================================
SELECT 
  '❌ AJUSTES INCONSISTENTES' AS verificacion,
  COUNT(*) AS cantidad_ajustes_pendientes,
  COUNT(DISTINCT aj.id_factura) AS cantidad_facturas_afectadas,
  COALESCE(SUM(aj.monto_ajuste), 0) AS monto_total
FROM ajustes_facturas aj
INNER JOIN facturas f ON aj.id_factura = f.id
WHERE aj.aprobado = false
  AND aj.pagado = false
  AND f.id_estado_nuevo = 5;
  
-- Resultado esperado: cantidad_ajustes_pendientes = 0 ✅
-- Si es > 0, hay ajustes que no se migraron ❌

-- ============================================
-- VERIFICACIÓN 4: Estado de Factura #87
-- ============================================
SELECT 
  '✅ FACTURA #87 - ESTADO ACTUAL' AS verificacion,
  f.id,
  f.code,
  f.id_estado_nuevo,
  ef.nombre AS estado_nombre,
  COUNT(aj.id) AS total_ajustes,
  COUNT(CASE WHEN aj.aprobado = true THEN 1 END) AS ajustes_aprobados,
  COUNT(CASE WHEN aj.aprobado = false THEN 1 END) AS ajustes_sin_aprobar,
  COALESCE(SUM(aj.monto_ajuste), 0) AS monto_total_ajustes
FROM facturas f
LEFT JOIN estados_facturas ef ON f.id_estado_nuevo = ef.id
LEFT JOIN ajustes_facturas aj ON f.id = aj.id_factura
WHERE f.id = 87
GROUP BY f.id, f.code, f.id_estado_nuevo, ef.nombre;

-- Resultado esperado:
-- - ajustes_aprobados = 1
-- - ajustes_sin_aprobar = 0
-- - monto_total_ajustes = 22000

-- ============================================
-- VERIFICACIÓN 5: Vista completa Factura #87
-- ============================================
SELECT 
  '✅ FACTURA #87 - VISTA COMPLETA' AS verificacion,
  id,
  code,
  nombre_edificio,
  total,
  total_ajustes_calculados,   -- Esperado: 0
  total_ajustes_pendientes,   -- Esperado: 22000 ✅
  total_ajustes_liquidados,   -- Esperado: 0
  total_ajustes_todos         -- Esperado: 22000
FROM vista_facturas_completa
WHERE id = 87;

-- ============================================
-- VERIFICACIÓN 6: Ajuste #49 específico
-- ============================================
SELECT 
  '✅ AJUSTE #49 - DETALLES' AS verificacion,
  id,
  id_factura,
  monto_ajuste,
  aprobado,  -- Esperado: true ✅
  fecha_aprobacion,  -- Esperado: timestamp ✅
  pagado,  -- Esperado: false
  created_at
FROM ajustes_facturas
WHERE id = 49;

-- ============================================
-- VERIFICACIÓN 7: Resumen general por estado
-- ============================================
SELECT 
  '📊 RESUMEN GENERAL' AS verificacion,
  ef.nombre AS estado_factura,
  COUNT(DISTINCT f.id) AS cantidad_facturas,
  COUNT(aj.id) AS cantidad_ajustes,
  COUNT(CASE WHEN aj.aprobado = true THEN 1 END) AS ajustes_aprobados,
  COUNT(CASE WHEN aj.aprobado = false THEN 1 END) AS ajustes_sin_aprobar,
  COALESCE(SUM(aj.monto_ajuste), 0) AS monto_total
FROM facturas f
LEFT JOIN estados_facturas ef ON f.id_estado_nuevo = ef.id
LEFT JOIN ajustes_facturas aj ON f.id = aj.id_factura
GROUP BY ef.nombre, f.id_estado_nuevo
ORDER BY f.id_estado_nuevo;

-- ============================================
-- VERIFICACIÓN 8: Últimas aprobaciones
-- ============================================
SELECT 
  '📅 ÚLTIMAS APROBACIONES' AS verificacion,
  aj.id AS ajuste_id,
  aj.id_factura,
  f.code AS factura_code,
  aj.monto_ajuste,
  aj.fecha_aprobacion,
  f.id_estado_nuevo AS estado_factura
FROM ajustes_facturas aj
INNER JOIN facturas f ON aj.id_factura = f.id
WHERE aj.fecha_aprobacion IS NOT NULL
ORDER BY aj.fecha_aprobacion DESC
LIMIT 20;

-- ============================================
-- VERIFICACIÓN 9: Prueba del trigger (OPCIONAL)
-- ============================================
/*
-- SOLO EJECUTAR SI QUIERES PROBAR EL TRIGGER
-- Esto creará un ajuste de prueba y lo eliminará

-- Insertar ajuste de prueba en factura pagada
INSERT INTO ajustes_facturas (
  id_factura,
  id_item,
  descripcion_item,
  monto_base,
  porcentaje_ajuste,
  monto_ajuste,
  aprobado,  -- Lo insertamos como false
  pagado
) VALUES (
  87,  -- Factura pagada
  999999,
  'PRUEBA TRIGGER - Eliminar después',
  100,
  10,
  10,
  false,  -- El trigger debería cambiarlo a true
  false
) RETURNING id, aprobado, fecha_aprobacion;

-- Verificar que se aprobó automáticamente
SELECT 
  id,
  aprobado,  -- Debería ser TRUE ✅
  fecha_aprobacion  -- Debería tener timestamp ✅
FROM ajustes_facturas
WHERE descripcion_item LIKE 'PRUEBA TRIGGER%';

-- Limpiar
DELETE FROM ajustes_facturas 
WHERE descripcion_item LIKE 'PRUEBA TRIGGER%';
*/

-- =====================================================
-- CHECKLIST DE VERIFICACIÓN:
-- =====================================================
/*
✅ VERIFICACIÓN 1: Trigger instalado y activo
✅ VERIFICACIÓN 2: Función existe
✅ VERIFICACIÓN 3: No hay ajustes inconsistentes (count = 0)
✅ VERIFICACIÓN 4: Factura #87 tiene ajustes aprobados
✅ VERIFICACIÓN 5: Vista muestra total_ajustes_pendientes = 22000
✅ VERIFICACIÓN 6: Ajuste #49 tiene aprobado = true
✅ VERIFICACIÓN 7: Resumen general coherente
✅ VERIFICACIÓN 8: Últimas aprobaciones visibles
*/

-- =====================================================
-- RESULTADO ESPERADO FINAL:
-- =====================================================
/*
FACTURA #87 debe aparecer en:
- Dashboard de Ajustes → Pestaña "🟠 Para Liquidar"
- Con monto: $22,000
- Estado: Aprobado, Pendiente de liquidación

PRÓXIMOS PASOS:
1. Ir a https://spcvercel.vercel.app/dashboard/ajustes
2. Click en pestaña "🟠 Para Liquidar"
3. Buscar factura FAC-00087
4. Verificar monto $22,000
5. Click en "Pagar Todos los Ajustes" cuando sea necesario
*/
