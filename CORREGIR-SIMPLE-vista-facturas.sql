-- =====================================================
-- CORRECCIÓN SIMPLE: Solo cambiar el campo del JOIN
-- =====================================================
-- Usar id_presupuesto_final en lugar de id_presupuesto
-- =====================================================

DROP VIEW IF EXISTS vista_facturas_completa CASCADE;

CREATE OR REPLACE VIEW vista_facturas_completa AS
SELECT 
  -- Datos principales de la factura
  f.id,
  f.code,
  f.nombre,
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
  
  -- Usar id_presupuesto_final (el campo que SÍ tiene valor)
  f.id_presupuesto_final AS id_presupuesto,
  
  -- Cálculo del saldo pendiente y total pagado
  f.total - COALESCE(
    (SELECT SUM(p.monto_pagado) 
     FROM pagos_facturas p 
     WHERE p.id_factura = f.id), 
    0
  ) AS saldo_pendiente,
  
  COALESCE(
    (SELECT SUM(p.monto_pagado) 
     FROM pagos_facturas p 
     WHERE p.id_factura = f.id), 
    0
  ) AS total_pagado,
  
  -- Cálculo del total de ajustes aprobados
  COALESCE(
    (SELECT SUM(aj.monto_ajuste) 
     FROM ajustes_facturas aj 
     WHERE aj.id_factura = f.id 
     AND aj.aprobado = true), 
    0
  ) AS total_ajustes,
  
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
  
  -- Edificio asociado (cliente)
  e.id AS edificio_id,
  e.nombre AS nombre_edificio,
  e.direccion AS direccion_edificio,
  e.cuit AS cuit_edificio
  
FROM facturas f
LEFT JOIN estados_facturas ef ON f.id_estado_nuevo = ef.id
-- ⚠️ CORRECCIÓN: Usar id_presupuesto_final
LEFT JOIN presupuestos_finales pf ON f.id_presupuesto_final = pf.id
LEFT JOIN tareas t ON pf.id_tarea = t.id
LEFT JOIN edificios e ON pf.id_edificio = e.id;

-- Verificar la factura 65
SELECT 
  id,
  code,
  nombre_edificio,
  direccion_edificio,
  cuit_edificio,
  saldo_pendiente,
  total_pagado
FROM vista_facturas_completa
WHERE id = 65;
