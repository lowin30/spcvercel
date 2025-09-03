-- Solución para el error "column reference id is ambiguous"
-- Reemplazar la función actual get_tarea_details con una versión mejorada

-- Primero eliminamos la función existente
DROP FUNCTION IF EXISTS public.get_tarea_details(integer);

-- Creamos la nueva función
CREATE FUNCTION public.get_tarea_details(tarea_id_param integer)
RETURNS TABLE(
  id integer,
  titulo text,
  descripcion text,
  fecha_creacion timestamp with time zone,
  id_estado_nuevo integer,
  finalizada boolean,
  prioridad text,
  id_edificio integer,
  nombre_edificio text,
  direccion_edificio text,
  cuit_edificio character varying,
  estado text,
  nombre_administrador text,
  telefono_administrador text,
  trabajadores_emails text,
  supervisores_emails text
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Verificar primero si la tarea existe
  IF NOT EXISTS (SELECT 1 FROM public.tareas WHERE tareas.id = tarea_id_param) THEN
    RAISE EXCEPTION 'La tarea con ID % no existe', tarea_id_param;
  END IF;

  RETURN QUERY 
  SELECT 
    vt.id::integer,
    vt.titulo::text,
    vt.descripcion::text,
    vt.created_at::timestamp with time zone,
    vt.id_estado_nuevo::integer,
    vt.finalizada::boolean,
    vt.prioridad::text,
    vt.id_edificio::integer,
    vt.nombre_edificio::text,
    vt.direccion_edificio::text,
    vt.cuit_edificio::character varying,
    vt.estado::text,
    vt.nombre_administrador::text,
    vt.telefono_administrador::text,
    vt.trabajadores_emails::text,
    vt.supervisores_emails::text
  FROM 
    public.vista_tareas_completa vt
  WHERE 
    vt.id = tarea_id_param;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No se encontraron datos para la tarea con ID %, posiblemente no tengas permisos', tarea_id_param;
  END IF;

  RETURN;
END;
$$;

-- Asegurar que los permisos están correctamente configurados
GRANT EXECUTE ON FUNCTION public.get_tarea_details(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_tarea_details(integer) TO service_role;
