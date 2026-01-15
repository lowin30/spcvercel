-- ============================================
-- SCRIPT-CORREGIR-TAREAS-FINALIZADAS-SIN-PF-RECHAZADO.sql
-- ============================================
-- 
-- PROBLEMA:
-- Tareas finalizadas (manualmente o automáticamente) que tienen
-- presupuestos finales que NO están rechazados, causando que
-- aparezcan en el listado de liquidaciones.
--
-- CASOS A CORREGIR:
-- 1. Tarea marcada como finalizada=true pero PF activo
-- 2. Tarea con estado "Cerrado sin respuesta" pero PF activo
-- 3. Tarea con estado "Terminado" pero PF activo
-- 4. Tareas sin partes de trabajo ni gastos
--
-- SOLUCIÓN:
-- Este script identifica y corrige automáticamente todas estas
-- inconsistencias en la base de datos.
--
-- USO:
-- 1. Ejecutar sección DIAGNÓSTICO primero (solo consultas)
-- 2. Revisar resultados
-- 3. Ejecutar sección CORRECCIÓN (hace cambios)
-- 4. Validar en /dashboard/liquidaciones/nueva
--
-- FECHA: 2026-01-15
-- ============================================

-- ============================================
-- SECCIÓN 1: DIAGNÓSTICO
-- ============================================
-- Solo consultas, NO hace cambios

-- 1.1 Obtener IDs de estados relevantes
WITH estados_relevantes AS (
  SELECT 
    (SELECT id FROM estados_tareas WHERE codigo = 'vencido' LIMIT 1) as estado_vencido,
    (SELECT id FROM estados_tareas WHERE codigo = 'terminado' LIMIT 1) as estado_terminado,
    (SELECT id FROM estados_presupuestos WHERE codigo = 'rechazado' LIMIT 1) as estado_pf_rechazado,
    (SELECT id FROM estados_presupuestos WHERE codigo = 'enviado' LIMIT 1) as estado_pf_enviado,
    (SELECT id FROM estados_presupuestos WHERE codigo = 'aprobado' LIMIT 1) as estado_pf_aprobado
)
SELECT * FROM estados_relevantes;

-- 1.2 Identificar tareas finalizadas con PF que NO están rechazados
WITH estados AS (
  SELECT 
    (SELECT id FROM estados_tareas WHERE codigo = 'vencido' LIMIT 1) as estado_vencido,
    (SELECT id FROM estados_tareas WHERE codigo = 'terminado' LIMIT 1) as estado_terminado,
    (SELECT id FROM estados_presupuestos WHERE codigo = 'rechazado' LIMIT 1) as estado_pf_rechazado
),
tareas_problematicas AS (
  SELECT DISTINCT
    t.id as tarea_id,
    t.code as tarea_code,
    t.finalizada,
    t.id_estado_nuevo,
    et.nombre as estado_tarea_nombre,
    et.codigo as estado_tarea_codigo,
    pf.id as pf_id,
    pf.code as pf_code,
    pf.id_estado as pf_estado_id,
    ep.nombre as pf_estado_nombre,
    ep.codigo as pf_estado_codigo,
    -- Contar partes y gastos
    (SELECT COUNT(*) FROM partes_trabajo pt WHERE pt.id_tarea = t.id) as cant_partes,
    (SELECT COUNT(*) FROM gastos_partes gp 
     JOIN partes_trabajo pt ON gp.id_parte = pt.id 
     WHERE pt.id_tarea = t.id) as cant_gastos
  FROM tareas t
  CROSS JOIN estados e
  LEFT JOIN estados_tareas et ON t.id_estado_nuevo = et.id
  LEFT JOIN presupuestos_finales pf ON pf.id_tarea = t.id
  LEFT JOIN estados_presupuestos ep ON pf.id_estado = ep.id
  WHERE (
    -- Condición 1: Tarea finalizada
    t.finalizada = TRUE
    OR
    -- Condición 2: Estado es "Cerrado sin respuesta" (vencido)
    t.id_estado_nuevo = e.estado_vencido
    OR
    -- Condición 3: Estado es "Terminado"
    t.id_estado_nuevo = e.estado_terminado
  )
  AND pf.id IS NOT NULL -- Tiene presupuesto final
  AND pf.id_estado IS DISTINCT FROM e.estado_pf_rechazado -- PF NO está rechazado
)
SELECT 
  tarea_id,
  tarea_code,
  CASE 
    WHEN finalizada THEN '✅ Finalizada' 
    ELSE '❌ No finalizada' 
  END as estado_finalizada,
  estado_tarea_nombre,
  pf_id,
  pf_code,
  pf_estado_nombre,
  cant_partes,
  cant_gastos,
  CASE 
    WHEN cant_partes = 0 AND cant_gastos = 0 THEN '⚠️ SIN ACTIVIDAD'
    ELSE '✓ Con actividad'
  END as tiene_actividad
FROM tareas_problematicas
ORDER BY tarea_id;

-- 1.3 Resumen de impacto
WITH estados AS (
  SELECT 
    (SELECT id FROM estados_tareas WHERE codigo = 'vencido' LIMIT 1) as estado_vencido,
    (SELECT id FROM estados_tareas WHERE codigo = 'terminado' LIMIT 1) as estado_terminado,
    (SELECT id FROM estados_presupuestos WHERE codigo = 'rechazado' LIMIT 1) as estado_pf_rechazado
),
tareas_afectadas AS (
  SELECT DISTINCT t.id
  FROM tareas t
  CROSS JOIN estados e
  LEFT JOIN presupuestos_finales pf ON pf.id_tarea = t.id
  WHERE (
    t.finalizada = TRUE
    OR t.id_estado_nuevo = e.estado_vencido
    OR t.id_estado_nuevo = e.estado_terminado
  )
  AND pf.id IS NOT NULL
  AND pf.id_estado IS DISTINCT FROM e.estado_pf_rechazado
)
SELECT 
  COUNT(*) as total_tareas_afectadas,
  COUNT(*) || ' presupuestos finales serán auto-rechazados' as accion_a_realizar
FROM tareas_afectadas;


-- ============================================
-- SECCIÓN 2: CORRECCIÓN
-- ============================================
-- ESTE BLOQUE HACE CAMBIOS EN LA BASE DE DATOS

DO $$
DECLARE
  v_estado_rechazado_id INTEGER;
  v_estado_vencido_id INTEGER;
  v_estado_terminado_id INTEGER;
  v_pf_corregidos INTEGER := 0;
  v_tareas_afectadas INTEGER := 0;
  rec RECORD;
BEGIN
  RAISE NOTICE '=== INICIANDO CORRECCIÓN MASIVA ===';
  RAISE NOTICE 'Timestamp: %', NOW();
  
  -- Obtener IDs de estados
  SELECT id INTO v_estado_rechazado_id
  FROM estados_presupuestos
  WHERE codigo = 'rechazado'
  LIMIT 1;
  
  SELECT id INTO v_estado_vencido_id
  FROM estados_tareas
  WHERE codigo = 'vencido'
  LIMIT 1;
  
  SELECT id INTO v_estado_terminado_id
  FROM estados_tareas
  WHERE codigo = 'terminado'
  LIMIT 1;
  
  -- Validar que existen los estados necesarios
  IF v_estado_rechazado_id IS NULL THEN
    RAISE EXCEPTION 'No se encontró el estado "rechazado" en estados_presupuestos';
  END IF;
  
  RAISE NOTICE 'Estado rechazado ID: %', v_estado_rechazado_id;
  RAISE NOTICE 'Estado vencido ID: %', v_estado_vencido_id;
  RAISE NOTICE 'Estado terminado ID: %', v_estado_terminado_id;
  RAISE NOTICE '';
  
  -- Identificar y corregir cada tarea problemática
  FOR rec IN
    SELECT DISTINCT
      t.id as tarea_id,
      t.code as tarea_code,
      pf.id as pf_id,
      pf.code as pf_code,
      ep.nombre as pf_estado_actual,
      (SELECT COUNT(*) FROM partes_trabajo pt WHERE pt.id_tarea = t.id) as cant_partes,
      (SELECT COUNT(*) FROM gastos_partes gp 
       JOIN partes_trabajo pt ON gp.id_parte = pt.id 
       WHERE pt.id_tarea = t.id) as cant_gastos
    FROM tareas t
    LEFT JOIN presupuestos_finales pf ON pf.id_tarea = t.id
    LEFT JOIN estados_presupuestos ep ON pf.id_estado = ep.id
    WHERE (
      t.finalizada = TRUE
      OR t.id_estado_nuevo = v_estado_vencido_id
      OR t.id_estado_nuevo = v_estado_terminado_id
    )
    AND pf.id IS NOT NULL
    AND pf.id_estado IS DISTINCT FROM v_estado_rechazado_id
    ORDER BY t.id
  LOOP
    -- Actualizar el presupuesto final a rechazado
    UPDATE presupuestos_finales
    SET id_estado = v_estado_rechazado_id,
        updated_at = NOW()
    WHERE id = rec.pf_id;
    
    v_pf_corregidos := v_pf_corregidos + 1;
    
    RAISE NOTICE 'Tarea #% (%) → PF #% (%) estado [%] → RECHAZADO | Partes: % | Gastos: %',
      rec.tarea_id,
      rec.tarea_code,
      rec.pf_id,
      rec.pf_code,
      rec.pf_estado_actual,
      rec.cant_partes,
      rec.cant_gastos;
  END LOOP;
  
  -- Contar tareas únicas afectadas
  SELECT COUNT(DISTINCT id) INTO v_tareas_afectadas
  FROM tareas t
  WHERE (
    t.finalizada = TRUE
    OR t.id_estado_nuevo = v_estado_vencido_id
    OR t.id_estado_nuevo = v_estado_terminado_id
  );
  
  RAISE NOTICE '';
  RAISE NOTICE '=== CORRECCIÓN COMPLETADA ===';
  RAISE NOTICE 'Presupuestos finales corregidos: %', v_pf_corregidos;
  RAISE NOTICE 'Tareas afectadas: %', v_tareas_afectadas;
  RAISE NOTICE 'Timestamp: %', NOW();
  
  IF v_pf_corregidos = 0 THEN
    RAISE NOTICE '✅ No se encontraron inconsistencias. Base de datos está correcta.';
  ELSE
    RAISE NOTICE '✅ Corrección exitosa. Todas las tareas finalizadas ahora tienen PF rechazados.';
    RAISE NOTICE '📋 Verificar en: /dashboard/liquidaciones/nueva';
  END IF;
  
END $$;


-- ============================================
-- SECCIÓN 3: VALIDACIÓN POST-CORRECCIÓN
-- ============================================
-- Ejecutar después de la corrección para confirmar

-- 3.1 Verificar que no quedan tareas problemáticas
WITH estados AS (
  SELECT 
    (SELECT id FROM estados_tareas WHERE codigo = 'vencido' LIMIT 1) as estado_vencido,
    (SELECT id FROM estados_tareas WHERE codigo = 'terminado' LIMIT 1) as estado_terminado,
    (SELECT id FROM estados_presupuestos WHERE codigo = 'rechazado' LIMIT 1) as estado_pf_rechazado
),
tareas_restantes AS (
  SELECT DISTINCT t.id
  FROM tareas t
  CROSS JOIN estados e
  LEFT JOIN presupuestos_finales pf ON pf.id_tarea = t.id
  WHERE (
    t.finalizada = TRUE
    OR t.id_estado_nuevo = e.estado_vencido
    OR t.id_estado_nuevo = e.estado_terminado
  )
  AND pf.id IS NOT NULL
  AND pf.id_estado IS DISTINCT FROM e.estado_pf_rechazado
)
SELECT 
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ CORRECTO: No hay tareas finalizadas con PF activos'
    ELSE '❌ ERROR: Aún quedan ' || COUNT(*) || ' tareas con problemas'
  END as resultado_validacion
FROM tareas_restantes;

-- 3.2 Estadísticas finales
SELECT 
  'Total tareas finalizadas' as metrica,
  COUNT(*) as cantidad
FROM tareas
WHERE finalizada = TRUE

UNION ALL

SELECT 
  'PF rechazados de tareas finalizadas',
  COUNT(DISTINCT pf.id)
FROM presupuestos_finales pf
JOIN tareas t ON pf.id_tarea = t.id
WHERE t.finalizada = TRUE
  AND pf.id_estado = (SELECT id FROM estados_presupuestos WHERE codigo = 'rechazado' LIMIT 1)

UNION ALL

SELECT 
  'Tareas "Cerrado sin respuesta"',
  COUNT(*)
FROM tareas
WHERE id_estado_nuevo = (SELECT id FROM estados_tareas WHERE codigo = 'vencido' LIMIT 1);

-- ============================================
-- NOTAS FINALES
-- ============================================
-- 
-- Después de ejecutar este script:
-- 1. Las tareas finalizadas tendrán sus PF rechazados
-- 2. No aparecerán en /dashboard/liquidaciones/nueva
-- 3. El trigger TRIGGER-AUTO-RECHAZAR-PF-AL-FINALIZAR-TAREA.sql
--    prevendrá que esto vuelva a ocurrir
--
-- Casos específicos resueltos:
-- - Tarea 63: AUTO-FINALIZADA con PF activo
-- - Tarea 156: Cerrado sin respuesta con PF activo
-- - Tarea 70: Ya tenía PF rechazado (no se modifica)
-- - Todas las demás tareas en situación similar
--
-- ============================================
