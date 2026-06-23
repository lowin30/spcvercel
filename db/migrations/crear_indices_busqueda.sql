-- migracion: crear indices de busqueda por trigramas para optimizar ilike
-- spc v2.1 (platinum standard)

begin;

-- habilitar la extension de trigramas si no esta activa
create extension if not exists pg_trgm;

-- indices trigrama para la tabla tareas (titulo y descripcion)
create index if not exists idx_tareas_titulo_trgm on public.tareas using gin (titulo gin_trgm_ops);
create index if not exists idx_tareas_descripcion_trgm on public.tareas using gin (descripcion gin_trgm_ops);

-- indices trigrama para la tabla edificios (nombre y direccion)
create index if not exists idx_edificios_nombre_trgm on public.edificios using gin (nombre gin_trgm_ops);
create index if not exists idx_edificios_direccion_trgm on public.edificios using gin (direccion gin_trgm_ops);

commit;
