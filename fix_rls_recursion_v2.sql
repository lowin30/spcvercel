-- Script v2 para solucionar la recursión infinita en políticas RLS de Supabase
-- Este enfoque utiliza subconsultas EXISTS directamente en la política de la tabla 'tareas',
-- confiando en políticas extremadamente simples en las tablas relacionadas para romper el ciclo.

-- Por favor, ejecuta este script completo en el Editor de SQL de tu proyecto Supabase.

-- Paso 1: Eliminar la función y las políticas anteriores para asegurar un estado limpio.

DROP FUNCTION IF EXISTS public.is_related_to_task(integer, uuid) CASCADE;

-- Políticas de 'tareas'
DROP POLICY IF EXISTS "Enable read access for admins, supervisors, and assigned personnel" ON public.tareas;
DROP POLICY IF EXISTS "Enable read access for related users" ON public.tareas;

-- Políticas de 'supervisores_tareas'
DROP POLICY IF EXISTS "Enable read access for assigned supervisors" ON public.supervisores_tareas;

-- Políticas de 'trabajadores_tareas'
DROP POLICY IF EXISTS "Enable read access for assigned workers" ON public.trabajadores_tareas;
DROP POLICY IF EXISTS "Enable all access for admins" ON public.tareas;

-- Políticas de 'supervisores_tareas'
DROP POLICY IF EXISTS "Enable read access for admins and assigned supervisors" ON public.supervisores_tareas;
DROP POLICY IF EXISTS "Enable insert for admins and supervisors" ON public.supervisores_tareas;
DROP POLICY IF EXISTS "Enable delete for admins and supervisors" ON public.supervisores_tareas;

-- Políticas de 'trabajadores_tareas'
DROP POLICY IF EXISTS "Enable read access for admins, supervisors, and assigned workers" ON public.trabajadores_tareas;
DROP POLICY IF EXISTS "Enable insert for admins and supervisors" ON public.trabajadores_tareas;
DROP POLICY IF EXISTS "Enable delete for admins and supervisors" ON public.trabajadores_tareas;


-- Paso 2: Recrear las políticas de las tablas de asignación de la forma más simple posible.
-- La clave es que estas políticas no deben tener dependencias externas.

-- Políticas para 'supervisores_tareas'
CREATE POLICY "Enable read access for assigned supervisors" ON public.supervisores_tareas
FOR SELECT USING (id_supervisor = auth.uid());

CREATE POLICY "Enable insert for admins and supervisors" ON public.supervisores_tareas
FOR INSERT WITH CHECK (get_my_role() IN ('admin', 'supervisor'));

CREATE POLICY "Enable delete for admins and supervisors" ON public.supervisores_tareas
FOR DELETE USING (get_my_role() IN ('admin', 'supervisor'));

-- Políticas para 'trabajadores_tareas'
CREATE POLICY "Enable read access for assigned workers" ON public.trabajadores_tareas
FOR SELECT USING (id_trabajador = auth.uid());

CREATE POLICY "Enable insert for admins and supervisors" ON public.trabajadores_tareas
FOR INSERT WITH CHECK (get_my_role() IN ('admin', 'supervisor'));

CREATE POLICY "Enable delete for admins and supervisors" ON public.trabajadores_tareas
FOR DELETE USING (get_my_role() IN ('admin', 'supervisor'));


-- Paso 3: Crear la política para la tabla 'tareas' usando subconsultas.
-- Como las políticas de las tablas consultadas ('supervisores_tareas', 'trabajadores_tareas')
-- ahora son muy simples, esto no debería causar recursión.

CREATE POLICY "Enable read access for related users" ON public.tareas
FOR SELECT
USING (
  -- El usuario es admin
  (get_my_role() = 'admin') OR
  
  -- El usuario es un supervisor asignado a esta tarea
  (EXISTS (
    SELECT 1
    FROM public.supervisores_tareas st
    WHERE st.id_tarea = tareas.id AND st.id_supervisor = auth.uid()
  )) OR
  
  -- El usuario es un trabajador asignado a esta tarea
  (EXISTS (
    SELECT 1
    FROM public.trabajadores_tareas tt
    WHERE tt.id_tarea = tareas.id AND tt.id_trabajador = auth.uid()
  ))
);

-- Mensaje final
-- Por favor, ejecuta este script y prueba la aplicación de nuevo. Este enfoque debería ser definitivo.
