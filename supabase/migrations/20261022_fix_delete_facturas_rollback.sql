-- ==============================================================================
-- MIGRACION: Blindaje total de eliminacion de facturas en Presupuesto Final y Tareas
-- PROTOCOLO PLATINUM v3.0 / LEYES DE ELITE
-- ==============================================================================

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
  v_desc_monto     NUMERIC;
  v_facturas_restantes INTEGER;
  v_pf_actual      presupuestos_finales%ROWTYPE;
  v_items_actuales JSONB;
  v_versiones      JSONB;
  v_snapshot       JSONB;
  v_id_tarea       INTEGER;
  v_estado_presupuestado_id INTEGER;
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
      v_factura_id := OLD.id;
    ELSE
      v_pf_id     := NEW.id_presupuesto_final;
      v_old_pf_id := OLD.id_presupuesto_final;
      v_factura_id := NEW.id;
    END IF;
  END IF;

  IF v_pf_id IS NULL AND v_old_pf_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- === CASO 1: SINCRONIZAR v_pf_id ===
  IF v_pf_id IS NOT NULL AND EXISTS (SELECT 1 FROM presupuestos_finales WHERE id = v_pf_id) THEN

    -- Contar cuantas facturas existen AHORA para este PF (excluyendo la que se este borrando)
    IF TG_TABLE_NAME = 'facturas' AND TG_OP = 'DELETE' THEN
      SELECT COUNT(*) INTO v_facturas_restantes FROM facturas WHERE id_presupuesto_final = v_pf_id AND id <> v_factura_id;
    ELSE
      SELECT COUNT(*) INTO v_facturas_restantes FROM facturas WHERE id_presupuesto_final = v_pf_id;
    END IF;

    -- SUB-CASO A: YA NO QUEDAN FACTURAS (se borraron todas)
    IF v_facturas_restantes = 0 THEN
      -- Restaurar totales del presupuesto final directamente desde su tabla items (valores presupuestados originales)
      SELECT
        COALESCE(SUM(CASE WHEN es_material = true  THEN cantidad * precio ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN es_material = false THEN cantidad * precio ELSE 0 END), 0)
      INTO v_sum_materiales, v_sum_mano_obra
      FROM items
      WHERE id_presupuesto = v_pf_id;

      SELECT COALESCE(descuento_monto, 0), id_tarea 
      INTO v_desc_monto, v_id_tarea 
      FROM presupuestos_finales WHERE id = v_pf_id;

      -- Resetear presupuesto final a borrador y restaurar montos
      UPDATE presupuestos_finales
      SET
        materiales = v_sum_materiales,
        mano_obra  = GREATEST(0, v_sum_mano_obra - v_desc_monto),
        total      = (v_sum_materiales + v_sum_mano_obra) - v_desc_monto,
        id_estado  = 1, -- borrador
        aprobado   = false,
        enviado    = false,
        updated_at = NOW()
      WHERE id = v_pf_id;

      -- Resetear tarea asociada a estado 'presupuestado' (id: 3)
      IF v_id_tarea IS NOT NULL THEN
        SELECT id INTO v_estado_presupuestado_id FROM estados_tareas WHERE codigo = 'presupuestado' LIMIT 1;
        IF v_estado_presupuestado_id IS NOT NULL THEN
          UPDATE tareas
          SET id_estado_nuevo = v_estado_presupuestado_id,
              updated_at = NOW()
          WHERE id = v_id_tarea
            AND id_estado_nuevo NOT IN (7, 9, 11)
            AND COALESCE(finalizada, false) = false;
        END IF;
      END IF;

    -- SUB-CASO B: TODAVIA EXISTEN FACTURAS (sincronizar segun facturas activas)
    ELSE
      -- Calcular sumas de todas las facturas que quedan
      SELECT
        COALESCE(SUM(CASE WHEN itf.es_material = true  THEN itf.subtotal_item ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN itf.es_material = false THEN itf.subtotal_item ELSE 0 END), 0)
      INTO v_sum_materiales, v_sum_mano_obra
      FROM items_factura itf
      JOIN facturas f ON f.id = itf.id_factura
      WHERE f.id_presupuesto_final = v_pf_id
        AND (TG_TABLE_NAME <> 'facturas' OR TG_OP <> 'DELETE' OR f.id <> v_factura_id);

      SELECT * INTO v_pf_actual FROM presupuestos_finales WHERE id = v_pf_id;
      v_desc_monto := COALESCE(v_pf_actual.descuento_monto, 0);

      -- Si los valores cambian legítimamente Y NO es una operacion de borrado intermedio
      IF TG_OP <> 'DELETE' AND (
         v_pf_actual.materiales IS DISTINCT FROM v_sum_materiales
         OR v_pf_actual.mano_obra IS DISTINCT FROM GREATEST(0, v_sum_mano_obra - v_desc_monto)) THEN

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

        v_snapshot := jsonb_build_object(
          'version',             jsonb_array_length(v_versiones) + 1,
          'fecha',               to_char(NOW() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
          'origen',              'factura',
          'materiales',          v_pf_actual.materiales,
          'mano_obra',           v_pf_actual.mano_obra,
          'total',               v_pf_actual.total,
          'descuento_monto',     v_desc_monto,
          'observaciones_admin', v_pf_actual.observaciones_admin,
          'items',               COALESCE(v_items_actuales, '[]'::jsonb)
        );

        UPDATE presupuestos_finales
        SET
          materiales          = v_sum_materiales,
          mano_obra           = GREATEST(0, v_sum_mano_obra - v_desc_monto),
          total               = (v_sum_materiales + v_sum_mano_obra) - v_desc_monto,
          historial_versiones = v_versiones || jsonb_build_array(v_snapshot),
          updated_at          = NOW()
        WHERE id = v_pf_id;

      ELSE
        -- Actualizacion directa de totales sin ensuciar historial con estados transitorios
        UPDATE presupuestos_finales
        SET
          materiales = CASE WHEN v_sum_materiales > 0 THEN v_sum_materiales ELSE materiales END,
          mano_obra  = CASE WHEN v_sum_mano_obra > 0 THEN GREATEST(0, v_sum_mano_obra - v_desc_monto) ELSE mano_obra END,
          total      = (CASE WHEN v_sum_materiales > 0 THEN v_sum_materiales ELSE materiales END +
                        CASE WHEN v_sum_mano_obra > 0 THEN GREATEST(0, v_sum_mano_obra - v_desc_monto) ELSE mano_obra END) - v_desc_monto,
          updated_at = NOW()
        WHERE id = v_pf_id;
      END IF;

      -- REGLA DE ORO DE ITEMS: NUNCA pisar con 0 un item si una factura es eliminada o si no hay factura de ese tipo
      IF v_sum_materiales > 0 AND (SELECT COUNT(*) FROM items WHERE id_presupuesto = v_pf_id AND es_material = true) = 1 THEN
        UPDATE items SET precio = v_sum_materiales, cantidad = 1
        WHERE id_presupuesto = v_pf_id AND es_material = true;
      END IF;

      IF v_sum_mano_obra > 0 AND (SELECT COUNT(*) FROM items WHERE id_presupuesto = v_pf_id AND es_material = false) = 1 THEN
        UPDATE items SET precio = v_sum_mano_obra, cantidad = 1
        WHERE id_presupuesto = v_pf_id AND es_material = false;
      END IF;

    END IF;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$function$;
