BEGIN;

-- RESTRICTIVE SELECT: admin, supervisores asignados a la tarea o trabajadores asignados
CREATE POLICY phase_c_comentarios_restrictive_select
ON public.comentarios
AS RESTRICTIVE
FOR SELECT
TO public
USING (
  check_user_role('admin'::text)
  OR EXISTS (
    SELECT 1
    FROM public.supervisores_tareas st
    WHERE st.id_tarea = comentarios.id_tarea
      AND st.id_supervisor = auth.uid()
  )
  OR EXISTS (
    SELECT 1
    FROM public.trabajadores_tareas tt
    WHERE tt.id_tarea = comentarios.id_tarea
      AND tt.id_trabajador = auth.uid()
  )
);

-- RESTRICTIVE INSERT: admin o supervisores/trabajadores asignados a la tarea
CREATE POLICY phase_c_comentarios_restrictive_insert
ON public.comentarios
AS RESTRICTIVE
FOR INSERT
TO public
WITH CHECK (
  check_user_role('admin'::text)
  OR EXISTS (
    SELECT 1
    FROM public.supervisores_tareas st
    WHERE st.id_tarea = comentarios.id_tarea
      AND st.id_supervisor = auth.uid()
  )
  OR EXISTS (
    SELECT 1
    FROM public.trabajadores_tareas tt
    WHERE tt.id_tarea = comentarios.id_tarea
      AND tt.id_trabajador = auth.uid()
  )
);

-- RESTRICTIVE UPDATE: solo admin
CREATE POLICY phase_c_comentarios_restrictive_update
ON public.comentarios
AS RESTRICTIVE
FOR UPDATE
TO public
USING (check_user_role('admin'::text))
WITH CHECK (check_user_role('admin'::text));

-- RESTRICTIVE DELETE: solo admin
CREATE POLICY phase_c_comentarios_restrictive_delete
ON public.comentarios
AS RESTRICTIVE
FOR DELETE
TO public
USING (check_user_role('admin'::text));

COMMIT;
