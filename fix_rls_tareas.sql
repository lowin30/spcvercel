-- Script para corregir las políticas RLS que bloquean el acceso a /dashboard/tareas/39
-- Creado para desactivar temporalmente las políticas conflictivas y permitir el acceso

-- 1. Primero guardamos un listado de las políticas actuales para referencia
-- (No ejecutar en producción, solo para diagnóstico)
-- SELECT tablename, policyname, permissive, roles, cmd, qual, with_check 
-- FROM pg_policies 
-- WHERE tablename IN ('tareas', 'supervisores_tareas', 'trabajadores_tareas', 'comentarios', 'presupuestos_base');

-- 2. Desactivamos temporalmente RLS en las tablas críticas
ALTER TABLE public.tareas DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.supervisores_tareas DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.trabajadores_tareas DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.comentarios DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.presupuestos_base DISABLE ROW LEVEL SECURITY;

-- 3. Verificamos que la función RPC get_tarea_details puede acceder a la vista
-- (Para diagnóstico)
-- SELECT * FROM public.get_tarea_details(39);

-- 4. Reactivamos RLS pero con políticas simplificadas para depuración

-- 4.1 Limpiamos todas las políticas existentes
DROP POLICY IF EXISTS "Todos pueden ver tareas asignadas" ON public.tareas;
DROP POLICY IF EXISTS "Admin gestión completa" ON public.tareas;
DROP POLICY IF EXISTS "Trabajadores ver tareas propias" ON public.tareas;
DROP POLICY IF EXISTS "Supervisores ven tareas asignadas" ON public.tareas;

-- 4.2 Creamos políticas simplificadas para tareas
-- Permitir acceso a todos los autenticados para poder diagnosticar
CREATE POLICY "temporary_all_access"
ON public.tareas
FOR ALL
TO authenticated
USING (true);

-- 4.3 Políticas simplificadas para supervisores_tareas
DROP POLICY IF EXISTS "Admin full access" ON public.supervisores_tareas;
DROP POLICY IF EXISTS "Supervisores pueden gestionar asignaciones en sus tareas" ON public.supervisores_tareas;

CREATE POLICY "temporary_all_access"
ON public.supervisores_tareas
FOR ALL
TO authenticated
USING (true);

-- 4.4 Políticas simplificadas para trabajadores_tareas
DROP POLICY IF EXISTS "Admin full access" ON public.trabajadores_tareas;
DROP POLICY IF EXISTS "Trabajadores pueden ver sus asignaciones" ON public.trabajadores_tareas;
DROP POLICY IF EXISTS "Supervisores pueden gestionar asignaciones en sus tareas" ON public.trabajadores_tareas;

CREATE POLICY "temporary_all_access"
ON public.trabajadores_tareas
FOR ALL
TO authenticated
USING (true);

-- 4.5 Políticas simplificadas para comentarios
DROP POLICY IF EXISTS "Admin full access" ON public.comentarios;
DROP POLICY IF EXISTS "Usuarios pueden ver comentarios de sus tareas" ON public.comentarios;
DROP POLICY IF EXISTS "Usuarios pueden crear comentarios en sus tareas" ON public.comentarios;

CREATE POLICY "temporary_all_access"
ON public.comentarios
FOR ALL
TO authenticated
USING (true);

-- 4.6 Políticas simplificadas para presupuestos_base
DROP POLICY IF EXISTS "Admin full access" ON public.presupuestos_base;
DROP POLICY IF EXISTS "Supervisores pueden ver presupuestos" ON public.presupuestos_base;

CREATE POLICY "temporary_all_access"
ON public.presupuestos_base
FOR ALL
TO authenticated
USING (true);

-- 5. Reactivar RLS en todas las tablas
ALTER TABLE public.tareas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supervisores_tareas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trabajadores_tareas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comentarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.presupuestos_base ENABLE ROW LEVEL SECURITY;

-- 6. IMPORTANTE: Este script es solo para diagnóstico
-- Una vez identificado el problema, debes restaurar las políticas RLS adecuadas
-- según la matriz de permisos de tu aplicación
