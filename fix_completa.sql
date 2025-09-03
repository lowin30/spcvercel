-- 1. Verificar estructura de tablas
SELECT 
    column_name, 
    data_type 
FROM 
    information_schema.columns 
WHERE 
    table_name = 'estados_tareas' 
    AND table_schema = 'public';

-- 2. Verificar relación entre tareas y estados
SELECT 
    column_name, 
    data_type 
FROM 
    information_schema.columns 
WHERE 
    table_name = 'tareas' 
    AND column_name = 'id_estado_nuevo' 
    AND table_schema = 'public';

-- 3. Recreación completa y corregida de la función RPC
DROP FUNCTION IF EXISTS public.get_tarea_details(integer);

CREATE OR REPLACE FUNCTION public.get_tarea_details(tarea_id_param integer)
RETURNS TABLE(
  id integer,
  titulo text,
  descripcion text,
  fecha_creacion timestamp with time zone,
  id_estado_nuevo integer,
  finalizada boolean,
  prioridad text,
  fecha_visita timestamp with time zone,
  id_edificio integer,
  edificio_nombre text,
  edificio_direccion text,
  cuit_edificio character varying,
  estado text,
  nombre_administrador text,
  telefono_administrador text,
  trabajadores_emails text,
  supervisores_emails text
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Log para diagnóstico
    RAISE NOTICE 'Ejecutando get_tarea_details con ID: %', tarea_id_param;
    
    RETURN QUERY 
    SELECT 
        t.id::integer,
        t.titulo::text,
        t.descripcion::text,
        t.created_at::timestamp with time zone AS fecha_creacion,
        t.id_estado_nuevo::integer,
        t.finalizada::boolean,
        t.prioridad::text,
        t.fecha_visita::timestamp with time zone,
        t.id_edificio::integer,
        e.nombre::text AS edificio_nombre,
        e.direccion::text AS edificio_direccion,
        e.cuit::character varying AS cuit_edificio,
        COALESCE(et.nombre, 'Sin Estado')::text AS estado,
        COALESCE(a.nombre, 'No asignado')::text AS nombre_administrador,
        COALESCE(a.telefono, 'Sin teléfono')::text AS telefono_administrador,
        -- Subconsultas para emails con referencias explícitas
        (SELECT string_agg(u.email, ', ')
         FROM trabajadores_tareas tt
         JOIN usuarios u ON tt.id_trabajador = u.id
         WHERE tt.id_tarea = t.id
        )::text AS trabajadores_emails,
        (SELECT string_agg(u.email, ', ')
         FROM supervisores_tareas st
         JOIN usuarios u ON st.id_supervisor = u.id
         WHERE st.id_tarea = t.id
        )::text AS supervisores_emails
    FROM 
        tareas t
    LEFT JOIN edificios e ON t.id_edificio = e.id
    LEFT JOIN estados_tareas et ON t.id_estado_nuevo = et.id
    LEFT JOIN administradores a ON e.id_administrador = a.id
    WHERE 
        t.id = tarea_id_param;

    -- Log adicional si no hay resultados
    IF NOT FOUND THEN
        RAISE NOTICE 'No se encontró ninguna tarea con ID: %', tarea_id_param;
    END IF;
END;
$$;

-- Aseguramos los permisos
REVOKE EXECUTE ON FUNCTION public.get_tarea_details(integer) FROM public;
GRANT EXECUTE ON FUNCTION public.get_tarea_details(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_tarea_details(integer) TO service_role;

-- 4. Verificar que la función se haya creado correctamente
SELECT 
    routine_name, 
    data_type AS return_type,
    external_language,
    security_type
FROM 
    information_schema.routines 
WHERE 
    routine_type = 'FUNCTION' 
    AND routine_name = 'get_tarea_details'
    AND routine_schema = 'public';
