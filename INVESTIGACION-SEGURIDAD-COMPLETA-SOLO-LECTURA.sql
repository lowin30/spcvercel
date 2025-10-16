-- ============================================
-- 🔍 INVESTIGACIÓN COMPLETA DE SEGURIDAD
-- ⚠️ ESTE SCRIPT NO MODIFICA NADA - SOLO CONSULTA
-- ============================================

-- ============================================
-- 1️⃣ ESTADO DE RLS (Row Level Security)
-- ============================================

SELECT 
    schemaname as esquema,
    tablename as tabla,
    rowsecurity as rls_habilitado,
    CASE 
        WHEN rowsecurity THEN '✅ RLS ACTIVO'
        ELSE '❌ RLS DESHABILITADO (PELIGRO)'
    END as estado
FROM pg_tables
WHERE tablename IN ('presupuestos_finales', 'presupuestos_base', 'facturas')
    AND schemaname = 'public'
ORDER BY tablename;

-- ============================================
-- 2️⃣ POLÍTICAS RLS ACTUALES EN presupuestos_finales
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

-- Si devuelve 0 filas = NO HAY POLÍTICAS (todos pueden acceder)

-- ============================================
-- 3️⃣ POLÍTICAS RLS EN presupuestos_base
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
-- 4️⃣ POLÍTICAS RLS EN facturas
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
-- 5️⃣ PERMISOS DE TABLA presupuestos_finales
-- ============================================

SELECT 
    grantee as quien_tiene_acceso,
    privilege_type as tipo_permiso,
    is_grantable as puede_otorgar
FROM information_schema.role_table_grants
WHERE table_name = 'presupuestos_finales'
ORDER BY grantee, privilege_type;

-- ============================================
-- 6️⃣ PERMISOS DE TABLA presupuestos_base
-- ============================================

SELECT 
    grantee as quien_tiene_acceso,
    privilege_type as tipo_permiso,
    is_grantable as puede_otorgar
FROM information_schema.role_table_grants
WHERE table_name = 'presupuestos_base'
ORDER BY grantee, privilege_type;

-- ============================================
-- 7️⃣ PERMISOS DE TABLA facturas
-- ============================================

SELECT 
    grantee as quien_tiene_acceso,
    privilege_type as tipo_permiso,
    is_grantable as puede_otorgar
FROM information_schema.role_table_grants
WHERE table_name = 'facturas'
ORDER BY grantee, privilege_type;

-- ============================================
-- 8️⃣ TRIGGERS EN presupuestos_finales
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
-- 9️⃣ FUNCIONES RELACIONADAS CON presupuestos
-- ============================================

SELECT 
    routine_name as nombre_funcion,
    routine_type as tipo,
    routine_definition as definicion
FROM information_schema.routines
WHERE routine_name LIKE '%presupuesto%'
    AND routine_schema = 'public'
ORDER BY routine_name;

-- ============================================
-- 🔟 RELACIÓN presupuestos_finales → presupuestos_base
-- ============================================

-- Ver foreign keys
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
-- 1️⃣1️⃣ ESTADÍSTICAS DE DATOS
-- ============================================

-- Presupuestos finales totales
SELECT 
    COUNT(*) as total_presupuestos_finales,
    COUNT(id_presupuesto_base) as con_presupuesto_base,
    COUNT(*) - COUNT(id_presupuesto_base) as sin_presupuesto_base
FROM presupuestos_finales;

-- ============================================
-- 1️⃣2️⃣ PRESUPUESTOS FINALES CON BASE
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
-- 1️⃣3️⃣ INCONSISTENCIAS: Base NO aprobado con Final creado
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

-- Si devuelve filas = HAY INCONSISTENCIAS

-- ============================================
-- 1️⃣4️⃣ ROLES Y USUARIOS EN EL SISTEMA
-- ============================================

-- Contar usuarios por rol (tabla custom)
SELECT 
    rol,
    COUNT(*) as cantidad_usuarios
FROM usuarios
GROUP BY rol
ORDER BY rol;

-- Ver algunos usuarios ejemplo con su rol
SELECT 
    u.id,
    u.email,
    u.rol,
    u.nombre
FROM usuarios u
ORDER BY u.rol, u.nombre
LIMIT 20;

-- ============================================
-- 1️⃣5️⃣ ESTRUCTURA DE LA TABLA usuarios
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
-- 1️⃣6️⃣ VERIFICAR ACCESO ACTUAL DE SUPERVISORES
-- ============================================

-- Ver cuántos supervisores hay
SELECT COUNT(*) as total_supervisores
FROM usuarios
WHERE rol = 'supervisor';

-- Ver cuántos admins hay
SELECT COUNT(*) as total_admins
FROM usuarios
WHERE rol = 'admin';

-- ============================================
-- 1️⃣7️⃣ CADENA COMPLETA: facturas → presupuestos_finales → presupuestos_base
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
-- 1️⃣8️⃣ VERIFICAR SI HAY VISTAS QUE USEN presupuestos_finales
-- ============================================

SELECT 
    table_name as nombre_vista,
    view_definition as definicion
FROM information_schema.views
WHERE view_definition LIKE '%presupuestos_finales%'
    AND table_schema = 'public';

-- ============================================
-- 1️⃣9️⃣ ÍNDICES EN presupuestos_finales
-- ============================================

SELECT 
    indexname as nombre_indice,
    indexdef as definicion
FROM pg_indexes
WHERE tablename = 'presupuestos_finales';

-- ============================================
-- 2️⃣0️⃣ COMENTARIOS EN TABLAS (documentación)
-- ============================================

SELECT 
    obj_description('presupuestos_finales'::regclass) as comentario_tabla;

-- ============================================
-- 📊 RESUMEN DE ANÁLISIS
-- ============================================

/*
DESPUÉS DE EJECUTAR TODOS LOS QUERIES, ANALIZA:

✅ Query 1: 
   - Si rls_habilitado = false → PROBLEMA DE SEGURIDAD
   - presupuestos_finales debe tener RLS = true

✅ Query 2, 3, 4:
   - Si presupuestos_finales NO tiene políticas → TODOS pueden acceder
   - Si presupuestos_base tiene políticas correctas → BIEN
   - Si facturas tiene políticas correctas → BIEN

✅ Query 5, 6, 7:
   - Si 'authenticated' tiene todos los permisos → NORMAL (pero RLS debe proteger)
   - Sin RLS = PELIGRO

✅ Query 8, 9:
   - Ver qué triggers están activos
   - Ver qué funciones existen

✅ Query 10:
   - Confirmar relación id_presupuesto_base

✅ Query 13:
   - Si devuelve filas → HAY INCONSISTENCIAS (bases no aprobados)
   - Necesitaremos script de corrección

✅ Query 16:
   - Confirmar cuántos usuarios de cada rol
   - Importante para testing

✅ Query 17:
   - Ver cadena completa de relaciones
   - Confirmar que todo está conectado
*/

-- ============================================
-- ⚠️ IMPORTANTE
-- ============================================

/*
ESTE SCRIPT ES 100% SEGURO:
- ❌ NO modifica datos
- ❌ NO elimina políticas
- ❌ NO cambia permisos
- ❌ NO altera tablas
- ✅ SOLO consulta información

Ejecuta cada query por separado y comparte los resultados.
Luego te daré el script de corrección personalizado.
*/
