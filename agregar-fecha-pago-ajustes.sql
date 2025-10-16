-- =====================================================
-- SCRIPT: Agregar campo fecha_pago a ajustes_facturas
-- FECHA: 2025-10-16
-- DESCRIPCIÓN: Permite rastrear cuándo se liquidó cada ajuste
-- =====================================================

-- PASO 1: Agregar columna fecha_pago
-- =====================================================
ALTER TABLE ajustes_facturas 
ADD COLUMN IF NOT EXISTS fecha_pago TIMESTAMPTZ;

-- PASO 2: Crear índice para consultas optimizadas
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_ajustes_facturas_fecha_pago 
ON ajustes_facturas(fecha_pago) 
WHERE fecha_pago IS NOT NULL;

-- PASO 3: Agregar comentario para documentación
-- =====================================================
COMMENT ON COLUMN ajustes_facturas.fecha_pago 
IS 'Fecha y hora en que se liquidó el ajuste';

-- PASO 4: Actualizar ajustes ya pagados con fecha retroactiva (opcional)
-- =====================================================
-- Si quieres poner una fecha a los ajustes que ya están pagados:
-- UPDATE ajustes_facturas 
-- SET fecha_pago = NOW() 
-- WHERE pagado = true AND fecha_pago IS NULL;

-- PASO 5: Verificación
-- =====================================================
-- Verificar que la columna fue agregada
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'ajustes_facturas' 
  AND column_name = 'fecha_pago'
ORDER BY ordinal_position;

-- Verificar índice
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'ajustes_facturas'
  AND indexname = 'idx_ajustes_facturas_fecha_pago';

-- =====================================================
-- RESULTADO ESPERADO:
-- ✅ Columna "fecha_pago" agregada (timestamptz, nullable)
-- ✅ Índice creado para optimizar consultas por fecha
-- ✅ Lista para usar en la aplicación
-- =====================================================
