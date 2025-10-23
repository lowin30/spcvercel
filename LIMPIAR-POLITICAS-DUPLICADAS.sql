-- =============================================
-- ANÁLISIS Y LIMPIEZA DE POLÍTICAS DUPLICADAS
-- FECHA: 23 de Octubre, 2025
-- =============================================

-- =============================================
-- PASO 1: VER TODAS LAS POLÍTICAS trabajadores_tareas
-- =============================================

SELECT 
  '=== TODAS LAS POLÍTICAS trabajadores_tareas ===' as analisis,
  policyname,
  cmd,
  CASE 
    WHEN cmd = 'ALL' THEN '⭐ Cubre todo (SELECT, INSERT, UPDATE, DELETE)'
    WHEN cmd = 'SELECT' THEN '👁️ Solo lectura'
    WHEN cmd = 'INSERT' THEN '➕ Solo crear'
    WHEN cmd = 'UPDATE' THEN '✏️ Solo editar'
    WHEN cmd = 'DELETE' THEN '🗑️ Solo eliminar'
  END as que_hace,
  CASE
    WHEN qual LIKE '%admin%' THEN '👔 Admin'
    WHEN qual LIKE '%supervisor%' THEN '👨‍💼 Supervisor'
    WHEN qual LIKE '%trabajador%' OR qual LIKE '%id_trabajador%' THEN '👷 Trabajador'
    ELSE '❓ Otro'
  END as para_quien
FROM pg_policies
WHERE tablename = 'trabajadores_tareas'
ORDER BY 
  CASE 
    WHEN qual LIKE '%admin%' THEN 1
    WHEN qual LIKE '%supervisor%' THEN 2
    WHEN qual LIKE '%trabajador%' THEN 3
    ELSE 4
  END,
  cmd DESC;

-- =============================================
-- PASO 2: IDENTIFICAR DUPLICADOS
-- =============================================

SELECT 
  '=== DUPLICADOS DETECTADOS ===' as analisis,
  CASE
    WHEN qual LIKE '%admin%' THEN '👔 Admin'
    WHEN qual LIKE '%supervisor%' THEN '👨‍💼 Supervisor'
    WHEN qual LIKE '%trabajador%' THEN '👷 Trabajador'
    ELSE 'Otro'
  END as rol,
  cmd,
  COUNT(*) as cantidad_politicas,
  CASE 
    WHEN COUNT(*) > 1 THEN '⚠️ DUPLICADO'
    ELSE '✅ OK'
  END as estado
FROM pg_policies
WHERE tablename = 'trabajadores_tareas'
GROUP BY 
  CASE
    WHEN qual LIKE '%admin%' THEN '👔 Admin'
    WHEN qual LIKE '%supervisor%' THEN '👨‍💼 Supervisor'
    WHEN qual LIKE '%trabajador%' THEN '👷 Trabajador'
    ELSE 'Otro'
  END,
  cmd
HAVING COUNT(*) > 1
ORDER BY rol, cmd;

-- =============================================
-- PASO 3: POLÍTICAS ÓPTIMAS NECESARIAS
-- =============================================

/*
CONFIGURACIÓN ÓPTIMA (SOLO 3 POLÍTICAS):

1. Admin - TODO (ALL)
   ✅ "Admin puede gestionar todas las asignaciones de trabajadores"

2. Supervisor - TODO de sus tareas (ALL)
   ✅ "Supervisores pueden gestionar asignaciones de trabajadores en sus tareas"

3. Trabajador - Ver sus asignaciones (SELECT)
   ✅ "Trabajadores pueden ver sus asignaciones de tareas"

TOTAL: 3 políticas cubren todos los casos
*/

-- =============================================
-- PASO 4: POLÍTICAS A ELIMINAR (DUPLICADAS)
-- =============================================

-- IMPORTANTE: Revisa esta lista antes de ejecutar los DROP

SELECT 
  '=== POLÍTICAS CANDIDATAS A ELIMINAR ===' as accion,
  policyname,
  cmd,
  '⚠️ ELIMINAR' as motivo
FROM pg_policies
WHERE tablename = 'trabajadores_tareas'
AND policyname IN (
  -- Duplicados de Admin (mantener solo 1 ALL)
  'Permitir acceso a admin', -- DUPLICADO de la otra ALL admin
  
  -- Duplicados de Supervisor (mantener solo 1 ALL)
  'Supervisores pueden ver trabajadores de sus tareas', -- CUBIERTO por ALL supervisor
  'Permitir a supervisores ver trabajadores de sus tareas', -- DUPLICADO del anterior
  'Supervisores pueden agregar trabajadores a sus tareas', -- CUBIERTO por ALL supervisor
  'Supervisores pueden eliminar trabajadores de sus tareas', -- CUBIERTO por ALL supervisor
  'Enable insert for admins and supervisors', -- DUPLICADO
  'Enable delete for admins and supervisors', -- DUPLICADO
  
  -- Duplicados de Trabajador
  'Permitir acceso a trabajadores', -- DUPLICADO (si es ALL, demasiado permisivo)
  'Enable read access for assigned workers' -- DUPLICADO del otro SELECT trabajador
);

-- =============================================
-- PASO 5: SCRIPT DE LIMPIEZA (NO EJECUTAR AÚN)
-- =============================================

/*
-- ⚠️ REVISAR ANTES DE EJECUTAR ⚠️
-- Eliminar políticas duplicadas/redundantes

-- ADMIN: Eliminar duplicado (mantener "Admin puede gestionar...")
DROP POLICY IF EXISTS "Permitir acceso a admin" ON trabajadores_tareas;

-- SUPERVISOR: Eliminar específicas (cubiertas por ALL)
DROP POLICY IF EXISTS "Supervisores pueden ver trabajadores de sus tareas" ON trabajadores_tareas;
DROP POLICY IF EXISTS "Permitir a supervisores ver trabajadores de sus tareas" ON trabajadores_tareas;
DROP POLICY IF EXISTS "Supervisores pueden agregar trabajadores a sus tareas" ON trabajadores_tareas;
DROP POLICY IF EXISTS "Supervisores pueden eliminar trabajadores de sus tareas" ON trabajadores_tareas;
DROP POLICY IF EXISTS "Enable insert for admins and supervisors" ON trabajadores_tareas;
DROP POLICY IF EXISTS "Enable delete for admins and supervisors" ON trabajadores_tareas;

-- TRABAJADOR: Eliminar duplicados (mantener solo SELECT)
DROP POLICY IF EXISTS "Permitir acceso a trabajadores" ON trabajadores_tareas;
DROP POLICY IF EXISTS "Enable read access for assigned workers" ON trabajadores_tareas;

*/

-- =============================================
-- PASO 6: VERIFICAR DESPUÉS DE LIMPIAR
-- =============================================

-- Ejecutar después de DROP para confirmar que quedaron solo 3-4 políticas

SELECT 
  '=== POLÍTICAS FINALES (DESPUÉS DE LIMPIEZA) ===' as resultado,
  policyname,
  cmd,
  CASE
    WHEN qual LIKE '%admin%' THEN '👔 Admin'
    WHEN qual LIKE '%supervisor%' THEN '👨‍💼 Supervisor'
    WHEN qual LIKE '%trabajador%' THEN '👷 Trabajador'
    ELSE 'Otro'
  END as rol
FROM pg_policies
WHERE tablename = 'trabajadores_tareas'
ORDER BY rol, cmd DESC;

SELECT 
  '=== CONTEO FINAL ===' as resultado,
  COUNT(*) as total_politicas,
  CASE 
    WHEN COUNT(*) <= 4 THEN '✅ ÓPTIMO'
    WHEN COUNT(*) <= 6 THEN '⚠️ Aceptable pero mejorable'
    ELSE '❌ Demasiadas políticas'
  END as evaluacion
FROM pg_policies
WHERE tablename = 'trabajadores_tareas';

-- =============================================
-- EXPLICACIÓN: ¿POR QUÉ DUPLICADAS?
-- =============================================

/*
RAZONES COMUNES:

1. Scripts ejecutados múltiples veces
   - Algunos scripts no tenían IF NOT EXISTS
   - Se ejecutaron en diferentes sesiones

2. Correcciones sucesivas
   - Se crearon nuevas políticas sin eliminar las viejas
   - Nombres en inglés → español → descriptivos

3. Políticas específicas innecesarias
   - Si tienes ALL, no necesitas SELECT, INSERT, DELETE separados
   - Pero algunos scripts las crean "por precaución"

4. Migraciones del sistema
   - El sistema evolucionó
   - Políticas temporales se volvieron permanentes
   - Nunca se limpiaron las viejas

IMPACTO:
- ✅ NO afecta funcionalidad (RLS usa OR, cualquier política que permita = permitido)
- ⚠️ Leve impacto en performance (más políticas = más evaluaciones)
- 🧹 Mejora legibilidad y mantenimiento

RECOMENDACIÓN:
- Revisar lista de candidatas a eliminar
- Hacer backup de políticas actuales
- Ejecutar limpieza
- Verificar que todo siga funcionando
*/

-- =============================================
-- BACKUP: GUARDAR POLÍTICAS ACTUALES
-- =============================================

-- Antes de eliminar, ejecuta esto para tener un backup:

SELECT 
  '-- BACKUP políticas trabajadores_tareas --' as backup,
  'CREATE POLICY "' || policyname || '"' ||
  ' ON trabajadores_tareas' ||
  ' FOR ' || cmd ||
  ' TO ' || roles[1] ||
  ' USING (' || qual || ')' ||
  CASE WHEN with_check IS NOT NULL THEN ' WITH CHECK (' || with_check || ')' ELSE '' END ||
  ';' as restore_command
FROM pg_policies
WHERE tablename = 'trabajadores_tareas'
ORDER BY policyname;
