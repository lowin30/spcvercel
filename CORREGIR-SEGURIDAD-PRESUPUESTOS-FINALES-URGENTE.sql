-- ============================================
-- 🚨 CORRECCIÓN URGENTE DE SEGURIDAD
-- presupuestos_finales SOLO para ADMIN
-- ============================================

-- ============================================
-- PASO 1: VERIFICAR ESTADO ACTUAL DE RLS
-- ============================================

SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_habilitado
FROM pg_tables
WHERE tablename = 'presupuestos_finales';

-- Si rls_habilitado = false → PROBLEMA

-- ============================================
-- PASO 2: VER POLÍTICAS ACTUALES (si existen)
-- ============================================

SELECT 
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies
WHERE tablename = 'presupuestos_finales';

-- ============================================
-- PASO 3: ELIMINAR TODAS LAS POLÍTICAS EXISTENTES
-- ============================================

-- Ver nombres de políticas primero
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'presupuestos_finales'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON presupuestos_finales', pol.policyname);
        RAISE NOTICE 'Política eliminada: %', pol.policyname;
    END LOOP;
END $$;

-- ============================================
-- PASO 4: HABILITAR RLS (Row Level Security)
-- ============================================

ALTER TABLE presupuestos_finales ENABLE ROW LEVEL SECURITY;

-- Verificar
SELECT 
    tablename,
    rowsecurity as rls_habilitado
FROM pg_tables
WHERE tablename = 'presupuestos_finales';
-- Debe mostrar rls_habilitado = true

-- ============================================
-- PASO 5: CREAR POLÍTICA CORRECTA - SOLO ADMIN
-- ============================================

-- Política para SELECT (leer)
CREATE POLICY "presupuestos_finales_select_admin"
ON presupuestos_finales
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 
        FROM usuarios
        WHERE usuarios.id = auth.uid()
        AND usuarios.rol = 'admin'
    )
);

-- Política para INSERT (crear)
CREATE POLICY "presupuestos_finales_insert_admin"
ON presupuestos_finales
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 
        FROM usuarios
        WHERE usuarios.id = auth.uid()
        AND usuarios.rol = 'admin'
    )
);

-- Política para UPDATE (actualizar)
CREATE POLICY "presupuestos_finales_update_admin"
ON presupuestos_finales
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 
        FROM usuarios
        WHERE usuarios.id = auth.uid()
        AND usuarios.rol = 'admin'
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 
        FROM usuarios
        WHERE usuarios.id = auth.uid()
        AND usuarios.rol = 'admin'
    )
);

-- Política para DELETE (eliminar)
CREATE POLICY "presupuestos_finales_delete_admin"
ON presupuestos_finales
FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 
        FROM usuarios
        WHERE usuarios.id = auth.uid()
        AND usuarios.rol = 'admin'
    )
);

-- ============================================
-- PASO 6: VERIFICAR POLÍTICAS CREADAS
-- ============================================

SELECT 
    policyname,
    cmd as operacion,
    roles,
    qual as condicion
FROM pg_policies
WHERE tablename = 'presupuestos_finales'
ORDER BY policyname;

-- Debe mostrar 4 políticas (SELECT, INSERT, UPDATE, DELETE)

-- ============================================
-- PASO 7: TESTING DE SEGURIDAD
-- ============================================

-- Como admin (debe funcionar)
-- Reemplaza 'ID_DE_ADMIN' con un ID real de admin
SET LOCAL auth.uid TO 'ID_DE_ADMIN_AQUI';
SELECT COUNT(*) FROM presupuestos_finales;
-- Debe devolver el conteo real

-- Como supervisor (debe fallar o devolver 0)
-- Reemplaza 'ID_DE_SUPERVISOR' con un ID real de supervisor
SET LOCAL auth.uid TO 'ID_DE_SUPERVISOR_AQUI';
SELECT COUNT(*) FROM presupuestos_finales;
-- Debe devolver 0 o error de permisos

-- Resetear
RESET auth.uid;

-- ============================================
-- PASO 8: DOCUMENTAR
-- ============================================

COMMENT ON POLICY "presupuestos_finales_select_admin" ON presupuestos_finales IS 
'Solo administradores pueden leer presupuestos finales';

COMMENT ON POLICY "presupuestos_finales_insert_admin" ON presupuestos_finales IS 
'Solo administradores pueden crear presupuestos finales';

COMMENT ON POLICY "presupuestos_finales_update_admin" ON presupuestos_finales IS 
'Solo administradores pueden actualizar presupuestos finales';

COMMENT ON POLICY "presupuestos_finales_delete_admin" ON presupuestos_finales IS 
'Solo administradores pueden eliminar presupuestos finales';

-- ============================================
-- ✅ RESULTADO ESPERADO
-- ============================================

/*
Después de ejecutar:

1. RLS habilitado = true
2. 4 políticas creadas (SELECT, INSERT, UPDATE, DELETE)
3. Solo usuarios con rol='admin' pueden acceder
4. Supervisores NO pueden ver presupuestos finales
5. Sistema seguro ✅

IMPORTANTE:
- Tus server actions seguirán funcionando (usan service_role)
- La UI para admin seguirá funcionando
- Supervisores serán bloqueados correctamente
*/

-- ============================================
-- 🚨 SI ALGO NO FUNCIONA
-- ============================================

-- Para ver errores de políticas:
SELECT * FROM pg_policies WHERE tablename = 'presupuestos_finales';

-- Para deshabilitar temporalmente (NO RECOMENDADO):
-- ALTER TABLE presupuestos_finales DISABLE ROW LEVEL SECURITY;

-- Para volver a habilitar:
-- ALTER TABLE presupuestos_finales ENABLE ROW LEVEL SECURITY;
