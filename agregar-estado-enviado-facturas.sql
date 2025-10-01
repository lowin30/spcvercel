-- ============================================================================
-- AGREGAR ESTADO "ENVIADO" A ESTADOS_FACTURAS
-- ============================================================================

-- Insertar estado "Enviado" (color indigo #6366f1)
INSERT INTO estados_facturas (nombre, color, codigo, descripcion, orden)
VALUES ('Enviado', '#6366f1', 'enviado', 'Factura enviada al cliente', 2)
ON CONFLICT (codigo) DO UPDATE 
SET 
  nombre = EXCLUDED.nombre,
  color = EXCLUDED.color,
  descripcion = EXCLUDED.descripcion,
  orden = EXCLUDED.orden;

-- Verificar que se creó correctamente
SELECT id, nombre, color, codigo, descripcion, orden
FROM estados_facturas
ORDER BY orden;
