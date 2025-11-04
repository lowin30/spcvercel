BEGIN;

DROP POLICY IF EXISTS phase_c_gastos_tarea_restrictive_select ON public.gastos_tarea;
DROP POLICY IF EXISTS phase_c_gastos_tarea_restrictive_insert ON public.gastos_tarea;
DROP POLICY IF EXISTS phase_c_gastos_tarea_restrictive_update ON public.gastos_tarea;
DROP POLICY IF EXISTS phase_c_gastos_tarea_restrictive_delete ON public.gastos_tarea;

COMMIT;
