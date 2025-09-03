-- Solución final para la función get_tarea_details
-- Esta versión corrige el error de "column reference 'id' is ambiguous"
-- asegurándose de que todas las referencias a columnas id estén calificadas con el nombre de tabla

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
SECURITY DEFINER -- Esto es clave para evitar problemas de RLS
SET search_path = public
AS $$
BEGIN
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
    LEFT JOIN estados_nuevos en ON t.id_estado_nuevo = en.id
    LEFT JOIN administradores a ON e.id_administrador = a.id
    WHERE 
        t.id = tarea_id_param;
END;
$$;

-- Aseguramos los permisos
REVOKE EXECUTE ON FUNCTION public.get_tarea_details(integer) FROM public;
GRANT EXECUTE ON FUNCTION public.get_tarea_details(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_tarea_details(integer) TO service_role;
