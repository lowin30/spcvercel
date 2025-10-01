-- =====================================================
-- CORRECCIÓN CRÍTICA: Vista de Facturas con Campo Correcto
-- =====================================================
-- PROBLEMA: La vista usaba f.id_presupuesto (que es NULL)
-- SOLUCIÓN: Debe usar f.id_presupuesto_final (que tiene el valor real)
-- =====================================================

-- PASO 1: Eliminar la vista anterior
DROP VIEW IF EXISTS vista_facturas_completa;

-- PASO 2: Recrear la vista con el campo CORRECTO
CREATE OR REPLACE VIEW vista_facturas_completa AS
SELECT 
  -- Datos principales de la factura
  f.id,
  f.code,
  f.created_at,
  f.total,
  f.pdf_url,
  f.datos_afip,
  f.enviada,
  f.fecha_envio,
  f.pagada,
  f.fecha_pago,
  f.id_estado_nuevo,
  f.id_administrador,
  
  -- ⚠️ CORRECCIÓN: Usar id_presupuesto_final en lugar de id_presupuesto
  f.id_presupuesto_final AS id_presupuesto,  -- Mantener nombre para compatibilidad
  
  -- Cálculo del saldo pendiente y total pagado
  f.total - COALESCE(
    (SELECT SUM(p.monto) 
     FROM pagos_facturas p 
     WHERE p.id_factura = f.id), 
    0
  ) AS saldo_pendiente,
  
  COALESCE(
    (SELECT SUM(p.monto) 
     FROM pagos_facturas p 
     WHERE p.id_factura = f.id), 
    0
  ) AS total_pagado,
  
  -- Estado de la factura
  ef.id AS estado_id,
  ef.nombre AS estado_nombre,
  ef.codigo AS estado_codigo,
  ef.color AS estado_color,
  
  -- Presupuesto final asociado
  pf.id AS presupuesto_final_id,
  pf.code AS presupuesto_final_code,
  pf.total AS presupuesto_final_total,
  pf.id_tarea AS id_tarea,
  pf.id_edificio AS id_edificio,
  
  -- Tarea asociada
  t.id AS tarea_id,
  t.titulo AS titulo_tarea,
  t.code AS code_tarea,
  t.descripcion AS descripcion_tarea,
  
  -- Edificio asociado (cliente) - ¡Ahora funcionará correctamente!
  e.id AS edificio_id,
  e.nombre AS nombre_edificio,
  e.direccion AS direccion_edificio,
  e.cuit AS cuit_edificio
  
FROM facturas f
LEFT JOIN estados_facturas ef ON f.id_estado_nuevo = ef.id
-- ⚠️ CORRECCIÓN: JOIN usando id_presupuesto_final en lugar de id_presupuesto
LEFT JOIN presupuestos_finales pf ON f.id_presupuesto_final = pf.id
LEFT JOIN tareas t ON pf.id_tarea = t.id
LEFT JOIN edificios e ON pf.id_edificio = e.id;

-- PASO 3: Agregar comentario actualizado
COMMENT ON VIEW vista_facturas_completa IS 
'Vista completa de facturas con información relacionada. 
CORRECCIÓN CRÍTICA: Usa id_presupuesto_final en lugar de id_presupuesto para el join.
Incluye saldo pendiente, total pagado, y datos del edificio/cliente asociado.';

-- PASO 4: Verificación de la corrección
-- Verificar que la factura 65 ahora tenga datos de edificio
SELECT 
  id,
  code,
  nombre_edificio,
  direccion_edificio,
  cuit_edificio,
  id_presupuesto,
  presupuesto_final_id,
  edificio_id
FROM vista_facturas_completa
WHERE id = 65;

-- Verificar todas las facturas con edificio
SELECT 
  id,
  code,
  nombre_edificio,
  COUNT(*) OVER() as total_con_edificio
FROM vista_facturas_completa
WHERE nombre_edificio IS NOT NULL
ORDER BY id DESC
LIMIT 10;

-- Verificar facturas SIN edificio (para identificar problemas restantes)
SELECT 
  id,
  code,
  id_presupuesto,
  presupuesto_final_id,
  nombre_edificio
FROM vista_facturas_completa
WHERE nombre_edificio IS NULL
ORDER BY id DESC;
