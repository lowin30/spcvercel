-- plan 2: soporte trabajos particulares (es_particular)
-- fecha: 2026-10-21
-- descripcion: agrega columna es_particular a tareas, actualiza vistas financieras
--              para excluir particulares de alertas de consorcio, y actualiza el RPC
--              de creacion de tareas.

-- ============================================================
-- 1. columna en tabla tareas
-- ============================================================
ALTER TABLE tareas ADD COLUMN IF NOT EXISTS es_particular BOOLEAN NOT NULL DEFAULT false;

-- marcar tareas particulares existentes
UPDATE tareas SET es_particular = true WHERE id IN (486, 410);

-- ============================================================
-- 2. vista base: vista_tareas_completa
-- ============================================================
CREATE OR REPLACE VIEW vista_tareas_completa AS
 SELECT t.id,
    t.code,
    t.titulo,
    t.descripcion,
    t.id_edificio,
    t.fecha_visita,
    t.prioridad,
    t.created_at,
    t.id_estado_nuevo,
    t.gastos_tarea_pdf,
    t.id_administrador,
    t.finalizada,
    t.updated_at,
    e.nombre AS nombre_edificio,
    e.direccion AS direccion_edificio,
    e.notas AS notas_edificio,
    adm.nombre AS nombre_administrador,
    et.nombre AS estado_nombre,
    et.nombre AS estado_tarea,
    et.color AS estado_color,
    t.prioridad AS prioridad_nombre,
        CASE
            WHEN (t.prioridad = 'baja'::text) THEN '#4CAF50'::text
            WHEN (t.prioridad = 'media'::text) THEN '#2196F3'::text
            WHEN (t.prioridad = 'alta'::text) THEN '#FF9800'::text
            WHEN (t.prioridad = 'urgente'::text) THEN '#F44336'::text
            ELSE '#9E9E9E'::text
        END AS prioridad_color,
    ( SELECT string_agg(u.email, ', '::text) AS string_agg
           FROM (supervisores_tareas st
             JOIN usuarios u ON ((st.id_supervisor = u.id)))
          WHERE (st.id_tarea = t.id)) AS supervisores_emails,
    ( SELECT string_agg(u.nombre, ', '::text) AS string_agg
           FROM (supervisores_tareas st
             JOIN usuarios u ON ((st.id_supervisor = u.id)))
          WHERE (st.id_tarea = t.id)) AS supervisores,
    ( SELECT string_agg(u.email, ', '::text) AS string_agg
           FROM (trabajadores_tareas tt
             JOIN usuarios u ON ((tt.id_trabajador = u.id)))
          WHERE (tt.id_tarea = t.id)) AS trabajadores_emails,
    ( SELECT jsonb_agg(jsonb_build_object('id', u.id, 'nombre', u.nombre, 'rol', u.rol, 'color_perfil', u.color_perfil)) AS jsonb_agg
           FROM (trabajadores_tareas tt
             JOIN usuarios u ON ((tt.id_trabajador = u.id)))
          WHERE (tt.id_tarea = t.id)) AS trabajadores_json,
    ( SELECT jsonb_agg(jsonb_build_object('id', u.id, 'nombre', u.nombre, 'email', u.email, 'color_perfil', u.color_perfil)) AS jsonb_agg
           FROM (supervisores_tareas st
             JOIN usuarios u ON ((st.id_supervisor = u.id)))
          WHERE (st.id_tarea = t.id)) AS supervisores_json,
    ( SELECT jsonb_agg(jsonb_build_object('id', d.id, 'codigo', d.codigo, 'propietario', COALESCE(c."nombreReal", d.propietario), 'telefono', c.telefono)) AS jsonb_agg
           FROM ((departamentos_tareas dt
             JOIN departamentos d ON ((dt.id_departamento = d.id)))
             LEFT JOIN contactos c ON (((c.departamento_id = d.id) AND (c.es_principal = true))))
          WHERE (dt.id_tarea = t.id)) AS departamentos_json,
    t.se_trabajo,
    t.descripcion_trabajo_realizado,
    t.fecha_finalizacion,
    t.es_particular
   FROM (((tareas t
     LEFT JOIN edificios e ON ((t.id_edificio = e.id)))
     LEFT JOIN administradores adm ON ((t.id_administrador = adm.id)))
     LEFT JOIN estados_tareas et ON ((t.id_estado_nuevo = et.id)));

-- ============================================================
-- 3. vista admin: vista_tareas_admin
-- ============================================================
CREATE OR REPLACE VIEW vista_tareas_admin AS
 SELECT id,
    code,
    titulo,
    descripcion,
    id_edificio,
    fecha_visita,
    prioridad,
    created_at,
    id_estado_nuevo,
    gastos_tarea_pdf,
    id_administrador,
    finalizada,
    updated_at,
    nombre_edificio,
    direccion_edificio,
    notas_edificio,
    nombre_administrador,
    estado_nombre,
    estado_tarea,
    estado_color,
    prioridad_nombre,
    prioridad_color,
    supervisores_emails,
    supervisores,
    trabajadores_emails,
    trabajadores_json,
    supervisores_json,
    departamentos_json,
    ( SELECT jsonb_build_object('pb', ( SELECT row_to_json(pb.*) AS row_to_json
                   FROM presupuestos_base pb
                  WHERE (pb.id_tarea = t.id)
                 LIMIT 1), 'pf', ( SELECT row_to_json(pf.*) AS row_to_json
                   FROM presupuestos_finales pf
                  WHERE (pf.id_tarea = t.id)
                 LIMIT 1), 'tiene_facturas', (EXISTS ( SELECT 1
                   FROM (facturas f
                     JOIN presupuestos_finales pf ON ((f.id_presupuesto_final = pf.id)))
                  WHERE (pf.id_tarea = t.id))), 'facturas_pagadas', ( SELECT COALESCE(bool_and(f.pagada), false) AS "coalesce"
                   FROM (facturas f
                     JOIN presupuestos_finales pf ON ((f.id_presupuesto_final = pf.id)))
                  WHERE (pf.id_tarea = t.id))) AS jsonb_build_object) AS finanzas_json,
    (EXISTS ( SELECT 1
           FROM presupuestos_base pb
          WHERE (pb.id_tarea = t.id))) AS tiene_presupuesto_base,
    (EXISTS ( SELECT 1
           FROM presupuestos_finales pf
          WHERE (pf.id_tarea = t.id))) AS tiene_presupuesto_final,
    (EXISTS ( SELECT 1
           FROM liquidaciones_nuevas ln
          WHERE (ln.id_tarea = t.id))) AS tiene_liquidacion,
    se_trabajo,
    es_particular
   FROM vista_tareas_completa t;

-- ============================================================
-- 4. vista supervisor: vista_tareas_supervisor
-- ============================================================
CREATE OR REPLACE VIEW vista_tareas_supervisor AS
 SELECT id,
    code,
    titulo,
    descripcion,
    id_edificio,
    fecha_visita,
    prioridad,
    created_at,
    id_estado_nuevo,
    gastos_tarea_pdf,
    id_administrador,
    finalizada,
    updated_at,
    nombre_edificio,
    direccion_edificio,
    notas_edificio,
    nombre_administrador,
    estado_nombre,
    estado_tarea,
    estado_color,
    prioridad_nombre,
    prioridad_color,
    supervisores_emails,
    supervisores,
    trabajadores_emails,
    trabajadores_json,
    supervisores_json,
    departamentos_json,
    (EXISTS ( SELECT 1
           FROM presupuestos_base pb
          WHERE (pb.id_tarea = t.id))) AS tiene_presupuesto_base,
    ( SELECT jsonb_build_object('pb', ( SELECT row_to_json(pb.*) AS row_to_json
                   FROM presupuestos_base pb
                  WHERE (pb.id_tarea = t.id)
                 LIMIT 1), 'total_gastos', ( SELECT COALESCE(sum(gastos_tarea.monto), (0)::bigint) AS "coalesce"
                   FROM gastos_tarea
                  WHERE (gastos_tarea.id_tarea = t.id)), 'lista_gastos', ( SELECT jsonb_agg(row_to_json(g.*)) AS jsonb_agg
                   FROM vista_gastos_tarea_completa g
                  WHERE (g.id_tarea = t.id))) AS jsonb_build_object) AS gastos_json,
    se_trabajo,
    es_particular
   FROM vista_tareas_completa t;

-- ============================================================
-- 5. alerta: vista_admin_pb_finalizada_sin_pf
--    excluye tareas particulares (no generan PF al consorcio)
-- ============================================================
CREATE OR REPLACE VIEW vista_admin_pb_finalizada_sin_pf AS
 SELECT DISTINCT ON (t.id) pb.id AS id_presupuesto_base,
    pb.code AS code_pb,
    t.id AS id_tarea,
    t.code AS code_tarea,
    t.titulo AS titulo_tarea,
    pb.total AS total_pb,
    COALESCE(u.nombre, u.email, u.code) AS supervisor_label,
    t.created_at
   FROM (((tareas t
     LEFT JOIN presupuestos_base pb ON ((pb.id_tarea = t.id)))
     LEFT JOIN supervisores_tareas st ON ((st.id_tarea = t.id)))
     LEFT JOIN usuarios u ON ((u.id = st.id_supervisor)))
  WHERE (((t.finalizada = true) OR (t.id_estado_nuevo = 7))
    AND (t.se_trabajo = true)
    AND (COALESCE(t.es_particular, false) = false)
    AND (NOT (EXISTS ( SELECT 1
           FROM presupuestos_finales pf
          WHERE (pf.id_tarea = t.id)))))
  ORDER BY t.id, t.created_at DESC;

-- ============================================================
-- 6. alerta: vista_admin_liquidaciones_sin_pf
--    excluye tareas particulares
-- ============================================================
CREATE OR REPLACE VIEW vista_admin_liquidaciones_sin_pf AS
 SELECT ln.id AS id_liquidacion,
    ln.id_tarea,
    t.code AS code_tarea,
    t.titulo AS titulo_tarea,
    ln.created_at
   FROM (liquidaciones_nuevas ln
     JOIN tareas t ON ((t.id = ln.id_tarea)))
  WHERE ((COALESCE(t.es_particular, false) = false)
    AND (NOT (EXISTS ( SELECT 1
           FROM presupuestos_finales pf
          WHERE (pf.id_tarea = ln.id_tarea)))))
    AND (jwt_rol() = 'admin'::text);

-- ============================================================
-- 7. alerta: vista_admin_pb_sin_aprobar
--    excluye tareas particulares
-- ============================================================
CREATE OR REPLACE VIEW vista_admin_pb_sin_aprobar AS
 SELECT pb.id AS id_presupuesto_base,
    pb.code AS code_pb,
    t.id AS id_tarea,
    t.code AS code_tarea,
    t.titulo AS titulo_tarea,
    pb.total AS total_pb,
    COALESCE(u.nombre, u.email, u.code) AS supervisor_label,
    pb.created_at
   FROM (((presupuestos_base pb
     JOIN tareas t ON ((t.id = pb.id_tarea)))
     LEFT JOIN supervisores_tareas st ON ((st.id_tarea = t.id)))
     LEFT JOIN usuarios u ON ((u.id = st.id_supervisor)))
  WHERE ((COALESCE(pb.aprobado, false) = false)
    AND (COALESCE(t.es_particular, false) = false)
    AND (NOT (EXISTS ( SELECT 1
           FROM presupuestos_finales pf
          WHERE (pf.id_tarea = t.id)))))
    AND (jwt_rol() = 'admin'::text);

-- ============================================================
-- 8. RPC: crear_tarea_con_asignaciones (con p_es_particular)
-- ============================================================
CREATE OR REPLACE FUNCTION public.crear_tarea_con_asignaciones(
  p_titulo text,
  p_descripcion text,
  p_id_administrador integer,
  p_id_edificio integer,
  p_prioridad text,
  p_id_estado_nuevo integer,
  p_fecha_visita timestamp without time zone,
  p_id_supervisor uuid,
  p_id_trabajador uuid,
  p_departamentos_ids integer[],
  p_es_particular boolean DEFAULT false
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    v_tarea_id integer;
    v_tarea_code text;
    v_departamento_id integer;
BEGIN
    INSERT INTO tareas (
        titulo,
        descripcion,
        id_administrador,
        id_edificio,
        id_estado_nuevo,
        fecha_visita,
        prioridad,
        es_particular
    )
    VALUES (
        p_titulo,
        p_descripcion,
        p_id_administrador,
        p_id_edificio,
        p_id_estado_nuevo,
        p_fecha_visita,
        p_prioridad,
        COALESCE(p_es_particular, false)
    )
    RETURNING id, code INTO v_tarea_id, v_tarea_code;

    IF p_id_supervisor IS NOT NULL THEN
        INSERT INTO supervisores_tareas (id_tarea, id_supervisor)
        VALUES (v_tarea_id, p_id_supervisor);
    END IF;

    IF p_id_trabajador IS NOT NULL THEN
        INSERT INTO trabajadores_tareas (id_tarea, id_trabajador)
        VALUES (v_tarea_id, p_id_trabajador);
    END IF;

    IF p_departamentos_ids IS NOT NULL AND array_length(p_departamentos_ids, 1) > 0 THEN
        FOREACH v_departamento_id IN ARRAY p_departamentos_ids
        LOOP
            INSERT INTO departamentos_tareas (id_departamento, id_tarea)
            VALUES (v_departamento_id, v_tarea_id);
        END LOOP;
    END IF;

    RETURN json_build_object(
        'id', v_tarea_id,
        'code', v_tarea_code
    );
END;
$function$;
