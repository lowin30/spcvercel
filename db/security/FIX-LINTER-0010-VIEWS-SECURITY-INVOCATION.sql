BEGIN;

ALTER VIEW public.vista_liquidaciones_completa SET (security_invoker = true);
ALTER VIEW public.vista_administradores SET (security_invoker = true);
ALTER VIEW public.vista_tareas_completa SET (security_invoker = true);
ALTER VIEW public.vista_facturas_completa SET (security_invoker = true);

COMMIT;
