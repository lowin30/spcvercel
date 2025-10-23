-- =============================================
-- AUDITORÍA COMPLETA DE POLÍTICAS RLS - TODAS LAS TABLAS
-- FECHA: 23 de Octubre, 2025
-- OBJETIVO: Mapear permisos de TODAS las tablas del sistema
-- =============================================

-- =============================================
-- PARTE 1: INVENTARIO COMPLETO DE TABLAS
-- =============================================

-- 1.1 Todas las tablas del sistema (excluir tablas de sistema)
SELECT 
  '=== 1.1 TODAS LAS TABLAS ===' as seccion,
  schemaname,
  tablename,
  CASE 
    WHEN tablename LIKE '%factura%' THEN '💰 Finanzas'
    WHEN tablename LIKE '%presupuesto%' THEN '📋 Presupuestos'
    WHEN tablename LIKE '%tarea%' THEN '📝 Tareas'
    WHEN tablename LIKE '%liquidacion%' THEN '💵 Liquidaciones'
    WHEN tablename LIKE '%trabajador%' OR tablename LIKE '%usuario%' THEN '👥 Usuarios'
    WHEN tablename LIKE '%gasto%' THEN '💳 Gastos'
    WHEN tablename LIKE '%parte%' THEN '📅 Partes de Trabajo'
    WHEN tablename LIKE '%edificio%' THEN '🏢 Edificios'
    WHEN tablename LIKE '%item%' THEN '📦 Items'
    WHEN tablename LIKE '%pago%' THEN '💸 Pagos'
    WHEN tablename LIKE '%ajuste%' THEN '🔧 Ajustes'
    WHEN tablename LIKE '%comentario%' THEN '💬 Comentarios'
    WHEN tablename LIKE '%estado%' THEN '📊 Estados'
    ELSE '📂 Otras'
  END as categoria
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename NOT LIKE 'pg_%'
  AND tablename NOT LIKE 'sql_%'
ORDER BY categoria, tablename;

-- 1.2 Contar tablas por categoría
SELECT 
  '=== 1.2 CONTEO POR CATEGORÍA ===' as seccion,
  CASE 
    WHEN tablename LIKE '%factura%' THEN '💰 Finanzas'
    WHEN tablename LIKE '%presupuesto%' THEN '📋 Presupuestos'
    WHEN tablename LIKE '%tarea%' THEN '📝 Tareas'
    WHEN tablename LIKE '%liquidacion%' THEN '💵 Liquidaciones'
    WHEN tablename LIKE '%trabajador%' OR tablename LIKE '%usuario%' THEN '👥 Usuarios'
    WHEN tablename LIKE '%gasto%' THEN '💳 Gastos'
    WHEN tablename LIKE '%parte%' THEN '📅 Partes de Trabajo'
    WHEN tablename LIKE '%edificio%' THEN '🏢 Edificios'
    WHEN tablename LIKE '%item%' THEN '📦 Items'
    WHEN tablename LIKE '%pago%' THEN '💸 Pagos'
    WHEN tablename LIKE '%ajuste%' THEN '🔧 Ajustes'
    WHEN tablename LIKE '%comentario%' THEN '💬 Comentarios'
    WHEN tablename LIKE '%estado%' THEN '📊 Estados'
    ELSE '📂 Otras'
  END as categoria,
  COUNT(*) as total_tablas
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename NOT LIKE 'pg_%'
  AND tablename NOT LIKE 'sql_%'
GROUP BY categoria
ORDER BY total_tablas DESC;

-- =============================================
-- PARTE 2: POLÍTICAS RLS POR TABLA
-- =============================================

-- 2.1 Todas las tablas con sus políticas
SELECT 
  '=== 2.1 POLÍTICAS POR TABLA ===' as seccion,
  t.tablename,
  COALESCE(COUNT(p.policyname), 0) as num_politicas,
  CASE 
    WHEN COUNT(p.policyname) = 0 THEN '⚠️ SIN POLÍTICAS RLS'
    WHEN COUNT(p.policyname) <= 3 THEN '✅ ÓPTIMO'
    WHEN COUNT(p.policyname) <= 6 THEN '⚠️ Revisar'
    ELSE '❌ DEMASIADAS'
  END as evaluacion,
  STRING_AGG(DISTINCT p.cmd::text, ', ') as comandos
FROM pg_tables t
LEFT JOIN pg_policies p ON t.tablename = p.tablename
WHERE t.schemaname = 'public'
  AND t.tablename NOT LIKE 'pg_%'
  AND t.tablename NOT LIKE 'sql_%'
GROUP BY t.tablename
ORDER BY num_politicas DESC, t.tablename;

-- 2.2 Tablas SIN políticas RLS (acceso público o problema)
SELECT 
  '=== 2.2 TABLAS SIN POLÍTICAS RLS ===' as seccion,
  tablename,
  '⚠️ VERIFICAR SI ES INTENCIONAL' as nota,
  CASE 
    WHEN tablename LIKE '%estado%' THEN 'Catálogo - Puede ser público'
    WHEN tablename LIKE 'vista_%' THEN 'Vista - Hereda permisos'
    ELSE '❓ Revisar necesidad de RLS'
  END as posible_razon
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename NOT LIKE 'pg_%'
  AND tablename NOT LIKE 'sql_%'
  AND NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE pg_policies.tablename = pg_tables.tablename
  )
ORDER BY tablename;

-- =============================================
-- PARTE 3: ANÁLISIS DETALLADO DE POLÍTICAS CRÍTICAS
-- =============================================

-- 3.1 Tablas financieras (SOLO ADMIN según POLITICAS.md)
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

-- 3.2 Tablas de asignación (admin + supervisor de sus tareas)
SELECT 
  '=== 3.2 ASIGNACIONES (admin + supervisor) ===' as seccion,
  p.tablename,
  p.policyname,
  p.cmd,
  CASE
    WHEN p.qual LIKE '%admin%' THEN '👔 Admin'
    WHEN p.qual LIKE '%supervisor%' THEN '👨‍💼 Supervisor'
    WHEN p.qual LIKE '%trabajador%' THEN '👷 Trabajador'
    ELSE '❓ Otro'
  END as para_quien,
  CASE 
    WHEN p.qual LIKE '%supervisores_tareas%' OR p.qual LIKE '%trabajadores_tareas%' THEN '✅ Verifica asignación'
    ELSE '⚠️ No verifica asignación'
  END as verifica_asignacion
FROM pg_policies p
WHERE p.tablename IN ('supervisores_tareas', 'trabajadores_tareas', 'tareas')
ORDER BY p.tablename, 
  CASE 
    WHEN p.qual LIKE '%admin%' THEN 1
    WHEN p.qual LIKE '%supervisor%' THEN 2
    WHEN p.qual LIKE '%trabajador%' THEN 3
    ELSE 4
  END;

-- 3.3 Tablas de trabajadores (admin + trabajador de sí mismo)
SELECT 
  '=== 3.3 DATOS TRABAJADORES ===' as seccion,
  p.tablename,
  p.policyname,
  p.cmd,
  CASE
    WHEN p.qual LIKE '%admin%' THEN '👔 Admin'
    WHEN p.qual LIKE '%trabajador%' THEN '👷 Trabajador'
    WHEN p.qual LIKE '%supervisor%' THEN '👨‍💼 Supervisor'
    ELSE '❓ Otro'
  END as para_quien,
  CASE 
    WHEN p.cmd = 'SELECT' AND p.qual LIKE '%trabajador%' THEN '✅ CORRECTO - Solo lectura'
    WHEN p.cmd = 'ALL' AND p.qual LIKE '%trabajador%' THEN '⚠️ PELIGROSO - Demasiado permisivo'
    ELSE 'OK'
  END as evaluacion
FROM pg_policies p
WHERE p.tablename IN (
  'gastos_materiales',
  'partes_de_trabajo', 
  'liquidaciones_trabajadores',
  'configuracion_trabajadores'
)
ORDER BY p.tablename, p.policyname;

-- =============================================
-- PARTE 4: DETECTAR POLÍTICAS PROBLEMÁTICAS
-- =============================================

-- 4.1 Políticas ALL demasiado permisivas
SELECT 
  '=== 4.1 POLÍTICAS ALL PELIGROSAS ===' as seccion,
  tablename,
  policyname,
  CASE
    WHEN qual LIKE '%trabajador%' THEN '❌ Trabajador con ALL es peligroso'
    WHEN qual LIKE '%true%' OR qual = '(true)' THEN '❌ ALL con true = acceso total sin verificar'
    WHEN qual LIKE '%auth.uid() IS NOT NULL%' THEN '❌ Cualquier autenticado tiene acceso'
    ELSE '⚠️ Revisar si es apropiado'
  END as problema,
  qual as condicion
FROM pg_policies
WHERE cmd = 'ALL'
  AND (
    qual LIKE '%trabajador%' OR
    qual LIKE '%true%' OR
    qual LIKE '%auth.uid() IS NOT NULL%'
  )
ORDER BY tablename;

-- 4.2 Tablas con muchas políticas (posibles duplicados)
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
-- PARTE 5: MATRIZ DE PERMISOS RECOMENDADA
-- =============================================

-- 5.1 Generar matriz basada en POLITICAS.md
SELECT 
  '=== 5.1 MATRIZ DE PERMISOS RECOMENDADA ===' as seccion,
  'Categoría' as categoria,
  'Ejemplos' as ejemplos,
  'Admin' as admin,
  'Supervisor' as supervisor,
  'Trabajador' as trabajador
UNION ALL
SELECT 
  '---',
  '💰 Finanzas',
  'facturas, items, pagos_facturas, items_factura',
  '✅ ALL',
  '❌ NO',
  '❌ NO'
UNION ALL
SELECT 
  '---',
  '📋 Presupuestos',
  'presupuestos_base, presupuestos_finales',
  '✅ ALL',
  '✅ SELECT/UPDATE sus tareas',
  '❌ NO'
UNION ALL
SELECT 
  '---',
  '💵 Liquidaciones',
  'liquidaciones_nuevas (supervisor), liquidaciones_trabajadores',
  '✅ ALL',
  '✅ ALL sus tareas',
  '✅ SELECT sus propias'
UNION ALL
SELECT 
  '---',
  '📝 Tareas',
  'tareas, supervisores_tareas, trabajadores_tareas',
  '✅ ALL',
  '✅ ALL sus tareas',
  '✅ SELECT sus asignaciones'
UNION ALL
SELECT 
  '---',
  '💳 Gastos',
  'gastos_materiales',
  '✅ ALL',
  '✅ SELECT de sus tareas',
  '✅ SELECT/INSERT propios'
UNION ALL
SELECT 
  '---',
  '📅 Partes Trabajo',
  'partes_de_trabajo',
  '✅ ALL',
  '✅ ALL de sus tareas',
  '✅ SELECT/INSERT propios'
UNION ALL
SELECT 
  '---',
  '👥 Usuarios',
  'usuarios, configuracion_trabajadores',
  '✅ ALL',
  '✅ SELECT (para asignar)',
  '✅ SELECT propio'
UNION ALL
SELECT 
  '---',
  '💬 Comentarios',
  'comentarios',
  '✅ ALL',
  '✅ ALL',
  '✅ SELECT/INSERT sus tareas'
UNION ALL
SELECT 
  '---',
  '📊 Estados (catálogos)',
  'estados_tareas, estados_presupuestos',
  '✅ ALL',
  '✅ SELECT',
  '✅ SELECT'
UNION ALL
SELECT 
  '---',
  '🏢 Edificios',
  'edificios, proyectos',
  '✅ ALL',
  '✅ SELECT',
  '✅ SELECT?';

-- =============================================
-- PARTE 6: RESUMEN EJECUTIVO
-- =============================================

-- 6.1 Resumen por tabla con evaluación
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

-- 6.2 Estadísticas generales
SELECT 
  '=== 6.2 ESTADÍSTICAS GENERALES ===' as resultado,
  (SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public' AND tablename NOT LIKE 'pg_%') as total_tablas,
  (SELECT COUNT(DISTINCT tablename) FROM pg_policies) as tablas_con_rls,
  (SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public' AND tablename NOT LIKE 'pg_%' 
    AND NOT EXISTS (SELECT 1 FROM pg_policies WHERE pg_policies.tablename = pg_tables.tablename)) as tablas_sin_rls,
  (SELECT COUNT(*) FROM pg_policies) as total_politicas,
  (SELECT COUNT(*) FROM pg_policies WHERE cmd = 'ALL') as politicas_all,
  (SELECT COUNT(*) FROM pg_policies WHERE qual LIKE '%admin%') as politicas_admin,
  (SELECT COUNT(*) FROM pg_policies WHERE qual LIKE '%supervisor%') as politicas_supervisor,
  (SELECT COUNT(*) FROM pg_policies WHERE qual LIKE '%trabajador%') as politicas_trabajador;

-- =============================================
-- RESULTADO ESPERADO
-- =============================================

/*
ESTE SCRIPT GENERA:

1. Inventario completo de todas las tablas
2. Políticas actuales por tabla
3. Tablas sin políticas (posible problema)
4. Análisis de tablas financieras (solo admin)
5. Análisis de tablas de asignación
6. Análisis de datos de trabajadores
7. Políticas problemáticas detectadas
8. Tablas con demasiadas políticas
9. Matriz de permisos recomendada
10. Resumen ejecutivo con acciones

DESPUÉS DE EJECUTAR:
- Tendrás una visión completa del sistema
- Podrás identificar problemas de seguridad
- Sabrás exactamente qué limpiar
- Tendrás base para decisiones informadas
*/
