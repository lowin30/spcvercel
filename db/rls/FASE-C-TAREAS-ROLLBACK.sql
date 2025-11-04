BEGIN;

DROP POLICY IF EXISTS phase_c_tareas_restrictive_select ON public.tareas;
DROP POLICY IF EXISTS phase_c_tareas_restrictive_update ON public.tareas;
DROP POLICY IF EXISTS phase_c_tareas_restrictive_delete ON public.tareas;

COMMIT;
