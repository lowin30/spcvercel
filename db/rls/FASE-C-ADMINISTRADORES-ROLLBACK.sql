BEGIN;

DROP POLICY IF EXISTS phase_c_administradores_restrictive_select ON public.administradores;
DROP POLICY IF EXISTS phase_c_administradores_restrictive_insert ON public.administradores;
DROP POLICY IF EXISTS phase_c_administradores_restrictive_update ON public.administradores;
DROP POLICY IF EXISTS phase_c_administradores_restrictive_delete ON public.administradores;

COMMIT;
