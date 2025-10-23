-- =============================================
-- VERIFICAR: Permisos para cargar trabajadores disponibles
-- =============================================

-- 1. Políticas de tabla usuarios
SELECT 
  '=== POLÍTICAS usuarios ===' as seccion,
  policyname,
  cmd,
  SUBSTRING(qual, 1, 80) as quien_puede
FROM pg_policies
WHERE tablename = 'usuarios'
ORDER BY policyname;

-- 2. Políticas de configuracion_trabajadores
SELECT 
  '=== POLÍTICAS configuracion_trabajadores ===' as seccion,
  policyname,
  cmd,
  SUBSTRING(qual, 1, 80) as quien_puede
FROM pg_policies
WHERE tablename = 'configuracion_trabajadores'
ORDER BY policyname;

-- 3. Test: ¿Puede un supervisor ver trabajadores activos?
SELECT 
  '=== TEST: Trabajadores activos ===' as seccion,
  u.id,
  u.email,
  u.rol,
  ct.activo
FROM usuarios u
JOIN configuracion_trabajadores ct ON u.id = ct.id_trabajador
WHERE u.rol = 'trabajador'
  AND ct.activo = true;

-- 4. Verificar si get_my_role() funciona
SELECT 
  '=== TEST: Función get_my_role() ===' as seccion,
  get_my_role() as mi_rol;
