-- ============================================
-- VERIFICACION PREVIA - ANTES DE ELIMINAR temporary_all_access
-- Solo Lectura - No Modifica Nada
-- ============================================

-- ============================================
-- 1. BUSCAR POLITICAS TEMPORALES EN TODAS LAS TABLAS
-- ============================================

SELECT 
    tablename as tabla,
    policyname as nombre_politica,
    cmd as operacion,
    qual as condicion
FROM pg_policies
WHERE policyname LIKE '%temporary%'
    OR policyname LIKE '%temp%'
    OR policyname LIKE '%all_access%'
ORDER BY tablename;

-- ============================================
-- 2. VER TODAS LAS POLITICAS DE presupuestos_base
-- ============================================

SELECT 
    policyname as nombre,
    cmd as operacion,
    CASE 
        WHEN cmd = 'ALL' THEN 'SELECT, INSERT, UPDATE, DELETE'
        ELSE cmd::text
    END as que_permite,
    CASE 
        WHEN qual = 'true' THEN '✓ PERMITE A TODOS'
        WHEN qual LIKE '%admin%' THEN '✓ Solo Admin'
        WHEN qual LIKE '%supervisor%' THEN '✓ Supervisores (condición)'
        ELSE qual
    END as a_quien
FROM pg_policies
WHERE tablename = 'presupuestos_base'
ORDER BY 
    CASE 
        WHEN policyname LIKE '%temporary%' THEN 3
        WHEN policyname LIKE '%Admin%' THEN 1
        ELSE 2
    END;

-- ============================================
-- 3. VERIFICAR ORDEN DE EVALUACION DE POLITICAS
-- ============================================

-- PostgreSQL evalúa políticas con OR
-- Si UNA política permite acceso → usuario tiene acceso
-- temporary_all_access con "true" = TODOS pasan (problema)

SELECT 
    'NOTA' as tipo,
    'PostgreSQL evalúa políticas con OR lógico' as mensaje,
    'Si temporary_all_access existe = TODOS tienen acceso' as impacto;

-- ============================================
-- 4. SIMULAR: ¿Qué pasará sin temporary_all_access?
-- ============================================

-- Ver presupuestos base con sus supervisores
SELECT 
    pb.id,
    pb.code,
    pb.aprobado,
    pb.id_tarea,
    t.titulo as tarea,
    st.id_supervisor as supervisor_en_st,
    u_st.nombre as nombre_supervisor,
    CASE 
        WHEN st.id_supervisor IS NOT NULL THEN '✓ Supervisor lo verá'
        ELSE '✗ Sin supervisor asignado'
    END as acceso_supervisor
FROM presupuestos_base pb
LEFT JOIN tareas t ON pb.id_tarea = t.id
LEFT JOIN supervisores_tareas st ON pb.id_tarea = st.id_tarea
LEFT JOIN usuarios u_st ON st.id_supervisor = u_st.id
ORDER BY pb.id DESC
LIMIT 10;

-- ============================================
-- 5. CONTAR PRESUPUESTOS CON/SIN SUPERVISOR
-- ============================================

SELECT 
    COUNT(*) FILTER (WHERE st.id_supervisor IS NOT NULL) as con_supervisor,
    COUNT(*) FILTER (WHERE st.id_supervisor IS NULL) as sin_supervisor,
    COUNT(*) as total
FROM presupuestos_base pb
LEFT JOIN supervisores_tareas st ON pb.id_tarea = st.id_tarea;

-- ============================================
-- 6. VERIFICAR SI HAY QUERIES EN CODIGO QUE DEPENDAN
-- ============================================

-- Ver si presupuestos_base se usa en vistas
SELECT 
    table_name as vista,
    view_definition
FROM information_schema.views
WHERE view_definition LIKE '%presupuestos_base%'
    AND table_schema = 'public';

-- ============================================
-- 7. VER POLITICAS DE TABLAS RELACIONADAS
-- ============================================

-- Verificar si otras tablas tienen temporary_all_access
SELECT 
    tablename as tabla,
    COUNT(*) as total_politicas,
    COUNT(*) FILTER (WHERE policyname LIKE '%temporary%') as politicas_temporales
FROM pg_policies
WHERE tablename IN (
    'presupuestos_base',
    'presupuestos_finales',
    'facturas',
    'items',
    'tareas'
)
GROUP BY tablename
ORDER BY tabla;

-- ============================================
-- ANALISIS DE RESULTADOS
-- ============================================

/*
QUERY 1: Políticas temporales en todas las tablas
  - Si solo presupuestos_base tiene temporary_all_access = OK eliminarlo
  - Si muchas tablas lo tienen = Investigar más

QUERY 2: Todas las políticas de presupuestos_base
  - Ver cuáles quedarán activas después de eliminar temporal
  - Verificar que cubren todos los casos

QUERY 3: Nota sobre evaluación
  - Solo informativo

QUERY 4: Simulación
  - Ver qué presupuestos tendrán supervisor asignado
  - Los que no tengan = solo admin podrá verlos (correcto)

QUERY 5: Conteo
  - Si muchos sin_supervisor = normal (solo admin debe verlos)
  - Si todos con_supervisor = perfecto

QUERY 6: Vistas que usan presupuestos_base
  - Ver si hay vistas que puedan romperse
  - Vistas NO tienen RLS (usan permisos de quien las consulta)

QUERY 7: Comparación con otras tablas
  - Ver patrón de políticas temporales
  - Si es solo presupuestos_base = seguro eliminar

DECISIÓN:
Si Query 1 muestra que solo presupuestos_base tiene temporary_all_access:
  → Seguro eliminar (no afecta otras tablas)
  
Si Query 4 muestra que la mayoría tienen supervisor:
  → Supervisores seguirán viendo sus presupuestos
  
Si Query 5 muestra que hay sin supervisor:
  → Normal, solo admin debe verlos

CONCLUSIÓN ESPERADA:
✅ Eliminar temporary_all_access es seguro
✅ Las 2 políticas restantes cubrirán todos los casos
✅ Admin: Todo
✅ Supervisor: Solo sus tareas
✅ No se rompe nada
*/

-- ============================================
-- PROXIMOS PASOS SI TODO OK
-- ============================================

/*
1. Eliminar temporary_all_access
2. Agregar política UPDATE para supervisores
3. Verificar acceso con usuario supervisor
4. Confirmar que admin sigue viendo todo
*/
