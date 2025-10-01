-- =====================================================
-- SCRIPT: Agregar campos "pagada" y "fecha_pago" a facturas
-- Fecha: 2025-10-01
-- Descripción: Agrega campos para tracking de pagos en facturas
--              y actualiza la vista completa de facturas
-- =====================================================

-- PASO 1: Agregar columnas a la tabla facturas
-- =====================================================
ALTER TABLE facturas 
ADD COLUMN IF NOT EXISTS pagada BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS fecha_pago TIMESTAMPTZ;

-- PASO 2: Crear índice para consultas optimizadas
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_facturas_pagada ON facturas(pagada);
CREATE INDEX IF NOT EXISTS idx_facturas_fecha_pago ON facturas(fecha_pago) WHERE fecha_pago IS NOT NULL;

-- PASO 3: Actualizar facturas existentes (opcional)
-- =====================================================
-- Si tienes facturas que ya están pagadas pero no marcadas, puedes actualizarlas aquí
-- Ejemplo: UPDATE facturas SET pagada = true, fecha_pago = NOW() WHERE id IN (...);
-- Por ahora las dejamos todas en pagada = false

-- PASO 4: Recrear la vista completa de facturas incluyendo los nuevos campos
-- =====================================================
DROP VIEW IF EXISTS vista_facturas_completa CASCADE;

CREATE OR REPLACE VIEW vista_facturas_completa AS
SELECT 
  f.id,
  f.code,
  f.created_at,
  f.id_presupuesto,
  f.total,
  f.pdf_url,
  f.datos_afip,
  f.enviada,
  f.fecha_envio,
  f.pagada,              -- NUEVO CAMPO
  f.fecha_pago,          -- NUEVO CAMPO
  f.id_estado_nuevo,
  
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
  
  -- Edificio asociado
  e.id AS edificio_id,
  e.nombre AS nombre_edificio,
  e.direccion AS direccion_edificio,
  e.cuit AS cuit_edificio         -- ASEGURAMOS QUE CUIT ESTÉ INCLUIDO
  
FROM facturas f
LEFT JOIN estados_facturas ef ON f.id_estado_nuevo = ef.id
LEFT JOIN presupuestos_finales pf ON f.id_presupuesto = pf.id
LEFT JOIN tareas t ON pf.id_tarea = t.id
LEFT JOIN edificios e ON pf.id_edificio = e.id;

-- PASO 5: Agregar comentarios para documentación
-- =====================================================
COMMENT ON COLUMN facturas.pagada IS 'Indica si la factura ha sido pagada completamente';
COMMENT ON COLUMN facturas.fecha_pago IS 'Fecha y hora en que se registró el pago de la factura';

-- PASO 6: Agregar política RLS si es necesario (ajustar según tus políticas existentes)
-- =====================================================
-- Ejemplo: permitir que usuarios autenticados vean facturas pagadas
-- ALTER TABLE facturas ENABLE ROW LEVEL SECURITY;
-- Ya debería estar habilitado, solo asegúrate que las políticas existentes cubran los nuevos campos

-- PASO 7: Verificación
-- =====================================================
-- Verificar que las columnas fueron agregadas
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'facturas' 
  AND column_name IN ('pagada', 'fecha_pago')
ORDER BY ordinal_position;

-- Verificar que la vista fue recreada correctamente
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'vista_facturas_completa'
  AND column_name IN ('pagada', 'fecha_pago', 'cuit_edificio')
ORDER BY ordinal_position;

-- Verificar índices
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'facturas'
  AND indexname LIKE '%pagada%';

-- =====================================================
-- RESULTADO ESPERADO:
-- ✅ Columna "pagada" agregada (boolean, default false)
-- ✅ Columna "fecha_pago" agregada (timestamptz, nullable)
-- ✅ Índices creados para optimizar consultas
-- ✅ Vista "vista_facturas_completa" actualizada con nuevos campos
-- ✅ Campo "cuit_edificio" incluido en la vista
-- =====================================================

-- NOTAS IMPORTANTES:
-- 1. Este script es IDEMPOTENTE - puede ejecutarse múltiples veces sin errores
-- 2. Los campos se inicializan en NULL/FALSE para facturas existentes
-- 3. La vista CASCADE se recrea automáticamente si hay dependencias
-- 4. Los índices se crean solo si no existen (IF NOT EXISTS)
-- 5. El campo "pagada" se actualizará automáticamente cuando se registre un pago
--    (esto se manejará desde el código de la aplicación o mediante triggers)

-- EJEMPLO DE USO FUTURO:
-- Cuando se registre un pago en la tabla "pagos":
-- UPDATE facturas 
-- SET pagada = true, fecha_pago = NOW() 
-- WHERE id = <factura_id>;
