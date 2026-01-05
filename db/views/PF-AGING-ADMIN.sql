BEGIN;

DROP VIEW IF EXISTS public.vista_admin_pf_enviado_sin_actividad;
CREATE VIEW public.vista_admin_pf_enviado_sin_actividad AS
WITH pf_base AS (
  SELECT
    pf.id AS id_presupuesto_final,
    pf.code AS code_pf,
    pf.id_tarea,
    t.code AS code_tarea,
    t.titulo AS titulo_tarea,
    t.fecha_visita,
    pf.total AS monto_pf,
    pf.created_at AS fecha_creacion
  FROM public.presupuestos_finales pf
  JOIN public.tareas t ON t.id = pf.id_tarea
),
pf_validos AS (
  SELECT
    pfb.*,
    GREATEST(date_trunc('day', NOW())::date - date_trunc('day', pfb.fecha_creacion)::date, 0) AS dias_desde_creacion
  FROM pf_base pfb
  WHERE pfb.fecha_creacion IS NOT NULL
    AND (pfb.fecha_visita IS NULL OR pfb.fecha_visita::date <= CURRENT_DATE)
),
pf_sin_factura AS (
  SELECT pfv.*
  FROM pf_validos pfv
  WHERE NOT EXISTS (
    SELECT 1 FROM public.facturas f WHERE f.id_presupuesto_final = pfv.id_presupuesto_final
  )
),
pf_sin_actividad AS (
  SELECT p.*
  FROM pf_sin_factura p
  WHERE NOT EXISTS (
    SELECT 1 FROM public.partes_de_trabajo pdt
    WHERE pdt.id_tarea = p.id_tarea
      AND (
        (pdt.fecha IS NOT NULL AND pdt.fecha >= date_trunc('day', p.fecha_creacion)::date)
        OR (pdt.created_at IS NOT NULL AND pdt.created_at >= p.fecha_creacion)
      )
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.gastos_tarea gt
    WHERE gt.id_tarea = p.id_tarea
      AND gt.created_at >= p.fecha_creacion
  )
)
SELECT
  p.id_presupuesto_final,
  p.code_pf,
  p.id_tarea,
  p.code_tarea,
  p.titulo_tarea,
  p.monto_pf,
  p.fecha_creacion AS fecha_envio,
  p.dias_desde_creacion AS dias_desde_envio,
  CASE
    WHEN p.dias_desde_creacion >= 30 THEN 'auto_cierre_30d'
    WHEN p.dias_desde_creacion >= 20 THEN 'alerta_20d'
    ELSE 'ninguno'
  END AS umbral
FROM pf_sin_actividad p
JOIN public.tareas t ON t.id = p.id_tarea
WHERE COALESCE(t.finalizada, false) = false
  AND p.dias_desde_creacion >= 20
  AND (check_user_role('admin') OR current_user = 'postgres');

COMMENT ON VIEW public.vista_admin_pf_enviado_sin_actividad IS 'PF con más de 20/30 días desde creación y sin actividad (partes/gastos) desde esa fecha. Excluye facturados. Solo admin.';

GRANT SELECT ON public.vista_admin_pf_enviado_sin_actividad TO authenticated;
GRANT SELECT ON public.vista_admin_pf_enviado_sin_actividad TO anon;

COMMIT;
