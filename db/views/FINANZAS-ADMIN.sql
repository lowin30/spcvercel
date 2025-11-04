BEGIN;

DROP VIEW IF EXISTS public.vista_finanzas_admin;

CREATE VIEW public.vista_finanzas_admin AS
SELECT
  -- Presupuestos finales
  (SELECT COUNT(DISTINCT pf.id) FROM public.presupuestos_finales pf) AS presupuestos_finales_total,
  (SELECT COALESCE(SUM(pf.total), 0) FROM public.presupuestos_finales pf) AS presupuestos_monto_total,

  -- Facturas (pendientes y cobradas del mes)
  (SELECT COUNT(*) FROM public.facturas f WHERE f.pagada = false) AS facturas_pendientes,
  (SELECT COUNT(*) FROM public.facturas f WHERE f.pagada = true AND f.fecha_pago >= date_trunc('month', NOW())) AS facturas_pagadas_mes,
  (SELECT COALESCE(SUM(f.total), 0) FROM public.facturas f WHERE f.pagada = true AND f.fecha_pago >= date_trunc('month', NOW())) AS monto_cobrado_mes,

  -- Ajustes pendientes de pago
  (SELECT COALESCE(SUM(aj.monto_ajuste), 0) FROM public.ajustes_facturas aj WHERE aj.aprobado = true AND aj.pagado = false) AS ajustes_pendientes_total,
  (SELECT COUNT(DISTINCT aj.id_factura) FROM public.ajustes_facturas aj WHERE aj.aprobado = true AND aj.pagado = false) AS facturas_con_ajustes_pendientes,

  -- Liquidaciones (mes actual)
  (SELECT COUNT(*) FROM public.vista_liquidaciones_completa vl WHERE vl.created_at >= date_trunc('month', NOW())) AS liquidaciones_mes,
  (SELECT COALESCE(SUM(vl.ganancia_neta), 0) FROM public.vista_liquidaciones_completa vl WHERE vl.created_at >= date_trunc('month', NOW())) AS ganancia_neta_mes,
  (SELECT COALESCE(SUM(vl.ganancia_admin), 0) FROM public.vista_liquidaciones_completa vl WHERE vl.created_at >= date_trunc('month', NOW())) AS ganancia_admin_mes,

  -- Costos no liquidados (gastos + jornales)
  (SELECT COALESCE(SUM(gt.monto), 0) FROM public.gastos_tarea gt WHERE gt.liquidado IS DISTINCT FROM true) AS gastos_no_liquidados,
  (SELECT COUNT(*) FROM public.partes_de_trabajo pdt WHERE pdt.liquidado IS DISTINCT FROM true) AS jornales_pendientes,
  (SELECT COALESCE(SUM(
    CASE pdt.tipo_jornada 
      WHEN 'dia_completo' THEN ct.salario_diario 
      WHEN 'medio_dia' THEN ct.salario_diario * 0.5 
      ELSE 0 
    END
  ), 0)
   FROM public.partes_de_trabajo pdt
   JOIN public.configuracion_trabajadores ct ON ct.id_trabajador = pdt.id_trabajador
   WHERE pdt.liquidado IS DISTINCT FROM true) AS monto_jornales_pendientes,

  -- KPIs semana actual (gastos y jornales pendientes)
  (SELECT COALESCE(SUM(gt.monto), 0)
     FROM public.gastos_tarea gt
     WHERE gt.liquidado IS DISTINCT FROM true
       AND gt.created_at >= date_trunc('week', NOW())
  ) AS gastos_no_liquidados_semana,
  (SELECT COUNT(*)
     FROM public.partes_de_trabajo pdt
     WHERE pdt.liquidado IS DISTINCT FROM true
       AND pdt.fecha >= date_trunc('week', NOW())
  ) AS jornales_pendientes_semana,
  (SELECT COALESCE(SUM(
        CASE pdt.tipo_jornada 
          WHEN 'dia_completo' THEN ct.salario_diario 
          WHEN 'medio_dia' THEN ct.salario_diario * 0.5 
          ELSE 0 
        END
      ), 0)
     FROM public.partes_de_trabajo pdt
     JOIN public.configuracion_trabajadores ct ON ct.id_trabajador = pdt.id_trabajador
     WHERE pdt.liquidado IS DISTINCT FROM true
       AND pdt.fecha >= date_trunc('week', NOW())
  ) AS monto_jornales_pendientes_semana,

  -- Liquidaciones pendientes (presupuesto aprobado + tiene gastos/jornales + sin liquidación)
  (SELECT COUNT(*)
     FROM public.tareas t
     JOIN public.presupuestos_finales pf ON pf.id_tarea = t.id AND pf.aprobado = true
     WHERE (
       EXISTS (SELECT 1 FROM public.gastos_tarea gt WHERE gt.id_tarea = t.id)
       OR EXISTS (
         SELECT 1
         FROM public.partes_de_trabajo pdt
         WHERE pdt.id_tarea = t.id
       )
     )
     AND NOT EXISTS (
       SELECT 1
       FROM public.liquidaciones_nuevas ln
       WHERE ln.id_tarea = t.id
     )
  ) AS liquidaciones_pendientes,

  -- Facturas por cobrar (total)
  (SELECT COALESCE(SUM(f.total), 0)
     FROM public.facturas f
     WHERE f.pagada = false
  ) AS facturas_por_cobrar_total,

  -- Saldos pendientes (usa saldo_pendiente si existe; si no, total - total_pagado para no pagadas)
  (SELECT COALESCE(SUM(
         CASE 
           WHEN f.saldo_pendiente IS NOT NULL THEN GREATEST(f.saldo_pendiente, 0)
           WHEN f.pagada = false THEN GREATEST(f.total - COALESCE(f.total_pagado, 0), 0)
           ELSE 0
         END
       ), 0)
     FROM public.facturas f
     WHERE (COALESCE(f.saldo_pendiente, CASE WHEN f.pagada = false THEN f.total - COALESCE(f.total_pagado, 0) ELSE 0 END)) > 0
  ) AS saldos_pendientes_total,

  -- Jornales por validar con antigüedad > 7 días
  (SELECT COUNT(*)
     FROM public.partes_de_trabajo pdt
     WHERE pdt.liquidado IS DISTINCT FROM true
       AND pdt.fecha < (CURRENT_DATE - INTERVAL '7 days')
  ) AS jornales_pendientes_mayor_7d,
  (SELECT COALESCE(SUM(
        CASE pdt.tipo_jornada 
          WHEN 'dia_completo' THEN ct.salario_diario 
          WHEN 'medio_dia' THEN ct.salario_diario * 0.5 
          ELSE 0 
        END
      ), 0)
     FROM public.partes_de_trabajo pdt
     JOIN public.configuracion_trabajadores ct ON ct.id_trabajador = pdt.id_trabajador
     WHERE pdt.liquidado IS DISTINCT FROM true
       AND pdt.fecha < (CURRENT_DATE - INTERVAL '7 days')
  ) AS monto_jornales_pendientes_mayor_7d,

  -- Visitas de hoy
  (SELECT COUNT(*) FROM public.tareas t WHERE t.fecha_visita::date = CURRENT_DATE) AS visitas_hoy_total,

  -- Tendencias de ingresos (mes actual vs anterior)
  (SELECT COALESCE(SUM(f.total), 0) FROM public.facturas f WHERE f.pagada = true AND f.fecha_pago >= date_trunc('month', NOW())) AS ingresos_mes_actual,
  (SELECT COALESCE(SUM(f.total), 0) FROM public.facturas f WHERE f.pagada = true AND f.fecha_pago >= date_trunc('month', NOW() - interval '1 month') AND f.fecha_pago <  date_trunc('month', NOW())) AS ingresos_mes_anterior

WHERE check_user_role('admin');

COMMENT ON VIEW public.vista_finanzas_admin IS 'Métricas financieras globales. Devuelve 1 fila para admin; 0 filas para otros roles. security_invoker aplica RLS de tablas base.';

COMMIT;
