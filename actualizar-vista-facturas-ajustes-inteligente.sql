-- =====================================================
-- SCRIPT: Actualizar vista_facturas_completa con 4 columnas de ajustes
-- FECHA: 2025-10-16
-- DESCRIPCIÓN: Agregar rastreo completo de ajustes (calculados, pendientes, liquidados, todos)
-- =====================================================

DROP VIEW IF EXISTS vista_facturas_completa CASCADE;

CREATE OR REPLACE VIEW vista_facturas_completa AS
SELECT 
  -- ========================================
  -- DATOS PRINCIPALES DE LA FACTURA
  -- ========================================
  f.id,
  f.code,
  f.nombre,
  f.created_at,
  f.total,
  f.saldo_pendiente,
  f.total_pagado,
  f.pdf_url,
  f.datos_afip,
  f.enviada,
  f.fecha_envio,
  f.pagada,
  f.fecha_pago,
  f.id_estado_nuevo,
  f.id_administrador,
  
  -- Usar id_presupuesto_final (el campo correcto)
  f.id_presupuesto_final AS id_presupuesto,
  
  -- ========================================
  -- 🆕 COLUMNAS DE AJUSTES (4 COLUMNAS)
  -- ========================================
  
  -- 1️⃣ CALCULADOS: ajustes NO aprobados (esperando pago de factura)
  COALESCE(
    (SELECT SUM(aj.monto_ajuste) 
     FROM ajustes_facturas aj 
     WHERE aj.id_factura = f.id 
     AND aj.aprobado = false 
     AND aj.pagado = false),
    0
  ) AS total_ajustes_calculados,
  
  -- 2️⃣ PENDIENTES LIQUIDACIÓN: aprobados pero NO liquidados ⭐ FOCO PRINCIPAL
  COALESCE(
    (SELECT SUM(aj.monto_ajuste) 
     FROM ajustes_facturas aj 
     WHERE aj.id_factura = f.id 
     AND aj.aprobado = true 
     AND aj.pagado = false),
    0
  ) AS total_ajustes_pendientes,
  
  -- 3️⃣ LIQUIDADOS: ajustes ya pagados (histórico)
  COALESCE(
    (SELECT SUM(aj.monto_ajuste) 
     FROM ajustes_facturas aj 
     WHERE aj.id_factura = f.id 
     AND aj.pagado = true),
    0
  ) AS total_ajustes_liquidados,
  
  -- 4️⃣ TODOS: total de todos los ajustes (para rastreo completo)
  COALESCE(
    (SELECT SUM(aj.monto_ajuste) 
     FROM ajustes_facturas aj 
     WHERE aj.id_factura = f.id),
    0
  ) AS total_ajustes_todos,
  
  -- ⚠️ BACKWARD COMPATIBILITY: Mantener total_ajustes para código existente
  -- Apunta a pendientes de liquidación (el foco principal)
  COALESCE(
    (SELECT SUM(aj.monto_ajuste) 
     FROM ajustes_facturas aj 
     WHERE aj.id_factura = f.id 
     AND aj.aprobado = true 
     AND aj.pagado = false),
    0
  ) AS total_ajustes,
  
  -- ========================================
  -- ESTADO DE LA FACTURA
  -- ========================================
  ef.id AS estado_id,
  ef.nombre AS estado_nombre,
  ef.codigo AS estado_codigo,
  ef.color AS estado_color,
  
  -- ========================================
  -- PRESUPUESTO FINAL ASOCIADO
  -- ========================================
  pf.id AS presupuesto_final_id,
  pf.code AS presupuesto_final_code,
  pf.total AS presupuesto_final_total,
  pf.id_tarea AS id_tarea,
  pf.id_edificio AS id_edificio,
  
  -- ========================================
  -- TAREA ASOCIADA
  -- ========================================
  t.id AS tarea_id,
  t.titulo AS titulo_tarea,
  t.code AS code_tarea,
  t.descripcion AS descripcion_tarea,
  
  -- ========================================
  -- EDIFICIO ASOCIADO (CLIENTE)
  -- ========================================
  e.id AS edificio_id,
  e.nombre AS nombre_edificio,
  e.direccion AS direccion_edificio,
  e.cuit AS cuit_edificio
  
FROM facturas f
LEFT JOIN estados_facturas ef ON f.id_estado_nuevo = ef.id
LEFT JOIN presupuestos_finales pf ON f.id_presupuesto_final = pf.id
LEFT JOIN tareas t ON pf.id_tarea = t.id
LEFT JOIN edificios e ON pf.id_edificio = e.id;

-- =====================================================
-- COMENTARIOS Y DOCUMENTACIÓN
-- =====================================================

COMMENT ON VIEW vista_facturas_completa IS 'Vista completa de facturas con rastreo inteligente de ajustes en 4 estados: calculados, pendientes liquidación, liquidados y todos';

-- =====================================================
-- VERIFICACIÓN
-- =====================================================

-- Verificar columnas de ajustes
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'vista_facturas_completa'
  AND column_name LIKE '%ajustes%'
ORDER BY ordinal_position;

-- Probar la vista con datos reales
SELECT 
  id,
  code,
  nombre_edificio,
  total,
  total_ajustes_calculados,
  total_ajustes_pendientes,
  total_ajustes_liquidados,
  total_ajustes_todos,
  total_ajustes  -- Alias para backward compatibility
FROM vista_facturas_completa
WHERE total_ajustes_todos > 0
LIMIT 10;

-- =====================================================
-- RESULTADO ESPERADO:
-- ✅ 4 nuevas columnas de ajustes
-- ✅ total_ajustes_calculados (esperando aprobación)
-- ✅ total_ajustes_pendientes (listos para liquidar) ⭐
-- ✅ total_ajustes_liquidados (histórico)
-- ✅ total_ajustes_todos (rastreo completo)
-- ✅ total_ajustes (alias → pendientes, backward compatible)
-- =====================================================
