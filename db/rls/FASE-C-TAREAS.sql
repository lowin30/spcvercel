BEGIN;

-- RESTRICTIVE SELECT: admin, supervisores asignados a la tarea o trabajadores asignados
CREATE POLICY phase_c_tareas_restrictive_select
ON public.tareas
AS RESTRICTIVE
FOR SELECT
TO public
USING (
  (jwt_rol() = 'admin'::text)
  OR (jwt_rol() = 'supervisor'::text)
  OR EXISTS (
    SELECT 1
    FROM public.supervisores_tareas st
    WHERE st.id_tarea = tareas.id
      AND st.id_supervisor = auth.uid()
  )
  OR EXISTS (
    SELECT 1
    FROM public.trabajadores_tareas tt
    WHERE tt.id_tarea = tareas.id
      AND tt.id_trabajador = auth.uid()
  )
);

-- RESTRICTIVE UPDATE: admin o supervisores de la tarea (USING y WITH CHECK)
CREATE POLICY phase_c_tareas_restrictive_update
ON public.tareas
AS RESTRICTIVE
FOR UPDATE
TO public
USING (
  (jwt_rol() = 'admin'::text)
  OR EXISTS (
    SELECT 1
    FROM public.supervisores_tareas st
    WHERE st.id_tarea = tareas.id
      AND st.id_supervisor = auth.uid()
  )
)
WITH CHECK (
  (jwt_rol() = 'admin'::text)
  OR EXISTS (
    SELECT 1
    FROM public.supervisores_tareas st
    WHERE st.id_tarea = tareas.id
      AND st.id_supervisor = auth.uid()
  )
);

-- RESTRICTIVE DELETE: solo admin
CREATE POLICY phase_c_tareas_restrictive_delete
ON public.tareas
AS RESTRICTIVE
FOR DELETE
TO public
USING ((jwt_rol() = 'admin'::text));

COMMIT;
