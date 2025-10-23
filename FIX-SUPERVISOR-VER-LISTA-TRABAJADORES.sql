-- =============================================
-- FIX: SUPERVISOR NO VE LISTA DE TRABAJADORES DISPONIBLES
-- FECHA: 23 de Octubre, 2025
-- =============================================

-- PROBLEMA: Supervisor en /dashboard/tareas/76 no puede ver lista para agregar trabajadores
-- CAUSA: Falta política SELECT en usuarios y/o configuracion_trabajadores

-- =============================================
-- PASO 1: VERIFICAR POLÍTICAS ACTUALES
-- =============================================

SELECT 
  '=== ANTES: Políticas usuarios ===' as seccion,
  policyname,
  cmd
FROM pg_policies
WHERE tablename = 'usuarios'
  AND cmd = 'SELECT'
ORDER BY policyname;

SELECT 
  '=== ANTES: Políticas configuracion_trabajadores ===' as seccion,
  policyname,
  cmd
FROM pg_policies
WHERE tablename = 'configuracion_trabajadores'
  AND cmd = 'SELECT'
ORDER BY policyname;

-- =============================================
-- PASO 2: CREAR POLÍTICAS SELECT NECESARIAS
-- =============================================

-- 2.1 Política SELECT para supervisores en tabla usuarios
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'usuarios' 
    AND policyname = 'Supervisores pueden ver usuarios'
  ) THEN
    EXECUTE 'CREATE POLICY "Supervisores pueden ver usuarios"
    ON usuarios
    FOR SELECT
    TO authenticated
    USING (
      get_my_role() = ''supervisor''
    )';
    
    RAISE NOTICE '✅ Política SELECT usuarios para supervisores creada';
  ELSE
    RAISE NOTICE 'ℹ️ Política SELECT usuarios ya existe';
  END IF;
END $$;

-- 2.2 Política SELECT para supervisores en configuracion_trabajadores
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'configuracion_trabajadores' 
    AND policyname = 'Supervisores pueden ver configuracion de trabajadores'
  ) THEN
    EXECUTE 'CREATE POLICY "Supervisores pueden ver configuracion de trabajadores"
    ON configuracion_trabajadores
    FOR SELECT
    TO authenticated
    USING (
      get_my_role() = ''supervisor''
    )';
    
    RAISE NOTICE '✅ Política SELECT configuracion_trabajadores para supervisores creada';
  ELSE
    RAISE NOTICE 'ℹ️ Política SELECT configuracion_trabajadores ya existe';
  END IF;
END $$;

-- =============================================
-- PASO 3: VERIFICACIONES FINALES
-- =============================================

-- 3.1 Ver todas las políticas SELECT de usuarios
SELECT 
  '=== DESPUÉS: Políticas usuarios ===' as seccion,
  policyname,
  cmd,
  CASE 
    WHEN qual LIKE '%admin%' THEN 'Admin'
    WHEN qual LIKE '%supervisor%' THEN 'Supervisor'
    ELSE 'Otro'
  END as para_quien
FROM pg_policies
WHERE tablename = 'usuarios'
  AND cmd = 'SELECT'
ORDER BY policyname;

-- 3.2 Ver todas las políticas SELECT de configuracion_trabajadores
SELECT 
  '=== DESPUÉS: Políticas configuracion_trabajadores ===' as seccion,
  policyname,
  cmd,
  CASE 
    WHEN qual LIKE '%admin%' THEN 'Admin'
    WHEN qual LIKE '%supervisor%' THEN 'Supervisor'
    ELSE 'Otro'
  END as para_quien
FROM pg_policies
WHERE tablename = 'configuracion_trabajadores'
  AND cmd = 'SELECT'
ORDER BY policyname;

-- 3.3 Test final: Consulta que usa el frontend
SELECT 
  '=== TEST: Query del frontend ===' as seccion,
  u.id,
  u.email,
  u.rol,
  ct.activo
FROM usuarios u
JOIN configuracion_trabajadores ct ON u.id = ct.id_trabajador
WHERE u.rol = 'trabajador'
  AND ct.activo = true
LIMIT 5;

-- =============================================
-- RESULTADO ESPERADO
-- =============================================

/*
DESPUÉS DE EJECUTAR ESTE SCRIPT:

✅ Supervisores pueden hacer SELECT en tabla usuarios
✅ Supervisores pueden hacer SELECT en configuracion_trabajadores
✅ La query del frontend funcionará:
   - supabase.from("usuarios").select("..., configuracion_trabajadores!inner(activo)")

COMPORTAMIENTO FINAL:

Admin:
  ✅ Ve todos los usuarios
  ✅ Ve toda la configuración

Supervisor:
  ✅ Ve todos los usuarios (necesario para asignar trabajadores)
  ✅ Ve configuración de trabajadores (necesario para filtrar activos)
  
Trabajador:
  ✅ Ve su propia configuración (si existe política)
  ❌ NO ve otros usuarios (correcto)

PÁGINAS AFECTADAS:
1. /dashboard/tareas/[id] → Lista de trabajadores disponibles para asignar
2. /dashboard/trabajadores → Lista general de trabajadores
3. Cualquier página que liste usuarios
*/

-- =============================================
-- ROLLBACK (SI ALGO SALE MAL)
-- =============================================

/*
-- Para revertir:

DROP POLICY IF EXISTS "Supervisores pueden ver usuarios" ON usuarios;
DROP POLICY IF EXISTS "Supervisores pueden ver configuracion de trabajadores" ON configuracion_trabajadores;
*/
