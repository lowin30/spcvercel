-- migracion: mejoras quirurgicas recordatorios de administracion
-- fecha: 2026-10-22
-- descripcion:
-- 1. vista_admin_pf_aprobado_sin_factura: exige estrictamente 'aprobado' y excluye tareas particulares.
-- 2. vista_admin_pf_enviado_sin_aprobar: excluye tareas particulares.

-- ============================================================
-- 1. vista_admin_pf_aprobado_sin_factura
-- ============================================================
CREATE OR REPLACE VIEW vista_admin_pf_aprobado_sin_factura AS
 SELECT pf.id AS id_presupuesto_final,
    pf.code AS code_pf,
    pf.id_tarea,
    t.code AS code_tarea,
    t.titulo AS titulo_tarea,
    pf.total AS monto_pf,
    pf.created_at
   FROM presupuestos_finales pf
     JOIN tareas t ON t.id = pf.id_tarea
     JOIN estados_presupuestos ep ON pf.id_estado = ep.id
  WHERE t.finalizada = true
    AND t.se_trabajo = true
    AND (ep.codigo = 'aprobado' OR pf.aprobado = true)
    AND COALESCE(t.es_particular, false) = false
    AND NOT (EXISTS ( SELECT 1
           FROM facturas f
          WHERE f.id_presupuesto_final = pf.id));

-- ============================================================
-- 2. vista_admin_pf_enviado_sin_aprobar
-- ============================================================
CREATE OR REPLACE VIEW vista_admin_pf_enviado_sin_aprobar AS
 SELECT pf.id AS id_presupuesto_final,
    pf.code AS code_pf,
    pf.created_at,
    pf.updated_at,
    (EXTRACT(day FROM (now() - (pf.updated_at)::timestamp with time zone)))::integer AS dias_sin_respuesta,
        CASE
            WHEN (EXTRACT(day FROM (now() - (pf.updated_at)::timestamp with time zone)) > 20) THEN 'critico'::text
            WHEN (EXTRACT(day FROM (now() - (pf.updated_at)::timestamp with time zone)) > 10) THEN 'urgente'::text
            ELSE 'normal'::text
        END AS prioridad,
    t.id AS id_tarea,
    t.code AS code_tarea,
    t.titulo AS titulo_tarea,
    e.id AS id_edificio,
    e.nombre AS nombre_edificio,
    e.id_administrador,
    pf.total AS total_pf
   FROM (((presupuestos_finales pf
     JOIN estados_presupuestos ep ON ((pf.id_estado = ep.id)))
     LEFT JOIN tareas t ON ((pf.id_tarea = t.id)))
     LEFT JOIN edificios e ON ((t.id_edificio = e.id)))
  WHERE (((ep.codigo)::text = 'enviado'::text) 
    AND (EXTRACT(day FROM (now() - (pf.updated_at)::timestamp with time zone)) > 7)
    AND (COALESCE(t.es_particular, false) = false))
  ORDER BY pf.updated_at;
