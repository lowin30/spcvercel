-- ============================================
-- FILTRADO INTELIGENTE DE PRESUPUESTOS BASE POR ROL
-- ============================================
-- Objetivo: Centralizar la lógica de presupuestos base según rol
-- CRÍTICO: Supervisor NUNCA debe ver información de Presupuestos Finales
--
-- REGLAS DE PRIVACIDAD:
-- - Supervisor: Solo info de PB (código, tarea, monto, aprobación, liquidación)
-- - Admin: Info completa incluyendo flags de PF (tiene_pf, estado_pf)
--
-- AUTOR: Sistema SPC - Automatizaciones Centralizadas
-- FECHA: 2026-01-15
-- ============================================

BEGIN;

-- ============================================
-- VISTA BASE COMPLETA (solo para referencia interna)
-- ============================================
-- No exponer directamente, usar las vistas específicas por rol

DROP VIEW IF EXISTS vista_pb_completa_interna CASCADE;

CREATE VIEW vista_pb_completa_interna AS
SELECT 
  pb.*,
  t.titulo as titulo_tarea,
  t.code as code_tarea,
  t.id_estado_nuevo as id_estado_tarea,
  et.nombre as estado_tarea,
  t.id_edificio,
  e.nombre as nombre_edificio,
  e.direccion as direccion_edificio,
  -- Verificar si tiene Presupuesto Final
  EXISTS (
    SELECT 1 FROM presupuestos_finales pf 
    WHERE pf.id_tarea = pb.id_tarea
  ) as tiene_presupuesto_final,
  -- Obtener estado del PF si existe
  (
    SELECT ep.nombre 
    FROM presupuestos_finales pf
    INNER JOIN estados_presupuestos ep ON pf.id_estado = ep.id
    WHERE pf.id_tarea = pb.id_tarea
    ORDER BY pf.created_at DESC
    LIMIT 1
  ) as estado_pf,
  -- Verificar si está liquidado
  EXISTS (
    SELECT 1 FROM liquidaciones_nuevas ln
    WHERE ln.id_tarea = pb.id_tarea
  ) as esta_liquidado,
  -- Días desde creación
  EXTRACT(DAY FROM NOW() - pb.created_at)::INTEGER as dias_desde_creacion
FROM presupuestos_base pb
LEFT JOIN tareas t ON pb.id_tarea = t.id
LEFT JOIN estados_tareas et ON t.id_estado_nuevo = et.id
LEFT JOIN edificios e ON t.id_edificio = e.id;

-- ============================================
-- VISTA PARA SUPERVISORES
-- ============================================
-- SIN información de Presupuestos Finales (privacidad estricta)

DROP VIEW IF EXISTS public.vista_pb_supervisor CASCADE;

CREATE VIEW public.vista_pb_supervisor AS
SELECT 
  pb.id,
  pb.code,
  pb.id_tarea,
  pb.nota_pb,
  pb.materiales,
  pb.mano_obra,
  pb.total,
  pb.aprobado,
  pb.created_at,
  pb.updated_at,
  t.titulo as titulo_tarea,
  t.code as code_tarea,
  t.id_estado_nuevo as id_estado_tarea,
  et.nombre as estado_tarea,
  t.id_edificio,
  e.nombre as nombre_edificio,
  e.direccion as direccion_edificio,
  EXISTS (
    SELECT 1 FROM liquidaciones_nuevas ln
    WHERE ln.id_tarea = pb.id_tarea
  ) as esta_liquidado,
  EXTRACT(DAY FROM NOW() - pb.created_at)::INTEGER as dias_desde_creacion
FROM presupuestos_base pb
LEFT JOIN tareas t ON pb.id_tarea = t.id
LEFT JOIN estados_tareas et ON t.id_estado_nuevo = et.id
LEFT JOIN edificios e ON t.id_edificio = e.id
WHERE
  -- NO mostrar si está liquidado
  NOT EXISTS (
    SELECT 1 FROM liquidaciones_nuevas ln
    WHERE ln.id_tarea = pb.id_tarea
  )
  AND (
    -- CASO 1: NO existe PF → Mostrar (supervisor debe trabajar)
    NOT EXISTS (
      SELECT 1 FROM presupuestos_finales pf 
      WHERE pf.id_tarea = pb.id_tarea
    )
    
    OR
    
    -- CASO 2: Existe PF pero está APROBADO → Mostrar (reactiva flujo)
    EXISTS (
      SELECT 1 FROM presupuestos_finales pf
      INNER JOIN estados_presupuestos ep ON pf.id_estado = ep.id
      WHERE pf.id_tarea = pb.id_tarea
        AND ep.codigo = 'aprobado'
    )
    
    -- OCULTAR si existe PF en Borrador o Enviado (pausa flujo)
    -- Esto se logra por exclusión: solo mostramos los 2 casos de arriba
  );

COMMENT ON VIEW public.vista_pb_supervisor IS 
'PB para supervisores con pausas/reactivaciones inteligentes.
OCULTA: PB cuando existe PF en Borrador/Enviado (supervisor pausado).
MUESTRA: PB cuando NO existe PF O PF aprobado (supervisor reactiva).
NO expone información de PF (privacidad estricta).';

-- ============================================
-- VISTA PARA ADMINS
-- ============================================
-- CON toda la información incluyendo flags de PF

DROP VIEW IF EXISTS public.vista_pb_admin CASCADE;

CREATE VIEW public.vista_pb_admin AS
SELECT 
  pb.id,
  pb.code,
  pb.id_tarea,
  pb.nota_pb,
  pb.materiales,
  pb.mano_obra,
  pb.total,
  pb.aprobado,
  pb.created_at,
  pb.updated_at,
  t.titulo as titulo_tarea,
  t.code as code_tarea,
  t.id_estado_nuevo as id_estado_tarea,
  et.nombre as estado_tarea,
  t.id_edificio,
  e.nombre as nombre_edificio,
  e.direccion as direccion_edificio,
  EXISTS (
    SELECT 1 FROM presupuestos_finales pf 
    WHERE pf.id_tarea = pb.id_tarea
  ) as tiene_presupuesto_final,
  (
    SELECT pf.id
    FROM presupuestos_finales pf
    WHERE pf.id_tarea = pb.id_tarea
    ORDER BY pf.created_at DESC
    LIMIT 1
  ) as id_presupuesto_final,
  (
    SELECT ep.codigo
    FROM presupuestos_finales pf
    INNER JOIN estados_presupuestos ep ON pf.id_estado = ep.id
    WHERE pf.id_tarea = pb.id_tarea
    ORDER BY pf.created_at DESC
    LIMIT 1
  ) as codigo_estado_pf,
  (
    SELECT ep.nombre 
    FROM presupuestos_finales pf
    INNER JOIN estados_presupuestos ep ON pf.id_estado = ep.id
    WHERE pf.id_tarea = pb.id_tarea
    ORDER BY pf.created_at DESC
    LIMIT 1
  ) as estado_pf,
  EXISTS (
    SELECT 1 FROM liquidaciones_nuevas ln
    WHERE ln.id_tarea = pb.id_tarea
  ) as esta_liquidado,
  (
    SELECT ln.id
    FROM liquidaciones_nuevas ln
    WHERE ln.id_tarea = pb.id_tarea
    ORDER BY ln.created_at DESC
    LIMIT 1
  ) as id_liquidacion,
  EXTRACT(DAY FROM NOW() - pb.created_at)::INTEGER as dias_desde_creacion
FROM presupuestos_base pb
LEFT JOIN tareas t ON pb.id_tarea = t.id
LEFT JOIN estados_tareas et ON t.id_estado_nuevo = et.id
LEFT JOIN edificios e ON t.id_edificio = e.id
WHERE
  -- Ocultar solo si está liquidado
  NOT EXISTS (
    SELECT 1 FROM liquidaciones_nuevas ln
    WHERE ln.id_tarea = pb.id_tarea
  );

COMMENT ON VIEW public.vista_pb_admin IS 
'PB para admins con info completa y filtrado por liquidación.
OCULTA: Solo PB liquidados (flujo terminado).
INCLUYE: codigo_estado_pf para filtrado inteligente en frontend.';

-- ============================================
-- PERMISOS
-- ============================================

GRANT SELECT ON public.vista_pb_supervisor TO authenticated;
GRANT SELECT ON public.vista_pb_admin TO authenticated;

-- ============================================
-- AUDITORÍA Y DIAGNÓSTICO
-- ============================================
-- Consultas útiles para verificar el comportamiento

/*
-- Ver PB según rol supervisor
SELECT 
  code,
  titulo_tarea,
  aprobado,
  esta_liquidado,
  dias_desde_creacion
FROM vista_pb_supervisor
ORDER BY created_at DESC
LIMIT 10;

-- Ver PB según rol admin con info PF
SELECT 
  code,
  titulo_tarea,
  aprobado,
  tiene_presupuesto_final,
  estado_pf,
  esta_liquidado,
  dias_desde_creacion
FROM vista_pb_admin
ORDER BY created_at DESC
LIMIT 10;

-- Ver PB aprobados sin PF (admin debe actuar)
SELECT 
  code,
  titulo_tarea,
  total,
  dias_desde_creacion
FROM vista_pb_admin
WHERE aprobado = true 
  AND tiene_presupuesto_final = false
  AND esta_liquidado = false
ORDER BY dias_desde_creacion DESC;
*/

COMMIT;
