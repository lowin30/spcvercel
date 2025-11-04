BEGIN;

-- Fijar search_path explícito para funciones reportadas por el linter (0011)
-- Elegimos 'pg_catalog, public' para no romper referencias no calificadas existentes
-- y evitar inyección de search_path en funciones SECURITY DEFINER.

ALTER FUNCTION public.auto_crear_presupuesto_base()
  SET search_path = pg_catalog, public;

ALTER FUNCTION public.auto_aprobar_ajustes_factura_pagada()
  SET search_path = pg_catalog, public;

ALTER FUNCTION public.update_updated_at_column()
  SET search_path = pg_catalog, public;

-- check_user_role(text) suele recibir 'admin'::text | 'supervisor'::text | 'trabajador'::text
ALTER FUNCTION public.check_user_role(text)
  SET search_path = pg_catalog, public;

COMMIT;
