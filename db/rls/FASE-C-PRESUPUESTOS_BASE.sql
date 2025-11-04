BEGIN;

-- RESTRICTIVE SELECT: admin o supervisores asignados a la tarea del PB
CREATE POLICY phase_c_presupuestos_base_restrictive_select
ON public.presupuestos_base
AS RESTRICTIVE
FOR SELECT
TO public
USING (
  check_user_role('admin'::text)
  OR EXISTS (
    SELECT 1
    FROM public.supervisores_tareas st
    WHERE st.id_tarea = presupuestos_base.id_tarea
      AND st.id_supervisor = auth.uid()
  )
);

-- RESTRICTIVE INSERT: admin o supervisores de la tarea
CREATE POLICY phase_c_presupuestos_base_restrictive_insert
ON public.presupuestos_base
AS RESTRICTIVE
FOR INSERT
TO public
WITH CHECK (
  check_user_role('admin'::text)
  OR EXISTS (
    SELECT 1
    FROM public.supervisores_tareas st
    WHERE st.id_tarea = presupuestos_base.id_tarea
      AND st.id_supervisor = auth.uid()
  )
);

-- RESTRICTIVE UPDATE: admin o supervisores de la tarea (las restricciones de 'aprobado=false' quedan en PERMISSIVE existentes)
CREATE POLICY phase_c_presupuestos_base_restrictive_update
ON public.presupuestos_base
AS RESTRICTIVE
FOR UPDATE
TO public
USING (
  check_user_role('admin'::text)
  OR EXISTS (
    SELECT 1
    FROM public.supervisores_tareas st
    WHERE st.id_tarea = presupuestos_base.id_tarea
      AND st.id_supervisor = auth.uid()
  )
)
WITH CHECK (
  check_user_role('admin'::text)
  OR EXISTS (
    SELECT 1
    FROM public.supervisores_tareas st
    WHERE st.id_tarea = presupuestos_base.id_tarea
      AND st.id_supervisor = auth.uid()
  )
);

-- RESTRICTIVE DELETE: solo admin
CREATE POLICY phase_c_presupuestos_base_restrictive_delete
ON public.presupuestos_base
AS RESTRICTIVE
FOR DELETE
TO public
USING (check_user_role('admin'::text));

COMMIT;
