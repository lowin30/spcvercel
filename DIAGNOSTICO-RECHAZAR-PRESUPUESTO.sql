-- =====================================================
-- DIAGNÓSTICO: Botón "Rechazar" Presupuesto NO Funciona
-- Fecha: 21 de Octubre, 2025
-- Presupuesto ID: 72 (tarea 70)
-- =====================================================

-- ✅ CONFIRMADO: Columna 'rechazado' SÍ existe
-- Investigando otras causas...

-- =====================================================
-- PASO 1: Verificar estructura completa de la tabla
-- =====================================================

SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'presupuestos_finales'
ORDER BY ordinal_position;

-- ⚠️ VERIFICAR: ¿Aparece la columna 'observaciones'?
-- Si NO aparece, eso es el problema del botón rechazar


-- =====================================================
-- SOLUCIÓN: Agregar columna 'observaciones' si no existe
-- =====================================================

-- Verificar si la columna existe
SELECT column_name 
FROM information_schema.columns
WHERE table_name = 'presupuestos_finales' 
AND column_name = 'observaciones';

-- Si NO existe, agregarla
ALTER TABLE presupuestos_finales
ADD COLUMN IF NOT EXISTS observaciones TEXT;

-- Verificar que se agregó
SELECT column_name, data_type 
FROM information_schema.columns
WHERE table_name = 'presupuestos_finales' 
AND column_name = 'observaciones';

-- Ver TODAS las políticas de la tabla presupuestos_finales
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,  -- SELECT, INSERT, UPDATE, DELETE
  qual,  -- USING clause
  with_check  -- WITH CHECK clause
FROM pg_policies 
WHERE tablename = 'presupuestos_finales';

-- INTERPRETACIÓN:
-- Si hay una política para UPDATE que NO permite al usuario actual,
-- el UPDATE se ejecutará sin errores pero NO actualizará ninguna fila


-- =====================================================
-- PASO 3: Verificar si RLS está habilitado
-- =====================================================

SELECT 
  tablename,
  rowsecurity  -- true = RLS habilitado, false = RLS deshabilitado
FROM pg_tables 
WHERE tablename = 'presupuestos_finales';


-- =====================================================
-- PASO 4: Intentar UPDATE manual de prueba
-- =====================================================

-- IMPORTANTE: Reemplazar <ID_REAL> con un ID existente de presupuesto final
-- Por ejemplo, el presupuesto de la tarea 70 que reportó el usuario

-- Ver el presupuesto actual
SELECT 
  id,
  code,
  aprobado,
  rechazado,
  observaciones,
  created_at,
  updated_at
FROM presupuestos_finales
WHERE id = 72;  -- ID del presupuesto que quieres rechazar

-- Intentar actualizar (ahora con observaciones)
UPDATE presupuestos_finales
SET 
  rechazado = true,
  aprobado = false,
  observaciones = 'Test desde SQL - diagnóstico',
  updated_at = NOW()
WHERE id = 72;

-- Ver si se actualizó
SELECT 
  id,
  code,
  aprobado,
  rechazado,
  observaciones,
  updated_at
FROM presupuestos_finales
WHERE id = 72;

-- RESULTADO ESPERADO:
-- Si el UPDATE funciona aquí pero NO en la app:
--   → Problema de permisos/autenticación en la app
-- Si el UPDATE NO funciona aquí:
--   → Problema de RLS o constraint


-- =====================================================
-- PASO 5: Verificar constraints y triggers
-- =====================================================

-- Ver constraints de la tabla
SELECT
  tc.constraint_name,
  tc.constraint_type,
  kcu.column_name,
  tc.is_deferrable,
  tc.initially_deferred
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
  ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_name = 'presupuestos_finales';

-- Ver triggers que podrían afectar UPDATE
SELECT 
  trigger_name,
  event_manipulation,  -- INSERT, UPDATE, DELETE
  event_object_table,
  action_statement,
  action_timing  -- BEFORE, AFTER
FROM information_schema.triggers
WHERE event_object_table = 'presupuestos_finales'
AND event_manipulation = 'UPDATE';


-- =====================================================
-- PASO 6: Verificar permisos de la tabla
-- =====================================================

SELECT 
  grantee,
  privilege_type
FROM information_schema.role_table_grants 
WHERE table_name = 'presupuestos_finales';


-- =====================================================
-- DIAGNÓSTICO: Análisis de resultados
-- =====================================================

/*
ESCENARIO 1: RLS está habilitado y bloqueando UPDATE
  Solución: Crear/modificar política RLS para permitir UPDATE a admins
  
ESCENARIO 2: UPDATE manual funciona, pero en app no
  Solución: Problema de autenticación o permisos en el cliente Supabase
  
ESCENARIO 3: Hay un trigger BEFORE UPDATE que rechaza
  Solución: Modificar o desactivar el trigger
  
ESCENARIO 4: Constraint impide el UPDATE
  Solución: Modificar constraint o datos
*/


-- =====================================================
-- SOLUCIÓN TEMPORAL: Desactivar RLS (SOLO PARA PRUEBA)
-- =====================================================

-- ⚠️ ADVERTENCIA: Solo usar temporalmente para probar
-- NO dejar en producción sin RLS

-- Desactivar RLS temporalmente
-- ALTER TABLE presupuestos_finales DISABLE ROW LEVEL SECURITY;

-- Después de probar, volver a habilitar
-- ALTER TABLE presupuestos_finales ENABLE ROW LEVEL SECURITY;


-- =====================================================
-- SOLUCIÓN DEFINITIVA: Crear política RLS correcta
-- =====================================================

-- Si el problema es RLS, crear política que permita UPDATE a admins

-- Primero, eliminar políticas problemáticas si existen
-- DROP POLICY IF EXISTS "nombre_de_politica_vieja" ON presupuestos_finales;

-- Crear nueva política para UPDATE (solo admins)
/*
CREATE POLICY "Admins pueden actualizar presupuestos finales"
ON presupuestos_finales
FOR UPDATE
USING (
  -- El usuario debe ser admin
  EXISTS (
    SELECT 1 FROM usuarios
    WHERE usuarios.id = auth.uid()
    AND usuarios.rol = 'admin'
  )
)
WITH CHECK (
  -- El usuario debe ser admin
  EXISTS (
    SELECT 1 FROM usuarios
    WHERE usuarios.id = auth.uid()
    AND usuarios.rol = 'admin'
  )
);
*/


-- =====================================================
-- FIN DEL DIAGNÓSTICO
-- =====================================================

-- PRÓXIMOS PASOS:
-- 1. Ejecutar queries de PASO 1 a PASO 6
-- 2. Analizar resultados
-- 3. Identificar causa raíz
-- 4. Aplicar solución correspondiente
