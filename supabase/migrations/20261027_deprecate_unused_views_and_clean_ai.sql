-- migracion: deprecacion preventiva de vistas huerfanas, proteccion de vistas criticas y eliminacion del esquema ai_system en desuso
-- protocolo platinum: minusculas, documentacion en catalogo postgres via comments, cero impacto operativo

-- 1. deprecacion preventiva (renombrado a _deprecated) de vistas 100% huerfanas
ALTER VIEW IF EXISTS public.vista_asignaciones_tareas_supervisores RENAME TO vista_asignaciones_tareas_supervisores_deprecated;
COMMENT ON VIEW public.vista_asignaciones_tareas_supervisores_deprecated IS 'deprecada el 2026-10-27: sin uso en app ni dependencias sql. renombrada preventivamente antes de su eliminacion definitiva.';

ALTER VIEW IF EXISTS public.vista_liquidaciones_items RENAME TO vista_liquidaciones_items_deprecated;
COMMENT ON VIEW public.vista_liquidaciones_items_deprecated IS 'deprecada el 2026-10-27: desglose migrado a rpc y loaders directos. renombrada preventivamente antes de su eliminacion definitiva.';

ALTER MATERIALIZED VIEW IF EXISTS public.mv_finanzas_supervisor RENAME TO mv_finanzas_supervisor_deprecated;
COMMENT ON MATERIALIZED VIEW public.mv_finanzas_supervisor_deprecated IS 'deprecada el 2026-10-27: copia estatica no utilizada; la app consume vista_finanzas_supervisor en tiempo real.';

-- 2. documentacion explicita en catalogo de postgres para blindar vistas activas contra futuras auditorias
COMMENT ON VIEW public.vista_admin_liquidaciones_sin_pf IS 'activa y critica: subconsulta obligatoria dentro de vista_finanzas_admin (liquidaciones_sin_pf_count). no eliminar.';
COMMENT ON VIEW public.vista_admin_pb_sin_aprobar IS 'activa y critica: subconsulta obligatoria dentro de vista_finanzas_admin (pb_sin_aprobar_count). no eliminar.';
COMMENT ON VIEW public.vista_admin_pf_enviado_sin_actividad IS 'activa y critica: subconsulta obligatoria dentro de vista_finanzas_admin (alertas 20d y 30d). no eliminar.';
COMMENT ON VIEW public.vista_admin_pb_finalizada_sin_pf IS 'activa y critica: subconsulta obligatoria dentro de vista_finanzas_admin (pb_finalizada_sin_pf_count). no eliminar.';
COMMENT ON VIEW public.vista_admin_pf_aprobado_sin_factura IS 'activa y critica: subconsulta obligatoria dentro de vista_finanzas_admin (pf_aprobado_sin_factura_count). no eliminar.';
COMMENT ON VIEW public.vista_finanzas_admin IS 'activa y critica: alimenta el dashboard principal de administracion con kpis globales y contadores de alertas.';
COMMENT ON VIEW public.vista_finanzas_supervisor IS 'activa y critica: alimenta los kpis del dashboard en modo supervisor (dashboard-supervisor.actions.ts). no eliminar.';
COMMENT ON VIEW public.vista_tareas_supervisor IS 'activa y critica: alimenta la lista de tareas en modo supervisor. no eliminar.';
COMMENT ON VIEW public.vista_actividad_maestra_god_mode IS 'activa y critica: alimenta dashboard/trabajadores/gastos en modo dios. no eliminar.';
COMMENT ON VIEW public.vista_pb_admin IS 'activa y critica: alimenta dashboard/presupuestos-base para administradores. no eliminar.';
COMMENT ON VIEW public.vista_pb_supervisor IS 'activa y critica: alimenta dashboard/presupuestos-base para supervisores. no eliminar.';

-- 3. corregir vista_comprobantes_admin_v4 para eliminar exposicion de auth.users y resolver error de seguridad
CREATE OR REPLACE VIEW public.vista_comprobantes_admin_v4 AS
SELECT 
  gt.id,
  gt.id_tarea,
  gt.id_usuario,
  p.rol AS rol_usuario,
  gt.tipo_gasto,
  gt.monto,
  gt.descripcion,
  gt.comprobante_url,
  gt.fecha_gasto,
  gt.estado,
  gt.created_at,
  gt.updated_at,
  gt.metodo_registro,
  gt.imagen_procesada_url,
  gt.liquidado,
  gt.id_liquidacion,
  t.titulo AS titulo_tarea,
  t.code AS code_tarea,
  p.email::character varying(255) AS email_usuario,
  e.nombre AS nombre_edificio,
  e.id AS id_edificio,
  (gt.comprobante_url IS NOT NULL OR gt.imagen_procesada_url IS NOT NULL) AS tiene_foto
FROM public.gastos_tarea gt
  LEFT JOIN public.tareas t ON gt.id_tarea = t.id
  LEFT JOIN public.usuarios p ON gt.id_usuario = p.id
  LEFT JOIN public.edificios e ON t.id_edificio = e.id;

COMMENT ON VIEW public.vista_comprobantes_admin_v4 IS 'activa: alimenta dashboard/comprobantes. vincula con usuarios publicos para proteger auth.users.';

-- 4. eliminar esquema ai_system obsoleto (limpieza masiva de warnings de seguridad y rendimiento)
DROP SCHEMA IF EXISTS ai_system CASCADE;
