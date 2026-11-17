-- migracion: eliminacion definitiva de objetos deprecados y limpieza de cron job huerfano
-- protocolo platinum: minusculas, cero impacto operativo, trazabilidad completa

-- 1. desprogramar cron job huerfano que refrescaba la antigua vista materializada
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule(jobid)
    FROM cron.job
    WHERE command ILIKE '%refresh_finanzas_supervisor%';
  END IF;
END $$;

-- 2. eliminacion definitiva de las vistas deprecadas
DROP MATERIALIZED VIEW IF EXISTS public.mv_finanzas_supervisor_deprecated CASCADE;
DROP VIEW IF EXISTS public.vista_asignaciones_tareas_supervisores_deprecated CASCADE;
DROP VIEW IF EXISTS public.vista_liquidaciones_items_deprecated CASCADE;
