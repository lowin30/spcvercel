BEGIN;

DROP VIEW IF EXISTS public.vista_finanzas_trabajador;

CREATE VIEW public.vista_finanzas_trabajador AS
SELECT
  tt.id_trabajador,

  -- Tareas asignadas
  (SELECT COUNT(DISTINCT t2.id)
   FROM public.trabajadores_tareas tt2
   JOIN public.tareas t2 ON t2.id = tt2.id_tarea
   WHERE tt2.id_trabajador = tt.id_trabajador) AS tareas_asignadas_total,

  -- Días trabajados del mes actual
  (SELECT COUNT(*)
   FROM public.partes_de_trabajo pdt
   WHERE pdt.id_trabajador = tt.id_trabajador
     AND pdt.fecha >= date_trunc('month', NOW())
     AND pdt.fecha <  date_trunc('month', NOW()) + interval '1 month') AS dias_registrados_mes,

  -- Jornales pendientes (monto)
  (SELECT COALESCE(SUM(
      CASE pdt.tipo_jornada 
        WHEN 'dia_completo' THEN ct.salario_diario 
        WHEN 'medio_dia' THEN ct.salario_diario * 0.5 
        ELSE 0 
      END
    ), 0)
   FROM public.partes_de_trabajo pdt
   JOIN public.configuracion_trabajadores ct ON ct.id_trabajador = pdt.id_trabajador
   WHERE pdt.id_trabajador = tt.id_trabajador
     AND pdt.liquidado IS DISTINCT FROM true) AS monto_jornales_pendientes,

  -- Gastos pendientes del trabajador (monto y cantidad)
  (SELECT COUNT(DISTINCT gt.id)
   FROM public.gastos_tarea gt
   WHERE gt.id_usuario = tt.id_trabajador
     AND gt.liquidado IS DISTINCT FROM true) AS cantidad_gastos_pendientes,

  (SELECT COALESCE(SUM(gt.monto), 0)
   FROM public.gastos_tarea gt
   WHERE gt.id_usuario = tt.id_trabajador
     AND gt.liquidado IS DISTINCT FROM true) AS monto_gastos_pendientes,

  -- Próximo pago estimado (jornales pendientes semana actual + gastos pendientes)
  (
    (SELECT COALESCE(SUM(
        CASE pdt.tipo_jornada 
          WHEN 'dia_completo' THEN ct.salario_diario 
          WHEN 'medio_dia' THEN ct.salario_diario * 0.5 
          ELSE 0 
        END
      ), 0)
     FROM public.partes_de_trabajo pdt
     JOIN public.configuracion_trabajadores ct ON ct.id_trabajador = pdt.id_trabajador
     WHERE pdt.id_trabajador = tt.id_trabajador
       AND pdt.liquidado IS DISTINCT FROM true
       AND pdt.fecha >= date_trunc('week', NOW()))
    +
    (SELECT COALESCE(SUM(gt.monto), 0)
     FROM public.gastos_tarea gt
     WHERE gt.id_usuario = tt.id_trabajador
       AND gt.liquidado IS DISTINCT FROM true)
  ) AS proximo_pago_estimado,

  -- KPIs semana actual (del trabajador autenticado)
  (SELECT COUNT(*)
   FROM public.partes_de_trabajo pdt
   WHERE pdt.id_trabajador = tt.id_trabajador
     AND pdt.liquidado IS DISTINCT FROM true
     AND pdt.fecha >= date_trunc('week', NOW())) AS dias_registrados_semana,

  (SELECT COALESCE(SUM(
      CASE pdt.tipo_jornada 
        WHEN 'dia_completo' THEN ct.salario_diario 
        WHEN 'medio_dia' THEN ct.salario_diario * 0.5 
        ELSE 0 
      END
    ), 0)
   FROM public.partes_de_trabajo pdt
   JOIN public.configuracion_trabajadores ct ON ct.id_trabajador = pdt.id_trabajador
   WHERE pdt.id_trabajador = tt.id_trabajador
     AND pdt.liquidado IS DISTINCT FROM true
     AND pdt.fecha >= date_trunc('week', NOW())) AS monto_jornales_pendientes_semana,

  (SELECT COALESCE(SUM(gt.monto), 0)
   FROM public.gastos_tarea gt
   WHERE gt.id_usuario = tt.id_trabajador
     AND gt.liquidado IS DISTINCT FROM true
     AND gt.created_at >= date_trunc('week', NOW())) AS monto_gastos_pendientes_semana

FROM (SELECT DISTINCT id_trabajador FROM public.trabajadores_tareas) tt
WHERE tt.id_trabajador = auth.uid();

COMMENT ON VIEW public.vista_finanzas_trabajador IS 'Métricas financieras personales para el trabajador autenticado (tt.id_trabajador = auth.uid()). security_invoker aplica RLS de tablas base.';

COMMIT;
