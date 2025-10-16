-- ============================================
-- SCRIPT: ELIMINAR temporary_all_access Y COMPLETAR POLITICAS
-- FECHA: 16 de Octubre 2025
-- PROBLEMA: Supervisores no pueden ver presupuestos_base de sus tareas
-- CAUSA: temporary_all_access está interfiriendo con políticas específicas
-- ============================================

-- ============================================
-- PASO 0: VERIFICACIONES PREVIAS (NO MODIFICAR)
-- ============================================

-- Guardar estado actual
SELECT 
    'BEFORE: Políticas temporales en el sistema' as verificacion,
    tablename,
    policyname
FROM pg_policies
WHERE policyname = 'temporary_all_access'
ORDER BY tablename;

-- Verificar políticas de presupuestos_base antes
SELECT 
    'BEFORE: Políticas presupuestos_base' as verificacion,
    policyname,
    cmd
FROM pg_policies
WHERE tablename = 'presupuestos_base'
ORDER BY policyname;

-- ============================================
-- PASO 1: ELIMINAR temporary_all_access DE 4 TABLAS
-- ============================================

-- RAZON: temporary_all_access con condición "true" permite a TODOS los usuarios
-- acceso total, interfiriendo con políticas específicas por rol.
-- Las 4 tablas ya tienen políticas alternativas que cubren todos los casos.

DROP POLICY IF EXISTS "temporary_all_access" ON comentarios;
DROP POLICY IF EXISTS "temporary_all_access" ON presupuestos_base;
DROP POLICY IF EXISTS "temporary_all_access" ON supervisores_tareas;
DROP POLICY IF EXISTS "temporary_all_access" ON trabajadores_tareas;

-- ============================================
-- PASO 2: AGREGAR POLITICAS FALTANTES EN presupuestos_base
-- ============================================

-- POLITICA 1: UPDATE para supervisores (solo si NO está aprobado)
CREATE POLICY "Supervisores pueden editar presupuestos base no aprobados"
ON presupuestos_base
FOR UPDATE
TO authenticated
USING (
    get_my_role() = 'supervisor' 
    AND aprobado = false
    AND id_tarea IN (
        SELECT id_tarea 
        FROM supervisores_tareas 
        WHERE id_supervisor = auth.uid()
    )
)
WITH CHECK (
    get_my_role() = 'supervisor' 
    AND aprobado = false
    AND id_tarea IN (
        SELECT id_tarea 
        FROM supervisores_tareas 
        WHERE id_supervisor = auth.uid()
    )
);

-- POLITICA 2: INSERT para supervisores (crear presupuestos base)
CREATE POLICY "Supervisores pueden crear presupuestos base de sus tareas"
ON presupuestos_base
FOR INSERT
TO authenticated
WITH CHECK (
    get_my_role() = 'supervisor'
    AND id_tarea IN (
        SELECT id_tarea 
        FROM supervisores_tareas 
        WHERE id_supervisor = auth.uid()
    )
);

-- ============================================
-- PASO 3: VERIFICACIONES POSTERIORES
-- ============================================

-- Verificar que temporary_all_access fue eliminado
SELECT 
    'AFTER: Políticas temporales restantes' as verificacion,
    COUNT(*) as deberia_ser_cero
FROM pg_policies
WHERE policyname = 'temporary_all_access';

-- Verificar políticas finales de presupuestos_base
SELECT 
    'AFTER: Políticas presupuestos_base' as verificacion,
    policyname,
    cmd,
    CASE 
        WHEN cmd = 'ALL' THEN 'Todas las operaciones'
        WHEN cmd = 'SELECT' THEN 'Solo lectura'
        WHEN cmd = 'UPDATE' THEN 'Solo edición'
        WHEN cmd = 'INSERT' THEN 'Solo creación'
        ELSE cmd::text
    END as que_permite
FROM pg_policies
WHERE tablename = 'presupuestos_base'
ORDER BY 
    CASE 
        WHEN policyname LIKE '%Admin%' THEN 1
        WHEN policyname LIKE '%Supervisores%' THEN 2
        ELSE 3
    END;

-- Verificar políticas de otras 3 tablas
SELECT 
    'AFTER: Políticas de otras tablas afectadas' as verificacion,
    tablename,
    COUNT(*) as total_politicas
FROM pg_policies
WHERE tablename IN ('comentarios', 'supervisores_tareas', 'trabajadores_tareas')
GROUP BY tablename
ORDER BY tablename;

-- ============================================
-- PASO 4: PRUEBA DE ACCESO (SIMULACION)
-- ============================================

-- Simular: ¿Qué presupuestos verán los supervisores?
SELECT 
    'TEST: Presupuestos base accesibles por supervisores' as verificacion,
    pb.id,
    pb.code,
    pb.aprobado,
    t.titulo as tarea,
    u.nombre as supervisor
FROM presupuestos_base pb
INNER JOIN supervisores_tareas st ON pb.id_tarea = st.id_tarea
INNER JOIN tareas t ON pb.id_tarea = t.id
INNER JOIN usuarios u ON st.id_supervisor = u.id
WHERE u.rol = 'supervisor'
ORDER BY pb.id DESC
LIMIT 5;

-- ============================================
-- RESULTADO ESPERADO
-- ============================================

/*
VERIFICACION 1 (BEFORE):
  - Debe mostrar 4 filas con temporary_all_access

VERIFICACION 2 (BEFORE):
  - Debe mostrar 3 políticas en presupuestos_base

PASO 1:
  - 4 DROP POLICY ejecutados exitosamente

PASO 2:
  - 2 CREATE POLICY ejecutados exitosamente

VERIFICACION 3 (AFTER):
  - deberia_ser_cero = 0 (no quedan temporales)

VERIFICACION 4 (AFTER):
  - Debe mostrar 4 políticas en presupuestos_base:
    1. Admin puede gestionar todos (ALL)
    2. Supervisores pueden ver (SELECT)
    3. Supervisores pueden editar no aprobados (UPDATE)
    4. Supervisores pueden crear (INSERT)

VERIFICACION 5 (AFTER):
  - comentarios: múltiples políticas (sin temporal)
  - supervisores_tareas: múltiples políticas (sin temporal)
  - trabajadores_tareas: múltiples políticas (sin temporal)

VERIFICACION 6 (TEST):
  - Debe mostrar presupuestos base con supervisor asignado
  - Estos son los que los supervisores podrán ver

SI TODAS LAS VERIFICACIONES PASAN:
✅ temporary_all_access eliminado de 4 tablas
✅ Políticas específicas funcionando correctamente
✅ Supervisores pueden ver/editar presupuestos de sus tareas
✅ Admin sigue teniendo acceso total
✅ Aplicación NO se rompe
*/

-- ============================================
-- COMPORTAMIENTO FINAL DEL SISTEMA
-- ============================================

/*
PRESUPUESTOS BASE:

Admin:
  ✅ Ver todos los presupuestos base (SELECT)
  ✅ Crear presupuestos base (INSERT)
  ✅ Editar todos, incluso aprobados (UPDATE)
  ✅ Eliminar presupuestos base (DELETE)

Supervisor:
  ✅ Ver presupuestos base de tareas asignadas en supervisores_tareas (SELECT)
  ✅ Crear presupuestos base de sus tareas (INSERT)
  ✅ Editar presupuestos base NO aprobados de sus tareas (UPDATE)
  ❌ NO puede editar presupuestos aprobados (solo admin)
  ❌ NO puede eliminar (solo admin)

Trabajador:
  ❌ NO tiene acceso a presupuestos_base

COMENTARIOS:
  ✅ Admin: Todo
  ✅ Supervisor: Todo
  ✅ Trabajador: Ver y crear de sus tareas

SUPERVISORES_TAREAS:
  ✅ Admin: Todo
  ✅ Supervisor: Ver y editar sus propias asignaciones

TRABAJADORES_TAREAS:
  ✅ Admin: Todo
  ✅ Supervisor: Gestionar trabajadores de sus tareas
  ✅ Trabajador: Ver sus propias asignaciones
*/

-- ============================================
-- DOCUMENTACION PARA PROBLEMAS FUTUROS
-- ============================================

/*
SI LA APLICACIÓN SE ROMPE DESPUÉS DE ESTE SCRIPT:

SINTOMA 1: Supervisores no ven presupuestos_base
CAUSA: Falta registro en supervisores_tareas
SOLUCION: 
  INSERT INTO supervisores_tareas (id_tarea, id_supervisor)
  VALUES ([id_tarea], [id_supervisor]);

SINTOMA 2: Supervisores ven error "permission denied"
CAUSA: Función get_my_role() no devuelve 'supervisor'
SOLUCION: Verificar rol del usuario en tabla usuarios
  SELECT id, nombre, rol FROM usuarios WHERE id = auth.uid();

SINTOMA 3: Admin no puede hacer algo que antes podía
CAUSA: Política de admin fue afectada (NO DEBERIA PASAR)
SOLUCION: Restaurar política:
  CREATE POLICY "Admin puede gestionar todos los presupuestos base"
  ON presupuestos_base FOR ALL TO authenticated
  USING (get_my_role() = 'admin')
  WITH CHECK (get_my_role() = 'admin');

SINTOMA 4: Comentarios no funcionan
CAUSA: temporary_all_access eliminado pero políticas alternativas fallan
SOLUCION: Verificar políticas con:
  SELECT * FROM pg_policies WHERE tablename = 'comentarios';

SINTOMA 5: Trabajadores no ven sus tareas asignadas
CAUSA: temporary_all_access eliminado de trabajadores_tareas
SOLUCION: Verificar políticas con:
  SELECT * FROM pg_policies WHERE tablename = 'trabajadores_tareas';
  -- Deben existir políticas para trabajadores

REVERTIR TODO ESTE SCRIPT:
-- Solo si es absolutamente necesario
CREATE POLICY "temporary_all_access" ON comentarios FOR ALL USING (true);
CREATE POLICY "temporary_all_access" ON presupuestos_base FOR ALL USING (true);
CREATE POLICY "temporary_all_access" ON supervisores_tareas FOR ALL USING (true);
CREATE POLICY "temporary_all_access" ON trabajadores_tareas FOR ALL USING (true);

DROP POLICY "Supervisores pueden editar presupuestos base no aprobados" ON presupuestos_base;
DROP POLICY "Supervisores pueden crear presupuestos base de sus tareas" ON presupuestos_base;
*/

-- ============================================
-- ARCHIVOS RELACIONADOS (PARA REFERENCIA)
-- ============================================

/*
Scripts de investigación creados:
1. INVESTIGACION-PRESUPUESTOS-BASE-SUPERVISOR.sql
2. VERIFICACION-ANTES-ELIMINAR-TEMPORAL.sql
3. FIX-ELIMINAR-TEMPORARY-ALL-ACCESS.sql (este archivo)

Documentación:
- POLITICAS.md (actualizar después de ejecutar este script)

Commits relacionados:
- Hash: 5a5275f "feat: Seguridad RLS y trigger presupuesto base"

IMPORTANTE:
Después de ejecutar este script, actualizar POLITICAS.md con:
- Estado de temporary_all_access: ELIMINADO
- Nuevas políticas en presupuestos_base: 4 totales
- Fecha de ejecución: [AGREGAR FECHA]
*/
