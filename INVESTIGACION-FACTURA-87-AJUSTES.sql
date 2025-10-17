-- =====================================================
-- INVESTIGACIÓN: Factura #87 - ¿Por qué no aparece en "Para liquidar"?
-- =====================================================

-- ============================================
-- PASO 1: Verificar datos de la factura #87
-- ============================================
SELECT 
  id,
  code,
  total,
  saldo_pendiente,
  total_pagado,
  pagada,
  fecha_pago,
  tiene_ajustes,
  id_presupuesto_final
FROM facturas
WHERE id = 87;

-- ============================================
-- PASO 2: Ver ajustes de la factura #87
-- ============================================
SELECT 
  id,
  id_factura,
  id_item,
  descripcion_item,
  monto_base,
  porcentaje_ajuste,
  monto_ajuste,
  aprobado,           -- ⭐ CLAVE
  fecha_aprobacion,
  pagado,             -- ⭐ CLAVE
  fecha_pago,
  created_at
FROM ajustes_facturas
WHERE id_factura = 87
ORDER BY created_at;

-- ============================================
-- PASO 3: Ver la factura en vista_facturas_completa
-- ============================================
SELECT 
  id,
  code,
  nombre_edificio,
  total,
  total_ajustes_calculados,   -- aprobado=false, pagado=false
  total_ajustes_pendientes,   -- ⭐ aprobado=true, pagado=false (Para liquidar)
  total_ajustes_liquidados,   -- pagado=true
  total_ajustes_todos,        -- todos
  total_ajustes              -- alias de pendientes
FROM vista_facturas_completa
WHERE id = 87;

-- ============================================
-- PASO 4: Diagnóstico del problema
-- ============================================

-- ¿La factura tiene ajustes?
SELECT 
  'Factura tiene ajustes:' AS diagnostico,
  COUNT(*) AS cantidad_ajustes,
  SUM(monto_ajuste) AS total_monto
FROM ajustes_facturas
WHERE id_factura = 87;

-- ¿Cuántos están aprobados?
SELECT 
  'Ajustes APROBADOS:' AS diagnostico,
  COUNT(*) AS cantidad,
  SUM(monto_ajuste) AS total_monto
FROM ajustes_facturas
WHERE id_factura = 87
  AND aprobado = true;

-- ¿Cuántos están pendientes (aprobados pero NO pagados)?
SELECT 
  'Ajustes PENDIENTES (Para liquidar):' AS diagnostico,
  COUNT(*) AS cantidad,
  SUM(monto_ajuste) AS total_monto
FROM ajustes_facturas
WHERE id_factura = 87
  AND aprobado = true
  AND pagado = false;

-- ¿Cuántos están calculados (NO aprobados)?
SELECT 
  'Ajustes CALCULADOS (Sin aprobar):' AS diagnostico,
  COUNT(*) AS cantidad,
  SUM(monto_ajuste) AS total_monto
FROM ajustes_facturas
WHERE id_factura = 87
  AND aprobado = false;

-- ¿Cuántos están liquidados (pagados)?
SELECT 
  'Ajustes LIQUIDADOS (Ya pagados):' AS diagnostico,
  COUNT(*) AS cantidad,
  SUM(monto_ajuste) AS total_monto
FROM ajustes_facturas
WHERE id_factura = 87
  AND pagado = true;

-- ============================================
-- PASO 5: Ver items de la factura
-- ============================================
SELECT 
  id,
  descripcion,
  cantidad,
  precio_unitario,
  subtotal_item,
  es_material,
  es_producto
FROM items_factura
WHERE id_factura = 87
ORDER BY id;

-- ============================================
-- PASO 6: Verificar presupuesto y tarea asociados
-- ============================================
SELECT 
  f.id AS factura_id,
  f.code AS factura_code,
  pf.id AS presupuesto_final_id,
  pf.code AS presupuesto_final_code,
  pf.aprobado AS presupuesto_aprobado,
  t.id AS tarea_id,
  t.titulo AS tarea_titulo,
  t.id_estado_nuevo AS tarea_estado_id,
  et.nombre AS tarea_estado_nombre
FROM facturas f
LEFT JOIN presupuestos_finales pf ON f.id_presupuesto_final = pf.id
LEFT JOIN tareas t ON pf.id_tarea = t.id
LEFT JOIN estados_tareas et ON t.id_estado_nuevo = et.id
WHERE f.id = 87;

-- ============================================
-- CONCLUSIÓN ESPERADA:
-- ============================================
/*
PROBLEMA POSIBLE:
- Si ajustes_pendientes = 0 → Los ajustes NO están aprobados
- Solución: Aprobar los ajustes desde la interfaz

FLUJO CORRECTO:
1. Factura pagada ✓
2. Generar ajustes (aprobado=false) → Aparece en "Calculados"
3. Aprobar ajustes (aprobado=true, pagado=false) → Aparece en "Para liquidar"
4. Liquidar ajustes (pagado=true) → Aparece en "Liquidados"

ACCIÓN REQUERIDA:
- Verificar en qué paso está la factura #87
- Aprobar los ajustes si están en estado "calculados"
*/
