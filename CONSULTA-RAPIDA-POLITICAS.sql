-- =============================================
-- CONSULTA RÁPIDA: 3 Secciones clave
-- Copia y pega en Supabase SQL Editor
-- =============================================

-- =============================================
-- 1. TABLAS FINANCIERAS (verificar que solo admin)
-- =============================================

SELECT 
  '=== 3.1 TABLAS FINANCIERAS (solo admin) ===' as seccion,
  p.tablename,
  p.policyname,
  p.cmd,
  CASE 
    WHEN p.qual LIKE '%admin%' AND p.cmd = 'ALL' THEN '✅ CORRECTO - Solo admin'
    WHEN p.qual LIKE '%admin%' THEN '⚠️ CORRECTO pero específico'
    WHEN p.qual LIKE '%supervisor%' THEN '❌ ERROR - Supervisor NO debe ver'
    WHEN p.qual LIKE '%trabajador%' THEN '❌ ERROR - Trabajador NO debe ver'
    ELSE '❓ REVISAR'
  END as evaluacion,
  SUBSTRING(p.qual, 1, 80) as condicion
FROM pg_policies p
WHERE p.tablename IN ('facturas', 'items', 'pagos_facturas', 'items_factura', 'ajustes_facturas')
ORDER BY p.tablename, p.policyname;

-- =============================================
-- 2. TABLAS CON MUCHAS POLÍTICAS (candidatas a limpiar)
-- =============================================

SELECT 
  '=== 4.2 TABLAS CON MUCHAS POLÍTICAS ===' as seccion,
  tablename,
  COUNT(*) as num_politicas,
  COUNT(*) FILTER (WHERE cmd = 'ALL') as num_all,
  COUNT(*) FILTER (WHERE cmd = 'SELECT') as num_select,
  COUNT(*) FILTER (WHERE cmd = 'INSERT') as num_insert,
  COUNT(*) FILTER (WHERE cmd = 'DELETE') as num_delete,
  CASE 
    WHEN COUNT(*) FILTER (WHERE cmd = 'ALL') > 0 
         AND COUNT(*) FILTER (WHERE cmd IN ('SELECT', 'INSERT', 'UPDATE', 'DELETE')) > 0
    THEN '⚠️ Tiene ALL + específicas = posible redundancia'
    WHEN COUNT(*) > 6 THEN '❌ Demasiadas políticas'
    ELSE '✅ Cantidad aceptable'
  END as evaluacion
FROM pg_policies
GROUP BY tablename
HAVING COUNT(*) > 4
ORDER BY COUNT(*) DESC;

-- =============================================
-- 3. RESUMEN EJECUTIVO (acción recomendada por tabla)
-- =============================================

SELECT 
  '=== 6.1 RESUMEN EJECUTIVO ===' as seccion,
  tablename,
  COUNT(*) as num_politicas,
  STRING_AGG(DISTINCT 
    CASE
      WHEN qual LIKE '%admin%' THEN '👔'
      WHEN qual LIKE '%supervisor%' THEN '👨‍💼'
      WHEN qual LIKE '%trabajador%' THEN '👷'
      ELSE '❓'
    END, ' ') as roles_con_acceso,
  CASE 
    WHEN COUNT(*) = 0 THEN '⚠️ SIN RLS'
    WHEN COUNT(*) <= 3 THEN '✅ ÓPTIMO'
    WHEN COUNT(*) <= 6 THEN '⚠️ Revisar'
    ELSE '❌ LIMPIAR'
  END as accion_recomendada
FROM pg_policies
GROUP BY tablename
ORDER BY 
  CASE 
    WHEN COUNT(*) = 0 THEN 1
    WHEN COUNT(*) > 6 THEN 2
    WHEN COUNT(*) > 3 THEN 3
    ELSE 4
  END,
  COUNT(*) DESC;
