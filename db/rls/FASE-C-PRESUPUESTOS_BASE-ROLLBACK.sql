BEGIN;

DROP POLICY IF EXISTS phase_c_presupuestos_base_restrictive_select ON public.presupuestos_base;
DROP POLICY IF EXISTS phase_c_presupuestos_base_restrictive_insert ON public.presupuestos_base;
DROP POLICY IF EXISTS phase_c_presupuestos_base_restrictive_update ON public.presupuestos_base;
DROP POLICY IF EXISTS phase_c_presupuestos_base_restrictive_delete ON public.presupuestos_base;

COMMIT;
