BEGIN;

-- RESTRICTIVE SELECT para acotar lectura a admin, supervisores/trabajadores asignados a la tarea
CREATE POLICY phase_c_departamentos_tareas_restrictive_select
ON public.departamentos_tareas
AS RESTRICTIVE
FOR SELECT
TO public
USING (
  check_user_role('admin'::text)
  OR EXISTS (
    SELECT 1
    FROM public.supervisores_tareas st
    WHERE st.id_tarea = departamentos_tareas.id_tarea
      AND st.id_supervisor = auth.uid()
  )
  OR EXISTS (
    SELECT 1
    FROM public.trabajadores_tareas tt
    WHERE tt.id_tarea = departamentos_tareas.id_tarea
      AND tt.id_trabajador = auth.uid()
  )
);

-- RESTRICTIVE INSERT: solo admin o supervisores de la tarea pueden crear relaciones
CREATE POLICY phase_c_departamentos_tareas_restrictive_insert
ON public.departamentos_tareas
AS RESTRICTIVE
FOR INSERT
TO public
WITH CHECK (
  check_user_role('admin'::text)
  OR EXISTS (
    SELECT 1
    FROM public.supervisores_tareas st
    WHERE st.id_tarea = departamentos_tareas.id_tarea
      AND st.id_supervisor = auth.uid()
  )
);

-- RESTRICTIVE UPDATE: solo admin o supervisores de la tarea (tanto filas origen como destino)
CREATE POLICY phase_c_departamentos_tareas_restrictive_update
ON public.departamentos_tareas
AS RESTRICTIVE
FOR UPDATE
TO public
USING (
  check_user_role('admin'::text)
  OR EXISTS (
    SELECT 1
    FROM public.supervisores_tareas st
    WHERE st.id_tarea = departamentos_tareas.id_tarea
      AND st.id_supervisor = auth.uid()
  )
)
WITH CHECK (
  check_user_role('admin'::text)
  OR EXISTS (
    SELECT 1
    FROM public.supervisores_tareas st
    WHERE st.id_tarea = departamentos_tareas.id_tarea
      AND st.id_supervisor = auth.uid()
  )
);

-- RESTRICTIVE DELETE: solo admin o supervisores de la tarea
CREATE POLICY phase_c_departamentos_tareas_restrictive_delete
ON public.departamentos_tareas
AS RESTRICTIVE
FOR DELETE
TO public
USING (
  check_user_role('admin'::text)
  OR EXISTS (
    SELECT 1
    FROM public.supervisores_tareas st
    WHERE st.id_tarea = departamentos_tareas.id_tarea
      AND st.id_supervisor = auth.uid()
  )
);

COMMIT;
