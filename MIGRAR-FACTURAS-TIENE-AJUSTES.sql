-- =====================================================
-- QUICK FIX: Marcar facturas pagadas con tiene_ajustes = true
-- FECHA: 2025-10-16
-- PROPÓSITO: Solución temporal para que aparezca el botón de generar ajustes
-- =====================================================

-- ============================================
-- PASO 1: INVESTIGAR - Ver facturas afectadas
-- ============================================
SELECT 
  f.id,
  f.code,
  f.total,
  f.id_estado_nuevo,
  ef.nombre AS estado_nombre,
  f.tiene_ajustes,
  f.pagada,
  COUNT(aj.id) AS ajustes_existentes,
  COUNT(itf.id) AS total_items,
  COUNT(CASE WHEN itf.es_material = false THEN 1 END) AS items_mano_obra
FROM facturas f
LEFT JOIN estados_facturas ef ON f.id_estado_nuevo = ef.id
LEFT JOIN ajustes_facturas aj ON f.id = aj.id_factura
LEFT JOIN items_factura itf ON f.id = itf.id_factura
WHERE f.id_estado_nuevo = 5  -- Estado: Pagado
  AND f.tiene_ajustes = false  -- NO marcada como tiene_ajustes
GROUP BY f.id, f.code, f.total, f.id_estado_nuevo, ef.nombre, f.tiene_ajustes, f.pagada
ORDER BY f.id DESC;

-- ============================================
-- PASO 2: CONTAR - Cuántas se actualizarán
-- ============================================
SELECT 
  COUNT(*) AS facturas_a_actualizar
FROM facturas
WHERE id_estado_nuevo = 5  -- Pagado
  AND tiene_ajustes = false;

-- ============================================
-- PASO 3: EJECUTAR - Marcar facturas pagadas
-- ============================================

BEGIN;

UPDATE facturas
SET tiene_ajustes = true
WHERE id_estado_nuevo = 5  -- Pagado
  AND tiene_ajustes = false;

-- Ver cuántas se actualizaron
-- (Esta info aparecerá en el resultado del UPDATE)

COMMIT;

-- Si algo salió mal:
-- ROLLBACK;

-- ============================================
-- PASO 4: VERIFICAR - Revisar cambios
-- ============================================
SELECT 
  f.id,
  f.code,
  f.total,
  f.id_estado_nuevo,
  ef.nombre AS estado_nombre,
  f.tiene_ajustes,  -- Debería ser TRUE ahora
  COUNT(aj.id) AS ajustes_existentes
FROM facturas f
LEFT JOIN estados_facturas ef ON f.id_estado_nuevo = ef.id
LEFT JOIN ajustes_facturas aj ON f.id = aj.id_factura
WHERE f.id_estado_nuevo = 5  -- Pagado
GROUP BY f.id, f.code, f.total, f.id_estado_nuevo, ef.nombre, f.tiene_ajustes
ORDER BY f.id DESC
LIMIT 20;

-- ============================================
-- PASO 5: VERIFICAR FACTURA #84 ESPECÍFICAMENTE
-- ============================================
SELECT 
  id,
  code,
  total,
  id_estado_nuevo,
  tiene_ajustes,  -- Debería ser TRUE si está pagada
  pagada
FROM facturas
WHERE id = 84;

-- =====================================================
-- RESULTADO ESPERADO:
-- =====================================================
/*
ANTES:
- Facturas pagadas con tiene_ajustes = false
- NO aparecen en lista de ajustes
- NO se puede generar ajustes

DESPUÉS:
- Facturas pagadas con tiene_ajustes = true
- Aparecen en dashboard de ajustes
- Se puede click en "Calcular Ajustes"

NOTA: Esta es una solución temporal.
La solución definitiva es agregar el botón en la página de detalles
o modificar el filtro en ajustes-facturas-list.tsx
*/
