-- ==============================================================================
-- MIGRACION: Calculo Certero de Ajustes de Factura por Trigger Nativo
-- Resuelve condicion de carrera entre items_factura y total de facturas.
-- Aplica regla Platinum: cero decimales en montos (ROUND a enteros).
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.calcular_ajustes_factura()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
    v_id_factura INTEGER;
    v_id_administrador INTEGER;
    v_aplica_ajustes BOOLEAN;
    v_porcentaje NUMERIC;
    v_total_factura NUMERIC;
    v_suma_items_bruta NUMERIC;
    v_descuento_real NUMERIC := 0;
    v_suma_mo_bruta NUMERIC;
    v_base_ajuste_neta NUMERIC;
    v_factor_ajuste NUMERIC;
    v_id_pf INTEGER;
BEGIN
    -- Evitar recursion
    IF pg_trigger_depth() > 1 THEN
        RETURN COALESCE(NEW, OLD);
    END IF;

    -- Determinar qué factura procesar
    IF TG_TABLE_NAME = 'items_factura' THEN
        IF TG_OP = 'DELETE' THEN
            v_id_factura := OLD.id_factura;
        ELSE
            v_id_factura := NEW.id_factura;
        END IF;
    ELSE  -- 'facturas'
        IF TG_OP = 'DELETE' THEN
            v_id_factura := OLD.id;
        ELSE
            v_id_factura := NEW.id;
        END IF;
    END IF;

    IF v_id_factura IS NULL THEN
        RETURN COALESCE(NEW, OLD);
    END IF;
    
    -- Obtener información del administrador y de la factura
    SELECT f.id_administrador, f.id_presupuesto_final, a.aplica_ajustes, a.porcentaje_default, f.total
    INTO v_id_administrador, v_id_pf, v_aplica_ajustes, v_porcentaje, v_total_factura
    FROM facturas f
    JOIN administradores a ON f.id_administrador = a.id
    WHERE f.id = v_id_factura;
    
    -- Si el administrador aplica ajustes
    IF v_aplica_ajustes AND v_porcentaje > 0 THEN
        
        -- 1. Calcular sumas brutas de la factura desde items_factura
        SELECT 
            COALESCE(SUM(subtotal_item), 0),
            COALESCE(SUM(CASE WHEN es_material = false THEN subtotal_item ELSE 0 END), 0)
        INTO v_suma_items_bruta, v_suma_mo_bruta
        FROM items_factura
        WHERE id_factura = v_id_factura;

        -- 2. Determinar el descuento real de manera certera:
        -- Si viene de un presupuesto final, el descuento oficial es el guardado en presupuestos_finales.descuento_monto
        IF v_id_pf IS NOT NULL THEN
            SELECT COALESCE(descuento_monto, 0) INTO v_descuento_real
            FROM presupuestos_finales
            WHERE id = v_id_pf;
        ELSE
            -- Para facturas libres, si el total es menor a la suma de items, la diferencia es el descuento
            IF v_total_factura > 0 AND v_suma_items_bruta > v_total_factura THEN
                v_descuento_real := v_suma_items_bruta - v_total_factura;
            ELSE
                v_descuento_real := 0;
            END IF;
        END IF;
        
        -- 3. Calcular la base neta de MO (Suma MO - Descuento aplicable a MO)
        v_base_ajuste_neta := GREATEST(v_suma_mo_bruta - v_descuento_real, 0);

        -- 4. Calcular factor de ajuste para distribuir el descuento entre los items de MO
        IF v_suma_mo_bruta > 0 THEN
            v_factor_ajuste := v_base_ajuste_neta / v_suma_mo_bruta;
        ELSE
            v_factor_ajuste := 0;
        END IF;

        -- Eliminar ajustes anteriores para recalcular
        DELETE FROM ajustes_facturas WHERE id_factura = v_id_factura;
        
        -- Insertar nuevos ajustes usando la base neta (redondeado a enteros, regla platinum de cero decimales)
        IF v_base_ajuste_neta > 0 THEN
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
                ROUND(subtotal_item * v_factor_ajuste), -- Base neta por item redondeada
                v_porcentaje,
                ROUND((subtotal_item * v_factor_ajuste) * (v_porcentaje / 100.0)), -- Ajuste entero en pesos
                false,
                false,
                NOW(),
                descripcion
            FROM items_factura
            WHERE id_factura = v_id_factura AND es_material = false;
        END IF;
        
        -- Actualizar estado de la factura (sin disparar trigger recursivo)
        UPDATE facturas
        SET tiene_ajustes = (v_base_ajuste_neta > 0)
        WHERE id = v_id_factura
          AND tiene_ajustes IS DISTINCT FROM (v_base_ajuste_neta > 0);
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$function$;

-- Actualizar trigger en items_factura para cubrir INSERT, UPDATE y DELETE
DROP TRIGGER IF EXISTS trig_items_factura_ajustes ON public.items_factura;
CREATE TRIGGER trig_items_factura_ajustes
AFTER INSERT OR UPDATE OR DELETE ON public.items_factura
FOR EACH ROW
EXECUTE FUNCTION calcular_ajustes_factura();

-- Actualizar trigger en facturas para que recalcule ajustes cuando cambia total
DROP TRIGGER IF EXISTS trig_facturas_ajustes ON public.facturas;
CREATE TRIGGER trig_facturas_ajustes
AFTER UPDATE OF total, saldo_pendiente, total_pagado ON public.facturas
FOR EACH ROW
EXECUTE FUNCTION calcular_ajustes_factura();
