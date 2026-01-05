-- Recordatorios unificados para /dashboard/tareas
-- NOTA: No consultar presupuestos_finales. Solo tablas existentes.
-- Columnas: id_tarea, nombre_tarea, supervisor_label, fecha_visita, tipo_recordatorio, prioridad, created_at

-- Vista ADMIN (ve todo el universo, sin filtro por usuario)
CREATE OR REPLACE VIEW public.vista_admin_recordatorios_tareas_unificada AS
WITH base AS (
  SELECT
    t.id          AS id_tarea,
    t.titulo      AS nombre_tarea,
    t.fecha_visita,
    t.created_at,
    COALESCE(u.nombre, u.email, u.code) AS supervisor_label
  FROM public.tareas t
  LEFT JOIN LATERAL (
    SELECT u.nombre, u.email, u.code
    FROM public.supervisores_tareas st
    JOIN public.usuarios u ON u.id = st.id_supervisor
    WHERE st.id_tarea = t.id
    ORDER BY st.id_supervisor
    LIMIT 1
  ) s ON TRUE
  WHERE COALESCE(t.finalizada, false) = false
),
no_pb AS (
  SELECT b.*
  FROM base b
  WHERE NOT EXISTS (
    SELECT 1 FROM public.presupuestos_base pb WHERE pb.id_tarea = b.id_tarea
  )
),
proximas_hoy AS (
  SELECT id_tarea FROM no_pb WHERE fecha_visita = CURRENT_DATE
),
proximas_72 AS (
  SELECT id_tarea FROM no_pb WHERE fecha_visita > CURRENT_DATE AND fecha_visita <= CURRENT_DATE + INTERVAL '3 days'
),
act7 AS (
  SELECT DISTINCT nb.id_tarea
  FROM no_pb nb
  LEFT JOIN public.partes_de_trabajo p 
    ON p.id_tarea = nb.id_tarea AND p.created_at >= NOW() - INTERVAL '7 days'
  LEFT JOIN public.gastos_tarea g 
    ON g.id_tarea = nb.id_tarea AND g.created_at >= NOW() - INTERVAL '7 days'
  WHERE p.id IS NOT NULL OR g.id IS NOT NULL
),
inactiva14 AS (
  SELECT nb.id_tarea
  FROM no_pb nb
  LEFT JOIN public.partes_de_trabajo p 
    ON p.id_tarea = nb.id_tarea AND p.created_at >= NOW() - INTERVAL '14 days'
  LEFT JOIN public.gastos_tarea g 
    ON g.id_tarea = nb.id_tarea AND g.created_at >= NOW() - INTERVAL '14 days'
  WHERE p.id IS NULL AND g.id IS NULL
),
priorized AS (
  SELECT
    nb.*,
    CASE
      WHEN nb.id_tarea IN (SELECT id_tarea FROM proximas_hoy) THEN 1
      WHEN nb.id_tarea IN (SELECT id_tarea FROM proximas_72) THEN 2
      WHEN nb.id_tarea IN (SELECT id_tarea FROM act7) THEN 3
      WHEN nb.id_tarea IN (SELECT id_tarea FROM inactiva14) THEN 5
      ELSE 4
    END AS prioridad,
    CASE
      WHEN nb.id_tarea IN (SELECT id_tarea FROM proximas_hoy) THEN 'proxima_visita_sin_pb'
      WHEN nb.id_tarea IN (SELECT id_tarea FROM proximas_72) THEN 'proxima_visita_sin_pb'
      WHEN nb.id_tarea IN (SELECT id_tarea FROM act7) THEN 'con_actividad_sin_pb'
      WHEN nb.id_tarea IN (SELECT id_tarea FROM inactiva14) THEN 'inactiva_sin_pb'
      ELSE 'sin_pb'
    END AS tipo_recordatorio
  FROM no_pb nb
)
SELECT DISTINCT ON (id_tarea)
  id_tarea, nombre_tarea, supervisor_label, fecha_visita, tipo_recordatorio, prioridad, created_at
FROM priorized
WHERE check_user_role('admin')
ORDER BY id_tarea, prioridad ASC;

-- Vista SUPERVISOR (filtra por tareas asignadas al supervisor actual)
CREATE OR REPLACE VIEW public.vista_sup_recordatorios_tareas_unificada AS
WITH base AS (
  SELECT
    t.id          AS id_tarea,
    t.titulo      AS nombre_tarea,
    t.fecha_visita,
    t.created_at,
    COALESCE(u.nombre, u.email, u.code) AS supervisor_label
  FROM public.tareas t
  JOIN public.supervisores_tareas st_assigned 
    ON st_assigned.id_tarea = t.id AND st_assigned.id_supervisor = auth.uid()
  LEFT JOIN LATERAL (
    SELECT u.nombre, u.email, u.code
    FROM public.supervisores_tareas st
    JOIN public.usuarios u ON u.id = st.id_supervisor
    WHERE st.id_tarea = t.id
    ORDER BY st.id_supervisor
    LIMIT 1
  ) s ON TRUE
  WHERE COALESCE(t.finalizada, false) = false
),
no_pb AS (
  SELECT b.*
  FROM base b
  WHERE NOT EXISTS (
    SELECT 1 FROM public.presupuestos_base pb WHERE pb.id_tarea = b.id_tarea
  )
),
proximas_hoy AS (
  SELECT id_tarea FROM no_pb WHERE fecha_visita = CURRENT_DATE
),
proximas_72 AS (
  SELECT id_tarea FROM no_pb WHERE fecha_visita > CURRENT_DATE AND fecha_visita <= CURRENT_DATE + INTERVAL '3 days'
),
act7 AS (
  SELECT DISTINCT nb.id_tarea
  FROM no_pb nb
  LEFT JOIN public.partes_de_trabajo p 
    ON p.id_tarea = nb.id_tarea AND p.created_at >= NOW() - INTERVAL '7 days'
  LEFT JOIN public.gastos_tarea g 
    ON g.id_tarea = nb.id_tarea AND g.created_at >= NOW() - INTERVAL '7 days'
  WHERE p.id IS NOT NULL OR g.id IS NOT NULL
),
inactiva14 AS (
  SELECT nb.id_tarea
  FROM no_pb nb
  LEFT JOIN public.partes_de_trabajo p 
    ON p.id_tarea = nb.id_tarea AND p.created_at >= NOW() - INTERVAL '14 days'
  LEFT JOIN public.gastos_tarea g 
    ON g.id_tarea = nb.id_tarea AND g.created_at >= NOW() - INTERVAL '14 days'
  WHERE p.id IS NULL AND g.id IS NULL
),
priorized AS (
  SELECT
    nb.*,
    CASE
      WHEN nb.id_tarea IN (SELECT id_tarea FROM proximas_hoy) THEN 1
      WHEN nb.id_tarea IN (SELECT id_tarea FROM proximas_72) THEN 2
      WHEN nb.id_tarea IN (SELECT id_tarea FROM act7) THEN 3
      WHEN nb.id_tarea IN (SELECT id_tarea FROM inactiva14) THEN 5
      ELSE 4
    END AS prioridad,
    CASE
      WHEN nb.id_tarea IN (SELECT id_tarea FROM proximas_hoy) THEN 'proxima_visita_sin_pb'
      WHEN nb.id_tarea IN (SELECT id_tarea FROM proximas_72) THEN 'proxima_visita_sin_pb'
      WHEN nb.id_tarea IN (SELECT id_tarea FROM act7) THEN 'con_actividad_sin_pb'
      WHEN nb.id_tarea IN (SELECT id_tarea FROM inactiva14) THEN 'inactiva_sin_pb'
      ELSE 'sin_pb'
    END AS tipo_recordatorio
  FROM no_pb nb
)
SELECT DISTINCT ON (id_tarea)
  id_tarea, nombre_tarea, supervisor_label, fecha_visita, tipo_recordatorio, prioridad, created_at
FROM priorized
WHERE check_user_role('supervisor')
ORDER BY id_tarea, prioridad ASC;
