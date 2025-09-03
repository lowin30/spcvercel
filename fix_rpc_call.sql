-- Comprobar si la función existe y es accesible
-- Esta consulta nos dirá si la función está correctamente creada
SELECT 
    routine_name, 
    data_type AS return_type,
    external_language,
    security_type
FROM 
    information_schema.routines 
WHERE 
    routine_type = 'FUNCTION' 
    AND routine_name = 'get_tarea_details'
    AND routine_schema = 'public';

-- Comprobar los parámetros de la función
SELECT 
    p.parameter_name,
    p.data_type,
    p.ordinal_position
FROM 
    information_schema.parameters p
WHERE 
    p.specific_schema = 'public'
    AND p.specific_name = 'get_tarea_details';

-- Comprobar permisos sobre la función
SELECT 
    routine_name,
    grantee,
    privilege_type
FROM 
    information_schema.routine_privileges
WHERE 
    routine_name = 'get_tarea_details'
    AND routine_schema = 'public';

-- Verificar que la tabla estados_tareas exista y tenga la estructura esperada
SELECT 
    table_name,
    column_name,
    data_type
FROM 
    information_schema.columns
WHERE 
    table_name = 'estados_tareas'
    AND table_schema = 'public';

-- Verificar que el ID específico existe en la tabla tareas
-- Reemplaza '39' con el ID que estás intentando consultar
SELECT EXISTS (
    SELECT 1 FROM tareas WHERE id = 39
) AS tarea_existe;
