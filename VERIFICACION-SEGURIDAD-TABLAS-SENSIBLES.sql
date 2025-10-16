-- ============================================
-- VERIFICACION DE SEGURIDAD - TABLAS SENSIBLES
-- SOLO LECTURA - NO MODIFICA NADA
-- ============================================

-- ============================================
-- 1. ESTADO RLS DE TODAS LAS TABLAS SENSIBLES
-- ============================================

SELECT 
    tablename as tabla,
    rowsecurity as rls_habilitado,
    CASE 
        WHEN rowsecurity THEN 'RLS ACTIVO'
        ELSE 'RLS DESHABILITADO - PELIGRO'
    END as estado
FROM pg_tables
WHERE tablename IN (
    'facturas',
    'vista_facturas_completa',
    'pagos',
    'ajustes_facturas',
    'presupuestos_finales',
    'items_factura'
)
AND schemaname = 'public'
ORDER BY tablename;

-- ============================================
-- 2. POLITICAS RLS EN facturas
-- ============================================

SELECT 
    policyname as nombre,
    roles as para_quien,
    cmd as operacion,
    qual as condicion
FROM pg_policies
WHERE tablename = 'facturas'
ORDER BY policyname;

-- ============================================
-- 3. POLITICAS RLS EN vista_facturas_completa
-- ============================================

SELECT 
    policyname as nombre,
    roles as para_quien,
    cmd as operacion,
    qual as condicion
FROM pg_policies
WHERE tablename = 'vista_facturas_completa'
ORDER BY policyname;

-- ============================================
-- 4. POLITICAS RLS EN pagos
-- ============================================

SELECT 
    policyname as nombre,
    roles as para_quien,
    cmd as operacion,
    qual as condicion
FROM pg_policies
WHERE tablename = 'pagos'
ORDER BY policyname;

-- ============================================
-- 5. POLITICAS RLS EN ajustes_facturas
-- ============================================

SELECT 
    policyname as nombre,
    roles as para_quien,
    cmd as operacion,
    qual as condicion
FROM pg_policies
WHERE tablename = 'ajustes_facturas'
ORDER BY policyname;

-- ============================================
-- 6. POLITICAS RLS EN items_factura
-- ============================================

SELECT 
    policyname as nombre,
    roles as para_quien,
    cmd as operacion,
    qual as condicion
FROM pg_policies
WHERE tablename = 'items_factura'
ORDER BY policyname;

-- ============================================
-- 7. PERMISOS DE TABLA facturas
-- ============================================

SELECT 
    grantee as quien,
    privilege_type as permiso
FROM information_schema.role_table_grants
WHERE table_name = 'facturas'
ORDER BY grantee, privilege_type;

-- ============================================
-- 8. PERMISOS DE VISTA vista_facturas_completa
-- ============================================

SELECT 
    grantee as quien,
    privilege_type as permiso
FROM information_schema.role_table_grants
WHERE table_name = 'vista_facturas_completa'
ORDER BY grantee, privilege_type;

-- ============================================
-- 9. PERMISOS DE TABLA pagos
-- ============================================

SELECT 
    grantee as quien,
    privilege_type as permiso
FROM information_schema.role_table_grants
WHERE table_name = 'pagos'
ORDER BY grantee, privilege_type;

-- ============================================
-- 10. PERMISOS DE TABLA ajustes_facturas
-- ============================================

SELECT 
    grantee as quien,
    privilege_type as permiso
FROM information_schema.role_table_grants
WHERE table_name = 'ajustes_facturas'
ORDER BY grantee, privilege_type;

-- ============================================
-- 11. VERIFICAR SI vista_facturas_completa ES VISTA
-- ============================================

SELECT 
    table_name as nombre,
    table_type as tipo
FROM information_schema.tables
WHERE table_name IN ('facturas', 'vista_facturas_completa')
    AND table_schema = 'public'
ORDER BY table_name;

-- ============================================
-- 12. RESUMEN POLITICAS - TODAS LAS TABLAS SENSIBLES
-- ============================================

SELECT 
    tablename as tabla,
    COUNT(*) as cantidad_politicas,
    string_agg(DISTINCT policyname, ', ') as nombres_politicas
FROM pg_policies
WHERE tablename IN (
    'facturas',
    'vista_facturas_completa',
    'pagos',
    'ajustes_facturas',
    'presupuestos_finales',
    'items_factura'
)
GROUP BY tablename
ORDER BY tablename;

-- ============================================
-- ANALISIS DE RESULTADOS
-- ============================================

/*
QUERY 1: Estado RLS
- Si alguna tabla muestra "RLS DESHABILITADO" = PROBLEMA CRITICO
- Todas deben tener RLS ACTIVO

QUERY 2-6: Politicas por tabla
- Si devuelve 0 filas = NO HAY PROTECCION (todos pueden acceder)
- Debe existir al menos 1 politica que valide rol = 'admin'

QUERY 7-10: Permisos
- authenticated con permisos = NORMAL (RLS debe proteger)
- Sin RLS = PELIGRO

QUERY 11: Tipo de objeto
- vista_facturas_completa debe ser VIEW
- facturas debe ser BASE TABLE

QUERY 12: Resumen
- Ver cuantas politicas tiene cada tabla
- Detectar tablas sin proteccion

RESULTADO ESPERADO:
- facturas: Solo admin (get_my_role() = 'admin')
- vista_facturas_completa: Solo admin o sin politicas si es vista material
- pagos: Solo admin
- ajustes_facturas: Solo admin
- items_factura: Solo admin
*/

-- ============================================
-- TABLAS QUE DEBEN ESTAR PROTEGIDAS
-- ============================================

/*
CRITICO - SOLO ADMIN:
✓ facturas
✓ vista_facturas_completa (si tiene RLS)
✓ pagos
✓ ajustes_facturas
✓ items_factura
✓ presupuestos_finales

PERMITIDO - ADMIN + SUPERVISOR:
✓ presupuestos_base (supervisores ven los suyos)
✓ tareas (supervisores ven las suyas)

PERMITIDO - TODOS:
✓ edificios
✓ productos
✓ estados
*/
