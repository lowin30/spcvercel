-- =============================================
-- LIMPIEZA: Tabla trabajadores_tareas
-- FECHA: 23 de Octubre, 2025 - 3:38 AM
-- De 12 políticas → 3 políticas (-9)
-- CORRIGE 1 BRECHA DE SEGURIDAD CRÍTICA
-- =============================================

-- ⚠️ IMPORTANTE: Este script corrige:
-- - Trabajadores con permisos ALL (crear/editar/eliminar asignaciones)
-- - Políticas duplicadas y redundantes
-- - Políticas rotas (INSERT con null)

-- =============================================
-- VERIFICACIÓN PREVIA
-- =============================================

SELECT 
  '=============================================' as separador,
  'ANTES DE LIMPIEZA' as estado,
  '=============================================' as separador2;

SELECT 
  ROW_NUMBER() OVER (ORDER BY policyname) as num,
  policyname,
  cmd,
  CASE
    WHEN policyname LIKE '%admin%' OR policyname LIKE '%Admin%' THEN '👔 Admin'
    WHEN policyname LIKE '%supervisor%' OR policyname LIKE '%Supervisor%' THEN '👨‍💼 Supervisor'
    WHEN policyname LIKE '%trabajador%' OR policyname LIKE '%Trabajador%' THEN '👷 Trabajador'
    ELSE '❓ Otro'
  END as rol,
  SUBSTRING(qual, 1, 80) as condicion
FROM pg_policies
WHERE tablename = 'trabajadores_tareas'
ORDER BY num;

-- Conteo inicial
SELECT 
  'TOTAL POLÍTICAS ANTES:' as descripcion,
  COUNT(*) as cantidad
FROM pg_policies
WHERE tablename = 'trabajadores_tareas';

-- =============================================
-- PASO 1: ELIMINAR DUPLICADOS DE ADMIN
-- =============================================

SELECT 
  '=============================================' as separador,
  'PASO 1: ELIMINANDO DUPLICADOS ADMIN' as paso,
  '=============================================' as separador2;

-- Mantener: "Admin puede gestionar todas las asignaciones de trabajadores"
-- Eliminar: "Permitir acceso a admin" (duplicada)
DROP POLICY IF EXISTS "Permitir acceso a admin" ON trabajadores_tareas;

-- Eliminar: "Enable delete for admins and supervisors" (redundante, admin tiene ALL)
DROP POLICY IF EXISTS "Enable delete for admins and supervisors" ON trabajadores_tareas;

SELECT 'Políticas admin duplicadas eliminadas' as resultado;

-- =============================================
-- PASO 2: ELIMINAR REDUNDANTES DE SUPERVISOR
-- =============================================

SELECT 
  '=============================================' as separador,
  'PASO 2: ELIMINANDO REDUNDANTES SUPERVISOR' as paso,
  '=============================================' as separador2;

-- Mantener: "Supervisores pueden gestionar asignaciones de trabajadores en s" (ALL)
-- Las demás son redundantes (ALL cubre SELECT, INSERT, DELETE)

DROP POLICY IF EXISTS "Supervisores pueden ver trabajadores de sus tareas" ON trabajadores_tareas;
-- Redundante: supervisor tiene ALL

DROP POLICY IF EXISTS "Permitir a supervisores ver trabajadores de sus tareas" ON trabajadores_tareas;
-- Duplicada con la anterior

DROP POLICY IF EXISTS "Supervisores pueden eliminar trabajadores de sus tareas" ON trabajadores_tareas;
-- Redundante: supervisor tiene ALL

SELECT 'Políticas supervisor redundantes eliminadas' as resultado;

-- =============================================
-- PASO 3: ELIMINAR POLÍTICAS ROTAS (INSERT NULL)
-- =============================================

SELECT 
  '=============================================' as separador,
  'PASO 3: ELIMINANDO POLÍTICAS ROTAS' as paso,
  '=============================================' as separador2;

-- Políticas INSERT con condición NULL (no funcionan)
DROP POLICY IF EXISTS "Enable insert for admins and supervisors" ON trabajadores_tareas;
DROP POLICY IF EXISTS "Supervisores pueden agregar trabajadores a sus tareas" ON trabajadores_tareas;

SELECT 'Políticas rotas eliminadas' as resultado;

-- =============================================
-- PASO 4: ELIMINAR DUPLICADO TRABAJADOR
-- =============================================

SELECT 
  '=============================================' as separador,
  'PASO 4: ELIMINANDO DUPLICADO TRABAJADOR' as paso,
  '=============================================' as separador2;

-- Mantener: "Trabajadores pueden ver sus asignaciones de tareas"
-- Eliminar: "Enable read access for assigned workers" (duplicada)
DROP POLICY IF EXISTS "Enable read access for assigned workers" ON trabajadores_tareas;

SELECT 'Política trabajador duplicada eliminada' as resultado;

-- =============================================
-- PASO 5: ELIMINAR POLÍTICA PELIGROSA TRABAJADOR
-- =============================================

SELECT 
  '=============================================' as separador,
  'PASO 5: ELIMINANDO POLÍTICA PELIGROSA' as paso,
  '⚠️ CRÍTICO: Trabajador con ALL' as advertencia,
  '=============================================' as separador2;

-- Esta política da ALL al trabajador (crear/editar/eliminar asignaciones)
-- El trabajador solo debe VER sus asignaciones (SELECT)
DROP POLICY IF EXISTS "Permitir acceso a trabajadores" ON trabajadores_tareas;

SELECT '⚠️ Brecha de seguridad corregida: Trabajador ya no puede crear/editar/eliminar' as resultado;

-- =============================================
-- VERIFICACIÓN FINAL
-- =============================================

SELECT 
  '=============================================' as separador,
  'DESPUÉS DE LIMPIEZA' as estado,
  '=============================================' as separador2;

-- Ver políticas finales
SELECT 
  ROW_NUMBER() OVER (ORDER BY policyname) as num,
  policyname,
  cmd,
  CASE
    WHEN policyname LIKE '%admin%' OR policyname LIKE '%Admin%' THEN '👔 Admin'
    WHEN policyname LIKE '%supervisor%' OR policyname LIKE '%Supervisor%' THEN '👨‍💼 Supervisor'
    WHEN policyname LIKE '%trabajador%' OR policyname LIKE '%Trabajador%' THEN '👷 Trabajador'
    ELSE '❓ Otro'
  END as rol,
  SUBSTRING(qual, 1, 80) as condicion
FROM pg_policies
WHERE tablename = 'trabajadores_tareas'
ORDER BY 
  CASE
    WHEN policyname LIKE '%admin%' THEN 1
    WHEN policyname LIKE '%supervisor%' THEN 2
    ELSE 3
  END;

-- Conteo final
SELECT 
  'TOTAL POLÍTICAS DESPUÉS:' as descripcion,
  COUNT(*) as cantidad,
  CASE 
    WHEN COUNT(*) = 3 THEN '✅ PERFECTO'
    WHEN COUNT(*) < 3 THEN '❌ FALTAN POLÍTICAS'
    ELSE '⚠️ TODAVÍA HAY POLÍTICAS DE MÁS'
  END as evaluacion
FROM pg_policies
WHERE tablename = 'trabajadores_tareas';

-- Comparación
SELECT 
  '=============================================' as separador,
  'RESUMEN DE LIMPIEZA' as titulo,
  '=============================================' as separador2;

SELECT 
  'ANTES' as momento,
  '12 políticas' as cantidad,
  '2 admin + 4 supervisor + 3 trabajador + 2 rotas + 1 duplicada' as detalle
UNION ALL
SELECT 
  'DESPUÉS',
  '3 políticas',
  '1 admin ALL + 1 supervisor ALL + 1 trabajador SELECT'
UNION ALL
SELECT 
  'ELIMINADAS',
  '9 políticas',
  'Duplicadas, redundantes, rotas, y 1 peligrosa'
UNION ALL
SELECT 
  'AHORRO',
  '75% reducción',
  'De 12 → 3 políticas';

-- =============================================
-- POLÍTICAS FINALES ESPERADAS (3)
-- =============================================

SELECT 
  '=============================================' as separador,
  'POLÍTICAS FINALES ESPERADAS' as titulo,
  '=============================================' as separador2;

SELECT 
  '1' as num,
  'Admin puede gestionar todas las asignaciones de trabajadores' as nombre,
  'ALL' as comando,
  'Admin gestiona todas las asignaciones' as descripcion
UNION ALL
SELECT 
  '2',
  'Supervisores pueden gestionar asignaciones de trabajadores en s',
  'ALL',
  'Supervisor gestiona asignaciones de SUS tareas'
UNION ALL
SELECT 
  '3',
  'Trabajadores pueden ver sus asignaciones de tareas',
  'SELECT',
  'Trabajador solo VE sus asignaciones';

-- =============================================
-- TEST DE FUNCIONALIDAD
-- =============================================

SELECT 
  '=============================================' as separador,
  'TEST DE FUNCIONALIDAD' as titulo,
  '=============================================' as separador2;

-- Verificar que las 3 políticas tienen condiciones correctas
SELECT 
  policyname,
  cmd,
  CASE 
    WHEN policyname LIKE '%Admin%' AND cmd = 'ALL' AND qual LIKE '%admin%' THEN '✅ Admin ALL con verificación de rol'
    WHEN policyname LIKE '%Supervisores%' AND cmd = 'ALL' AND qual LIKE '%supervisor%' AND qual LIKE '%supervisores_tareas%' THEN '✅ Supervisor ALL con verificación de asignación'
    WHEN policyname LIKE '%Trabajadores%' AND cmd = 'SELECT' AND qual LIKE '%trabajador%' AND qual LIKE '%id_trabajador%' THEN '✅ Trabajador SELECT con verificación de propiedad'
    ELSE '⚠️ REVISAR MANUALMENTE'
  END as test_resultado
FROM pg_policies
WHERE tablename = 'trabajadores_tareas';

-- =============================================
-- ESTADÍSTICAS GLOBALES
-- =============================================

SELECT 
  '=============================================' as separador,
  'ESTADÍSTICAS GLOBALES DEL SISTEMA' as titulo,
  '=============================================' as separador2;

SELECT 
  (SELECT COUNT(*) FROM pg_policies) as total_politicas_sistema,
  (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'trabajadores_tareas') as politicas_trabajadores_tareas,
  '9 políticas eliminadas de trabajadores_tareas' as cambio,
  'De ~83 → ~74 políticas totales' as nuevo_total;

-- =============================================
-- RESULTADO ESPERADO
-- =============================================

/*
✅ ANTES: 12 políticas
✅ DESPUÉS: 3 políticas
✅ ELIMINADAS: 9 políticas

POLÍTICAS ELIMINADAS:
1. Permitir acceso a admin (DUPLICADA)
2. Enable delete for admins and supervisors (REDUNDANTE)
3. Supervisores pueden ver trabajadores de sus tareas (REDUNDANTE)
4. Permitir a supervisores ver trabajadores de sus tareas (DUPLICADA)
5. Supervisores pueden eliminar trabajadores de sus tareas (REDUNDANTE)
6. Enable insert for admins and supervisors (ROTA - null)
7. Supervisores pueden agregar trabajadores a sus tareas (ROTA - null)
8. Enable read access for assigned workers (DUPLICADA)
9. Permitir acceso a trabajadores (PELIGROSA - ALL al trabajador)

BRECHA DE SEGURIDAD CORREGIDA:
⚠️ Trabajador ya NO puede crear/editar/eliminar asignaciones
✅ Trabajador solo puede VER sus asignaciones

FUNCIONALIDAD PRESERVADA:
✅ Admin sigue teniendo acceso total
✅ Supervisor sigue gestionando sus tareas
✅ Trabajador sigue viendo sus asignaciones
✅ CERO cambios en comportamiento correcto
✅ Páginas validadas:
   - /dashboard/tareas/[id] - Supervisor ve y asigna trabajadores
   - /dashboard/trabajadores/registro-dias - Lista de trabajadores por tarea

PRÓXIMO PASO:
📋 Probar aplicación por varios días
📋 Verificar que todo funciona correctamente
📋 Si todo OK → Continuar con limpieza de tabla "usuarios"
*/

-- =============================================
-- ROLLBACK (Si algo sale mal)
-- =============================================

/*
-- Para restaurar TODAS las políticas originales:

CREATE POLICY "Admin puede gestionar todas las asignaciones de trabajadores" 
ON trabajadores_tareas FOR ALL TO public 
USING ((get_my_role() = 'admin'::text)) 
WITH CHECK ((get_my_role() = 'admin'::text));

CREATE POLICY "Enable delete for admins and supervisors" 
ON trabajadores_tareas FOR DELETE TO public 
USING ((get_my_role() = ANY (ARRAY['admin'::text, 'supervisor'::text])));

CREATE POLICY "Enable read access for assigned workers" 
ON trabajadores_tareas FOR SELECT TO public 
USING ((auth.uid() = id_trabajador));

CREATE POLICY "Permitir a supervisores ver trabajadores de sus tareas" 
ON trabajadores_tareas FOR SELECT TO public 
USING ((EXISTS ( SELECT 1 FROM supervisores_tareas st 
WHERE ((st.id_tarea = trabajadores_tareas.id_tarea) AND (st.id_supervisor = auth.uid())))));

CREATE POLICY "Permitir acceso a admin" 
ON trabajadores_tareas FOR ALL TO public 
USING ((get_my_role() = 'admin'::text));

CREATE POLICY "Permitir acceso a trabajadores" 
ON trabajadores_tareas FOR ALL TO public 
USING ((id_trabajador = auth.uid()));

CREATE POLICY "Supervisores pueden eliminar trabajadores de sus tareas" 
ON trabajadores_tareas FOR DELETE TO authenticated 
USING (((get_my_role() = 'supervisor'::text) AND (id_tarea IN ( 
SELECT supervisores_tareas.id_tarea FROM supervisores_tareas 
WHERE (supervisores_tareas.id_supervisor = auth.uid())))));

CREATE POLICY "Supervisores pueden gestionar asignaciones de trabajadores en s" 
ON trabajadores_tareas FOR ALL TO public 
USING (((get_my_role() = 'supervisor'::text) AND (id_tarea IN ( 
SELECT supervisores_tareas.id_tarea FROM supervisores_tareas 
WHERE (supervisores_tareas.id_supervisor = auth.uid())))));

CREATE POLICY "Supervisores pueden ver trabajadores de sus tareas" 
ON trabajadores_tareas FOR SELECT TO authenticated 
USING (((get_my_role() = 'supervisor'::text) AND (id_tarea IN ( 
SELECT supervisores_tareas.id_tarea FROM supervisores_tareas 
WHERE (supervisores_tareas.id_supervisor = auth.uid())))));

CREATE POLICY "Trabajadores pueden ver sus asignaciones de tareas" 
ON trabajadores_tareas FOR SELECT TO public 
USING (((get_my_role() = 'trabajador'::text) AND (id_trabajador = auth.uid())));

CREATE POLICY "Enable insert for admins and supervisors" 
ON trabajadores_tareas FOR INSERT TO public 
WITH CHECK (NULL);

CREATE POLICY "Supervisores pueden agregar trabajadores a sus tareas" 
ON trabajadores_tareas FOR INSERT TO authenticated 
WITH CHECK (NULL);
*/
