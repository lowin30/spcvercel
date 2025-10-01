-- =====================================================
-- SCRIPT: Actualizar vista_facturas_completa
-- OBJETIVO: Agregar campos saldo_pendiente y total_pagado
-- FECHA: 2025-10-01
-- =====================================================

-- PASO 1: Recrear la vista con los nuevos campos
-- =====================================================

DROP VIEW IF EXISTS vista_facturas_completa CASCADE;

CREATE OR REPLACE VIEW vista_facturas_completa AS
SELECT 
  -- Campos de la factura
  f.id,
  f.code,
  f.created_at,
  f.total,
  f.saldo_pendiente,     -- NUEVO: Saldo pendiente de pago
  f.total_pagado,        -- NUEVO: Total pagado hasta el momento
  f.pdf_url,
  f.datos_afip,
  f.enviada,
  f.fecha_envio,
  f.pagada,              -- Campo agregado anteriormente (indica si está pagada)
  f.fecha_pago,          -- Campo agregado anteriormente (fecha del pago)
  f.id_estado_nuevo,
  f.id_presupuesto,
  
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
LEFT JOIN presupuestos_finales pf ON f.id_presupuesto = pf.id
LEFT JOIN tareas t ON pf.id_tarea = t.id
LEFT JOIN edificios e ON pf.id_edificio = e.id;

-- PASO 2: Agregar comentarios para documentación
-- =====================================================

COMMENT ON VIEW vista_facturas_completa IS 'Vista completa de facturas con toda la información relacionada incluyendo saldo pendiente y total pagado';

-- PASO 3: Verificación
-- =====================================================

-- Verificar que la vista se creó correctamente
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'vista_facturas_completa'
ORDER BY ordinal_position;

-- Verificar que los nuevos campos están presentes
SELECT column_name
FROM information_schema.columns 
WHERE table_name = 'vista_facturas_completa'
  AND column_name IN ('saldo_pendiente', 'total_pagado');

-- Probar la vista con una consulta
SELECT 
  id,
  code,
  nombre_edificio,
  cuit_edificio,
  datos_afip,
  estado_nombre,
  total,
  saldo_pendiente,
  total_pagado
FROM vista_facturas_completa
LIMIT 5;

-- =====================================================
-- FIN DEL SCRIPT
-- =====================================================

-- RESULTADO ESPERADO:
-- ✅ Vista recreada con saldo_pendiente y total_pagado
-- ✅ Todos los campos anteriores preservados
-- ✅ Lista para usar en la aplicación
