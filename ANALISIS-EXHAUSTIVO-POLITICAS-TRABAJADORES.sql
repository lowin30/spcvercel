-- =============================================
-- ANÁLISIS EXHAUSTIVO DE POLÍTICAS trabajadores_tareas
-- FECHA: 23 de Octubre, 2025
-- OBJETIVO: Revisar a profundidad TODAS las políticas antes de eliminar cualquiera
-- =============================================

-- =============================================
-- PARTE 1: ANÁLISIS COMPLETO DE POLÍTICAS ACTUALES
-- =============================================

-- 1.1 Ver TODAS las políticas con detalle completo
SELECT 
  '=== 1. LISTADO COMPLETO ===' as seccion,
  ROW_NUMBER() OVER (ORDER BY policyname) as num,
  policyname,
  cmd,
  CASE 
    WHEN cmd = 'ALL' THEN '⭐ CUBRE TODO (SELECT, INSERT, UPDATE, DELETE)'
    WHEN cmd = 'SELECT' THEN '👁️ SOLO LECTURA'
    WHEN cmd = 'INSERT' THEN '➕ SOLO CREAR'
    WHEN cmd = 'UPDATE' THEN '✏️ SOLO EDITAR'
    WHEN cmd = 'DELETE' THEN '🗑️ SOLO ELIMINAR'
  END as alcance,
  roles,
  qual as condicion_using,
  with_check as condicion_with_check
FROM pg_policies
WHERE tablename = 'trabajadores_tareas'
ORDER BY policyname;

-- =============================================
-- PARTE 2: ANÁLISIS POR ROL
-- =============================================

-- 2.1 POLÍTICAS DE ADMIN
SELECT 
  '=== 2.1 POLÍTICAS ADMIN ===' as seccion,
  policyname,
  cmd,
  CASE 
    WHEN cmd = 'ALL' THEN '✅ Acceso total'
    ELSE cmd::text
  END as que_permite,
  CASE
    WHEN qual LIKE '%get_my_role()%admin%' THEN '✅ Usa get_my_role()'
    WHEN qual LIKE '%admin%' THEN '⚠️ Otra verificación admin'
    ELSE '❌ No parece ser de admin'
  END as tipo_verificacion
FROM pg_policies
WHERE tablename = 'trabajadores_tareas'
  AND (
    policyname ILIKE '%admin%' OR
    qual LIKE '%admin%'
  )
ORDER BY cmd DESC;

-- 2.2 POLÍTICAS DE SUPERVISOR
SELECT 
  '=== 2.2 POLÍTICAS SUPERVISOR ===' as seccion,
  policyname,
  cmd,
  CASE
    WHEN cmd = 'ALL' THEN '⭐ CUBRE SELECT, INSERT, UPDATE, DELETE'
    ELSE '⚠️ Operación específica: ' || cmd
  END as cobertura,
  CASE
    WHEN qual LIKE '%get_my_role()%supervisor%' THEN '✅ Usa get_my_role()'
    WHEN qual LIKE '%supervisor%' THEN '✅ Verifica supervisor'
    ELSE '❓ Verificación no clara'
  END as verificacion,
  CASE
    WHEN qual LIKE '%supervisores_tareas%' THEN '✅ Verifica en supervisores_tareas'
    ELSE '⚠️ No verifica supervisores_tareas'
  END as verifica_asignacion
FROM pg_policies
WHERE tablename = 'trabajadores_tareas'
  AND (
    policyname ILIKE '%superv%' OR
    qual LIKE '%superv%'
  )
ORDER BY 
  CASE WHEN cmd = 'ALL' THEN 1 ELSE 2 END,
  cmd;

-- 2.3 POLÍTICAS DE TRABAJADOR
SELECT 
  '=== 2.3 POLÍTICAS TRABAJADOR ===' as seccion,
  policyname,
  cmd,
  CASE
    WHEN cmd = 'ALL' THEN '⚠️ DEMASIADO PERMISIVO - debería ser solo SELECT'
    WHEN cmd = 'SELECT' THEN '✅ CORRECTO - Solo lectura'
    ELSE '❓ ' || cmd
  END as evaluacion,
  CASE
    WHEN qual LIKE '%id_trabajador = auth.uid()%' THEN '✅ Verifica su propio ID'
    WHEN qual LIKE '%get_my_role()%trabajador%' THEN '✅ Verifica rol + ID'
    ELSE '⚠️ Verificación no clara'
  END as seguridad
FROM pg_policies
WHERE tablename = 'trabajadores_tareas'
  AND (
    policyname ILIKE '%trabaj%' OR
    policyname ILIKE '%worker%' OR
    qual LIKE '%trabajador%' OR
    qual LIKE '%id_trabajador%'
  )
ORDER BY cmd;

-- =============================================
-- PARTE 3: IDENTIFICAR DUPLICADOS Y REDUNDANCIAS
-- =============================================

-- 3.1 Contar políticas por rol y comando
SELECT 
  '=== 3.1 DUPLICADOS POR ROL Y COMANDO ===' as seccion,
  CASE
    WHEN policyname ILIKE '%admin%' OR qual LIKE '%admin%' THEN '👔 Admin'
    WHEN policyname ILIKE '%superv%' OR qual LIKE '%superv%' THEN '👨‍💼 Supervisor'
    WHEN policyname ILIKE '%trabaj%' OR qual LIKE '%trabaj%' THEN '👷 Trabajador'
    ELSE '❓ Otro'
  END as rol,
  cmd,
  COUNT(*) as cantidad,
  CASE 
    WHEN COUNT(*) > 1 THEN '⚠️ DUPLICADO'
    ELSE '✅ OK'
  END as estado,
  STRING_AGG(policyname, ' | ') as nombres_politicas
FROM pg_policies
WHERE tablename = 'trabajadores_tareas'
GROUP BY 
  CASE
    WHEN policyname ILIKE '%admin%' OR qual LIKE '%admin%' THEN '👔 Admin'
    WHEN policyname ILIKE '%superv%' OR qual LIKE '%superv%' THEN '👨‍💼 Supervisor'
    WHEN policyname ILIKE '%trabaj%' OR qual LIKE '%trabaj%' THEN '👷 Trabajador'
    ELSE '❓ Otro'
  END,
  cmd
HAVING COUNT(*) > 1
ORDER BY rol, cmd;

-- 3.2 Políticas ALL que hacen redundantes a las específicas
SELECT 
  '=== 3.2 POLÍTICAS ALL (cubren otras) ===' as seccion,
  policyname,
  CASE
    WHEN policyname ILIKE '%admin%' THEN '👔 Admin'
    WHEN policyname ILIKE '%superv%' THEN '👨‍💼 Supervisor'
    WHEN policyname ILIKE '%trabaj%' THEN '👷 Trabajador'
    ELSE '❓ Otro'
  END as rol,
  '⭐ Esta política ALL cubre SELECT, INSERT, UPDATE y DELETE' as nota_importante,
  qual as condicion
FROM pg_policies
WHERE tablename = 'trabajadores_tareas'
  AND cmd = 'ALL'
ORDER BY policyname;

-- =============================================
-- PARTE 4: ANÁLISIS DE SEGURIDAD
-- =============================================

-- 4.1 Verificar que Admin tenga acceso total
SELECT 
  '=== 4.1 ADMIN TIENE ACCESO TOTAL? ===' as seccion,
  COUNT(*) FILTER (WHERE cmd = 'ALL') as politicas_all,
  COUNT(*) as total_politicas,
  CASE 
    WHEN COUNT(*) FILTER (WHERE cmd = 'ALL') > 0 THEN '✅ SÍ - Tiene política ALL'
    ELSE '❌ NO - Solo tiene políticas específicas'
  END as evaluacion
FROM pg_policies
WHERE tablename = 'trabajadores_tareas'
  AND (policyname ILIKE '%admin%' OR qual LIKE '%admin%');

-- 4.2 Verificar que trabajadores NO tengan acceso ALL
SELECT 
  '=== 4.2 TRABAJADOR CON ALL? (debería ser NO) ===' as seccion,
  policyname,
  cmd,
  CASE 
    WHEN cmd = 'ALL' THEN '❌ PELIGROSO - Trabajador tiene acceso total'
    ELSE '✅ SEGURO - Solo acceso limitado'
  END as evaluacion_seguridad,
  qual as condicion
FROM pg_policies
WHERE tablename = 'trabajadores_tareas'
  AND (policyname ILIKE '%trabaj%' OR qual LIKE '%trabaj%')
ORDER BY 
  CASE WHEN cmd = 'ALL' THEN 1 ELSE 2 END;

-- 4.3 Verificar que supervisor solo vea/edite sus tareas
SELECT 
  '=== 4.3 SUPERVISOR VERIFICA supervisores_tareas? ===' as seccion,
  policyname,
  cmd,
  CASE 
    WHEN qual LIKE '%supervisores_tareas%' THEN '✅ SÍ - Verifica asignación'
    ELSE '❌ NO - Acceso sin verificar asignación'
  END as verifica_asignacion,
  SUBSTRING(qual, 1, 100) as parte_condicion
FROM pg_policies
WHERE tablename = 'trabajadores_tareas'
  AND (policyname ILIKE '%superv%' OR qual LIKE '%superv%')
ORDER BY policyname;

-- =============================================
-- PARTE 5: RECOMENDACIONES
-- =============================================

-- 5.1 Resumen de políticas óptimas necesarias
SELECT 
  '=== 5.1 POLÍTICAS ÓPTIMAS NECESARIAS ===' as seccion,
  'Política' as tipo,
  'Descripción' as descripcion,
  'Estado Actual' as estado
UNION ALL
SELECT 
  '---',
  '1. Admin ALL',
  'Admin puede hacer todo',
  CASE WHEN EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'trabajadores_tareas' 
      AND cmd = 'ALL' 
      AND (policyname ILIKE '%admin%' OR qual LIKE '%admin%')
  ) THEN '✅ EXISTE' ELSE '❌ FALTA' END
UNION ALL
SELECT 
  '---',
  '2. Supervisor ALL (sus tareas)',
  'Supervisor gestiona trabajadores de sus tareas',
  CASE WHEN EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'trabajadores_tareas' 
      AND cmd = 'ALL' 
      AND qual LIKE '%superv%' 
      AND qual LIKE '%supervisores_tareas%'
  ) THEN '✅ EXISTE' ELSE '❌ FALTA' END
UNION ALL
SELECT 
  '---',
  '3. Trabajador SELECT',
  'Trabajador solo ve sus asignaciones',
  CASE WHEN EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'trabajadores_tareas' 
      AND cmd = 'SELECT' 
      AND (qual LIKE '%trabajador%' OR qual LIKE '%id_trabajador%')
  ) THEN '✅ EXISTE' ELSE '❌ FALTA' END;

-- =============================================
-- PARTE 6: POLÍTICAS CANDIDATAS A ELIMINAR
-- =============================================

-- 6.1 Listar políticas redundantes (cubiertas por ALL)
WITH politicas_all AS (
  SELECT DISTINCT
    CASE
      WHEN policyname ILIKE '%admin%' OR qual LIKE '%admin%' THEN 'admin'
      WHEN policyname ILIKE '%superv%' OR qual LIKE '%superv%' THEN 'supervisor'
      WHEN policyname ILIKE '%trabaj%' OR qual LIKE '%trabaj%' THEN 'trabajador'
    END as rol_detectado
  FROM pg_policies
  WHERE tablename = 'trabajadores_tareas'
    AND cmd = 'ALL'
)
SELECT 
  '=== 6.1 CANDIDATAS A ELIMINAR (redundantes) ===' as seccion,
  p.policyname,
  p.cmd,
  CASE
    WHEN p.policyname ILIKE '%admin%' OR p.qual LIKE '%admin%' THEN '👔 Admin'
    WHEN p.policyname ILIKE '%superv%' OR p.qual LIKE '%superv%' THEN '👨‍💼 Supervisor'
    WHEN p.policyname ILIKE '%trabaj%' OR p.qual LIKE '%trabaj%' THEN '👷 Trabajador'
  END as rol,
  CASE
    WHEN p.cmd IN ('SELECT', 'INSERT', 'UPDATE', 'DELETE') AND EXISTS (
      SELECT 1 FROM politicas_all pa
      WHERE (
        (pa.rol_detectado = 'admin' AND (p.policyname ILIKE '%admin%' OR p.qual LIKE '%admin%')) OR
        (pa.rol_detectado = 'supervisor' AND (p.policyname ILIKE '%superv%' OR p.qual LIKE '%superv%')) OR
        (pa.rol_detectado = 'trabajador' AND (p.policyname ILIKE '%trabaj%' OR p.qual LIKE '%trabaj%'))
      )
    ) THEN '⚠️ REDUNDANTE - Cubierta por política ALL'
    WHEN p.cmd = 'ALL' THEN '✅ MANTENER - Política principal'
    ELSE '❓ Revisar manualmente'
  END as recomendacion
FROM pg_policies p
WHERE p.tablename = 'trabajadores_tareas'
  AND p.cmd != 'ALL'
ORDER BY rol, p.cmd;

-- 6.2 Duplicados exactos (mismo rol y comando)
SELECT 
  '=== 6.2 DUPLICADOS EXACTOS ===' as seccion,
  CASE
    WHEN policyname ILIKE '%admin%' OR qual LIKE '%admin%' THEN '👔 Admin'
    WHEN policyname ILIKE '%superv%' OR qual LIKE '%superv%' THEN '👨‍💼 Supervisor'
    WHEN policyname ILIKE '%trabaj%' OR qual LIKE '%trabaj%' THEN '👷 Trabajador'
    ELSE '❓ Otro'
  END as rol,
  cmd,
  policyname,
  '⚠️ Eliminar todas menos UNA de este grupo' as accion
FROM pg_policies
WHERE tablename = 'trabajadores_tareas'
  AND (
    CASE
      WHEN policyname ILIKE '%admin%' OR qual LIKE '%admin%' THEN '👔 Admin'
      WHEN policyname ILIKE '%superv%' OR qual LIKE '%superv%' THEN '👨‍💼 Supervisor'
      WHEN policyname ILIKE '%trabaj%' OR qual LIKE '%trabaj%' THEN '👷 Trabajador'
      ELSE '❓ Otro'
    END,
    cmd
  ) IN (
    SELECT 
      CASE
        WHEN policyname ILIKE '%admin%' OR qual LIKE '%admin%' THEN '👔 Admin'
        WHEN policyname ILIKE '%superv%' OR qual LIKE '%superv%' THEN '👨‍💼 Supervisor'
        WHEN policyname ILIKE '%trabaj%' OR qual LIKE '%trabaj%' THEN '👷 Trabajador'
        ELSE '❓ Otro'
      END,
      cmd
    FROM pg_policies
    WHERE tablename = 'trabajadores_tareas'
    GROUP BY 
      CASE
        WHEN policyname ILIKE '%admin%' OR qual LIKE '%admin%' THEN '👔 Admin'
        WHEN policyname ILIKE '%superv%' OR qual LIKE '%superv%' THEN '👨‍💼 Supervisor'
        WHEN policyname ILIKE '%trabaj%' OR qual LIKE '%trabaj%' THEN '👷 Trabajador'
        ELSE '❓ Otro'
      END,
      cmd
    HAVING COUNT(*) > 1
  )
ORDER BY rol, cmd, policyname;

-- =============================================
-- PARTE 7: CONTEO FINAL Y EVALUACIÓN
-- =============================================

SELECT 
  '=== 7. RESUMEN FINAL ===' as seccion,
  COUNT(*) as total_politicas,
  COUNT(*) FILTER (WHERE cmd = 'ALL') as politicas_all,
  COUNT(*) FILTER (WHERE cmd = 'SELECT') as politicas_select,
  COUNT(*) FILTER (WHERE cmd = 'INSERT') as politicas_insert,
  COUNT(*) FILTER (WHERE cmd = 'UPDATE') as politicas_update,
  COUNT(*) FILTER (WHERE cmd = 'DELETE') as politicas_delete,
  CASE 
    WHEN COUNT(*) <= 4 THEN '✅ ÓPTIMO'
    WHEN COUNT(*) <= 6 THEN '⚠️ Aceptable pero hay duplicados'
    ELSE '❌ DEMASIADAS POLÍTICAS'
  END as evaluacion
FROM pg_policies
WHERE tablename = 'trabajadores_tareas';

-- =============================================
-- RESULTADO ESPERADO DE ESTE ANÁLISIS
-- =============================================

/*
Este script NO elimina nada, solo analiza.

DESPUÉS DE EJECUTAR VERÁS:

1. Listado completo de todas las políticas (12 aprox)
2. Análisis por rol (Admin, Supervisor, Trabajador)
3. Identificación de duplicados
4. Análisis de seguridad (si Admin tiene acceso total, etc)
5. Recomendaciones de cuáles políticas son necesarias
6. Lista de candidatas a eliminar (redundantes o duplicadas)
7. Resumen final con evaluación

PRÓXIMO PASO:
- Revisar los resultados
- Confirmar cuáles políticas eliminar
- Crear script de limpieza específico
*/
