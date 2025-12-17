-- TRIGGER-ESTADOS-INTELIGENTES-TAREAS.sql
-- Objetivo:
-- 1) Cuando se CREA una factura (INSERT en facturas), la tarea vinculada pasa a estado 'Facturado' (id_estado_nuevo = 6)
-- 2) Cuando un Presupuesto Final se marca como 'Enviado' (id_estado = 4), la tarea vinculada pasa a estado 'Enviado' (id_estado_nuevo = 4)
--
-- Notas:
-- - Se asume que facturas.id_presupuesto_final apunta a presupuestos_finales.id
-- - presupuestos_finales.id_tarea apunta a tareas.id
-- - Estados normalizados de tareas según app: 4 = Enviado, 6 = Facturado
-- - SECURITY DEFINER para ejecutar aunque RLS limite UPDATE en tareas

BEGIN;

-- 1) Factura creada -> Tarea a Facturado (6)
CREATE OR REPLACE FUNCTION public.sync_factura_creada_set_tarea_facturado()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tarea_id integer;
  v_estado_facturado integer;
BEGIN
  IF NEW.id_presupuesto_final IS NOT NULL THEN
    SELECT id_tarea INTO v_tarea_id
    FROM presupuestos_finales
    WHERE id = NEW.id_presupuesto_final;

    IF v_tarea_id IS NOT NULL THEN
      -- Buscar el ID del estado de tareas con codigo 'facturado'
      SELECT id INTO v_estado_facturado
      FROM estados_tareas
      WHERE codigo = 'facturado'
      LIMIT 1;

      IF v_estado_facturado IS NOT NULL THEN
        UPDATE tareas
        SET id_estado_nuevo = v_estado_facturado
        WHERE id = v_tarea_id
          AND COALESCE(id_estado_nuevo, 0) <> v_estado_facturado;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_factura_creada_set_tarea_facturado ON public.facturas;
CREATE TRIGGER trg_factura_creada_set_tarea_facturado
AFTER INSERT ON public.facturas
FOR EACH ROW
EXECUTE FUNCTION public.sync_factura_creada_set_tarea_facturado();


-- 2) Presupuesto Final Enviado -> Tarea a Enviado (4)
CREATE OR REPLACE FUNCTION public.sync_presupuesto_final_enviado_set_tarea_enviado()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_estado_enviado integer;
BEGIN
  -- Solo actuar cuando cambia el estado
  IF (OLD.id_estado IS DISTINCT FROM NEW.id_estado) THEN
    -- Buscar el ID del estado de presupuestos con codigo 'enviado'
    SELECT id INTO v_estado_enviado
    FROM estados_presupuestos
    WHERE codigo = 'enviado'
    LIMIT 1;

    IF v_estado_enviado IS NOT NULL AND NEW.id_estado = v_estado_enviado THEN
      IF NEW.id_tarea IS NOT NULL THEN
        UPDATE tareas
        SET id_estado_nuevo = (
          SELECT id FROM estados_tareas WHERE codigo = 'enviado' LIMIT 1
        )
        WHERE id = NEW.id_tarea;
      ELSE
        -- Fallback si id_tarea no viene en NEW (por compatibilidad)
        UPDATE tareas t
        SET id_estado_nuevo = (
          SELECT id FROM estados_tareas WHERE codigo = 'enviado' LIMIT 1
        )
        FROM presupuestos_finales pf
        WHERE pf.id = NEW.id
          AND pf.id_tarea = t.id;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_pf_enviado_set_tarea_enviado ON public.presupuestos_finales;
CREATE TRIGGER trg_pf_enviado_set_tarea_enviado
AFTER UPDATE OF id_estado ON public.presupuestos_finales
FOR EACH ROW
EXECUTE FUNCTION public.sync_presupuesto_final_enviado_set_tarea_enviado();

-- 3) Presupuesto Final Facturado -> Tarea a Facturado
CREATE OR REPLACE FUNCTION public.sync_presupuesto_final_facturado_set_tarea_facturado()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_estado_facturado_pf integer;
  v_estado_facturado_tarea integer;
BEGIN
  -- Solo actuar cuando cambia el estado
  IF (OLD.id_estado IS DISTINCT FROM NEW.id_estado) THEN
    -- Buscar IDs de estados por codigo
    SELECT id INTO v_estado_facturado_pf FROM estados_presupuestos WHERE codigo = 'facturado' LIMIT 1;
    SELECT id INTO v_estado_facturado_tarea FROM estados_tareas WHERE codigo = 'facturado' LIMIT 1;

    IF v_estado_facturado_pf IS NOT NULL AND v_estado_facturado_tarea IS NOT NULL AND NEW.id_estado = v_estado_facturado_pf THEN
      IF NEW.id_tarea IS NOT NULL THEN
        UPDATE tareas
        SET id_estado_nuevo = v_estado_facturado_tarea
        WHERE id = NEW.id_tarea
          AND COALESCE(id_estado_nuevo, 0) <> v_estado_facturado_tarea;
      ELSE
        UPDATE tareas t
        SET id_estado_nuevo = v_estado_facturado_tarea
        FROM presupuestos_finales pf
        WHERE pf.id = NEW.id
          AND pf.id_tarea = t.id
          AND COALESCE(t.id_estado_nuevo, 0) <> v_estado_facturado_tarea;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_pf_facturado_set_tarea_facturado ON public.presupuestos_finales;
CREATE TRIGGER trg_pf_facturado_set_tarea_facturado
AFTER UPDATE OF id_estado ON public.presupuestos_finales
FOR EACH ROW
EXECUTE FUNCTION public.sync_presupuesto_final_facturado_set_tarea_facturado();

COMMIT;
