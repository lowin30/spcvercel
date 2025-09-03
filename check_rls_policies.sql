-- Script para verificar las políticas RLS activas
-- Este script genera un reporte completo de todas las políticas RLS 
-- relacionadas con las tablas principales del módulo de tareas

SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM 
    pg_policies 
WHERE 
    tablename IN (
        'tareas', 
        'supervisores_tareas', 
        'trabajadores_tareas', 
        'comentarios', 
        'presupuestos_base',
        'presupuestos_finales',
        'vista_tareas_completa'
    )
ORDER BY 
    tablename,
    policyname;
