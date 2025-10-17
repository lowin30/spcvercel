-- =====================================================
-- MIGRACIÓN: Aprobar ajustes de facturas pagadas
-- FECHA: 2025-10-16
-- PROPÓSITO: Aprobar todos los ajustes pendientes de facturas que ya están pagadas
-- =====================================================

-- ============================================
-- PASO 1: INVESTIGAR - Ver ajustes afectados
-- ============================================
SELECT 
  aj.id AS ajuste_id,
  aj.id_factura,
  f.code AS factura_code,
  aj.monto_ajuste,
  aj.aprobado AS actualmente_aprobado,
  f.id_estado_nuevo AS estado_factura,
  ef.nombre AS nombre_estado_factura,
  aj.created_at AS ajuste_creado
FROM ajustes_facturas aj
INNER JOIN facturas f ON aj.id_factura = f.id
LEFT JOIN estados_facturas ef ON f.id_estado_nuevo = ef.id
WHERE aj.aprobado = false  -- Ajustes NO aprobados
  AND aj.pagado = false    -- Ajustes NO liquidados
  AND f.id_estado_nuevo = 5  -- Facturas PAGADAS
ORDER BY aj.created_at DESC;

-- ============================================
-- PASO 2: CONTAR - Ver cuántos ajustes se actualizarán
-- ============================================
SELECT 
  COUNT(*) AS total_ajustes_a_aprobar,
  COUNT(DISTINCT aj.id_factura) AS total_facturas_afectadas,
  SUM(aj.monto_ajuste) AS monto_total_a_aprobar
FROM ajustes_facturas aj
INNER JOIN facturas f ON aj.id_factura = f.id
WHERE aj.aprobado = false
  AND aj.pagado = false
  AND f.id_estado_nuevo = 5;

-- ============================================
-- PASO 3: EJECUTAR - Aprobar ajustes
-- ============================================

-- Comenzar transacción para poder hacer rollback si algo sale mal
BEGIN;

-- Actualizar los ajustes
UPDATE ajustes_facturas aj
SET 
  aprobado = true,
  fecha_aprobacion = NOW()
FROM facturas f
WHERE aj.id_factura = f.id
  AND aj.aprobado = false
  AND aj.pagado = false
  AND f.id_estado_nuevo = 5;

-- Ver cuántos se actualizaron
-- (Esta query solo funciona inmediatamente después del UPDATE)
-- En PostgreSQL, puedes usar RETURNING para ver los IDs actualizados

-- ============================================
-- PASO 4: VERIFICAR - Revisar los cambios
-- ============================================
SELECT 
  aj.id AS ajuste_id,
  aj.id_factura,
  f.code AS factura_code,
  aj.monto_ajuste,
  aj.aprobado,
  aj.fecha_aprobacion,
  f.id_estado_nuevo AS estado_factura
FROM ajustes_facturas aj
INNER JOIN facturas f ON aj.id_factura = f.id
WHERE aj.fecha_aprobacion >= NOW() - INTERVAL '1 minute'  -- Aprobados en el último minuto
ORDER BY aj.fecha_aprobacion DESC;

-- Si todo se ve bien, hacer COMMIT
COMMIT;

-- Si algo salió mal, hacer ROLLBACK
-- ROLLBACK;

-- ============================================
-- PASO 5: VALIDACIÓN FINAL
-- ============================================

-- Verificar que NO queden ajustes sin aprobar en facturas pagadas
SELECT 
  COUNT(*) AS ajustes_pendientes_en_facturas_pagadas
FROM ajustes_facturas aj
INNER JOIN facturas f ON aj.id_factura = f.id
WHERE aj.aprobado = false
  AND aj.pagado = false
  AND f.id_estado_nuevo = 5;
-- Resultado esperado: 0

-- ============================================
-- CASO ESPECÍFICO: Factura #87
-- ============================================
SELECT 
  aj.id,
  aj.id_factura,
  aj.descripcion_item,
  aj.monto_ajuste,
  aj.aprobado,
  aj.fecha_aprobacion,
  f.id_estado_nuevo AS estado_factura,
  ef.nombre AS nombre_estado
FROM ajustes_facturas aj
INNER JOIN facturas f ON aj.id_factura = f.id
LEFT JOIN estados_facturas ef ON f.id_estado_nuevo = ef.id
WHERE aj.id_factura = 87;

-- Verificar en vista_facturas_completa
SELECT 
  id,
  code,
  nombre_edificio,
  total,
  total_ajustes_calculados,   -- Debería ser 0
  total_ajustes_pendientes,   -- Debería ser 22000
  total_ajustes_liquidados,   -- Debería ser 0
  total_ajustes_todos         -- Debería ser 22000
FROM vista_facturas_completa
WHERE id = 87;

-- =====================================================
-- RESUMEN DE RESULTADOS ESPERADOS:
-- =====================================================
/*
ANTES de ejecutar:
- Factura #87: total_ajustes_calculados = 22000, total_ajustes_pendientes = 0
- Ajuste #49: aprobado = false, fecha_aprobacion = NULL

DESPUÉS de ejecutar:
- Factura #87: total_ajustes_calculados = 0, total_ajustes_pendientes = 22000
- Ajuste #49: aprobado = true, fecha_aprobacion = NOW()
- Factura aparece en pestaña "Para Liquidar" ✅
*/

-- =====================================================
-- NOTAS IMPORTANTES:
-- =====================================================
/*
1. Este script usa una transacción (BEGIN/COMMIT) para seguridad
2. Si algo sale mal, ejecuta ROLLBACK para deshacer cambios
3. Solo afecta ajustes con aprobado=false y pagado=false
4. Solo afecta facturas con id_estado_nuevo=5 (Pagado)
5. NO toca ajustes ya aprobados o liquidados
*/
