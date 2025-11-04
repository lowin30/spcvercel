BEGIN;

DROP POLICY IF EXISTS phase_c_comentarios_restrictive_select ON public.comentarios;
DROP POLICY IF EXISTS phase_c_comentarios_restrictive_insert ON public.comentarios;
DROP POLICY IF EXISTS phase_c_comentarios_restrictive_update ON public.comentarios;
DROP POLICY IF EXISTS phase_c_comentarios_restrictive_delete ON public.comentarios;

COMMIT;
