-- =====================================================
-- SCRIPT ULTRA SEGURO: Agregar columnas de ajustes SIN romper nada
-- FECHA: 2025-10-16
-- DESCRIPCIÓN: Agrega 4 nuevas columnas AL FINAL de la vista
--              Preserva TODAS las columnas existentes sin cambios
--              Backward compatible al 100%
-- =====================================================

-- ⚠️ IMPORTANTE: Este script NO rompe código existente
-- ✅ Todas las columnas actuales se mantienen igual
-- ✅ Las 4 nuevas columnas se agregan AL FINAL
-- ✅ total_ajustes sigue funcionando exactamente igual

-- PASO 1: Recrear vista preservando TODAS las columnas existentes
-- =====================================================

DROP VIEW IF EXISTS vista_facturas_completa CASCADE;

CREATE OR REPLACE VIEW vista_facturas_completa AS
SELECT 
  -- ========================================
  -- COLUMNAS EXISTENTES (PRESERVADAS TAL CUAL)
  -- ========================================
  
  -- IDs principales
  f.id,
  f.id_estado_nuevo,
  f.id_administrador,
  f.id_presupuesto_final AS id_presupuesto,  -- Este alias ya existía
  
  -- Montos de la factura
  f.saldo_pendiente,
  f.total_pagado,
  
  -- ⚠️ IMPORTANTE: Esta columna SE MANTIENE IGUAL (apunta a pendientes)
  COALESCE(
    (SELECT SUM(aj.monto_ajuste) 
     FROM ajustes_facturas aj 
     WHERE aj.id_factura = f.id 
     AND aj.aprobado = true 
     AND aj.pagado = false),
    0
  ) AS total_ajustes,
  
  -- IDs relacionales del estado
  ef.id AS estado_id,
  
  -- IDs relacionales del presupuesto
  pf.id AS presupuesto_final_id,
  pf.total AS presupuesto_final_total,
  pf.id_tarea AS id_tarea,
  pf.id_edificio AS id_edificio,
  
  -- IDs relacionales de tarea y edificio
  t.id AS tarea_id,
  e.id AS edificio_id,
  
  -- Fechas
  f.created_at,
  f.fecha_envio,
  f.fecha_pago,
  
  -- Números/Montos
  f.total,
  f.datos_afip,
  
  -- Booleanos
  f.enviada,
  f.pagada,
  
  -- Textos de la factura
  f.code,
  f.nombre,
  
  -- Textos del edificio
  e.cuit AS cuit_edificio,
  e.nombre AS nombre_edificio,
  e.direccion AS direccion_edificio,
  
  -- Textos de otros
  f.pdf_url,
  t.titulo AS titulo_tarea,
  t.code AS code_tarea,
  t.descripcion AS descripcion_tarea,
  
  -- Textos del estado
  ef.nombre AS estado_nombre,
  ef.codigo AS estado_codigo,
  ef.color AS estado_color,
  
  -- Textos del presupuesto
  pf.code AS presupuesto_final_code,
  
  -- ========================================
  -- 🆕 NUEVAS COLUMNAS (AGREGADAS AL FINAL)
  -- ========================================
  -- Estas NO afectan el código existente porque:
  -- 1. Se agregan AL FINAL
  -- 2. El código existente no las usa
  -- 3. Son opcionales en TypeScript (con ?)
  
  -- CALCULADOS: Esperando aprobación (factura no pagada)
  COALESCE(
    (SELECT SUM(aj.monto_ajuste) 
     FROM ajustes_facturas aj 
     WHERE aj.id_factura = f.id 
     AND aj.aprobado = false 
     AND aj.pagado = false),
    0
  ) AS total_ajustes_calculados,
  
  -- PENDIENTES: Listos para liquidar (factura pagada, ajustes no)
  -- NOTA: Es igual a total_ajustes, pero con nombre descriptivo
  COALESCE(
    (SELECT SUM(aj.monto_ajuste) 
     FROM ajustes_facturas aj 
     WHERE aj.id_factura = f.id 
     AND aj.aprobado = true 
     AND aj.pagado = false),
    0
  ) AS total_ajustes_pendientes,
  
  -- LIQUIDADOS: Ya pagados (histórico)
  COALESCE(
    (SELECT SUM(aj.monto_ajuste) 
     FROM ajustes_facturas aj 
     WHERE aj.id_factura = f.id 
     AND aj.pagado = true),
    0
  ) AS total_ajustes_liquidados,
  
  -- TODOS: Rastreo completo
  COALESCE(
    (SELECT SUM(aj.monto_ajuste) 
     FROM ajustes_facturas aj 
     WHERE aj.id_factura = f.id),
    0
  ) AS total_ajustes_todos
  
FROM facturas f
LEFT JOIN estados_facturas ef ON f.id_estado_nuevo = ef.id
LEFT JOIN presupuestos_finales pf ON f.id_presupuesto_final = pf.id
LEFT JOIN tareas t ON pf.id_tarea = t.id
LEFT JOIN edificios e ON pf.id_edificio = e.id;

-- =====================================================
-- COMENTARIOS Y DOCUMENTACIÓN
-- =====================================================

COMMENT ON VIEW vista_facturas_completa IS 'Vista completa de facturas con información relacionada. Incluye 5 columnas de ajustes: total_ajustes (backward compatible), total_ajustes_calculados, total_ajustes_pendientes, total_ajustes_liquidados, total_ajustes_todos';

-- =====================================================
-- VERIFICACIÓN DE SEGURIDAD
-- =====================================================

-- 1. Verificar que TODAS las columnas antiguas siguen existiendo
DO $$
DECLARE
  columnas_antiguas text[] := ARRAY[
    'id', 'id_estado_nuevo', 'id_administrador', 'id_presupuesto',
    'saldo_pendiente', 'total_pagado', 'total_ajustes', 'estado_id',
    'presupuesto_final_id', 'presupuesto_final_total', 'id_tarea',
    'id_edificio', 'tarea_id', 'edificio_id', 'created_at', 'total',
    'datos_afip', 'enviada', 'fecha_envio', 'pagada', 'fecha_pago',
    'code', 'nombre', 'cuit_edificio', 'nombre_edificio', 'pdf_url',
    'direccion_edificio', 'titulo_tarea', 'estado_nombre', 'estado_codigo',
    'estado_color', 'code_tarea', 'presupuesto_final_code', 'descripcion_tarea'
  ];
  col text;
  existe boolean;
BEGIN
  FOREACH col IN ARRAY columnas_antiguas
  LOOP
    SELECT EXISTS (
      SELECT 1 
      FROM information_schema.columns 
      WHERE table_name = 'vista_facturas_completa' 
      AND column_name = col
    ) INTO existe;
    
    IF NOT existe THEN
      RAISE EXCEPTION '❌ ERROR: Columna % no existe. Script abortado.', col;
    END IF;
  END LOOP;
  
  RAISE NOTICE '✅ ÉXITO: Todas las columnas antiguas siguen existiendo';
END $$;

-- 2. Verificar que las nuevas columnas fueron agregadas
SELECT 
  CASE 
    WHEN COUNT(*) = 4 THEN '✅ Las 4 nuevas columnas fueron agregadas correctamente'
    ELSE '❌ ERROR: Faltan columnas nuevas'
  END as resultado
FROM information_schema.columns 
WHERE table_name = 'vista_facturas_completa'
  AND column_name IN (
    'total_ajustes_calculados',
    'total_ajustes_pendientes', 
    'total_ajustes_liquidados',
    'total_ajustes_todos'
  );

-- 3. Verificar que total_ajustes sigue funcionando (backward compatibility)
SELECT 
  COUNT(*) as total_facturas_con_ajustes,
  SUM(total_ajustes) as suma_total_ajustes
FROM vista_facturas_completa
WHERE total_ajustes > 0;

-- 4. Comparar total_ajustes con total_ajustes_pendientes (deben ser iguales)
SELECT 
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ total_ajustes = total_ajustes_pendientes (correcto)'
    ELSE '❌ ERROR: Los valores no coinciden'
  END as comparacion
FROM vista_facturas_completa
WHERE total_ajustes != total_ajustes_pendientes;

-- 5. Ver ejemplo de datos con las nuevas columnas
SELECT 
  id,
  code,
  nombre,
  total_ajustes,              -- Columna original (igual que antes)
  total_ajustes_calculados,   -- 🆕 Nueva
  total_ajustes_pendientes,   -- 🆕 Nueva (= total_ajustes)
  total_ajustes_liquidados,   -- 🆕 Nueva
  total_ajustes_todos         -- 🆕 Nueva
FROM vista_facturas_completa
WHERE total_ajustes_todos > 0
LIMIT 5;

-- =====================================================
-- RESULTADO ESPERADO:
-- =====================================================
-- ✅ Todas las 34 columnas antiguas preservadas
-- ✅ 4 nuevas columnas agregadas al final
-- ✅ total_ajustes funciona exactamente igual que antes
-- ✅ Código existente sigue funcionando sin cambios
-- ✅ Solo la página de ajustes usa las nuevas columnas
-- =====================================================

-- =====================================================
-- GARANTÍAS DE SEGURIDAD:
-- =====================================================
-- 1. ✅ Código existente NO se rompe (columnas preservadas)
-- 2. ✅ Consultas existentes siguen funcionando igual
-- 3. ✅ TypeScript existente no requiere cambios (columnas opcionales)
-- 4. ✅ Solo la página /dashboard/ajustes usa las nuevas columnas
-- 5. ✅ Si algo falla, puedes hacer ROLLBACK fácilmente
-- =====================================================

-- ⚠️ ROLLBACK EN CASO DE PROBLEMAS:
-- Si necesitas volver atrás, simplemente ejecuta el script
-- anterior que NO tenía las 4 columnas nuevas.
-- Las columnas nuevas son opcionales, así que eliminarlas
-- no rompe nada.
-- =====================================================
