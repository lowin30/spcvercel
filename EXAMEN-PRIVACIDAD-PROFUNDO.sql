-- ============================================
-- EXAMEN PROFUNDO DE PRIVACIDAD Y SEGURIDAD
-- ESTE SCRIPT NO MODIFICA NADA - SOLO CONSULTA
-- ============================================

-- ============================================
-- 1. VERIFICAR FUNCION get_my_role() EXISTE
-- ============================================

SELECT 
    routine_name as nombre_funcion,
    routine_definition as definicion
FROM information_schema.routines
WHERE routine_name = 'get_my_role'
    AND routine_schema = 'public';

-- Si devuelve 0 filas = la funcion NO existe (problema)

-- ============================================
-- 2. POLITICA COMPLETA DE presupuestos_finales
-- ============================================

SELECT 
    policyname as nombre,
    permissive as tipo,
    roles as para_roles,
    cmd as operacion,
    qual as condicion_using,
    with_check as condicion_with_check
FROM pg_policies
WHERE tablename = 'presupuestos_finales';

-- ============================================
-- 3. POLITICAS DE presupuestos_base (supervisores pueden ver)
-- ============================================

SELECT 
    policyname as nombre,
    permissive as tipo,
    roles as para_roles,
    cmd as operacion,
    qual as condicion_using,
    with_check as condicion_with_check
FROM pg_policies
WHERE tablename = 'presupuestos_base'
ORDER BY policyname;

-- ============================================
-- 4. POLITICAS DE facturas (solo admin)
-- ============================================

SELECT 
    policyname as nombre,
    permissive as tipo,
    roles as para_roles,
    cmd as operacion,
    qual as condicion_using,
    with_check as condicion_with_check
FROM pg_policies
WHERE tablename = 'facturas'
ORDER BY policyname;

-- ============================================
-- 5. TODAS LAS FUNCIONES DE ROL/SEGURIDAD
-- ============================================

SELECT 
    routine_name as nombre_funcion,
    routine_type as tipo
FROM information_schema.routines
WHERE (
    routine_name LIKE '%role%' 
    OR routine_name LIKE '%rol%'
    OR routine_name LIKE '%auth%'
    OR routine_name LIKE '%permission%'
)
AND routine_schema = 'public'
ORDER BY routine_name;

-- ============================================
-- 6. VISTAS QUE SUPERVISORES PODRIAN VER
-- ============================================

SELECT 
    table_name as nombre_vista
FROM information_schema.views
WHERE table_schema = 'public'
    AND (
        view_definition LIKE '%presupuestos_finales%'
        OR view_definition LIKE '%facturas%'
    )
ORDER BY table_name;

-- ============================================
-- 7. POLITICAS EN TODAS LAS TABLAS SENSIBLES
-- ============================================

SELECT 
    schemaname,
    tablename,
    policyname,
    roles,
    cmd,
    qual
FROM pg_policies
WHERE tablename IN (
    'presupuestos_finales',
    'presupuestos_base',
    'facturas',
    'items_factura',
    'pagos',
    'ajustes_facturas'
)
ORDER BY tablename, policyname;

-- ============================================
-- 8. VERIFICAR presupuestos_finales SIN presupuesto_base
-- ============================================

SELECT 
    COUNT(*) as total_sin_base,
    COUNT(CASE WHEN aprobado THEN 1 END) as aprobados_sin_base,
    COUNT(CASE WHEN NOT aprobado THEN 1 END) as pendientes_sin_base
FROM presupuestos_finales
WHERE id_presupuesto_base IS NULL;

-- ============================================
-- 9. EJEMPLO DE presupuestos_finales SIN base
-- ============================================

SELECT 
    id,
    code,
    total,
    aprobado,
    id_presupuesto_base,
    created_at
FROM presupuestos_finales
WHERE id_presupuesto_base IS NULL
ORDER BY created_at DESC
LIMIT 5;

-- ============================================
-- 10. ESTRUCTURA COMPLETA DE presupuestos_finales
-- ============================================

SELECT 
    column_name as columna,
    data_type as tipo,
    is_nullable as permite_null,
    column_default as valor_default
FROM information_schema.columns
WHERE table_name = 'presupuestos_finales'
ORDER BY ordinal_position;

-- ============================================
-- ANALISIS DE RESULTADOS
-- ============================================

/*
QUERY 1: Si get_my_role() NO existe
  → La politica actual NO funciona
  → Necesitamos crear la funcion o cambiar la politica

QUERY 2: Confirmar que solo admin puede acceder

QUERY 3: Confirmar que supervisores SI pueden ver presupuestos_base
  → Esto es correcto segun tus requisitos

QUERY 4: Confirmar que solo admin puede ver facturas

QUERY 5: Ver que funciones de seguridad existen

QUERY 6: Ver si hay vistas que expongan datos sensibles

QUERY 7: Vista completa de TODAS las politicas sensibles

QUERY 8-9: Ver cuantos presupuestos finales NO tienen base
  → Si hay muchos = es normal en tu flujo
  → Si hay pocos = las inconsistencias son el problema

QUERY 10: Ver estructura completa de presupuestos_finales
  → Ver que campos se autorrellenan
  → Ver valores default
*/

-- ============================================
-- RECOMENDACIONES BASADAS EN LO QUE DIJISTE
-- ============================================

/*
1. presupuestos_finales con id_presupuesto_base NULL = OK
   - Usuario puede crear rapido sin base
   - Campos en 0 si no hay base
   
2. presupuestos_finales con id_presupuesto_base NOT NULL
   - Deberia auto-aprobar el presupuesto base
   - Trigger lo manejara

3. Privacidad:
   - presupuestos_finales = SOLO ADMIN ✓
   - facturas = SOLO ADMIN ✓
   - presupuestos_base = ADMIN + SUPERVISOR ✓
*/
