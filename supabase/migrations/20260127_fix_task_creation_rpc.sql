-- Fix creating task with assignments
-- PROBLEM: Previous version inserted Supervisor into 'trabajadores_tareas' instead of 'supervisores_tareas'.
-- SOLUTION: Insert into 'supervisores_tareas' and decoupled worker assignment.

CREATE OR REPLACE FUNCTION crear_tarea_con_asignaciones(
    p_titulo text,
    p_descripcion text,
    p_id_administrador integer,
    p_id_edificio integer,
    p_prioridad text,
    p_id_estado_nuevo integer,
    p_fecha_visita timestamp without time zone,
    p_id_supervisor uuid,
    p_id_trabajador uuid,
    p_departamentos_ids integer[]
) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_tarea_id integer;
    v_tarea_code text;
    v_departamento_id integer;
BEGIN
    -- Insertar la tarea
    INSERT INTO tareas (
        titulo,
        descripcion,
        id_administrador,
        id_edificio,
        id_estado_nuevo,
        fecha_visita,
        prioridad
    )
    VALUES (
        p_titulo,
        p_descripcion,
        p_id_administrador,
        p_id_edificio,
        p_id_estado_nuevo,
        p_fecha_visita,
        p_prioridad
    )
    RETURNING id, code INTO v_tarea_id, v_tarea_code;

    -- Asignar supervisor si se proporcionó (CORREGIDO: Insertar en supervisores_tareas)
    IF p_id_supervisor IS NOT NULL THEN
        INSERT INTO supervisores_tareas (id_tarea, id_supervisor)
        VALUES (v_tarea_id, p_id_supervisor);
    END IF;

    -- Asignar trabajador adicional si se proporcionó
    -- (Ya no verificamos duplicidad con supervisor porque van a tablas distintas)
    IF p_id_trabajador IS NOT NULL THEN
        INSERT INTO trabajadores_tareas (id_tarea, id_trabajador)
        VALUES (v_tarea_id, p_id_trabajador);
    END IF;

    -- Asignar departamentos
    IF p_departamentos_ids IS NOT NULL AND array_length(p_departamentos_ids, 1) > 0 THEN
        FOREACH v_departamento_id IN ARRAY p_departamentos_ids
        LOOP
            INSERT INTO departamentos_tareas (id_departamento, id_tarea)
            VALUES (v_departamento_id, v_tarea_id);
        END LOOP;
    END IF;

    -- Retornar resultado
    RETURN json_build_object(
        'id', v_tarea_id,
        'code', v_tarea_code,
        'title', p_titulo
    );
END;
$$;
