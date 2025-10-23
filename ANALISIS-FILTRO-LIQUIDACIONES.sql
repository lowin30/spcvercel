-- =====================================================
-- ANÁLISIS: Mejora del filtro en liquidaciones/nueva
-- Fecha: 21 de Octubre, 2025
-- ACTUALIZACIÓN: Incluir filtro de supervisor asignado
-- =====================================================

-- Query actual (sin filtro de aprobación ni supervisor)
SELECT
  pf.id,
  pf.code,
  pf.aprobado,
  pf.rechazado,
  pf.total,
  pf.total_base,
  t.titulo,
  pb.total as total_presupuesto_base
FROM presupuestos_finales pf
LEFT JOIN tareas t ON pf.id_tarea = t.id
LEFT JOIN presupuestos_base pb ON pf.id_presupuesto_base = pb.id
WHERE pf.id_liquidacion_supervisor IS NULL;

-- Query mejorada (solo presupuestos aprobados Y con supervisor)
SELECT
  pf.id,
  pf.code,
  pf.total,
  pf.total_base,
  pf.aprobado,
  pf.id_estado,
  t.titulo,
  pb.total as total_presupuesto_base,
  ep.nombre as estado_presupuesto,
  st.id_supervisor,
  u.email as email_supervisor
FROM presupuestos_finales pf
LEFT JOIN tareas t ON pf.id_tarea = t.id
LEFT JOIN presupuestos_base pb ON pf.id_presupuesto_base = pb.id
LEFT JOIN estados_presupuestos ep ON pf.id_estado = ep.id
INNER JOIN supervisores_tareas st ON pf.id_tarea = st.id_tarea  -- ← Solo tareas con supervisor
LEFT JOIN usuarios u ON st.id_supervisor = u.id  -- ← Email del supervisor
WHERE pf.id_liquidacion_supervisor IS NULL
  AND pf.id_estado = 3;  -- ← Solo aceptados

-- Ver tareas sin supervisor
SELECT
  pf.id,
  pf.code,
  t.titulo,
  st.id_supervisor
FROM presupuestos_finales pf
LEFT JOIN tareas t ON pf.id_tarea = t.id
LEFT JOIN supervisores_tareas st ON pf.id_tarea = st.id_tarea
WHERE pf.id_liquidacion_supervisor IS NULL
  AND st.id_supervisor IS NULL;  -- ← Tareas sin supervisor

-- Ver distribución de supervisores por tarea
SELECT
  t.titulo,
  COUNT(st.id_supervisor) as supervisores_asignados,
  STRING_AGG(u.email, ', ') as emails_supervisores
FROM tareas t
LEFT JOIN supervisores_tareas st ON t.id = st.id_tarea
LEFT JOIN usuarios u ON st.id_supervisor = u.id
GROUP BY t.id, t.titulo
ORDER BY supervisores_asignados;
