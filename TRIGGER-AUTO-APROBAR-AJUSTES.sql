-- =====================================================
-- TRIGGER: Auto-aprobar ajustes de facturas pagadas
-- FECHA: 2025-10-16
-- PROPÓSITO: Aprobar automáticamente ajustes cuando se insertan en facturas pagadas
-- =====================================================

-- ============================================
-- PASO 1: Crear la función del trigger
-- ============================================
CREATE OR REPLACE FUNCTION auto_aprobar_ajustes_factura_pagada()
RETURNS TRIGGER AS $$
DECLARE
  v_estado_factura INTEGER;
BEGIN
  -- Obtener el estado de la factura
  SELECT id_estado_nuevo INTO v_estado_factura
  FROM facturas 
  WHERE id = NEW.id_factura;
  
  -- Si la factura está pagada (id_estado_nuevo = 5), aprobar automáticamente
  IF v_estado_factura = 5 THEN
    NEW.aprobado := true;
    NEW.fecha_aprobacion := NOW();
    
    RAISE NOTICE 'Ajuste auto-aprobado para factura pagada % (Factura ID: %)', NEW.id, NEW.id_factura;
  ELSE
    RAISE NOTICE 'Ajuste % creado sin aprobación automática (Factura % no está pagada, estado: %)', 
                 NEW.id, NEW.id_factura, v_estado_factura;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- PASO 2: Crear el trigger
-- ============================================
DROP TRIGGER IF EXISTS trigger_auto_aprobar_ajustes ON ajustes_facturas;

CREATE TRIGGER trigger_auto_aprobar_ajustes
BEFORE INSERT ON ajustes_facturas
FOR EACH ROW
EXECUTE FUNCTION auto_aprobar_ajustes_factura_pagada();

-- ============================================
-- PASO 3: Agregar comentarios para documentación
-- ============================================
COMMENT ON FUNCTION auto_aprobar_ajustes_factura_pagada() IS 
'Función de trigger que aprueba automáticamente los ajustes cuando se insertan en facturas con estado pagado (id_estado_nuevo = 5). 
Evita el paso manual de aprobación para facturas ya pagadas.';

COMMENT ON TRIGGER trigger_auto_aprobar_ajustes ON ajustes_facturas IS 
'Trigger que ejecuta auto_aprobar_ajustes_factura_pagada() ANTES de insertar un nuevo ajuste. 
Si la factura asociada está pagada, el ajuste se crea ya aprobado.';

-- ============================================
-- VERIFICACIÓN
-- ============================================

-- Ver la función creada
SELECT 
  p.proname AS nombre_funcion,
  pg_get_functiondef(p.oid) AS definicion
FROM pg_proc p
WHERE p.proname = 'auto_aprobar_ajustes_factura_pagada';

-- Ver el trigger creado
SELECT 
  tgname AS nombre_trigger,
  tgrelid::regclass AS tabla,
  tgtype,
  tgenabled
FROM pg_trigger
WHERE tgname = 'trigger_auto_aprobar_ajustes';

-- =====================================================
-- PRUEBA DEL TRIGGER (OPCIONAL - NO EJECUTAR EN PRODUCCIÓN)
-- =====================================================
/*
-- Crear un ajuste de prueba para una factura pagada
-- NOTA: Reemplazar 87 con una factura pagada real

INSERT INTO ajustes_facturas (
  id_factura,
  id_item,
  descripcion_item,
  monto_base,
  porcentaje_ajuste,
  monto_ajuste,
  aprobado,  -- Intentamos insertar con false
  pagado
) VALUES (
  87,  -- ID de factura pagada
  999999,  -- ID ficticio
  'PRUEBA - Ajuste de prueba',
  1000,
  10,
  100,
  false,  -- Lo insertamos como NO aprobado
  false
);

-- Verificar que se aprobó automáticamente
SELECT 
  id,
  id_factura,
  descripcion_item,
  aprobado,  -- Debería ser TRUE
  fecha_aprobacion  -- Debería tener fecha
FROM ajustes_facturas
WHERE descripcion_item = 'PRUEBA - Ajuste de prueba';

-- Limpiar prueba
DELETE FROM ajustes_facturas 
WHERE descripcion_item = 'PRUEBA - Ajuste de prueba';
*/

-- =====================================================
-- RESULTADO ESPERADO:
-- =====================================================
/*
✅ Función creada: auto_aprobar_ajustes_factura_pagada()
✅ Trigger creado: trigger_auto_aprobar_ajustes
✅ Se ejecuta ANTES de cada INSERT en ajustes_facturas
✅ Si factura está pagada (id_estado_nuevo = 5):
   - aprobado se cambia a TRUE
   - fecha_aprobacion se establece a NOW()
✅ Si factura NO está pagada:
   - ajuste se inserta sin cambios (aprobado = false)
*/
