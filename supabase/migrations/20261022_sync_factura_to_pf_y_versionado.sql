-- ==============================================================================
-- MIGRACION: Sincronizacion Facturas -> Presupuesto Final & Versionado JSONB
-- Trigger vive en la base de datos: funciona desde la app Y desde ediciones
-- manuales directas en Supabase Studio.
-- PROTOCOLO PLATINUM v3.0 / LEYES DE ELITE
-- ==============================================================================

-- 1. Columna de historial en tabla madre (sin crear tablas ni vistas nuevas)
ALTER TABLE public.presupuestos_finales
ADD COLUMN IF NOT EXISTS historial_versiones JSONB DEFAULT '[]'::jsonb;

-- 2. Funcion principal: sincroniza totales Y archiva version previa atomicamente
CREATE OR REPLACE FUNCTION public.fn_sincronizar_factura_a_presupuesto_final()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_factura_id     INTEGER;
  v_pf_id          INTEGER;
  v_old_pf_id      INTEGER;
  v_sum_materiales NUMERIC;
  v_sum_mano_obra  NUMERIC;
  v_descuento      NUMERIC;
  v_pf_actual      presupuestos_finales%ROWTYPE;
  v_items_actuales JSONB;
  v_versiones      JSONB;
  v_snapshot       JSONB;
BEGIN
  -- Blindaje anti-recursion
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
    SELECT id_presupuesto_final INTO v_pf_id FROM facturas WHERE id = v_factura_id;
  ELSIF TG_TABLE_NAME = 'facturas' THEN
    IF TG_OP = 'DELETE' THEN
      v_pf_id := OLD.id_presupuesto_final;
    ELSE
      v_pf_id     := NEW.id_presupuesto_final;
      v_old_pf_id := OLD.id_presupuesto_final;
    END IF;
  END IF;

  IF v_pf_id IS NULL AND v_old_pf_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- === BLOQUE PRINCIPAL: sincronizar v_pf_id ===
  IF v_pf_id IS NOT NULL AND EXISTS (SELECT 1 FROM presupuestos_finales WHERE id = v_pf_id) THEN

    -- 1. Calcular nuevos totales acumulados desde TODAS las facturas del PF
    SELECT
      COALESCE(SUM(CASE WHEN itf.es_material = true  THEN itf.subtotal_item ELSE 0 END), 0),
      COALESCE(SUM(CASE WHEN itf.es_material = false THEN itf.subtotal_item ELSE 0 END), 0)
    INTO v_sum_materiales, v_sum_mano_obra
    FROM items_factura itf
    JOIN facturas f ON f.id = itf.id_factura
    WHERE f.id_presupuesto_final = v_pf_id;

    IF v_sum_materiales > 0 OR v_sum_mano_obra > 0 THEN

      -- 2. Leer estado ACTUAL del PF antes de sobreescribir
      SELECT * INTO v_pf_actual FROM presupuestos_finales WHERE id = v_pf_id;
      v_descuento := COALESCE(v_pf_actual.descuento_monto, 0);

      -- 3. Solo archivar version si los totales realmente cambian
      IF v_pf_actual.materiales IS DISTINCT FROM v_sum_materiales
         OR v_pf_actual.mano_obra IS DISTINCT FROM GREATEST(0, v_sum_mano_obra - v_descuento) THEN

        -- 3a. Leer items actuales del PF para incluir en el snapshot
        SELECT COALESCE(
          jsonb_agg(jsonb_build_object(
            'descripcion', descripcion,
            'cantidad',    cantidad,
            'precio',      precio,
            'es_material', es_material
          ) ORDER BY id),
          '[]'::jsonb
        )
        INTO v_items_actuales
        FROM items
        WHERE id_presupuesto = v_pf_id;

        v_versiones := COALESCE(v_pf_actual.historial_versiones, '[]'::jsonb);

        -- 3b. Construir snapshot de la version que se va a perder
        v_snapshot := jsonb_build_object(
          'version',             jsonb_array_length(v_versiones) + 1,
          'fecha',               to_char(NOW() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
          'origen',              'factura',
          'materiales',          v_pf_actual.materiales,
          'mano_obra',           v_pf_actual.mano_obra,
          'total',               v_pf_actual.total,
          'descuento_monto',     v_descuento,
          'observaciones_admin', v_pf_actual.observaciones_admin,
          'items',               COALESCE(v_items_actuales, '[]'::jsonb)
        );

        -- 3c. Actualizar PF: nuevos totales + version archivada atomicamente
        UPDATE presupuestos_finales
        SET
          materiales          = v_sum_materiales,
          mano_obra           = GREATEST(0, v_sum_mano_obra - v_descuento),
          total               = (v_sum_materiales + v_sum_mano_obra) - v_descuento,
          historial_versiones = v_versiones || jsonb_build_array(v_snapshot),
          updated_at          = NOW()
        WHERE id = v_pf_id;

      ELSE
        -- Totales identicos: actualizar sin crear version redundante
        UPDATE presupuestos_finales
        SET
          materiales = v_sum_materiales,
          mano_obra  = GREATEST(0, v_sum_mano_obra - v_descuento),
          total      = (v_sum_materiales + v_sum_mano_obra) - v_descuento,
          updated_at = NOW()
        WHERE id = v_pf_id;
      END IF;

      -- 4. Sincronizar tabla items (coherencia visual en la UI del presupuesto)
      IF (SELECT COUNT(*) FROM items WHERE id_presupuesto = v_pf_id AND es_material = true) = 1 THEN
        UPDATE items SET precio = v_sum_materiales, cantidad = 1
        WHERE id_presupuesto = v_pf_id AND es_material = true;
      END IF;
      IF (SELECT COUNT(*) FROM items WHERE id_presupuesto = v_pf_id AND es_material = false) = 1 THEN
        UPDATE items SET precio = v_sum_mano_obra, cantidad = 1
        WHERE id_presupuesto = v_pf_id AND es_material = false;
      END IF;

    END IF;
  END IF;

  -- === BLOQUE SECUNDARIO: recalcular PF anterior si cambio el id_presupuesto_final ===
  IF v_old_pf_id IS NOT NULL
     AND v_old_pf_id <> COALESCE(v_pf_id, -1)
     AND EXISTS (SELECT 1 FROM presupuestos_finales WHERE id = v_old_pf_id) THEN

    SELECT
      COALESCE(SUM(CASE WHEN itf.es_material = true  THEN itf.subtotal_item ELSE 0 END), 0),
      COALESCE(SUM(CASE WHEN itf.es_material = false THEN itf.subtotal_item ELSE 0 END), 0)
    INTO v_sum_materiales, v_sum_mano_obra
    FROM items_factura itf
    JOIN facturas f ON f.id = itf.id_factura
    WHERE f.id_presupuesto_final = v_old_pf_id;

    SELECT COALESCE(descuento_monto, 0) INTO v_descuento
    FROM presupuestos_finales WHERE id = v_old_pf_id;

    UPDATE presupuestos_finales
    SET
      materiales = v_sum_materiales,
      mano_obra  = GREATEST(0, v_sum_mano_obra - v_descuento),
      total      = (v_sum_materiales + v_sum_mano_obra) - v_descuento,
      updated_at = NOW()
    WHERE id = v_old_pf_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- 3. Triggers (idempotentes: DROP IF EXISTS + CREATE)
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

-- 4. Correccion retroactiva de desfasajes historicos existentes
DO $$
DECLARE
  r     RECORD;
  v_mat NUMERIC;
  v_mo  NUMERIC;
  v_desc NUMERIC;
BEGIN
  FOR r IN (
    SELECT DISTINCT id_presupuesto_final
    FROM facturas
    WHERE id_presupuesto_final IS NOT NULL
  ) LOOP
    SELECT
      COALESCE(SUM(CASE WHEN itf.es_material = true  THEN itf.subtotal_item ELSE 0 END), 0),
      COALESCE(SUM(CASE WHEN itf.es_material = false THEN itf.subtotal_item ELSE 0 END), 0)
    INTO v_mat, v_mo
    FROM items_factura itf
    JOIN facturas f ON f.id = itf.id_factura
    WHERE f.id_presupuesto_final = r.id_presupuesto_final;

    IF v_mat > 0 OR v_mo > 0 THEN
      SELECT COALESCE(descuento_monto, 0) INTO v_desc
      FROM presupuestos_finales WHERE id = r.id_presupuesto_final;

      UPDATE presupuestos_finales
      SET
        materiales = v_mat,
        mano_obra  = GREATEST(0, v_mo - v_desc),
        total      = (v_mat + v_mo) - v_desc,
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
