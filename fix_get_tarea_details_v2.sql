-- Solución mejorada para la función get_tarea_details
-- Esta versión evita usar la vista y accede directamente a las tablas
-- para minimizar problemas de permisos con RLS

-- Primero eliminamos la función existente si existe
DROP FUNCTION IF EXISTS public.get_tarea_details(integer);

-- Creamos la nueva función con SECURITY DEFINER para evitar problemas de RLS
CREATE OR REPLACE FUNCTION public.get_tarea_details(tarea_id_param integer)
RETURNS TABLE(
  id integer,
  titulo text,
  descripcion text,
  fecha_creacion timestamp with time zone,
  id_estado_nuevo integer,
  finalizada boolean,
  prioridad text,
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
SECURITY DEFINER -- Esto hace que la función se ejecute con los permisos del creador
SET search_path = public
AS $$
DECLARE
    v_tarea_exists boolean;
BEGIN
    -- Verificar primero si la tarea existe
    SELECT EXISTS(SELECT 1 FROM tareas WHERE id = tarea_id_param) INTO v_tarea_exists;
    
    IF NOT v_tarea_exists THEN
        RAISE EXCEPTION 'La tarea con ID % no existe', tarea_id_param;
    END IF;

    -- Consultar directamente las tablas en lugar de usar la vista
    RETURN QUERY 
    SELECT 
        t.id::integer,
        t.titulo::text,
        t.descripcion::text,
        t.created_at::timestamp with time zone,
        t.id_estado_nuevo::integer,
        t.finalizada::boolean,
        t.prioridad::text,
        t.id_edificio::integer,
        e.nombre::text AS edificio_nombre,
        e.direccion::text AS edificio_direccion,
        e.cuit::character varying AS cuit_edificio,
        COALESCE(en.nombre, 'Sin Estado')::text AS estado,
        COALESCE(a.nombre, 'No asignado')::text AS nombre_administrador,
        COALESCE(a.telefono, 'Sin teléfono')::text AS telefono_administrador,
        -- Subconsultas para emails
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
    LEFT JOIN estados_nuevos en ON t.id_estado_nuevo = en.id
    LEFT JOIN administradores a ON e.id_administrador = a.id
    WHERE 
        t.id = tarea_id_param;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'No se encontraron datos completos para la tarea con ID %', tarea_id_param;
    END IF;

    RETURN;
END;
$$;

-- Asegurar que los permisos están correctamente configurados
REVOKE EXECUTE ON FUNCTION public.get_tarea_details(integer) FROM public;
GRANT EXECUTE ON FUNCTION public.get_tarea_details(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_tarea_details(integer) TO service_role;

-- Comentario adicional para documentar
COMMENT ON FUNCTION public.get_tarea_details(integer) IS 
'Función que retorna detalles completos de una tarea especificada por su ID.
Esta función tiene SECURITY DEFINER para evitar problemas de RLS.';
