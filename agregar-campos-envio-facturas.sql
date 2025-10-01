-- ============================================================================
-- AGREGAR CAMPOS PARA TRACKING DE ENVÍO EN FACTURAS
-- ============================================================================

-- Agregar campos para tracking de envío de facturas
ALTER TABLE facturas 
ADD COLUMN IF NOT EXISTS enviada BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS fecha_envio TIMESTAMPTZ;

-- Agregar comentarios para documentación
COMMENT ON COLUMN facturas.enviada IS 'Indica si la factura fue enviada al cliente';
COMMENT ON COLUMN facturas.fecha_envio IS 'Fecha y hora en que se envió la factura al cliente';

-- Crear índice para mejorar consultas
CREATE INDEX IF NOT EXISTS idx_facturas_enviada ON facturas(enviada);

-- Verificar cambios
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'facturas' 
AND column_name IN ('enviada', 'fecha_envio');
