-- ============================================
-- INVESTIGACIÓN CORREGIDA: PRESUPUESTOS_FINALES Y BASE
-- ============================================

-- ============================================
-- 1. VERIFICAR RELACIÓN presupuestos_finales → presupuestos_base
-- ============================================

SELECT 
    COUNT(*) as total_presupuestos_finales,
    COUNT(id_presupuesto_base) as con_base,
    COUNT(*) - COUNT(id_presupuesto_base) as sin_base
FROM presupuestos_finales;

-- ============================================
-- 2. EJEMPLOS DE PRESUPUESTOS FINALES CON BASE
-- ============================================

SELECT 
    pf.id as presupuesto_final_id,
    pf.code as presupuesto_final_code,
    pf.total as presupuesto_final_total,
    pf.id_presupuesto_base,
    pb.code as presupuesto_base_code,
    pb.aprobado as base_aprobado,
    pb.fecha_aprobacion as base_fecha_aprobacion,
    pf.created_at as presupuesto_final_fecha
FROM presupuestos_finales pf
LEFT JOIN presupuestos_base pb ON pf.id_presupuesto_base = pb.id
WHERE pf.id_presupuesto_base IS NOT NULL
ORDER BY pf.created_at DESC
LIMIT 10;

-- ============================================
-- 3. ⚠️ CRÍTICO: PRESUPUESTOS BASE NO APROBADOS CON FINAL
-- ============================================
-- Detectar inconsistencias

SELECT 
    pb.id as base_id,
    pb.code as base_code,
    pb.aprobado as base_aprobado,
    pb.fecha_aprobacion,
    pf.id as final_id,
    pf.code as final_code,
    pf.created_at as final_creado,
    EXTRACT(DAY FROM (NOW() - pf.created_at)) as dias_desde_creacion
FROM presupuestos_finales pf
INNER JOIN presupuestos_base pb ON pf.id_presupuesto_base = pb.id
WHERE pb.aprobado = false
ORDER BY pf.created_at DESC;

-- ============================================
-- 4. ⚠️ SEGURIDAD: POLÍTICAS RLS EN presupuestos_finales
-- ============================================

SELECT 
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'presupuestos_finales';

-- ============================================
-- 5. ⚠️ SEGURIDAD: POLÍTICAS RLS EN presupuestos_base
-- ============================================

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

-- ============================================
-- 6. VERIFICAR RLS ESTÁ HABILITADO
-- ============================================

SELECT 
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename IN ('presupuestos_finales', 'presupuestos_base', 'facturas')
    AND schemaname = 'public';

-- ============================================
-- 7. RELACIÓN FACTURAS → PRESUPUESTOS_FINALES → BASE
-- ============================================

SELECT 
    f.id as factura_id,
    f.code as factura_code,
    f.total as factura_total,
    pf.id as presupuesto_final_id,
    pf.code as presupuesto_final_code,
    pf.id_presupuesto_base,
    pb.code as presupuesto_base_code,
    pb.aprobado as base_aprobado,
    pb.total as base_total,
    pb.nota_pb as base_nota
FROM facturas f
LEFT JOIN presupuestos_finales pf ON f.id_presupuesto = pf.id
LEFT JOIN presupuestos_base pb ON pf.id_presupuesto_base = pb.id
WHERE pb.id IS NOT NULL
ORDER BY f.created_at DESC
LIMIT 10;

-- ============================================
-- 8. VERIFICAR FOREIGN KEYS
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
WHERE tc.table_name = 'presupuestos_finales'
    AND tc.constraint_type = 'FOREIGN KEY';

-- ============================================
-- 9. VERIFICAR ROLES Y PERMISOS
-- ============================================

-- Ver qué roles pueden acceder a presupuestos_finales
SELECT 
    grantee,
    privilege_type
FROM information_schema.role_table_grants
WHERE table_name = 'presupuestos_finales';

-- Ver qué roles pueden acceder a presupuestos_base
SELECT 
    grantee,
    privilege_type
FROM information_schema.role_table_grants
WHERE table_name = 'presupuestos_base';

-- ============================================
-- 10. ⚠️ DETECTAR SI SUPERVISORES TIENEN ACCESO A FINALES
-- ============================================

-- Esto requiere conocer cómo identificas supervisores en tu sistema
-- Asumiendo que los supervisores tienen rol en la tabla usuarios

-- Ver si existen políticas que permitan a supervisores ver presupuestos_finales
SELECT 
    policyname,
    roles,
    qual as condicion_acceso
FROM pg_policies
WHERE tablename = 'presupuestos_finales'
    AND (
        roles::text LIKE '%supervisor%' 
        OR roles::text LIKE '%authenticated%'
    );

-- ============================================
-- RESULTADOS ESPERADOS Y ANÁLISIS:
-- ============================================

/*
Query 1: 
- Confirmar cuántos presupuestos finales existen
- Ver cuántos tienen base asociada

Query 2:
- Ver ejemplos reales de la relación
- Confirmar que id_presupuesto_base funciona

Query 3: ⚠️ CRÍTICO
- Si devuelve filas: HAY INCONSISTENCIAS
- Presupuestos finales creados pero base no aprobado
- Necesitaremos script de corrección

Query 4 y 5: ⚠️ SEGURIDAD
- Verificar que supervisores NO tengan políticas de acceso
- presupuestos_finales debe ser SOLO para admin
- presupuestos_base puede ser para admin + supervisor

Query 6: ⚠️ SEGURIDAD
- Verificar que RLS esté habilitado
- Si rls_enabled = false → PELIGRO

Query 7:
- Ver cadena completa de relaciones
- Confirmar que las facturas se vinculan correctamente

Query 10: ⚠️ CRÍTICO
- Si devuelve políticas para supervisores → PROBLEMA DE SEGURIDAD
- Supervisores NO deben ver presupuestos finales
*/

-- ============================================
-- SI HAY PROBLEMAS DE SEGURIDAD, EJECUTAR:
-- ============================================

-- ⚠️ NO EJECUTAR SIN CONFIRMAR PRIMERO
-- Esto eliminará políticas incorrectas

/*
-- Ver todas las políticas actuales
SELECT * FROM pg_policies 
WHERE tablename = 'presupuestos_finales';

-- Si hay políticas permitiendo supervisores, eliminarlas:
-- DROP POLICY nombre_de_politica ON presupuestos_finales;

-- Crear política correcta SOLO para admin:
CREATE POLICY "presupuestos_finales_solo_admin" 
ON presupuestos_finales
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM usuarios
    WHERE usuarios.id = auth.uid()
    AND usuarios.rol = 'admin'
  )
);
*/
