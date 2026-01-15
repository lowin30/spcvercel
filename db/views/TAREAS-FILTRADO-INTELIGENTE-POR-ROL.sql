-- ============================================
-- FILTRADO INTELIGENTE DE TAREAS POR ROL
-- ============================================
-- Objetivo: Centralizar la lógica de qué tareas ve cada rol
-- según el flujo de trabajo y las pausas/reactivaciones.
--
-- FLUJO DE TRABAJO:
-- 1. Supervisor crea PB → PAUSA (no ve tarea en Presupuestado/Enviado)
-- 2. Admin crea PF y envía → PAUSA ambos roles
-- 3. Cliente aprueba PF → REACTIVA ambos flujos
-- 4. Supervisor ejecuta y finaliza → PAUSA supervisor
-- 5. Admin factura y liquida → OCULTA para ambos
--
-- REGLAS:
-- - Supervisor tiene acceso solo a Presupuesto Base (PB)
-- - Admin tiene acceso solo a Presupuesto Final (PF)
-- - Supervisor NUNCA ve menciones de PF
-- - Listado limpio = solo tareas que requieren acción
--
-- AUTOR: Sistema SPC - Automatizaciones Centralizadas
-- FECHA: 2026-01-15
-- ============================================

BEGIN;

-- ============================================
-- VISTA PARA SUPERVISORES
-- ============================================
-- Muestra solo tareas donde el supervisor debe actuar
-- según las pausas y reactivaciones del flujo

DROP VIEW IF EXISTS public.vista_tareas_supervisor CASCADE;

CREATE VIEW public.vista_tareas_supervisor AS
SELECT 
  t.*,
  -- Verificar si tiene Presupuesto Base
  EXISTS (
    SELECT 1 FROM presupuestos_base pb 
    WHERE pb.id_tarea = t.id
  ) as tiene_presupuesto_base
FROM vista_tareas_completa t
WHERE 
  -- Estado NO es Liquidada (flujo terminado para todos)
  t.id_estado_nuevo != 9
  
  AND (
    -- CASO 1: NO tiene PB → Supervisor debe crearlo
    NOT EXISTS (
      SELECT 1 FROM presupuestos_base pb 
      WHERE pb.id_tarea = t.id
    )
    
    OR
    
    -- CASO 2: Tiene PB pero está en estado Aprobado → Debe ejecutar trabajo
    (
      EXISTS (
        SELECT 1 FROM presupuestos_base pb 
        WHERE pb.id_tarea = t.id
      )
      AND t.id_estado_nuevo = 5 -- Aprobado
    )
    
    OR
    
    -- CASO 3: Estado Reclamado → Siempre visible (problema a resolver)
    t.id_estado_nuevo = 8 -- Reclamado
    
    OR
    
    -- CASO 4: Estados iniciales que siempre debe ver
    t.id_estado_nuevo IN (1, 2, 10) -- Organizar, Preguntar, Posible
  );

COMMENT ON VIEW public.vista_tareas_supervisor IS 
'Tareas visibles para supervisores según flujo de trabajo. 
OCULTA: Tareas con PB en estados Presupuestado/Enviado/Facturado (supervisor pausado).
MUESTRA: Sin PB, Aprobado, Reclamado, estados iniciales.
Coherente con pausas/reactivaciones del flujo.';

-- ============================================
-- VISTA PARA ADMINS
-- ============================================
-- Admins ven todas las tareas excepto las ya liquidadas
-- (flujo completamente terminado)

DROP VIEW IF EXISTS public.vista_tareas_admin CASCADE;

CREATE VIEW public.vista_tareas_admin AS
SELECT 
  t.*,
  -- Verificar si tiene Presupuesto Base
  EXISTS (
    SELECT 1 FROM presupuestos_base pb 
    WHERE pb.id_tarea = t.id
  ) as tiene_presupuesto_base,
  -- Verificar si tiene Presupuesto Final
  EXISTS (
    SELECT 1 FROM presupuestos_finales pf 
    WHERE pf.id_tarea = t.id
  ) as tiene_presupuesto_final,
  -- Verificar si tiene factura
  EXISTS (
    SELECT 1 FROM facturas f
    INNER JOIN presupuestos_finales pf ON f.id_presupuesto_final = pf.id
    WHERE pf.id_tarea = t.id
  ) as tiene_factura,
  -- Verificar si está liquidada
  EXISTS (
    SELECT 1 FROM liquidaciones_nuevas ln
    WHERE ln.id_tarea = t.id
  ) as tiene_liquidacion
FROM vista_tareas_completa t
WHERE 
  -- ÚNICA CONDICIÓN: Estado NO es Liquidada
  t.id_estado_nuevo != 9;

COMMENT ON VIEW public.vista_tareas_admin IS 
'Tareas visibles para admins según flujo de trabajo.
OCULTA: Solo tareas en estado Liquidada (flujo completamente terminado).
MUESTRA: Todo lo demás con flags auxiliares para filtros avanzados.
Incluye verificaciones de PB, PF, factura y liquidación.';

-- ============================================
-- PERMISOS
-- ============================================

GRANT SELECT ON public.vista_tareas_supervisor TO authenticated;
GRANT SELECT ON public.vista_tareas_admin TO authenticated;

-- ============================================
-- AUDITORÍA Y DIAGNÓSTICO
-- ============================================
-- Consultas útiles para verificar el comportamiento

-- Ver cuántas tareas oculta/muestra cada vista
/*
-- Para supervisores
SELECT 
  'Total tareas' as metrica, 
  COUNT(*) as cantidad 
FROM vista_tareas_completa WHERE id_estado_nuevo != 9
UNION ALL
SELECT 
  'Visibles para supervisor' as metrica, 
  COUNT(*) as cantidad 
FROM vista_tareas_supervisor;

-- Para admins
SELECT 
  'Total tareas' as metrica, 
  COUNT(*) as cantidad 
FROM vista_tareas_completa
UNION ALL
SELECT 
  'Visibles para admin' as metrica, 
  COUNT(*) as cantidad 
FROM vista_tareas_admin;

-- Ver estados de tareas ocultas para supervisores
SELECT 
  t.id_estado_nuevo,
  et.nombre as estado,
  COUNT(*) as cantidad_oculta
FROM vista_tareas_completa t
LEFT JOIN estados_tareas et ON et.id = t.id_estado_nuevo
WHERE 
  t.id_estado_nuevo != 9
  AND t.id NOT IN (SELECT id FROM vista_tareas_supervisor)
GROUP BY t.id_estado_nuevo, et.nombre
ORDER BY cantidad_oculta DESC;
*/

COMMIT;
