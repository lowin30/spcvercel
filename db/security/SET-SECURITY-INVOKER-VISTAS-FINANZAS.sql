BEGIN;

ALTER VIEW public.vista_finanzas_admin      SET (security_invoker = true);
ALTER VIEW public.vista_finanzas_supervisor SET (security_invoker = true);
ALTER VIEW public.vista_finanzas_trabajador SET (security_invoker = true);

GRANT SELECT ON public.vista_finanzas_admin      TO authenticated;
GRANT SELECT ON public.vista_finanzas_supervisor TO authenticated;
GRANT SELECT ON public.vista_finanzas_trabajador TO authenticated;

COMMIT;
