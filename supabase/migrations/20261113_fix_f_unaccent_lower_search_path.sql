-- migracion: restaurar search_path con extensions para f_unaccent_lower y funciones de busqueda
-- protocolo platinum: permite la resolucion de unaccent() y similarity() de la extension pg_trgm
-- resolviendo el error al insertar facturas generadas por aprobacion de presupuestos finales

ALTER FUNCTION public.f_unaccent_lower(text) SET search_path = public, extensions;
ALTER FUNCTION public.buscar_edificios_super_inteligente(text, integer, text, integer) SET search_path = public, extensions;
ALTER FUNCTION public.buscar_productos_super_inteligente(text, uuid, boolean, integer) SET search_path = public, extensions;
ALTER FUNCTION public.buscar_tareas_super_inteligente(text, integer, integer, boolean, uuid, text, integer) SET search_path = public, extensions;
ALTER FUNCTION public.buscar_facturas_super_inteligente(text, integer, integer, boolean, boolean, integer) SET search_path = public, extensions;
