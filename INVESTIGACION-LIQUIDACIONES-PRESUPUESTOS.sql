-- ============================================
-- INVESTIGACION: LIQUIDACIONES Y PRESUPUESTOS BASE
-- Solo Lectura - Análisis
-- ============================================

-- ============================================
-- 1. ESTRUCTURA DE LIQUIDACIONES_NUEVAS
-- ============================================

SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'liquidaciones_nuevas'
    AND table_schema = 'public'
ORDER BY ordinal_position;

-- ============================================
-- 2. VER SI HAY RELACION CON PRESUPUESTOS
-- ============================================

-- Ver campos de liquidaciones_nuevas
SELECT *
FROM liquidaciones_nuevas
LIMIT 3;

-- ============================================
-- 3. COMO SE DETERMINA SI ESTA LIQUIDADO?
-- ============================================

-- Opción A: Por presupuesto final
SELECT 
    pf.id as presupuesto_final_id,
    pf.code as presupuesto_final_code,
    pb.id as presupuesto_base_id,
    pb.code as presupuesto_base_code,
    ln.id as liquidacion_id,
    ln.code as liquidacion_code,
    CASE 
        WHEN ln.id IS NOT NULL THEN 'Liquidado'
        ELSE 'No liquidado'
    END as estado_liquidacion
FROM presupuestos_finales pf
INNER JOIN presupuestos_base pb ON pf.id_presupuesto_base = pb.id
LEFT JOIN liquidaciones_nuevas ln ON pf.id = ln.id_presupuesto_final
ORDER BY pf.id DESC
LIMIT 10;

-- ============================================
-- 4. PRESUPUESTOS BASE SIN PRESUPUESTO FINAL
-- ============================================

SELECT 
    pb.id,
    pb.code,
    pb.aprobado,
    pf.id as tiene_presupuesto_final
FROM presupuestos_base pb
LEFT JOIN presupuestos_finales pf ON pf.id_presupuesto_base = pb.id
WHERE pf.id IS NULL
ORDER BY pb.created_at DESC
LIMIT 5;

-- ============================================
-- 5. FLUJO COMPLETO
-- ============================================

SELECT 
    pb.id as pb_id,
    pb.code as pb_code,
    pb.aprobado as pb_aprobado,
    pf.id as pf_id,
    pf.code as pf_code,
    pf.aprobado as pf_aprobado,
    ln.id as liq_id,
    ln.code as liq_code,
    CASE 
        WHEN ln.id IS NOT NULL THEN 'Liquidado ✓'
        WHEN pf.id IS NOT NULL AND pf.aprobado = true THEN 'Con PF aprobado (pendiente liquidar)'
        WHEN pf.id IS NOT NULL AND pf.aprobado = false THEN 'Con PF sin aprobar'
        ELSE 'Sin presupuesto final'
    END as estado_flujo
FROM presupuestos_base pb
LEFT JOIN presupuestos_finales pf ON pf.id_presupuesto_base = pb.id
LEFT JOIN liquidaciones_nuevas ln ON pf.id = ln.id_presupuesto_final
ORDER BY pb.created_at DESC
LIMIT 10;

-- ============================================
-- 6. CONTEO POR ESTADO
-- ============================================

SELECT 
    CASE 
        WHEN ln.id IS NOT NULL THEN 'Liquidado'
        WHEN pf.id IS NOT NULL THEN 'Con presupuesto final'
        ELSE 'Solo base'
    END as estado,
    COUNT(*) as cantidad
FROM presupuestos_base pb
LEFT JOIN presupuestos_finales pf ON pf.id_presupuesto_base = pb.id
LEFT JOIN liquidaciones_nuevas ln ON pf.id = ln.id_presupuesto_final
GROUP BY 
    CASE 
        WHEN ln.id IS NOT NULL THEN 'Liquidado'
        WHEN pf.id IS NOT NULL THEN 'Con presupuesto final'
        ELSE 'Solo base'
    END
ORDER BY cantidad DESC;

-- ============================================
-- ANALISIS DE RESULTADOS
-- ============================================

/*
QUERY 1: Estructura liquidaciones_nuevas
  - Ver qué campos tiene
  - Buscar id_presupuesto_final o id_tarea

QUERY 2: Ejemplos de liquidaciones
  - Ver datos reales

QUERY 3: Relación con presupuestos
  - Cómo se detecta si está liquidado
  - Relación: presupuestos_base → presupuestos_finales → liquidaciones_nuevas

QUERY 4: Presupuestos base sin final
  - Ver cuántos presupuestos base no tienen presupuesto final

QUERY 5: Flujo completo
  - Ver toda la cadena
  - Detectar en qué etapa está cada presupuesto base

QUERY 6: Conteo
  - Ver distribución de estados

PROPUESTA DE FILTROS:

OPCIÓN 1 (SIMPLE - RECOMENDADA):
- Todos
- Pendientes aprobación (aprobado = false)
- Aprobados sin liquidar (aprobado = true AND sin liquidación)
- Liquidados (tienen liquidación)

OPCIÓN 2 (AVANZADA):
- Todos
- Solo base (sin presupuesto final)
- Con presupuesto final (sin liquidar)
- Liquidados

OPCIÓN 3 (MUY SIMPLE):
Mantener filtros actuales + agregar:
- Liquidados / No liquidados (toggle o tercera solapa)
*/
