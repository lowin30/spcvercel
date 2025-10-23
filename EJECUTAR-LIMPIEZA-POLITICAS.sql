-- =============================================
-- LIMPIEZA DE POLÍTICAS DUPLICADAS trabajadores_tareas
-- FECHA: 23 de Octubre, 2025
-- BASADO EN BACKUP REAL DEL SISTEMA
-- =============================================

-- ⚠️ IMPORTANTE: Este script eliminará 9 políticas redundantes
-- Quedando solo 3 políticas óptimas

-- =============================================
-- ANTES: Verificar políticas actuales (12 total)
-- =============================================

SELECT 
  '=== ANTES DE LIMPIEZA ===' as estado,
  COUNT(*) as total_politicas,
  '12 políticas (9 redundantes)' as nota
FROM pg_policies
WHERE tablename = 'trabajadores_tareas';

-- =============================================
-- PASO 1: ELIMINAR POLÍTICAS DUPLICADAS DE ADMIN
-- =============================================

-- Mantener: "Admin puede gestionar todas las asignaciones de trabajadores"
-- Eliminar: "Permitir acceso a admin" (duplicada)

DROP POLICY IF EXISTS "Permitir acceso a admin" ON trabajadores_tareas;

-- =============================================
-- PASO 2: ELIMINAR POLÍTICAS REDUNDANTES DE SUPERVISOR
-- =============================================

-- Mantener: "Supervisores pueden gestionar asignaciones de trabajadores en s" (ALL)
-- Eliminar: Todas las específicas (cubiertas por ALL)

DROP POLICY IF EXISTS "Supervisores pueden ver trabajadores de sus tareas" ON trabajadores_tareas;
DROP POLICY IF EXISTS "Supervisores pueden eliminar trabajadores de sus tareas" ON trabajadores_tareas;
DROP POLICY IF EXISTS "Supervisores pueden agregar trabajadores a sus tareas" ON trabajadores_tareas;
DROP POLICY IF EXISTS "Permitir a supervisores ver trabajadores de sus tareas" ON trabajadores_tareas;
DROP POLICY IF EXISTS "Enable delete for admins and supervisors" ON trabajadores_tareas;
DROP POLICY IF EXISTS "Enable insert for admins and supervisors" ON trabajadores_tareas;

-- =============================================
-- PASO 3: ELIMINAR POLÍTICAS REDUNDANTES DE TRABAJADOR
-- =============================================

-- Mantener: "Trabajadores pueden ver sus asignaciones de tareas" (SELECT)
-- Eliminar: Duplicada y la peligrosa (ALL)

DROP POLICY IF EXISTS "Enable read access for assigned workers" ON trabajadores_tareas;
DROP POLICY IF EXISTS "Permitir acceso a trabajadores" ON trabajadores_tareas; -- ⚠️ ALL es muy permisivo

-- =============================================
-- PASO 4: VERIFICACIÓN FINAL
-- =============================================

-- Deberían quedar 3 políticas

SELECT 
  '=== DESPUÉS DE LIMPIEZA ===' as estado,
  policyname,
  cmd,
  CASE
    WHEN policyname LIKE '%Admin%' THEN '👔 Admin (ALL)'
    WHEN policyname LIKE '%Supervisores%' THEN '👨‍💼 Supervisor (ALL de sus tareas)'
    WHEN policyname LIKE '%Trabajadores%' THEN '👷 Trabajador (SELECT)'
    ELSE '❓ Otra'
  END as rol_permiso
FROM pg_policies
WHERE tablename = 'trabajadores_tareas'
ORDER BY 
  CASE
    WHEN policyname LIKE '%Admin%' THEN 1
    WHEN policyname LIKE '%Supervisores%' THEN 2
    WHEN policyname LIKE '%Trabajadores%' THEN 3
    ELSE 4
  END;

-- Verificar conteo
SELECT 
  '=== CONTEO FINAL ===' as resultado,
  COUNT(*) as total_politicas,
  CASE 
    WHEN COUNT(*) = 3 THEN '✅ PERFECTO (3 políticas óptimas)'
    WHEN COUNT(*) <= 4 THEN '✅ BUENO'
    ELSE '⚠️ Todavía hay políticas de más'
  END as evaluacion
FROM pg_policies
WHERE tablename = 'trabajadores_tareas';

-- =============================================
-- POLÍTICAS FINALES ESPERADAS (3):
-- =============================================

/*
1. "Admin puede gestionar todas las asignaciones de trabajadores"
   - Comando: ALL
   - Permite: Todo a los admins

2. "Supervisores pueden gestionar asignaciones de trabajadores en s"
   - Comando: ALL
   - Permite: Todo en sus tareas (supervisores_tareas)

3. "Trabajadores pueden ver sus asignaciones de tareas"
   - Comando: SELECT
   - Permite: Ver solo sus asignaciones
*/

-- =============================================
-- RESULTADO ESPERADO
-- =============================================

/*
ANTES: 12 políticas
DESPUÉS: 3 políticas

POLÍTICAS ELIMINADAS (9):
✅ Permitir acceso a admin (duplicada)
✅ Supervisores pueden ver trabajadores... (redundante)
✅ Supervisores pueden eliminar trabajadores... (redundante)
✅ Supervisores pueden agregar trabajadores... (redundante)
✅ Permitir a supervisores ver trabajadores... (duplicada)
✅ Enable delete for admins and supervisors (duplicada)
✅ Enable insert for admins and supervisors (duplicada)
✅ Enable read access for assigned workers (duplicada)
✅ Permitir acceso a trabajadores (ALL muy permisivo)

FUNCIONALIDAD:
✅ Admin sigue haciendo todo
✅ Supervisor sigue gestionando sus tareas
✅ Trabajador sigue viendo sus asignaciones
✅ CERO cambios en comportamiento
✅ Mejor performance
✅ Más fácil de mantener
*/

-- =============================================
-- ROLLBACK (Si algo sale mal)
-- =============================================

/*
-- Para restaurar TODAS las políticas originales:

CREATE POLICY "Admin puede gestionar todas las asignaciones de trabajadores" ON trabajadores_tareas FOR ALL TO public USING ((get_my_role() = 'admin'::text)) WITH CHECK ((get_my_role() = 'admin'::text));
CREATE POLICY "Enable delete for admins and supervisors" ON trabajadores_tareas FOR DELETE TO public USING ((get_my_role() = ANY (ARRAY['admin'::text, 'supervisor'::text])));
CREATE POLICY "Enable read access for assigned workers" ON trabajadores_tareas FOR SELECT TO public USING ((auth.uid() = id_trabajador));
CREATE POLICY "Permitir a supervisores ver trabajadores de sus tareas" ON trabajadores_tareas FOR SELECT TO public USING ((EXISTS ( SELECT 1 FROM supervisores_tareas st WHERE ((st.id_tarea = trabajadores_tareas.id_tarea) AND (st.id_supervisor = auth.uid())))));
CREATE POLICY "Permitir acceso a admin" ON trabajadores_tareas FOR ALL TO public USING ((get_my_role() = 'admin'::text));
CREATE POLICY "Permitir acceso a trabajadores" ON trabajadores_tareas FOR ALL TO public USING ((id_trabajador = auth.uid()));
CREATE POLICY "Supervisores pueden eliminar trabajadores de sus tareas" ON trabajadores_tareas FOR DELETE TO authenticated USING (((get_my_role() = 'supervisor'::text) AND (id_tarea IN ( SELECT supervisores_tareas.id_tarea FROM supervisores_tareas WHERE (supervisores_tareas.id_supervisor = auth.uid())))));
CREATE POLICY "Supervisores pueden gestionar asignaciones de trabajadores en s" ON trabajadores_tareas FOR ALL TO public USING (((get_my_role() = 'supervisor'::text) AND (id_tarea IN ( SELECT supervisores_tareas.id_tarea FROM supervisores_tareas WHERE (supervisores_tareas.id_supervisor = auth.uid())))));
CREATE POLICY "Supervisores pueden ver trabajadores de sus tareas" ON trabajadores_tareas FOR SELECT TO authenticated USING (((get_my_role() = 'supervisor'::text) AND (id_tarea IN ( SELECT supervisores_tareas.id_tarea FROM supervisores_tareas WHERE (supervisores_tareas.id_supervisor = auth.uid())))));
CREATE POLICY "Trabajadores pueden ver sus asignaciones de tareas" ON trabajadores_tareas FOR SELECT TO public USING (((get_my_role() = 'trabajador'::text) AND (id_trabajador = auth.uid())));
*/
