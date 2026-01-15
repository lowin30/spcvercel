BEGIN;

CREATE OR REPLACE FUNCTION public.auto_finalizar_tareas_por_pf_enviado_sin_actividad()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_rows integer := 0;
  v_hist_exists boolean := false;
BEGIN
  IF NOT (public.check_user_role('admin') OR current_user = 'postgres') THEN
    RETURN 0;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'historial_estados'
  ) INTO v_hist_exists;

  IF v_hist_exists THEN
    WITH candidatos AS (
      SELECT v.id_presupuesto_final, v.id_tarea, v.fecha_envio
      FROM public.vista_admin_pf_enviado_sin_actividad v
      WHERE v.umbral = 'auto_cierre_30d'
    ),
    para_cerrar_base AS (
      SELECT c.id_presupuesto_final, c.id_tarea, c.fecha_envio
      FROM candidatos c
      JOIN public.tareas t ON t.id = c.id_tarea
      WHERE COALESCE(t.finalizada, false) = false
        AND NOT EXISTS (
          SELECT 1 FROM public.partes_de_trabajo pdt
          WHERE pdt.id_tarea = c.id_tarea
            AND (
              (pdt.fecha IS NOT NULL AND pdt.fecha >= date_trunc('day', c.fecha_envio)::date)
              OR (pdt.created_at IS NOT NULL AND pdt.created_at >= c.fecha_envio)
            )
        )
        AND NOT EXISTS (
          SELECT 1 FROM public.gastos_tarea gt
          WHERE gt.id_tarea = c.id_tarea
            AND gt.created_at >= c.fecha_envio
        )
    ),
    para_cerrar AS (
      SELECT id_tarea, MIN(fecha_envio) AS fecha_envio
      FROM para_cerrar_base
      GROUP BY id_tarea
    ),
    updated AS (
      UPDATE public.tareas t
      SET finalizada = true,
          id_estado_nuevo = COALESCE(
            (SELECT id FROM public.estados_tareas WHERE codigo = 'vencido' LIMIT 1),
            (SELECT id FROM public.estados_tareas WHERE codigo = 'enviado' LIMIT 1),
            t.id_estado_nuevo
          )
      FROM para_cerrar pc
      WHERE t.id = pc.id_tarea
        AND COALESCE(t.finalizada, false) = false
      RETURNING t.id AS id_tarea, pc.fecha_envio
    ),
    rechazar_pf AS (
      UPDATE public.presupuestos_finales pf
      SET id_estado = (SELECT id FROM public.estados_presupuestos WHERE codigo = 'rechazado' LIMIT 1)
      FROM updated u
      WHERE pf.id_tarea = u.id_tarea
        AND pf.id_estado IS DISTINCT FROM (SELECT id FROM public.estados_presupuestos WHERE codigo = 'rechazado' LIMIT 1)
      RETURNING pf.id, pf.code
    ),
    comments AS (
      INSERT INTO public.comentarios (contenido, id_tarea, id_usuario)
      SELECT
        'AUTO-FINALIZADA: 30 días desde PF enviado sin actividad (partes/gastos). Tarea cerrada automáticamente.' ||
        E'\n\nFecha de envío PF: ' || to_char(u.fecha_envio, 'YYYY-MM-DD'),
        u.id_tarea,
        NULL::uuid
      FROM updated u
      RETURNING 1
    ),
    hist AS (
      INSERT INTO public.historial_estados (tipo_entidad, id_entidad, estado_nuevo, estado_anterior, id_usuario, comentario, created_at)
      SELECT
        'tarea',
        u.id_tarea,
        'vencido',
        NULL,
        NULL::uuid,
        'Auto-finalizada por 30 días sin actividad desde envío de PF',
        NOW()
      FROM updated u
      RETURNING 1
    )
    SELECT COUNT(*) INTO v_rows FROM updated;
  ELSE
    WITH candidatos AS (
      SELECT v.id_presupuesto_final, v.id_tarea, v.fecha_envio
      FROM public.vista_admin_pf_enviado_sin_actividad v
      WHERE v.umbral = 'auto_cierre_30d'
    ),
    para_cerrar_base AS (
      SELECT c.id_presupuesto_final, c.id_tarea, c.fecha_envio
      FROM candidatos c
      JOIN public.tareas t ON t.id = c.id_tarea
      WHERE COALESCE(t.finalizada, false) = false
        AND NOT EXISTS (
          SELECT 1 FROM public.partes_de_trabajo pdt
          WHERE pdt.id_tarea = c.id_tarea
            AND (
              (pdt.fecha IS NOT NULL AND pdt.fecha >= date_trunc('day', c.fecha_envio)::date)
              OR (pdt.created_at IS NOT NULL AND pdt.created_at >= c.fecha_envio)
            )
        )
        AND NOT EXISTS (
          SELECT 1 FROM public.gastos_tarea gt
          WHERE gt.id_tarea = c.id_tarea
            AND gt.created_at >= c.fecha_envio
        )
    ),
    para_cerrar AS (
      SELECT id_tarea, MIN(fecha_envio) AS fecha_envio
      FROM para_cerrar_base
      GROUP BY id_tarea
    ),
    updated AS (
      UPDATE public.tareas t
      SET finalizada = true,
          id_estado_nuevo = COALESCE(
            (SELECT id FROM public.estados_tareas WHERE codigo = 'vencido' LIMIT 1),
            (SELECT id FROM public.estados_tareas WHERE codigo = 'enviado' LIMIT 1),
            t.id_estado_nuevo
          )
      FROM para_cerrar pc
      WHERE t.id = pc.id_tarea
        AND COALESCE(t.finalizada, false) = false
      RETURNING t.id AS id_tarea, pc.fecha_envio
    ),
    rechazar_pf AS (
      UPDATE public.presupuestos_finales pf
      SET id_estado = (SELECT id FROM public.estados_presupuestos WHERE codigo = 'rechazado' LIMIT 1)
      FROM updated u
      WHERE pf.id_tarea = u.id_tarea
        AND pf.id_estado IS DISTINCT FROM (SELECT id FROM public.estados_presupuestos WHERE codigo = 'rechazado' LIMIT 1)
      RETURNING pf.id, pf.code
    ),
    comments AS (
      INSERT INTO public.comentarios (contenido, id_tarea, id_usuario)
      SELECT
        'AUTO-FINALIZADA: 30 días desde PF enviado sin actividad (partes/gastos). Tarea cerrada automáticamente.' ||
        E'\n\nFecha de envío PF: ' || to_char(u.fecha_envio, 'YYYY-MM-DD'),
        u.id_tarea,
        NULL::uuid
      FROM updated u
      RETURNING 1
    )
    SELECT COUNT(*) INTO v_rows FROM updated;
  END IF;

  RETURN v_rows;
END;
$$;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname = 'auto-pf-finalizar-sin-actividad';
    PERFORM cron.schedule(
      'auto-pf-finalizar-sin-actividad',
      '15 3 * * *',
      'SELECT public.auto_finalizar_tareas_por_pf_enviado_sin_actividad();'
    );
  END IF;
END $$;

COMMIT;
