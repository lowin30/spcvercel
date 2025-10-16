-- ============================================
-- INVESTIGACION COMPLETA DE SEGURIDAD
-- ESTE SCRIPT NO MODIFICA NADA - SOLO CONSULTA
-- ============================================

-- ============================================
-- 1. ESTADO DE RLS (Row Level Security)
-- ============================================

SELECT 
    schemaname as esquema,
    tablename as tabla,
    rowsecurity as rls_habilitado,
    CASE 
        WHEN rowsecurity THEN 'RLS ACTIVO'
        ELSE 'RLS DESHABILITADO'
    END as estado
FROM pg_tables
WHERE tablename IN ('presupuestos_finales', 'presupuestos_base', 'facturas')
    AND schemaname = 'public'
ORDER BY tablename;

-- ============================================
-- 2. POLITICAS RLS EN presupuestos_finales
-- ============================================

SELECT 
    policyname as nombre_politica,
    permissive as tipo_permiso,
    roles as roles_afectados,
    cmd as operacion,
    qual as condicion_using,
    with_check as condicion_with_check
FROM pg_policies
WHERE tablename = 'presupuestos_finales'
ORDER BY policyname;

-- ============================================
-- 3. POLITICAS RLS EN presupuestos_base
-- ============================================

SELECT 
    policyname as nombre_politica,
    permissive as tipo_permiso,
    roles as roles_afectados,
    cmd as operacion,
    qual as condicion_using,
    with_check as condicion_with_check
FROM pg_policies
WHERE tablename = 'presupuestos_base'
ORDER BY policyname;

-- ============================================
-- 4. POLITICAS RLS EN facturas
-- ============================================

SELECT 
    policyname as nombre_politica,
    permissive as tipo_permiso,
    roles as roles_afectados,
    cmd as operacion,
    qual as condicion_using,
    with_check as condicion_with_check
FROM pg_policies
WHERE tablename = 'facturas'
ORDER BY policyname;

-- ============================================
-- 5. PERMISOS DE TABLA presupuestos_finales
-- ============================================

SELECT 
    grantee as quien_tiene_acceso,
    privilege_type as tipo_permiso,
    is_grantable as puede_otorgar
FROM information_schema.role_table_grants
WHERE table_name = 'presupuestos_finales'
ORDER BY grantee, privilege_type;

-- ============================================
-- 6. PERMISOS DE TABLA presupuestos_base
-- ============================================

SELECT 
    grantee as quien_tiene_acceso,
    privilege_type as tipo_permiso,
    is_grantable as puede_otorgar
FROM information_schema.role_table_grants
WHERE table_name = 'presupuestos_base'
ORDER BY grantee, privilege_type;

-- ============================================
-- 7. PERMISOS DE TABLA facturas
-- ============================================

SELECT 
    grantee as quien_tiene_acceso,
    privilege_type as tipo_permiso,
    is_grantable as puede_otorgar
FROM information_schema.role_table_grants
WHERE table_name = 'facturas'
ORDER BY grantee, privilege_type;

-- ============================================
-- 8. TRIGGERS EN presupuestos_finales
-- ============================================

SELECT 
    trigger_name as nombre_trigger,
    event_manipulation as evento,
    action_timing as momento,
    action_statement as accion
FROM information_schema.triggers
WHERE event_object_table = 'presupuestos_finales'
ORDER BY trigger_name;

-- ============================================
-- 9. FUNCIONES RELACIONADAS CON presupuestos
-- ============================================

SELECT 
    routine_name as nombre_funcion,
    routine_type as tipo
FROM information_schema.routines
WHERE routine_name LIKE '%presupuesto%'
    AND routine_schema = 'public'
ORDER BY routine_name;

-- ============================================
-- 10. RELACION presupuestos_finales a presupuestos_base
-- ============================================

SELECT 
    tc.constraint_name as nombre_constraint,
    tc.table_name as tabla_origen,
    kcu.column_name as columna_origen,
    ccu.table_name as tabla_destino,
    ccu.column_name as columna_destino
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_name = 'presupuestos_finales'
ORDER BY tc.constraint_name;

-- ============================================
-- 11. ESTADISTICAS DE DATOS
-- ============================================

SELECT 
    COUNT(*) as total_presupuestos_finales,
    COUNT(id_presupuesto_base) as con_presupuesto_base,
    COUNT(*) - COUNT(id_presupuesto_base) as sin_presupuesto_base
FROM presupuestos_finales;

-- ============================================
-- 12. PRESUPUESTOS FINALES CON BASE
-- ============================================

SELECT 
    pf.id as pf_id,
    pf.code as pf_code,
    pf.total as pf_total,
    pf.aprobado as pf_aprobado,
    pf.id_presupuesto_base,
    pb.code as pb_code,
    pb.aprobado as pb_aprobado,
    pb.fecha_aprobacion as pb_fecha_aprobacion
FROM presupuestos_finales pf
LEFT JOIN presupuestos_base pb ON pf.id_presupuesto_base = pb.id
WHERE pf.id_presupuesto_base IS NOT NULL
ORDER BY pf.created_at DESC
LIMIT 10;

-- ============================================
-- 13. INCONSISTENCIAS - Base NO aprobado con Final creado
-- ============================================

SELECT 
    'INCONSISTENCIA' as alerta,
    pb.id as base_id,
    pb.code as base_code,
    pb.aprobado as base_aprobado,
    pf.id as final_id,
    pf.code as final_code,
    pf.created_at as final_fecha_creacion
FROM presupuestos_finales pf
INNER JOIN presupuestos_base pb ON pf.id_presupuesto_base = pb.id
WHERE pb.aprobado = false
ORDER BY pf.created_at DESC;

-- ============================================
-- 14. ROLES Y USUARIOS EN EL SISTEMA
-- ============================================

SELECT 
    rol,
    COUNT(*) as cantidad_usuarios
FROM usuarios
GROUP BY rol
ORDER BY rol;

-- ============================================
-- 15. USUARIOS EJEMPLO CON SU ROL
-- ============================================

SELECT 
    u.id,
    u.email,
    u.rol,
    u.nombre
FROM usuarios u
ORDER BY u.rol, u.nombre
LIMIT 20;

-- ============================================
-- 16. ESTRUCTURA DE LA TABLA usuarios
-- ============================================

SELECT 
    column_name as columna,
    data_type as tipo,
    is_nullable as permite_null,
    column_default as valor_default
FROM information_schema.columns
WHERE table_name = 'usuarios'
ORDER BY ordinal_position;

-- ============================================
-- 17. CADENA COMPLETA facturas a presupuestos_finales a presupuestos_base
-- ============================================

SELECT 
    f.id as factura_id,
    f.code as factura_code,
    f.total as factura_total,
    f.pagada as factura_pagada,
    pf.id as pf_id,
    pf.code as pf_code,
    pf.aprobado as pf_aprobado,
    pf.id_presupuesto_base,
    pb.code as pb_code,
    pb.aprobado as pb_aprobado
FROM facturas f
LEFT JOIN presupuestos_finales pf ON f.id_presupuesto_final = pf.id
LEFT JOIN presupuestos_base pb ON pf.id_presupuesto_base = pb.id
ORDER BY f.created_at DESC
LIMIT 10;

-- ============================================
-- 18. VISTAS QUE USEN presupuestos_finales
-- ============================================

SELECT 
    table_name as nombre_vista
FROM information_schema.views
WHERE view_definition LIKE '%presupuestos_finales%'
    AND table_schema = 'public';

-- ============================================
-- 19. INDICES EN presupuestos_finales
-- ============================================

SELECT 
    indexname as nombre_indice,
    indexdef as definicion
FROM pg_indexes
WHERE tablename = 'presupuestos_finales';

-- ============================================
-- IMPORTANTE
-- ============================================
-- Este script es 100% seguro
-- NO modifica datos
-- NO elimina politicas
-- NO cambia permisos
-- SOLO consulta informacion
