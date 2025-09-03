-- Script para probar funciones y vistas relacionadas con tareas
-- Este script verifica si podemos acceder directamente a los datos necesarios

-- 1. Comprobar si la vista_tareas_completa tiene datos
SELECT COUNT(*) FROM vista_tareas_completa;

-- 2. Intentar acceder a la tarea específica en la vista
SELECT * FROM vista_tareas_completa WHERE id = 39;

-- 3. Probar la función RPC directamente
SELECT * FROM get_tarea_details(39);

-- 4. Verificar permisos de la función RPC
SELECT 
    routine_name,
    routine_type,
    security_type,
    external_security,
    definer
FROM 
    information_schema.routines 
WHERE 
    routine_name = 'get_tarea_details';

-- 5. Verificar si la tarea existe en la tabla base
SELECT EXISTS(SELECT 1 FROM tareas WHERE id = 39);

-- 6. Verificar supervisores asignados a esta tarea
SELECT * FROM supervisores_tareas WHERE id_tarea = 39;

-- 7. Verificar trabajadores asignados a esta tarea
SELECT * FROM trabajadores_tareas WHERE id_tarea = 39;

-- 8. Verificar comentarios de esta tarea
SELECT COUNT(*) FROM comentarios WHERE id_tarea = 39;

-- 9. Verificar presupuestos asociados
SELECT COUNT(*) FROM presupuestos_base WHERE id_tarea = 39;
