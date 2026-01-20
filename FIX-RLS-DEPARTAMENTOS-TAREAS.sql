-- ========================================
-- DIAGNÓSTICO Y FIX: RLS departamentos_tareas
-- Error: new row violates row-level security policy
-- ========================================

-- PASO 1: Ver políticas actuales
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'departamentos_tareas'
ORDER BY cmd, policyname;

-- PASO 2: Ver función crear_tarea_con_asignaciones
SELECT 
    p.proname AS function_name,
    pg_get_functiondef(p.oid) AS function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname = 'crear_tarea_con_asignaciones';

-- ========================================
-- ANÁLISIS DEL PROBLEMA:
-- ========================================
-- La función crear_tarea_con_asignaciones inserta en departamentos_tareas
-- pero hay una política RESTRICTIVE que bloquea inserciones
-- 
-- SOLUCIÓN: La función debe ejecutarse con SECURITY DEFINER
-- para bypassear RLS, O la política debe permitir inserciones
-- desde funciones del sistema
-- ========================================

-- PASO 3: Ver si la función es SECURITY DEFINER
SELECT 
    p.proname,
    p.prosecdef AS is_security_definer,
    pg_get_userbyid(p.proowner) AS owner
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname = 'crear_tarea_con_asignaciones';

-- ========================================
-- FIX: Opción 1 - Hacer la función SECURITY DEFINER
-- ========================================
-- Esto permite que la función ejecute con permisos del owner
-- ignorando RLS del usuario que la llama

CREATE OR REPLACE FUNCTION crear_tarea_con_asignaciones(
    p_titulo text,
    p_descripcion text,
    p_id_edificio integer,
    p_id_administrador integer,
    p_id_supervisor uuid,
    p_id_estado_nuevo integer,
    p_fecha_estimada_finalizacion date,
    p_departamentos integer[]
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER  -- ← ESTO ES LA CLAVE
SET search_path = public
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
        id_edificio,
        id_administrador,
        id_estado_nuevo,
        fecha_estimada_finalizacion
    )
    VALUES (
        p_titulo,
        p_descripcion,
        p_id_edificio,
        p_id_administrador,
        p_id_estado_nuevo,
        p_fecha_estimada_finalizacion
    )
    RETURNING id, code INTO v_tarea_id, v_tarea_code;

    -- Asignar supervisor si se proporcionó
    IF p_id_supervisor IS NOT NULL THEN
        INSERT INTO trabajadores_tareas (id_tarea, id_trabajador)
        VALUES (v_tarea_id, p_id_supervisor);
    END IF;

    -- Asignar departamentos
    IF p_departamentos IS NOT NULL AND array_length(p_departamentos, 1) > 0 THEN
        FOREACH v_departamento_id IN ARRAY p_departamentos
        LOOP
            INSERT INTO departamentos_tareas (id_departamento, id_tarea)
            VALUES (v_departamento_id, v_tarea_id);
        END LOOP;
    END IF;

    -- Retornar resultado
    RETURN json_build_object(
        'id', v_tarea_id,
        'code', v_tarea_code
    );
END;
$$;

-- Otorgar permisos de ejecución
GRANT EXECUTE ON FUNCTION crear_tarea_con_asignaciones(text, text, integer, integer, uuid, integer, date, integer[]) TO authenticated;

-- ========================================
-- VERIFICACIÓN
-- ========================================
-- Verificar que la función ahora es SECURITY DEFINER
SELECT 
    p.proname,
    p.prosecdef AS is_security_definer,
    pg_get_userbyid(p.proowner) AS owner
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname = 'crear_tarea_con_asignaciones';

-- Debería mostrar:
-- proname: crear_tarea_con_asignaciones
-- is_security_definer: true
-- owner: postgres
