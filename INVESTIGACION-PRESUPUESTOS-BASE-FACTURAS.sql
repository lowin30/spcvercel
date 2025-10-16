-- ============================================
-- INVESTIGACIÓN: PRESUPUESTOS BASE Y FACTURAS
-- ============================================

-- ============================================
-- 1. VERIFICAR ESTRUCTURA DE PRESUPUESTOS
-- ============================================
-- ¿Existe la relación presupuestos → presupuestos_base?

SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'presupuestos'
    AND column_name LIKE '%presupuesto%'
ORDER BY ordinal_position;

-- ============================================
-- 2. BUSCAR RELACIÓN ENTRE PRESUPUESTOS Y PRESUPUESTOS_BASE
-- ============================================

SELECT 
    tc.table_name, 
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.table_name = 'presupuestos'
    AND tc.constraint_type = 'FOREIGN KEY';

-- ============================================
-- 3. VERIFICAR SI EXISTEN PRESUPUESTOS FINALES CON BASE
-- ============================================

SELECT 
    COUNT(*) as total_presupuestos,
    COUNT(id_presupuesto_base) as con_base,
    COUNT(*) - COUNT(id_presupuesto_base) as sin_base
FROM presupuestos;

-- ============================================
-- 4. EJEMPLO DE PRESUPUESTOS CON BASE
-- ============================================

SELECT 
    p.id as presupuesto_final_id,
    p.code as presupuesto_final_code,
    p.id_presupuesto_base,
    pb.code as presupuesto_base_code,
    pb.aprobado as base_aprobado,
    pb.fecha_aprobacion,
    p.created_at as presupuesto_final_fecha
FROM presupuestos p
LEFT JOIN presupuestos_base pb ON p.id_presupuesto_base = pb.id
WHERE p.id_presupuesto_base IS NOT NULL
ORDER BY p.created_at DESC
LIMIT 10;

-- ============================================
-- 5. VERIFICAR VISTA ACTUAL vista_facturas_completa
-- ============================================

-- Ver definición de la vista
SELECT pg_get_viewdef('vista_facturas_completa', true);

-- ============================================
-- 6. RELACIÓN FACTURAS → PRESUPUESTOS → PRESUPUESTOS_BASE
-- ============================================

SELECT 
    f.id as factura_id,
    f.code as factura_code,
    f.total as factura_total,
    p.id as presupuesto_final_id,
    p.code as presupuesto_final_code,
    p.id_presupuesto_base,
    pb.code as presupuesto_base_code,
    pb.aprobado as base_aprobado,
    pb.total as base_total,
    pb.materiales as base_materiales,
    pb.mano_obra as base_mano_obra,
    pb.nota_pb as base_nota
FROM facturas f
LEFT JOIN presupuestos p ON f.id_presupuesto = p.id
LEFT JOIN presupuestos_base pb ON p.id_presupuesto_base = pb.id
WHERE pb.id IS NOT NULL
ORDER BY f.created_at DESC
LIMIT 10;

-- ============================================
-- 7. VERIFICAR PERMISOS EN TABLAS
-- ============================================

-- Políticas de seguridad en presupuestos_base
SELECT 
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'presupuestos_base';

-- Políticas de seguridad en facturas
SELECT 
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'facturas';

-- Políticas en vista_facturas_completa
SELECT 
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'vista_facturas_completa';

-- ============================================
-- 8. CASOS DE USO: ¿QUÉ SUPERVISORES PUEDEN VER?
-- ============================================

-- Simular como supervisor ve presupuestos_base
-- (esto depende de tus políticas RLS)
SELECT 
    pb.id,
    pb.code,
    pb.total,
    pb.aprobado,
    pb.id_supervisor
FROM presupuestos_base pb
WHERE pb.id_supervisor = '123e4567-e89b-12d3-a456-426614174000' -- UUID de ejemplo
LIMIT 5;

-- ============================================
-- 9. ANÁLISIS DE CAMPOS ÚTILES PARA AGREGAR
-- ============================================

-- ¿Qué campos de presupuestos_base serían útiles en facturas?
SELECT 
    'presupuesto_base_code' as campo_sugerido,
    'Para rastrear origen' as utilidad
UNION ALL
SELECT 
    'presupuesto_base_aprobado',
    'Para validar estado'
UNION ALL
SELECT 
    'presupuesto_base_nota',
    'Para contexto adicional'
UNION ALL
SELECT 
    'presupuesto_base_total',
    '⚠️ PELIGRO: Supervisores no deben ver montos de facturas';

-- ============================================
-- 10. PRESUPUESTOS BASE NO APROBADOS CON PRESUPUESTO FINAL
-- ============================================
-- Detectar inconsistencias: presupuestos finales creados
-- pero el base aún no está aprobado

SELECT 
    pb.id as base_id,
    pb.code as base_code,
    pb.aprobado as base_aprobado,
    pb.fecha_aprobacion,
    p.id as final_id,
    p.code as final_code,
    p.created_at as final_creado
FROM presupuestos p
INNER JOIN presupuestos_base pb ON p.id_presupuesto_base = pb.id
WHERE pb.aprobado = false
ORDER BY p.created_at DESC;

-- ============================================
-- 11. TABLA presupuestos - ESTRUCTURA COMPLETA
-- ============================================

SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'presupuestos'
ORDER BY ordinal_position;

-- ============================================
-- RESULTADOS ESPERADOS:
-- ============================================
-- Query 1: Ver si existe campo id_presupuesto_base en presupuestos
-- Query 2: Ver foreign keys de presupuestos
-- Query 3: Contar cuántos presupuestos tienen base
-- Query 4: Ver ejemplos reales de la relación
-- Query 5: Ver estructura de vista_facturas_completa
-- Query 6: Ver cadena completa facturas→presupuestos→base
-- Query 7: Ver políticas de seguridad (RLS)
-- Query 8: Simular acceso de supervisor
-- Query 9: Campos sugeridos para agregar
-- Query 10: Detectar inconsistencias
-- Query 11: Ver estructura completa de presupuestos

-- ============================================
-- EJECUTA ESTOS QUERIES Y COMPARTE RESULTADOS
-- ============================================
