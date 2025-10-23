-- =============================================
-- INVESTIGACIÓN: POLÍTICAS RLS trabajadores_tareas
-- PROBLEMA: Supervisor no ve trabajadores asignados
-- =============================================

-- 1. Ver TODAS las políticas de trabajadores_tareas
SELECT 
  '=== POLÍTICAS ACTUALES trabajadores_tareas ===' as seccion,
  policyname,
  cmd,
  roles,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'trabajadores_tareas'
ORDER BY policyname;

-- 2. Verificar cuántas políticas hay
SELECT 
  '=== CONTEO políticas ===' as seccion,
  COUNT(*) as total_politicas
FROM pg_policies
WHERE tablename = 'trabajadores_tareas';

-- 3. Ver si existe política SELECT para supervisores
SELECT 
  '=== POLÍTICA SELECT para supervisores ===' as seccion,
  policyname,
  qual
FROM pg_policies
WHERE tablename = 'trabajadores_tareas'
  AND cmd = 'SELECT'
  AND (
    qual LIKE '%supervisor%' OR 
    qual LIKE '%get_my_role%'
  );

-- 4. Verificar datos reales: ¿Qué trabajadores están asignados a tarea 76?
SELECT 
  '=== TRABAJADORES ASIGNADOS A TAREA 76 ===' as seccion,
  tt.id_tarea,
  tt.id_trabajador,
  u.email as email_trabajador,
  u.rol
FROM trabajadores_tareas tt
JOIN usuarios u ON tt.id_trabajador = u.id
WHERE tt.id_tarea = 76;

-- 5. Verificar: ¿Quién es el supervisor de tarea 76?
SELECT 
  '=== SUPERVISOR DE TAREA 76 ===' as seccion,
  st.id_tarea,
  st.id_supervisor,
  u.email as email_supervisor,
  u.rol
FROM supervisores_tareas st
JOIN usuarios u ON st.id_supervisor = u.id
WHERE st.id_tarea = 76;

-- 6. Prueba: Si fueras supervisor, ¿podrías ver los trabajadores?
-- Esta query simula lo que RLS permite
SELECT 
  '=== TEST ACCESO SUPERVISOR ===' as seccion,
  'Si esta query devuelve filas, el supervisor DEBERIA poder verlas' as nota,
  tt.*
FROM trabajadores_tareas tt
WHERE tt.id_tarea IN (
  SELECT id_tarea 
  FROM supervisores_tareas 
  WHERE id_tarea = 76
);

-- =============================================
-- RESULTADO ESPERADO:
-- =============================================
/*
SECCION 1: Debe mostrar políticas existentes
  - Si hay 0 políticas → PROBLEMA GRAVE
  - Si hay políticas pero ninguna permite SELECT a supervisor → PROBLEMA

SECCION 2: Conteo
  - Si total = 0 → Tabla SIN políticas RLS
  - Si total > 0 → Verificar en sección 1

SECCION 3: Política SELECT supervisores
  - Si devuelve filas → Política existe
  - Si NO devuelve filas → Falta política SELECT para supervisores

SECCION 4: Trabajadores en tarea 76
  - Debe mostrar trabajadores asignados
  - Si está vacío → No hay trabajadores asignados

SECCION 5: Supervisor de tarea 76
  - Debe mostrar el supervisor asignado
  - Verifica que existe la relación

SECCION 6: Test de acceso
  - Si devuelve trabajadores → RLS funcionaría correctamente
  - Si está vacío → Problema con la query o datos
*/
