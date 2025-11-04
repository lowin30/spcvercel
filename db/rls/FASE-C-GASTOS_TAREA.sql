BEGIN;

-- RESTRICTIVE SELECT: admin o supervisores de la tarea
CREATE POLICY phase_c_gastos_tarea_restrictive_select
ON public.gastos_tarea
AS RESTRICTIVE
FOR SELECT
TO public
USING (
  check_user_role('admin'::text)
  OR EXISTS (
    SELECT 1
    FROM public.supervisores_tareas st
    WHERE st.id_tarea = gastos_tarea.id_tarea
      AND st.id_supervisor = auth.uid()
  )
  OR (gastos_tarea.id_usuario = auth.uid())
);

-- RESTRICTIVE INSERT: admin o supervisores de la tarea
CREATE POLICY phase_c_gastos_tarea_restrictive_insert
ON public.gastos_tarea
AS RESTRICTIVE
FOR INSERT
TO public
WITH CHECK (
  check_user_role('admin'::text)
  OR EXISTS (
    SELECT 1
    FROM public.supervisores_tareas st
    WHERE st.id_tarea = gastos_tarea.id_tarea
      AND st.id_supervisor = auth.uid()
  )
);

-- RESTRICTIVE UPDATE: solo admin
CREATE POLICY phase_c_gastos_tarea_restrictive_update
ON public.gastos_tarea
AS RESTRICTIVE
FOR UPDATE
TO public
USING (check_user_role('admin'::text))
WITH CHECK (check_user_role('admin'::text));

-- RESTRICTIVE DELETE: solo admin
CREATE POLICY phase_c_gastos_tarea_restrictive_delete
ON public.gastos_tarea
AS RESTRICTIVE
FOR DELETE
TO public
USING (check_user_role('admin'::text));

COMMIT;
