-- ============================================
-- INVESTIGACION: PROBLEMA PERMISOS SUPERVISOR
-- Presupuestos Base - Solo Lectura
-- ============================================

-- ============================================
-- 1. POLITICAS RLS EN presupuestos_base
-- ============================================

SELECT 
    policyname as nombre_politica,
    cmd as operacion,
    roles as para_quien,
    qual as condicion,
    with_check as condicion_check
FROM pg_policies
WHERE tablename = 'presupuestos_base'
ORDER BY policyname;

-- ============================================
-- 2. VERIFICAR RLS HABILITADO
-- ============================================

SELECT 
    tablename,
    rowsecurity as rls_habilitado
FROM pg_tables
WHERE tablename = 'presupuestos_base'
    AND schemaname = 'public';

-- ============================================
-- 3. VER PRESUPUESTO BASE #51
-- ============================================

SELECT 
    pb.id,
    pb.code,
    pb.id_tarea,
    pb.id_supervisor,
    pb.aprobado,
    pb.materiales,
    pb.mano_obra,
    pb.total,
    t.titulo as tarea_titulo,
    t.code as tarea_code
FROM presupuestos_base pb
LEFT JOIN tareas t ON pb.id_tarea = t.id
WHERE pb.id = 51;

-- ============================================
-- 4. VER SUPERVISOR ASIGNADO A LA TAREA
-- ============================================

SELECT 
    st.id,
    st.id_tarea,
    st.id_supervisor,
    u.nombre as nombre_supervisor,
    u.email as email_supervisor,
    t.titulo as tarea_titulo
FROM supervisores_tareas st
INNER JOIN usuarios u ON st.id_supervisor = u.id
INNER JOIN tareas t ON st.id_tarea = t.id
WHERE st.id_tarea = (SELECT id_tarea FROM presupuestos_base WHERE id = 51);

-- ============================================
-- 5. CONTAR PRESUPUESTOS BASE TOTALES
-- ============================================

SELECT COUNT(*) as total_presupuestos_base
FROM presupuestos_base;

-- ============================================
-- 6. PRESUPUESTOS BASE CON SUPERVISOR ASIGNADO
-- ============================================

SELECT 
    pb.id,
    pb.code,
    pb.id_tarea,
    pb.id_supervisor as supervisor_en_pb,
    pb.aprobado,
    st.id_supervisor as supervisor_en_st,
    t.titulo as tarea
FROM presupuestos_base pb
LEFT JOIN supervisores_tareas st ON pb.id_tarea = st.id_tarea
LEFT JOIN tareas t ON pb.id_tarea = t.id
ORDER BY pb.id DESC
LIMIT 10;

-- ============================================
-- 7. VERIFICAR PERMISOS DE TABLA
-- ============================================

SELECT 
    grantee as quien,
    privilege_type as permiso
FROM information_schema.role_table_grants
WHERE table_name = 'presupuestos_base'
ORDER BY grantee, privilege_type;

-- ============================================
-- RESULTADO ESPERADO
-- ============================================

/*
QUERY 1: Políticas RLS
  - Debe mostrar al menos 1 política para supervisores
  - Si solo hay política de admin = PROBLEMA

QUERY 2: RLS habilitado
  - Debe ser TRUE

QUERY 3: Presupuesto base #51
  - Ver si tiene id_supervisor
  - Ver si está aprobado

QUERY 4: Supervisor en supervisores_tareas
  - Ver qué supervisor está asignado a la tarea

QUERY 5: Total presupuestos
  - Ver cuántos hay en total

QUERY 6: Relación supervisores
  - Ver si id_supervisor en presupuestos_base coincide con supervisores_tareas

QUERY 7: Permisos de tabla
  - Ver si authenticated tiene acceso

DIAGNÓSTICO:
Si Query 1 solo muestra política admin:
  → Supervisores NO tienen acceso (este es el problema)
  
Solución necesaria:
  → Agregar política SELECT para supervisores
  → Condición: id_supervisor = auth.uid() OR id_tarea IN (SELECT id_tarea FROM supervisores_tareas WHERE id_supervisor = auth.uid())
  → Para UPDATE: Solo si aprobado = false
*/
