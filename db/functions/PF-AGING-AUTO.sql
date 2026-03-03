-- PF-AGING-AUTO (V3 Platinium)
-- Lógica robusta de auto-finalización de tareas inactivas
BEGIN;

CREATE OR REPLACE FUNCTION public.auto_finalizar_tareas_por_pf_enviado_sin_actividad()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_rows integer := 0;
  v_system_user_id uuid := '00000000-0000-0000-0000-000000000000';
BEGIN
  -- 1. Seguridad: Solo admins o el propio sistema (postgres)
  IF NOT (public.check_user_role('admin') OR current_user = 'postgres') THEN
    RETURN 0;
  END IF;

  WITH candidatos AS (
    -- Obtenemos tareas con PF enviado hace >= 30 días
    SELECT v.id_presupuesto_final, v.id_tarea, v.fecha_envio
    FROM public.vista_admin_pf_enviado_sin_actividad v
    WHERE v.umbral = 'auto_cierre_30d'
  ),
  para_cerrar AS (
    SELECT c.id_tarea, c.fecha_envio
    FROM candidatos c
    JOIN public.tareas t ON t.id = c.id_tarea
    WHERE 
      -- A. Solo tareas NO finalizadas
      COALESCE(t.finalizada, false) = false
      -- B. REGLA ORO: Solo tareas en estado 'Enviado' (4). 
      -- Si están en 'Aprobado' o cualquier otro, NO se cierran.
      AND t.id_estado_nuevo = 4
      -- C. REGLA ROBUSTEZ: updated_at debe ser antiguo (mínimo 30 días)
      AND t.updated_at < (NOW() - INTERVAL '30 days')
      -- D. NO hay Partes de Trabajo nuevos
      AND NOT EXISTS (
        SELECT 1 FROM public.partes_de_trabajo pdt
        WHERE pdt.id_tarea = c.id_tarea
          AND (pdt.created_at >= c.fecha_envio OR pdt.updated_at >= c.fecha_envio)
      )
      -- E. NO hay Gastos nuevos
      AND NOT EXISTS (
        SELECT 1 FROM public.gastos_tarea gt
        WHERE gt.id_tarea = c.id_tarea
          AND gt.created_at >= c.fecha_envio
      )
      -- F. NUEVO: NO hay Comentarios de humanos nuevos
      AND NOT EXISTS (
        SELECT 1 FROM public.comentarios com
        WHERE com.id_tarea = c.id_tarea
          AND com.created_at >= c.fecha_envio
          AND com.id_usuario IS DISTINCT FROM v_system_user_id
      )
      -- G. NUEVO: NO hay Cambios de Estado manuales nuevos
      AND NOT EXISTS (
        SELECT 1 FROM public.historial_estados hist
        WHERE hist.tipo_entidad = 'tarea' 
          AND hist.id_entidad = c.id_tarea
          AND hist.created_at >= c.fecha_envio
          AND hist.id_usuario IS DISTINCT FROM v_system_user_id
      )
  ),
  consolidated AS (
    SELECT id_tarea, MIN(fecha_envio) AS fecha_envio
    FROM para_cerrar
    GROUP BY id_tarea
  ),
  updated AS (
    UPDATE public.tareas t
    SET finalizada = true,
        id_estado_nuevo = (SELECT id FROM public.estados_tareas WHERE codigo = 'vencido' LIMIT 1),
        updated_at = NOW()
    FROM consolidated pc
    WHERE t.id = pc.id_tarea
    RETURNING t.id AS id_tarea, pc.fecha_envio
  ),
  rechazar_pf AS (
    UPDATE public.presupuestos_finales pf
    SET id_estado = (SELECT id FROM public.estados_presupuestos WHERE codigo = 'rechazado' LIMIT 1)
    FROM updated u
    WHERE pf.id_tarea = u.id_tarea
    RETURNING pf.id
  ),
  ins_comments AS (
    INSERT INTO public.comentarios (contenido, id_tarea, id_usuario)
    SELECT
      'AUTO-FINALIZADA: 30 días desde PF enviado sin actividad humana detectada.' ||
      E'\n\nResumen: Sin comentarios, sin gastos y sin partes registros en el periodo de gracia.' ||
      E'\nFecha original envío PF: ' || to_char(u.fecha_envio, 'YYYY-MM-DD'),
      u.id_tarea,
      v_system_user_id
    FROM updated u
  ),
  ins_hist AS (
    INSERT INTO public.historial_estados (tipo_entidad, id_entidad, estado_nuevo, id_usuario, comentario, created_at)
    SELECT
      'tarea',
      u.id_tarea,
      'vencido',
      v_system_user_id,
      'Auto-finalización automatizada por inactividad prolongada (V3 Platinium)',
      NOW()
    FROM updated u
  )
  SELECT COUNT(*) INTO v_rows FROM updated;

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
