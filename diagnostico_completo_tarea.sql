-- Script de diagnóstico completo para problemas de carga de tareas
-- Este script realiza comprobaciones exhaustivas en la estructura de la base de datos
-- y proporciona información útil para solucionar problemas

-- 1. Verificación del esquema y tablas principales
-- Verificar tablas relacionadas con tareas
SELECT 
    table_schema,
    table_name
FROM 
    information_schema.tables 
WHERE 
    table_name IN ('tareas', 'estados_tareas', 'edificios', 'administradores')
    AND table_schema = 'public';

-- 2. Verificar las columnas críticas en la tabla tareas
SELECT 
    column_name, 
    data_type,
    is_nullable
FROM 
    information_schema.columns 
WHERE 
    table_name = 'tareas' 
    AND table_schema = 'public';

-- 3. Verificar estructura de estados_tareas
SELECT 
    column_name, 
    data_type,
    is_nullable 
FROM 
    information_schema.columns 
WHERE 
    table_name = 'estados_tareas' 
    AND table_schema = 'public';

-- 4. Verificar que la función RPC está correctamente creada
SELECT 
    routine_name, 
    data_type AS return_type,
    external_language,
    security_type
FROM 
    information_schema.routines 
WHERE 
    routine_name = 'get_tarea_details' 
    AND routine_schema = 'public';

-- 5. Verificar permisos de la función
SELECT 
    grantee, 
    privilege_type
FROM 
    information_schema.routine_privileges
WHERE 
    routine_name = 'get_tarea_details' 
    AND routine_schema = 'public';

-- 6. Verificar que existe la tarea con ID específico (ajustar ID según necesidad)
SELECT EXISTS (
    SELECT 1 FROM tareas WHERE id = 39
) AS tarea_existe;

-- 7. Verificar una muestra de datos de la tabla tareas para diagnóstico
SELECT 
    id, 
    titulo, 
    id_estado_nuevo,
    finalizada,
    created_at
FROM 
    tareas 
ORDER BY id DESC 
LIMIT 5;

-- 8. Verificar contenido de la tabla estados_tareas
SELECT 
    id, 
    nombre, 
    color
FROM 
    estados_tareas 
ORDER BY id;

-- 9. Verificar IDs en uso en la tabla tareas para id_estado_nuevo
SELECT DISTINCT 
    id_estado_nuevo 
FROM 
    tareas 
WHERE 
    id_estado_nuevo IS NOT NULL
ORDER BY id_estado_nuevo;

-- 10. Probar directamente la función RPC con un ID conocido (ajustar ID según necesidad)
SELECT * FROM public.get_tarea_details(39);
