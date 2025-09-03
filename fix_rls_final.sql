-- Script Final para solucionar la recursión infinita en RLS
-- Causa raíz: La función get_my_role() se ejecutaba con permisos de invocador (SECURITY INVOKER),
-- lo que causaba un ciclo al consultar la tabla 'usuarios' que también tiene RLS.
-- Solución: Recrear la función con SECURITY DEFINER para que se ejecute con privilegios elevados,
-- rompiendo el ciclo de políticas.

-- Paso 1: Modificar la función existente para usar SECURITY DEFINER.
-- Esta es la solución más segura, ya que no elimina las políticas dependientes.
ALTER FUNCTION public.get_my_role() SECURITY DEFINER;

-- Paso 3: Limpiar todas las políticas antiguas de las tablas involucradas para evitar conflictos.
DROP POLICY IF EXISTS "Enable read access for related users" ON public.tareas CASCADE;
DROP POLICY IF EXISTS "Enable read access for admins, supervisors, and assigned personnel" ON public.tareas CASCADE;
DROP POLICY IF EXISTS "Enable all access for admins" ON public.tareas CASCADE;
DROP POLICY IF EXISTS "Enable read access for assigned supervisors" ON public.supervisores_tareas CASCADE;
DROP POLICY IF EXISTS "Enable read access for assigned workers" ON public.trabajadores_tareas CASCADE;

-- Paso 4: Recrear las políticas de forma limpia y segura.

-- Política para 'supervisores_tareas': Solo el supervisor asignado puede ver la fila.
CREATE POLICY "Enable read access for assigned supervisors"
ON public.supervisores_tareas
FOR SELECT
USING (auth.uid() = id_supervisor);

-- Política para 'trabajadores_tareas': Solo el trabajador asignado puede ver la fila.
CREATE POLICY "Enable read access for assigned workers"
ON public.trabajadores_tareas
FOR SELECT
USING (auth.uid() = id_trabajador);

-- Política para 'tareas': Admins, o supervisores/trabajadores asignados a la tarea.
CREATE POLICY "Enable read access for related users"
ON public.tareas
FOR SELECT
USING (
  (get_my_role() = 'admin') OR
  (EXISTS (
    SELECT 1
    FROM supervisores_tareas st
    WHERE st.id_tarea = tareas.id AND st.id_supervisor = auth.uid()
  )) OR
  (EXISTS (
    SELECT 1
    FROM trabajadores_tareas tt
    WHERE tt.id_tarea = tareas.id AND tt.id_trabajador = auth.uid()
  ))
);

-- Política de administrador para acceso total (opcional pero recomendado).
CREATE POLICY "Enable all access for admins"
ON public.tareas
FOR ALL
USING (get_my_role() = 'admin')
WITH CHECK (get_my_role() = 'admin');

