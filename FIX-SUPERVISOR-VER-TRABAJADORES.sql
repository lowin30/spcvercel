-- =============================================
-- FIX: SUPERVISOR NO VE TRABAJADORES ASIGNADOS
-- FECHA: 23 de Octubre, 2025
-- =============================================

-- PROBLEMA 1: Supervisor en /dashboard/tareas/76 no ve trabajadores
-- PROBLEMA 2: Supervisor en /dashboard/trabajadores/registro-dias no ve trabajadores

-- =============================================
-- PASO 1: DIAGNOSTICAR PROBLEMA
-- =============================================

-- 1.1 Ver políticas actuales de trabajadores_tareas
SELECT 
  '=== POLÍTICAS trabajadores_tareas ===' as seccion,
  policyname,
  cmd,
  roles,
  SUBSTRING(qual, 1, 100) as qual_preview
FROM pg_policies
WHERE tablename = 'trabajadores_tareas'
ORDER BY policyname;

-- 1.2 Verificar si existe vista_asignaciones_tareas_trabajadores
SELECT 
  '=== VISTA vista_asignaciones_tareas_trabajadores ===' as seccion,
  table_name,
  CASE WHEN view_definition IS NOT NULL THEN 'EXISTE' ELSE 'NO EXISTE' END as estado
FROM information_schema.views
WHERE table_schema = 'public'
  AND table_name = 'vista_asignaciones_tareas_trabajadores';

-- 1.3 Ver definición de la vista si existe
SELECT 
  '=== DEFINICIÓN DE LA VISTA ===' as seccion,
  view_definition
FROM information_schema.views
WHERE table_schema = 'public'
  AND table_name = 'vista_asignaciones_tareas_trabajadores';

-- 1.4 Datos reales: Trabajadores de tarea 76
SELECT 
  '=== TRABAJADORES TAREA 76 ===' as seccion,
  tt.id_tarea,
  tt.id_trabajador,
  u.email as trabajador_email
FROM trabajadores_tareas tt
JOIN usuarios u ON tt.id_trabajador = u.id
WHERE tt.id_tarea = 76;

-- 1.5 Supervisor de tarea 76
SELECT 
  '=== SUPERVISOR TAREA 76 ===' as seccion,
  st.id_tarea,
  st.id_supervisor,
  u.email as supervisor_email
FROM supervisores_tareas st
JOIN usuarios u ON st.id_supervisor = u.id
WHERE st.id_tarea = 76;

-- =============================================
-- PASO 2: SOLUCIÓN - AGREGAR POLÍTICA SELECT PARA SUPERVISORES
-- =============================================

-- 2.1 Verificar si ya existe política SELECT para supervisores
SELECT 
  '=== VERIFICAR POLÍTICA EXISTENTE ===' as seccion,
  COUNT(*) as count,
  CASE 
    WHEN COUNT(*) > 0 THEN 'YA EXISTE - NO CREAR'
    ELSE 'NO EXISTE - CREAR AHORA'
  END as accion
FROM pg_policies
WHERE tablename = 'trabajadores_tareas'
  AND cmd = 'SELECT'
  AND (
    policyname LIKE '%superv%' OR
    policyname LIKE '%Superv%' OR
    qual LIKE '%supervisor%'
  );

-- 2.2 CREAR POLÍTICA SELECT para supervisores
-- Solo ejecutar si la verificación anterior dice "NO EXISTE - CREAR AHORA"

DO $$
BEGIN
  -- Verificar si la política ya existe
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'trabajadores_tareas' 
    AND policyname = 'Supervisores pueden ver trabajadores de sus tareas'
  ) THEN
    -- Crear la política
    EXECUTE 'CREATE POLICY "Supervisores pueden ver trabajadores de sus tareas"
    ON trabajadores_tareas
    FOR SELECT
    TO authenticated
    USING (
      get_my_role() = ''supervisor''
      AND id_tarea IN (
        SELECT id_tarea 
        FROM supervisores_tareas 
        WHERE id_supervisor = auth.uid()
      )
    )';
    
    RAISE NOTICE 'Política creada exitosamente';
  ELSE
    RAISE NOTICE 'La política ya existe - no se creó nuevamente';
  END IF;
END $$;

-- 2.3 Verificar también si existe INSERT para supervisores
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'trabajadores_tareas' 
    AND policyname = 'Supervisores pueden agregar trabajadores a sus tareas'
  ) THEN
    EXECUTE 'CREATE POLICY "Supervisores pueden agregar trabajadores a sus tareas"
    ON trabajadores_tareas
    FOR INSERT
    TO authenticated
    WITH CHECK (
      get_my_role() = ''supervisor''
      AND id_tarea IN (
        SELECT id_tarea 
        FROM supervisores_tareas 
        WHERE id_supervisor = auth.uid()
      )
    )';
    
    RAISE NOTICE 'Política INSERT creada exitosamente';
  ELSE
    RAISE NOTICE 'La política INSERT ya existe';
  END IF;
END $$;

-- 2.4 Verificar DELETE para supervisores
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'trabajadores_tareas' 
    AND policyname = 'Supervisores pueden eliminar trabajadores de sus tareas'
  ) THEN
    EXECUTE 'CREATE POLICY "Supervisores pueden eliminar trabajadores de sus tareas"
    ON trabajadores_tareas
    FOR DELETE
    TO authenticated
    USING (
      get_my_role() = ''supervisor''
      AND id_tarea IN (
        SELECT id_tarea 
        FROM supervisores_tareas 
        WHERE id_supervisor = auth.uid()
      )
    )';
    
    RAISE NOTICE 'Política DELETE creada exitosamente';
  ELSE
    RAISE NOTICE 'La política DELETE ya existe';
  END IF;
END $$;

-- =============================================
-- PASO 3: VERIFICAR VISTA (SI EXISTE)
-- =============================================

-- 3.1 Si la vista existe, verificar su seguridad
-- Las vistas heredan permisos de las tablas base, así que arreglar RLS de trabajadores_tareas debería ser suficiente

-- =============================================
-- PASO 4: VERIFICACIONES FINALES
-- =============================================

-- 4.1 Ver TODAS las políticas finales de trabajadores_tareas
SELECT 
  '=== POLÍTICAS FINALES trabajadores_tareas ===' as seccion,
  policyname,
  cmd,
  CASE 
    WHEN cmd = 'SELECT' THEN 'Leer'
    WHEN cmd = 'INSERT' THEN 'Crear'
    WHEN cmd = 'UPDATE' THEN 'Editar'
    WHEN cmd = 'DELETE' THEN 'Eliminar'
    WHEN cmd = 'ALL' THEN 'Todo'
    ELSE cmd::text
  END as operacion,
  SUBSTRING(qual, 1, 50) as quien_puede
FROM pg_policies
WHERE tablename = 'trabajadores_tareas'
ORDER BY 
  CASE 
    WHEN policyname LIKE '%Admin%' THEN 1
    WHEN policyname LIKE '%Superv%' THEN 2
    WHEN policyname LIKE '%Trabaj%' THEN 3
    ELSE 4
  END,
  cmd;

-- 4.2 Test final: ¿Puede un supervisor ver trabajadores de tarea 76?
SELECT 
  '=== TEST FINAL: Acceso supervisor a trabajadores ===' as seccion,
  'Simulación: Si esta query devuelve filas, el supervisor PODRA verlas' as nota,
  tt.id_tarea,
  tt.id_trabajador,
  u.email as trabajador_email
FROM trabajadores_tareas tt
JOIN usuarios u ON tt.id_trabajador = u.id
WHERE tt.id_tarea IN (
  SELECT id_tarea 
  FROM supervisores_tareas 
  WHERE id_tarea = 76
);

-- =============================================
-- RESULTADO ESPERADO
-- =============================================

/*
DESPUÉS DE EJECUTAR ESTE SCRIPT:

✅ Política SELECT para supervisores creada
✅ Política INSERT para supervisores creada (para agregar trabajadores)
✅ Política DELETE para supervisores creada (para quitar trabajadores)

COMPORTAMIENTO FINAL:

Admin:
  ✅ Ver todos los trabajadores de todas las tareas
  ✅ Agregar/quitar trabajadores en cualquier tarea
  ✅ Sin restricciones

Supervisor:
  ✅ Ver trabajadores de SUS tareas (supervisores_tareas)
  ✅ Agregar trabajadores a SUS tareas
  ✅ Quitar trabajadores de SUS tareas
  ❌ NO puede ver/modificar trabajadores de otras tareas

Trabajador:
  ✅ Ver sus propias asignaciones (trabajadores_tareas donde id_trabajador = auth.uid())
  ❌ NO puede ver otros trabajadores
  ❌ NO puede agregar/quitar trabajadores

PÁGINAS AFECTADAS:
1. /dashboard/tareas/[id] → Supervisor verá trabajadores asignados
2. /dashboard/trabajadores/registro-dias → Supervisor verá lista de trabajadores al seleccionar tarea
*/

-- =============================================
-- ROLLBACK (SI ALGO SALE MAL)
-- =============================================

/*
-- Para revertir, ejecutar:

DROP POLICY IF EXISTS "Supervisores pueden ver trabajadores de sus tareas" ON trabajadores_tareas;
DROP POLICY IF EXISTS "Supervisores pueden agregar trabajadores a sus tareas" ON trabajadores_tareas;
DROP POLICY IF EXISTS "Supervisores pueden eliminar trabajadores de sus tareas" ON trabajadores_tareas;

-- Y verificar que las políticas admin y trabajador sigan existiendo:
SELECT policyname FROM pg_policies WHERE tablename = 'trabajadores_tareas';
*/
