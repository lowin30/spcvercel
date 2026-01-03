BEGIN;

DROP VIEW IF EXISTS public.vista_admin_liquidaciones_sin_pf;
CREATE VIEW public.vista_admin_liquidaciones_sin_pf AS
SELECT 
  ln.id          AS id_liquidacion,
  ln.id_tarea    AS id_tarea,
  t.code         AS code_tarea,
  t.titulo       AS titulo_tarea,
  ln.created_at  AS created_at
FROM public.liquidaciones_nuevas ln
JOIN public.tareas t ON t.id = ln.id_tarea
WHERE NOT EXISTS (
  SELECT 1 FROM public.presupuestos_finales pf WHERE pf.id_tarea = ln.id_tarea
)
AND check_user_role('admin');

COMMENT ON VIEW public.vista_admin_liquidaciones_sin_pf IS 'Detalle de liquidaciones (supervisor) sin presupuesto final asociado. Restringido a admin por check_user_role.';

DROP VIEW IF EXISTS public.vista_admin_pf_aprobado_sin_factura;
CREATE VIEW public.vista_admin_pf_aprobado_sin_factura AS
SELECT
  pf.id          AS id_presupuesto_final,
  pf.code        AS code_pf,
  pf.id_tarea    AS id_tarea,
  t.code         AS code_tarea,
  t.titulo       AS titulo_tarea,
  pf.total       AS monto_pf,
  pf.created_at  AS created_at
FROM public.presupuestos_finales pf
JOIN public.tareas t ON t.id = pf.id_tarea
WHERE COALESCE(pf.aprobado, false) = true
  AND NOT EXISTS (
    SELECT 1 FROM public.facturas f WHERE f.id_presupuesto_final = pf.id
  )
AND check_user_role('admin');

COMMENT ON VIEW public.vista_admin_pf_aprobado_sin_factura IS 'Detalle de presupuestos finales aprobados que aún no tienen factura. Restringido a admin por check_user_role.';

DROP VIEW IF EXISTS public.vista_admin_pb_finalizada_sin_pf;
CREATE VIEW public.vista_admin_pb_finalizada_sin_pf AS
SELECT
  pb.id        AS id_presupuesto_base,
  pb.code      AS code_pb,
  t.id         AS id_tarea,
  t.code       AS code_tarea,
  t.titulo     AS titulo_tarea,
  pb.total     AS total_pb,
  COALESCE(u.nombre, u.email, u.code) AS supervisor_label,
  pb.created_at AS created_at
FROM public.presupuestos_base pb
JOIN public.tareas t ON t.id = pb.id_tarea
LEFT JOIN public.supervisores_tareas st ON st.id_tarea = t.id
LEFT JOIN public.usuarios u ON u.id = st.id_supervisor
WHERE COALESCE(pb.aprobado, false) = true
  AND NOT EXISTS (
    SELECT 1 FROM public.presupuestos_finales pf WHERE pf.id_tarea = t.id
  )
AND check_user_role('admin');

COMMENT ON VIEW public.vista_admin_pb_finalizada_sin_pf IS 'Detalle de PBs aprobados que aún no tienen presupuesto final creado (sin requerir tarea finalizada). Restringido a admin por check_user_role.';

-- NUEVO: PB SIN APROBAR (SOLO ADMIN)
DROP VIEW IF EXISTS public.vista_admin_pb_sin_aprobar;
CREATE VIEW public.vista_admin_pb_sin_aprobar AS
SELECT
  pb.id    AS id_presupuesto_base,
  pb.code  AS code_pb,
  t.id     AS id_tarea,
  t.code   AS code_tarea,
  t.titulo AS titulo_tarea,
  pb.total AS total_pb,
  COALESCE(u.nombre, u.email, u.code) AS supervisor_label,
  pb.created_at AS created_at
FROM public.presupuestos_base pb
JOIN public.tareas t ON t.id = pb.id_tarea
LEFT JOIN public.supervisores_tareas st ON st.id_tarea = t.id
LEFT JOIN public.usuarios u ON u.id = st.id_supervisor
WHERE COALESCE(pb.aprobado, false) = false
  AND NOT EXISTS (
    SELECT 1 FROM public.presupuestos_finales pf WHERE pf.id_tarea = t.id
  )
AND check_user_role('admin');

COMMENT ON VIEW public.vista_admin_pb_sin_aprobar IS 'Detalle de PBs NO aprobados. Restringido a admin por check_user_role.';

COMMIT;
