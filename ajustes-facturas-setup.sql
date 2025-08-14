-- 1. Eliminar la tabla obsoleta
DROP TABLE IF EXISTS config_ajustes_administradores;

-- 2. Añadir el campo es_material a items_factura si no existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'items_factura' AND column_name = 'es_material'
    ) THEN
        ALTER TABLE items_factura ADD COLUMN es_material BOOLEAN DEFAULT false;
    END IF;
END $$;

-- 3. Crear función para cálculo automático de ajustes
CREATE OR REPLACE FUNCTION calcular_ajustes_factura()
RETURNS TRIGGER AS $$
DECLARE
    v_id_factura INTEGER;
    v_id_administrador INTEGER;
    v_aplica_ajustes BOOLEAN;
    v_porcentaje NUMERIC;
    v_factura_pagada BOOLEAN;
BEGIN
    -- Determinar qué factura procesar
    IF TG_TABLE_NAME = 'items_factura' THEN
        v_id_factura := NEW.id_factura;
    ELSE  -- 'facturas'
        v_id_factura := NEW.id;
    END IF;
    
    -- Verificar si la factura está completamente pagada
    SELECT (saldo_pendiente <= 0) INTO v_factura_pagada
    FROM facturas
    WHERE id = v_id_factura;
    
    -- Solo procesar si está pagada
    IF v_factura_pagada THEN
        -- Obtener información del administrador
        SELECT f.id_administrador, a.aplica_ajustes, a.porcentaje_default
        INTO v_id_administrador, v_aplica_ajustes, v_porcentaje
        FROM facturas f
        JOIN administradores a ON f.id_administrador = a.id
        WHERE f.id = v_id_factura;
        
        -- Si el administrador aplica ajustes
        IF v_aplica_ajustes AND v_porcentaje > 0 THEN
            -- Eliminar ajustes anteriores para recalcular
            DELETE FROM ajustes_facturas WHERE id_factura = v_id_factura;
            
            -- Insertar nuevos ajustes solo para ítems que NO son materiales
            INSERT INTO ajustes_facturas (
                id_factura, 
                id_item, 
                monto_base, 
                porcentaje_ajuste, 
                monto_ajuste, 
                aprobado, 
                pagado,
                created_at,
                descripcion_item
            )
            SELECT
                id_factura,
                id,
                subtotal_item,
                v_porcentaje,
                subtotal_item * (v_porcentaje / 100.0),
                false, -- No aprobado por defecto
                false, -- No pagado por defecto
                NOW(),
                descripcion
            FROM items_factura
            WHERE id_factura = v_id_factura AND es_material = false;
            
            -- Actualizar estado de la factura
            UPDATE facturas
            SET tiene_ajustes = TRUE
            WHERE id = v_id_factura;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Crear triggers para aplicar la función
DROP TRIGGER IF EXISTS trig_items_factura_ajustes ON items_factura;
CREATE TRIGGER trig_items_factura_ajustes
AFTER INSERT OR UPDATE ON items_factura
FOR EACH ROW
EXECUTE FUNCTION calcular_ajustes_factura();

DROP TRIGGER IF EXISTS trig_facturas_ajustes ON facturas;
CREATE TRIGGER trig_facturas_ajustes
AFTER UPDATE OF saldo_pendiente, total_pagado ON facturas
FOR EACH ROW
WHEN (OLD.saldo_pendiente > 0 AND NEW.saldo_pendiente <= 0)
EXECUTE FUNCTION calcular_ajustes_factura();
