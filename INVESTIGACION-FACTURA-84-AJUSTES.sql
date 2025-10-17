-- =====================================================
-- INVESTIGACIÓN: Factura #84 - ¿Por qué no tiene ajustes?
-- =====================================================

-- ============================================
-- PASO 1: Ver datos completos de la factura #84
-- ============================================
SELECT 
  id,
  code,
  total,
  saldo_pendiente,
  total_pagado,
  id_estado_nuevo,
  pagada,
  fecha_pago,
  tiene_ajustes,
  ajustes_aprobados,
  id_presupuesto_final,
  id_administrador,
  created_at
FROM facturas
WHERE id = 84;

-- ============================================
-- PASO 2: Ver estado de la factura
-- ============================================
SELECT 
  f.id,
  f.code,
  f.total,
  f.total_pagado,
  f.saldo_pendiente,
  ef.id AS estado_id,
  ef.nombre AS estado_nombre,
  ef.codigo AS estado_codigo
FROM facturas f
LEFT JOIN estados_facturas ef ON f.id_estado_nuevo = ef.id
WHERE f.id = 84;

-- ============================================
-- PASO 3: Ver items de la factura #84
-- ============================================
SELECT 
  id,
  id_factura,
  descripcion,
  cantidad,
  precio_unitario,
  subtotal_item,
  es_material,
  es_producto
FROM items_factura
WHERE id_factura = 84
ORDER BY id;

-- ¿Cuántos items de mano de obra tiene?
SELECT 
  COUNT(*) AS total_items,
  COUNT(CASE WHEN es_material = false THEN 1 END) AS items_mano_obra,
  COUNT(CASE WHEN es_material = true THEN 1 END) AS items_materiales,
  SUM(subtotal_item) AS total_monto,
  SUM(CASE WHEN es_material = false THEN subtotal_item ELSE 0 END) AS total_mano_obra
FROM items_factura
WHERE id_factura = 84;

-- ============================================
-- PASO 4: Ver si tiene ajustes generados
-- ============================================
SELECT 
  id,
  id_factura,
  id_item,
  descripcion_item,
  monto_base,
  porcentaje_ajuste,
  monto_ajuste,
  aprobado,
  pagado,
  created_at
FROM ajustes_facturas
WHERE id_factura = 84;

-- Si no devuelve resultados, NO tiene ajustes generados

-- ============================================
-- PASO 5: Ver pagos de la factura #84
-- ============================================
SELECT 
  id,
  id_factura,
  monto_pagado,
  fecha_pago,
  modalidad_pago,
  created_at
FROM pagos_facturas
WHERE id_factura = 84
ORDER BY fecha_pago;

-- ============================================
-- PASO 6: Ver presupuesto y tarea asociados
-- ============================================
SELECT 
  f.id AS factura_id,
  f.code AS factura_code,
  pf.id AS presupuesto_final_id,
  pf.code AS presupuesto_final_code,
  pf.total AS presupuesto_total,
  t.id AS tarea_id,
  t.titulo AS tarea_titulo,
  e.id AS edificio_id,
  e.nombre AS edificio_nombre,
  a.id AS admin_id,
  a.nombre AS admin_nombre
FROM facturas f
LEFT JOIN presupuestos_finales pf ON f.id_presupuesto_final = pf.id
LEFT JOIN tareas t ON pf.id_tarea = t.id
LEFT JOIN edificios e ON pf.id_edificio = e.id
LEFT JOIN administradores a ON f.id_administrador = a.id
WHERE f.id = 84;

-- ============================================
-- PASO 7: Ver en la vista completa
-- ============================================
SELECT 
  id,
  code,
  nombre_edificio,
  total,
  total_pagado,
  saldo_pendiente,
  total_ajustes_calculados,
  total_ajustes_pendientes,
  total_ajustes_liquidados,
  total_ajustes_todos,
  estado_nombre,
  estado_codigo
FROM vista_facturas_completa
WHERE id = 84;

-- =====================================================
-- INVESTIGACIÓN GENERAL: ¿Cuántas facturas tienen ajustes?
-- =====================================================

-- Ver resumen de facturas con y sin ajustes
SELECT 
  ef.nombre AS estado_factura,
  COUNT(DISTINCT f.id) AS total_facturas,
  COUNT(DISTINCT CASE WHEN f.tiene_ajustes = true THEN f.id END) AS con_ajustes_flag,
  COUNT(DISTINCT CASE WHEN EXISTS (
    SELECT 1 FROM ajustes_facturas aj WHERE aj.id_factura = f.id
  ) THEN f.id END) AS con_ajustes_reales
FROM facturas f
LEFT JOIN estados_facturas ef ON f.id_estado_nuevo = ef.id
GROUP BY ef.nombre, ef.id
ORDER BY ef.id;

-- =====================================================
-- ANÁLISIS: Relación entre estado de pago y ajustes
-- =====================================================

-- ¿Solo las facturas totalmente pagadas tienen ajustes?
SELECT 
  ef.nombre AS estado_factura,
  f.id AS factura_id,
  f.code AS factura_code,
  f.total,
  f.total_pagado,
  f.saldo_pendiente,
  f.tiene_ajustes,
  COUNT(aj.id) AS cantidad_ajustes_reales
FROM facturas f
LEFT JOIN estados_facturas ef ON f.id_estado_nuevo = ef.id
LEFT JOIN ajustes_facturas aj ON f.id = aj.id_factura
GROUP BY f.id, f.code, f.total, f.total_pagado, f.saldo_pendiente, f.tiene_ajustes, ef.nombre
ORDER BY f.id DESC
LIMIT 20;

-- =====================================================
-- DIAGNÓSTICO: ¿Qué facturas DEBERÍAN tener ajustes?
-- =====================================================

-- Facturas pagadas totalmente SIN ajustes
SELECT 
  f.id,
  f.code,
  f.total,
  f.id_estado_nuevo,
  ef.nombre AS estado_nombre,
  f.tiene_ajustes,
  COUNT(aj.id) AS ajustes_existentes,
  COUNT(itf.id) AS total_items,
  COUNT(CASE WHEN itf.es_material = false THEN 1 END) AS items_mano_obra
FROM facturas f
LEFT JOIN estados_facturas ef ON f.id_estado_nuevo = ef.id
LEFT JOIN ajustes_facturas aj ON f.id = aj.id_factura
LEFT JOIN items_factura itf ON f.id = itf.id_factura
WHERE f.id_estado_nuevo = 5  -- Estado: Pagado
GROUP BY f.id, f.code, f.total, f.id_estado_nuevo, ef.nombre, f.tiene_ajustes
HAVING COUNT(aj.id) = 0  -- Sin ajustes
   AND COUNT(CASE WHEN itf.es_material = false THEN 1 END) > 0  -- Pero tiene mano de obra
ORDER BY f.id DESC;

-- =====================================================
-- CONCLUSIÓN ESPERADA:
-- =====================================================
/*
PREGUNTAS A RESPONDER:

1. ¿Factura #84 está pagada?
   - Si SÍ y tiene mano de obra → Debería tener opción de generar ajustes
   - Si NO → No debería tener ajustes aún (por diseño?)

2. ¿Factura #84 tiene items de mano de obra?
   - Si SÍ → Puede tener ajustes
   - Si NO (solo materiales) → No necesita ajustes

3. ¿Los ajustes solo se generan para facturas totalmente pagadas?
   - Verificar patrón en otras facturas
   - ¿Es una regla de negocio?

4. ¿El botón "Generar Ajustes" solo aparece si está pagada?
   - Verificar en el código del frontend
*/
