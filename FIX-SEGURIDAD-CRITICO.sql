-- ============================================
-- SCRIPT 1: CORRECCIONES DE SEGURIDAD CRITICAS
-- CAMBIOS MINIMOS - NO TOCA DATOS
-- ============================================

-- ============================================
-- PASO 1: ELIMINAR POLITICAS INCORRECTAS
-- ============================================

-- Eliminar acceso de supervisores a facturas
DROP POLICY IF EXISTS "supervisor_select_facturas" ON facturas;

-- Eliminar acceso de supervisores a items
DROP POLICY IF EXISTS "supervisor_select_items" ON items;

-- ============================================
-- PASO 2: CORREGIR POLITICA DE pagos_facturas
-- ============================================

-- Eliminar politica incorrecta
DROP POLICY IF EXISTS "Admin puede gestionar todos los pagos de facturas" ON pagos_facturas;

-- Crear politica correcta (solo admin)
CREATE POLICY "Admin puede gestionar todos los pagos de facturas"
ON pagos_facturas
FOR ALL
TO authenticated
USING (get_my_role() = 'admin')
WITH CHECK (get_my_role() = 'admin');

-- ============================================
-- PASO 3: VERIFICACION INMEDIATA
-- ============================================

-- Verificar que las politicas se eliminaron
SELECT 
    'VERIFICACION: Politicas eliminadas' as paso,
    COUNT(*) as deberia_ser_cero
FROM pg_policies
WHERE (tablename = 'facturas' AND policyname = 'supervisor_select_facturas')
   OR (tablename = 'items' AND policyname = 'supervisor_select_items');

-- Verificar politica de pagos_facturas corregida
SELECT 
    'VERIFICACION: Politica pagos_facturas corregida' as paso,
    policyname,
    qual as condicion_correcta
FROM pg_policies
WHERE tablename = 'pagos_facturas'
    AND policyname = 'Admin puede gestionar todos los pagos de facturas';

-- Verificar que facturas solo tiene 1 politica (admin)
SELECT 
    'VERIFICACION: Facturas solo admin' as paso,
    COUNT(*) as deberia_ser_1
FROM pg_policies
WHERE tablename = 'facturas';

-- Verificar que items solo tiene 1 politica (admin)
SELECT 
    'VERIFICACION: Items solo admin' as paso,
    COUNT(*) as deberia_ser_1
FROM pg_policies
WHERE tablename = 'items';

-- ============================================
-- RESULTADO ESPERADO
-- ============================================

/*
VERIFICACION 1: deberia_ser_cero = 0
  → Las 2 politicas de supervisores fueron eliminadas

VERIFICACION 2: condicion_correcta = (get_my_role() = 'admin'::text)
  → pagos_facturas ahora es solo admin

VERIFICACION 3: deberia_ser_1 = 1
  → facturas solo tiene politica admin_all_facturas

VERIFICACION 4: deberia_ser_1 = 1
  → items solo tiene politica admin_all_items

SI TODOS LOS RESULTADOS SON CORRECTOS:
✅ Seguridad corregida
✅ Solo admins pueden ver facturas, items y pagos_facturas
✅ Aplicacion sigue funcionando normal
*/

-- ============================================
-- NOTAS IMPORTANTES
-- ============================================

/*
ESTE SCRIPT:
✅ NO modifica datos
✅ NO altera estructura de tablas
✅ NO afecta otras politicas
✅ Solo corrige accesos incorrectos

IMPACTO:
- Supervisores ya NO pueden ver facturas (correcto)
- Supervisores ya NO pueden ver items (correcto)
- Solo admin puede gestionar pagos_facturas (correcto)
- Todo lo demas sigue igual
*/
