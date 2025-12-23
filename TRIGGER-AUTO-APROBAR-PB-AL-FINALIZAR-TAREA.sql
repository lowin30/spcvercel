-- TRIGGER-AUTO-APROBAR-PB-AL-FINALIZAR-TAREA.sql
-- Aprueba automáticamente el Presupuesto Base (PB) de una tarea cuando la tarea se marca como finalizada.
-- Cambios mínimos. Robusto y sin depender del frontend.

BEGIN;

CREATE OR REPLACE FUNCTION public.sync_tarea_finalizada_aprobar_presupuesto_base()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Solo actuar cuando cambia finalizada -> true
  IF NEW.finalizada = TRUE AND (OLD.finalizada IS DISTINCT FROM NEW.finalizada) THEN
    UPDATE public.presupuestos_base pb
    SET aprobado = TRUE,
        fecha_aprobacion = COALESCE(pb.fecha_aprobacion, NOW()),
        updated_at = NOW()
    WHERE pb.id_tarea = NEW.id
      AND COALESCE(pb.aprobado, FALSE) = FALSE;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_tarea_finalizada_aprobar_pb ON public.tareas;
CREATE TRIGGER trg_tarea_finalizada_aprobar_pb
AFTER UPDATE OF finalizada ON public.tareas
FOR EACH ROW
EXECUTE FUNCTION public.sync_tarea_finalizada_aprobar_presupuesto_base();

COMMIT;
