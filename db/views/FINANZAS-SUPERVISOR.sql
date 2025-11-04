BEGIN;

DROP VIEW IF EXISTS public.vista_finanzas_supervisor;

CREATE VIEW public.vista_finanzas_supervisor AS
SELECT
  st.id_supervisor,

  -- Tareas supervisadas
  (SELECT COUNT(DISTINCT t2.id)
   FROM public.supervisores_tareas st2
   JOIN public.tareas t2 ON t2.id = st2.id_tarea
   WHERE st2.id_supervisor = st.id_supervisor) AS tareas_supervisadas_total,

  -- Visitas de hoy
  (SELECT COUNT(*)
   FROM public.tareas t2
   JOIN public.supervisores_tareas st2 ON st2.id_tarea = t2.id
   WHERE st2.id_supervisor = st.id_supervisor
     AND t2.fecha_visita::date = CURRENT_DATE) AS visitas_hoy_total,

  -- Liquidaciones pendientes (con costos y sin LN)
  (SELECT COUNT(*)
   FROM public.tareas t2
   JOIN public.supervisores_tareas st2 ON st2.id_tarea = t2.id
   WHERE st2.id_supervisor = st.id_supervisor
     AND (
       EXISTS (SELECT 1 FROM public.gastos_tarea gt WHERE gt.id_tarea = t2.id)
       OR EXISTS (SELECT 1 FROM public.partes_de_trabajo pdt WHERE pdt.id_tarea = t2.id)
     )
     AND NOT EXISTS (
       SELECT 1 FROM public.liquidaciones_nuevas ln WHERE ln.id_tarea = t2.id
     )
  ) AS liquidaciones_pendientes,

  -- Liquidaciones del mes (propias)
  (SELECT COUNT(*)
   FROM public.liquidaciones_nuevas ln
   WHERE ln.id_usuario_supervisor = st.id_supervisor
     AND ln.created_at >= date_trunc('month', NOW())
  ) AS liquidaciones_mes,

  -- Ganancia del supervisor del mes
  (SELECT COALESCE(SUM(ln.ganancia_supervisor), 0)
   FROM public.liquidaciones_nuevas ln
   WHERE ln.id_usuario_supervisor = st.id_supervisor
     AND ln.created_at >= date_trunc('month', NOW())
  ) AS ganancia_supervisor_mes,

  -- Gastos sin comprobante
  (SELECT COUNT(*)
   FROM public.gastos_tarea gt
   JOIN public.supervisores_tareas st2 ON st2.id_tarea = gt.id_tarea
   WHERE st2.id_supervisor = st.id_supervisor
     AND gt.comprobante_url IS NULL) AS gastos_sin_comprobante_total,

  -- Costos actuales (no liquidados)
  (SELECT COALESCE(SUM(gt.monto), 0)
   FROM public.gastos_tarea gt
   JOIN public.supervisores_tareas st2 ON st2.id_tarea = gt.id_tarea
   WHERE st2.id_supervisor = st.id_supervisor
     AND gt.liquidado IS DISTINCT FROM true) AS gastos_no_liquidados,

  (SELECT COALESCE(SUM(
      CASE pdt.tipo_jornada 
        WHEN 'dia_completo' THEN ct.salario_diario 
        WHEN 'medio_dia' THEN ct.salario_diario * 0.5 
        ELSE 0 
      END
    ), 0)
   FROM public.partes_de_trabajo pdt
   JOIN public.configuracion_trabajadores ct ON ct.id_trabajador = pdt.id_trabajador
   JOIN public.supervisores_tareas st2 ON st2.id_tarea = pdt.id_tarea
   WHERE st2.id_supervisor = st.id_supervisor
     AND pdt.liquidado IS DISTINCT FROM true) AS jornales_no_liquidados,

  -- KPIs semana actual (gastos y jornales pendientes)
  (SELECT COALESCE(SUM(gt.monto), 0)
   FROM public.gastos_tarea gt
   JOIN public.supervisores_tareas st2 ON st2.id_tarea = gt.id_tarea
   WHERE st2.id_supervisor = st.id_supervisor
     AND gt.liquidado IS DISTINCT FROM true
     AND gt.created_at >= date_trunc('week', NOW())) AS gastos_no_liquidados_semana,

  (SELECT COUNT(*)
   FROM public.partes_de_trabajo pdt
   JOIN public.supervisores_tareas st2 ON st2.id_tarea = pdt.id_tarea
   WHERE st2.id_supervisor = st.id_supervisor
     AND pdt.liquidado IS DISTINCT FROM true
     AND pdt.fecha >= date_trunc('week', NOW())) AS jornales_pendientes_semana,

  (SELECT COALESCE(SUM(
      CASE pdt.tipo_jornada 
        WHEN 'dia_completo' THEN ct.salario_diario 
        WHEN 'medio_dia' THEN ct.salario_diario * 0.5 
        ELSE 0 
      END
    ), 0)
   FROM public.partes_de_trabajo pdt
   JOIN public.configuracion_trabajadores ct ON ct.id_trabajador = pdt.id_trabajador
   JOIN public.supervisores_tareas st2 ON st2.id_tarea = pdt.id_tarea
   WHERE st2.id_supervisor = st.id_supervisor
     AND pdt.liquidado IS DISTINCT FROM true
     AND pdt.fecha >= date_trunc('week', NOW())) AS monto_jornales_pendientes_semana,

  -- Jornales > 7 días (cantidad)
  (SELECT COUNT(*)
   FROM public.partes_de_trabajo pdt
   JOIN public.supervisores_tareas st2 ON st2.id_tarea = pdt.id_tarea
   WHERE st2.id_supervisor = st.id_supervisor
     AND pdt.liquidado IS DISTINCT FROM true
     AND pdt.fecha < (CURRENT_DATE - INTERVAL '7 days')
  ) AS jornales_pendientes_mayor_7d,

  -- Jornales > 7 días (monto)
  (SELECT COALESCE(SUM(
        CASE pdt.tipo_jornada 
          WHEN 'dia_completo' THEN ct.salario_diario 
          WHEN 'medio_dia' THEN ct.salario_diario * 0.5 
          ELSE 0 
        END
      ), 0)
   FROM public.partes_de_trabajo pdt
   JOIN public.supervisores_tareas st2 ON st2.id_tarea = pdt.id_tarea
   JOIN public.configuracion_trabajadores ct ON ct.id_trabajador = pdt.id_trabajador
   WHERE st2.id_supervisor = st.id_supervisor
     AND pdt.liquidado IS DISTINCT FROM true
     AND pdt.fecha < (CURRENT_DATE - INTERVAL '7 days')
  ) AS monto_jornales_pendientes_mayor_7d,

  -- Presupuestos base (cantidad y monto)
  (SELECT COUNT(*)
   FROM public.presupuestos_base pb
   JOIN public.tareas t2 ON t2.id = pb.id_tarea
   JOIN public.supervisores_tareas st2 ON st2.id_tarea = t2.id
   WHERE st2.id_supervisor = st.id_supervisor
  ) AS presupuestos_base_total,
  (SELECT COALESCE(SUM(pb.total), 0)
   FROM public.presupuestos_base pb
   JOIN public.tareas t2 ON t2.id = pb.id_tarea
   JOIN public.supervisores_tareas st2 ON st2.id_tarea = t2.id
   WHERE st2.id_supervisor = st.id_supervisor
  ) AS presupuestos_base_monto_total

FROM (SELECT DISTINCT id_supervisor FROM public.supervisores_tareas) st
WHERE st.id_supervisor = auth.uid();

COMMENT ON VIEW public.vista_finanzas_supervisor IS 'Métricas financieras por supervisor (agregado sobre tareas bajo st.id_supervisor = auth.uid()). security_invoker aplica RLS de tablas base.';

COMMIT;
