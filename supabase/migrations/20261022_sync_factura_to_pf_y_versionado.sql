-- ==============================================================================
-- MIGRACION: Sincronizacion Facturas -> Presupuesto Final & Versionado JSONB
-- PROTOCOLO PLATINUM v3.0 / LEYES DE ELITE
-- ==============================================================================

-- 1. Agregar columna para versionado en presupuestos_finales sin tocar tablas madre ni vistas
ALTER TABLE public.presupuestos_finales 
ADD COLUMN IF NOT EXISTS historial_versiones JSONB DEFAULT '[]'::jsonb;

-- 2. Funcion de sincronizacion atomica desde facturas/items_factura hacia presupuestos_finales
CREATE OR REPLACE FUNCTION public.fn_sincronizar_factura_a_presupuesto_final()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_factura_id INTEGER;
  v_pf_id INTEGER;
  v_old_pf_id INTEGER;
  v_sum_materiales NUMERIC;
  v_sum_mano_obra NUMERIC;
  v_descuento NUMERIC;
BEGIN
  -- Evitar recursion si otro trigger de actualizacion esta activo
  IF pg_trigger_depth() > 1 THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Determinar id_presupuesto_final segun tabla y operacion
  IF TG_TABLE_NAME = 'items_factura' THEN
    IF TG_OP = 'DELETE' THEN
      v_factura_id := OLD.id_factura;
    ELSE
      v_factura_id := NEW.id_factura;
    END IF;

    SELECT id_presupuesto_final INTO v_pf_id
    FROM facturas
    WHERE id = v_factura_id;

  ELSIF TG_TABLE_NAME = 'facturas' THEN
    IF TG_OP = 'DELETE' THEN
      v_pf_id := OLD.id_presupuesto_final;
    ELSE
      v_pf_id := NEW.id_presupuesto_final;
      v_old_pf_id := OLD.id_presupuesto_final;
    END IF;
  END IF;

  -- Si no hay id_presupuesto_final asociado, no hay nada que sincronizar hacia PF
  IF v_pf_id IS NULL AND v_old_pf_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Sincronizar v_pf_id
  IF v_pf_id IS NOT NULL AND EXISTS (SELECT 1 FROM presupuestos_finales WHERE id = v_pf_id) THEN
    -- Sumar materiales y mano de obra de TODAS las facturas vinculadas a este PF
    SELECT
      COALESCE(SUM(CASE WHEN itf.es_material = true THEN itf.subtotal_item ELSE 0 END), 0),
      COALESCE(SUM(CASE WHEN itf.es_material = false THEN itf.subtotal_item ELSE 0 END), 0)
    INTO v_sum_materiales, v_sum_mano_obra
    FROM items_factura itf
    JOIN facturas f ON f.id = itf.id_factura
    WHERE f.id_presupuesto_final = v_pf_id;

    -- Solo sincronizar si existen items_factura
    IF v_sum_materiales > 0 OR v_sum_mano_obra > 0 THEN
      SELECT COALESCE(descuento_monto, 0) INTO v_descuento
      FROM presupuestos_finales
      WHERE id = v_pf_id;

      -- Actualizar presupuestos_finales (jamas se toca presupuestos_base)
      UPDATE presupuestos_finales
      SET
        materiales = v_sum_materiales,
        mano_obra = GREATEST(0, v_sum_mano_obra - v_descuento),
        total = (v_sum_materiales + v_sum_mano_obra) - v_descuento,
        updated_at = NOW()
      WHERE id = v_pf_id;

      -- Sincronizar renglones de la tabla items para total coherencia
      IF (SELECT COUNT(*) FROM items WHERE id_presupuesto = v_pf_id AND es_material = true) = 1 THEN
        UPDATE items
        SET precio = v_sum_materiales, cantidad = 1
        WHERE id_presupuesto = v_pf_id AND es_material = true;
      END IF;

      IF (SELECT COUNT(*) FROM items WHERE id_presupuesto = v_pf_id AND es_material = false) = 1 THEN
        UPDATE items
        SET precio = v_sum_mano_obra, cantidad = 1
        WHERE id_presupuesto = v_pf_id AND es_material = false;
      END IF;
    END IF;
  END IF;

  -- Si hubo cambio de id_presupuesto_final en una factura, recalcular tambien el anterior
  IF v_old_pf_id IS NOT NULL AND v_old_pf_id <> COALESCE(v_pf_id, -1) AND EXISTS (SELECT 1 FROM presupuestos_finales WHERE id = v_old_pf_id) THEN
    SELECT
      COALESCE(SUM(CASE WHEN itf.es_material = true THEN itf.subtotal_item ELSE 0 END), 0),
      COALESCE(SUM(CASE WHEN itf.es_material = false THEN itf.subtotal_item ELSE 0 END), 0)
    INTO v_sum_materiales, v_sum_mano_obra
    FROM items_factura itf
    JOIN facturas f ON f.id = itf.id_factura
    WHERE f.id_presupuesto_final = v_old_pf_id;

    SELECT COALESCE(descuento_monto, 0) INTO v_descuento
    FROM presupuestos_finales
    WHERE id = v_old_pf_id;

    UPDATE presupuestos_finales
    SET
      materiales = v_sum_materiales,
      mano_obra = GREATEST(0, v_sum_mano_obra - v_descuento),
      total = (v_sum_materiales + v_sum_mano_obra) - v_descuento,
      updated_at = NOW()
    WHERE id = v_old_pf_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- 3. Triggers en items_factura y facturas
DROP TRIGGER IF EXISTS trg_sync_items_factura_a_pf ON public.items_factura;
CREATE TRIGGER trg_sync_items_factura_a_pf
AFTER INSERT OR UPDATE OR DELETE ON public.items_factura
FOR EACH ROW
EXECUTE FUNCTION fn_sincronizar_factura_a_presupuesto_final();

DROP TRIGGER IF EXISTS trg_sync_factura_a_pf ON public.facturas;
CREATE TRIGGER trg_sync_factura_a_pf
AFTER UPDATE OF total, id_presupuesto_final OR DELETE ON public.facturas
FOR EACH ROW
EXECUTE FUNCTION fn_sincronizar_factura_a_presupuesto_final();

-- 4. Ejecucion retroactiva para corregir de inmediato cualquier desfasaje historico (incluyendo PF 62 y Factura 75)
DO $$
DECLARE
  r RECORD;
  v_mat NUMERIC;
  v_mo NUMERIC;
  v_desc NUMERIC;
BEGIN
  FOR r IN (
    SELECT DISTINCT id_presupuesto_final 
    FROM facturas 
    WHERE id_presupuesto_final IS NOT NULL
  ) LOOP
    SELECT
      COALESCE(SUM(CASE WHEN itf.es_material = true THEN itf.subtotal_item ELSE 0 END), 0),
      COALESCE(SUM(CASE WHEN itf.es_material = false THEN itf.subtotal_item ELSE 0 END), 0)
    INTO v_mat, v_mo
    FROM items_factura itf
    JOIN facturas f ON f.id = itf.id_factura
    WHERE f.id_presupuesto_final = r.id_presupuesto_final;

    IF v_mat > 0 OR v_mo > 0 THEN
      SELECT COALESCE(descuento_monto, 0) INTO v_desc
      FROM presupuestos_finales
      WHERE id = r.id_presupuesto_final;

      UPDATE presupuestos_finales
      SET
        materiales = v_mat,
        mano_obra = GREATEST(0, v_mo - v_desc),
        total = (v_mat + v_mo) - v_desc,
        updated_at = NOW()
      WHERE id = r.id_presupuesto_final;

      IF (SELECT COUNT(*) FROM items WHERE id_presupuesto = r.id_presupuesto_final AND es_material = true) = 1 THEN
        UPDATE items SET precio = v_mat, cantidad = 1
        WHERE id_presupuesto = r.id_presupuesto_final AND es_material = true;
      END IF;

      IF (SELECT COUNT(*) FROM items WHERE id_presupuesto = r.id_presupuesto_final AND es_material = false) = 1 THEN
        UPDATE items SET precio = v_mo, cantidad = 1
        WHERE id_presupuesto = r.id_presupuesto_final AND es_material = false;
      END IF;
    END IF;
  END LOOP;
END $$;
