-- FASE C - DIAGNÓSTICO RLS (NO CAMBIA NADA)
-- Listar políticas y estado RLS de tablas moderadas antes de cualquier cambio

BEGIN;

-- Tablas objetivo (ajusta si querés añadir/quitar)
WITH targets AS (
  SELECT 'public'::text AS schemaname, 'administradores'::text AS tablename UNION ALL
  SELECT 'public', 'comentarios' UNION ALL
  SELECT 'public', 'departamentos_tareas' UNION ALL
  SELECT 'public', 'gastos_tarea' UNION ALL
  SELECT 'public', 'tareas' UNION ALL
  SELECT 'public', 'presupuestos_base' UNION ALL
  SELECT 'storage', 'objects'
)

-- 1) Políticas detalladas
SELECT p.schemaname,
       p.tablename,
       p.policyname,
       p.permissive,
       p.cmd,
       p.roles,
       p.qual,
       p.with_check
FROM pg_policies p
JOIN targets t
  ON p.schemaname = t.schemaname
 AND p.tablename  = t.tablename
ORDER BY p.schemaname, p.tablename, p.cmd, p.policyname;

-- 2) Estado RLS (habilitado/forzado) por tabla
WITH targets AS (
  SELECT 'public'::text AS schemaname, 'administradores'::text AS tablename UNION ALL
  SELECT 'public', 'comentarios' UNION ALL
  SELECT 'public', 'departamentos_tareas' UNION ALL
  SELECT 'public', 'gastos_tarea' UNION ALL
  SELECT 'public', 'tareas' UNION ALL
  SELECT 'public', 'presupuestos_base' UNION ALL
  SELECT 'storage', 'objects'
)
SELECT n.nspname      AS schemaname,
       c.relname      AS tablename,
       c.relrowsecurity AS rls_enabled,
       c.relforcerowsecurity AS rls_forced
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
JOIN targets t ON t.schemaname = n.nspname AND t.tablename = c.relname
WHERE c.relkind = 'r'
ORDER BY n.nspname, c.relname;

-- 3) Cantidad de políticas por tabla objetivo
WITH targets AS (
  SELECT 'public'::text AS schemaname, 'administradores'::text AS tablename UNION ALL
  SELECT 'public', 'comentarios' UNION ALL
  SELECT 'public', 'departamentos_tareas' UNION ALL
  SELECT 'public', 'gastos_tarea' UNION ALL
  SELECT 'public', 'tareas' UNION ALL
  SELECT 'public', 'presupuestos_base' UNION ALL
  SELECT 'storage', 'objects'
)
SELECT p.schemaname, p.tablename, COUNT(*) AS policy_count
FROM pg_policies p
JOIN targets t ON p.schemaname = t.schemaname AND p.tablename = t.tablename
GROUP BY p.schemaname, p.tablename
ORDER BY policy_count DESC, p.schemaname, p.tablename;

-- 4) Funciones auxiliares presentes (solo nombre/namespace)
SELECT n.nspname AS schema, p.proname AS function_name
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE p.proname IN ('get_my_role', 'check_user_role')
ORDER BY n.nspname, p.proname;

-- 5) Presencia de tablas relacionadas usadas en políticas (evitar suposiciones)
SELECT 
  to_regclass('public.supervisores_tareas') IS NOT NULL AS supervisores_tareas_exists,
  to_regclass('public.usuarios') IS NOT NULL AS usuarios_exists
;

COMMIT;
