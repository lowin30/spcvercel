-- Script para solucionar la recursión infinita en políticas RLS de Supabase
-- Por favor, ejecuta este script completo en el Editor de SQL de tu proyecto Supabase.

-- Paso 1: Crear una función auxiliar para verificar la relación de un usuario con una tarea.
-- Esta función comprueba si un usuario es supervisor o trabajador asignado a una tarea específica.
-- Se define como SECURITY DEFINER para evitar que la llamada a esta función desde una política RLS
-- desencadene las políticas de las tablas internas (supervisores_tareas, trabajadores_tareas), rompiendo así el ciclo de recursión.

CREATE OR REPLACE FUNCTION public.is_related_to_task(task_id integer, user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Es importante establecer la ruta de búsqueda para que el definidor de seguridad sepa qué esquema usar.
  -- SET search_path = public;
  RETURN EXISTS (
    -- El usuario es un supervisor asignado a la tarea
    SELECT 1 FROM public.supervisores_tareas st WHERE st.id_tarea = task_id AND st.id_supervisor = user_id
  ) OR EXISTS (
    -- El usuario es un trabajador asignado a la tarea
    SELECT 1 FROM public.trabajadores_tareas tt WHERE tt.id_tarea = task_id AND tt.id_trabajador = user_id
  );
END;
$$;

-- Otorgar permisos de ejecución sobre la función a los roles autenticados
GRANT EXECUTE ON FUNCTION public.is_related_to_task(integer, uuid) TO authenticated;


-- Paso 2: Eliminar las políticas existentes en las tablas involucradas para empezar de cero.
-- Esto asegura que no queden políticas antiguas que puedan causar conflictos.

DROP POLICY IF EXISTS "Enable read access for admins and assigned supervisors" ON public.supervisores_tareas;
DROP POLICY IF EXISTS "Enable insert for admins and supervisors" ON public.supervisores_tareas;
DROP POLICY IF EXISTS "Enable delete for admins and supervisors" ON public.supervisores_tareas;

DROP POLICY IF EXISTS "Enable read access for admins, supervisors, and assigned workers" ON public.trabajadores_tareas;
DROP POLICY IF EXISTS "Enable insert for admins and supervisors" ON public.trabajadores_tareas;
DROP POLICY IF EXISTS "Enable delete for admins and supervisors" ON public.trabajadores_tareas;

DROP POLICY IF EXISTS "Enable read access for admins, supervisors, and assigned personnel" ON public.tareas;
DROP POLICY IF EXISTS "Enable all access for admins" ON public.tareas; -- Nombre de política común que podría existir


-- Paso 3: Recrear las políticas de forma segura y sin dependencias cíclicas.

-- Políticas para la tabla 'tareas'
-- La política de lectura (SELECT) es la más crítica para la recursión.
-- Usamos la función auxiliar `is_related_to_task` para evitar subconsultas directas.
CREATE POLICY "Enable read access for admins, supervisors, and assigned personnel" ON public.tareas
FOR SELECT
USING (
  (get_my_role() = 'admin') OR
  public.is_related_to_task(id, auth.uid())
);

-- Políticas para la tabla 'supervisores_tareas'
-- Estas políticas ahora son simples y no dependen de otras tablas.
CREATE POLICY "Enable read access for admins and assigned supervisors" ON public.supervisores_tareas
FOR SELECT
USING (
  (get_my_role() = 'admin') OR
  (id_supervisor = auth.uid())
);

CREATE POLICY "Enable insert for admins and supervisors" ON public.supervisores_tareas
FOR INSERT
WITH CHECK (get_my_role() IN ('admin', 'supervisor'));

CREATE POLICY "Enable delete for admins and supervisors" ON public.supervisores_tareas
FOR DELETE
USING (get_my_role() IN ('admin', 'supervisor'));


-- Políticas para la tabla 'trabajadores_tareas'
-- Similares a las de supervisores, sin dependencias externas.
CREATE POLICY "Enable read access for admins, supervisors, and assigned workers" ON public.trabajadores_tareas
FOR SELECT
USING (
  (get_my_role() IN ('admin', 'supervisor')) OR
  (id_trabajador = auth.uid())
);

CREATE POLICY "Enable insert for admins and supervisors" ON public.trabajadores_tareas
FOR INSERT
WITH CHECK (get_my_role() IN ('admin', 'supervisor'));

CREATE POLICY "Enable delete for admins and supervisors" ON public.trabajadores_tareas
FOR DELETE
USING (get_my_role() IN ('admin', 'supervisor'));


-- Mensaje final
-- Por favor, revisa que el script se haya ejecutado correctamente y prueba la funcionalidad en la aplicación.
-- El error de recursión debería estar resuelto.
