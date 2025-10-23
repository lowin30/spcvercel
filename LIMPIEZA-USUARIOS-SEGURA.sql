-- =============================================
-- LIMPIEZA SEGURA: Tabla usuarios
-- De 11 políticas → 3 políticas
-- ELIMINA BRECHAS DE SEGURIDAD CRÍTICAS
-- =============================================

-- ⚠️ IMPORTANTE: Este script corrige 2 problemas de seguridad críticos:
-- 1. Acceso público a TODOS los usuarios
-- 2. Cualquiera puede crear usuarios

-- =============================================
-- ANTES: Verificar políticas actuales
-- =============================================

SELECT 
  '=== ANTES DE LIMPIEZA ===' as estado,
  policyname,
  cmd
FROM pg_policies
WHERE tablename = 'usuarios'
ORDER BY policyname;

-- =============================================
-- PASO 1: ELIMINAR POLÍTICAS PELIGROSAS (CRÍTICO)
-- =============================================

-- 1.1 Política que permite a TODOS ver TODOS los usuarios
DROP POLICY IF EXISTS "Permitir lectura de usuarios a anonimos" ON usuarios;
-- ⚠️ Condición: true (acceso total público)

-- 1.2 Política que permite a cualquiera crear usuarios
DROP POLICY IF EXISTS "Insert users" ON usuarios;
-- ⚠️ Condición: null (cualquier autenticado puede crear usuarios)

-- =============================================
-- PASO 2: ELIMINAR DUPLICADOS DE SUPERVISOR
-- =============================================

-- Mantener: "Supervisores pueden ver usuarios" (usa get_my_role más reciente)
-- Eliminar: "supervisor_select_usuarios" (usa check_user_role viejo)

DROP POLICY IF EXISTS "supervisor_select_usuarios" ON usuarios;

-- =============================================
-- PASO 3: ELIMINAR REDUNDANTES (cubiertas por ALL propio)
-- =============================================

-- La política "Permitir a usuarios gestionar su propio perfil" (ALL)
-- ya cubre SELECT, UPDATE y DELETE del propio perfil

-- Eliminar SELECT redundantes
DROP POLICY IF EXISTS "users_select_own_profile" ON usuarios;
DROP POLICY IF EXISTS "Select users" ON usuarios;

-- Eliminar UPDATE redundantes
DROP POLICY IF EXISTS "users_update_own_profile" ON usuarios;
DROP POLICY IF EXISTS "Update users" ON usuarios;

-- Eliminar DELETE redundante
DROP POLICY IF EXISTS "Delete users" ON usuarios;

-- =============================================
-- PASO 4: VERIFICACIÓN FINAL
-- =============================================

-- Deberían quedar 3 políticas
SELECT 
  '=== DESPUÉS DE LIMPIEZA ===' as estado,
  policyname,
  cmd,
  CASE
    WHEN policyname = 'admin_all_usuarios' THEN '✅ Admin TODO'
    WHEN policyname = 'Supervisores pueden ver usuarios' THEN '✅ Supervisor ver usuarios'
    WHEN policyname = 'Permitir a usuarios gestionar su propio perfil' THEN '✅ Usuario propio perfil'
    ELSE '❓ Revisar'
  END as descripcion
FROM pg_policies
WHERE tablename = 'usuarios'
ORDER BY 
  CASE
    WHEN policyname = 'admin_all_usuarios' THEN 1
    WHEN policyname = 'Supervisores pueden ver usuarios' THEN 2
    WHEN policyname = 'Permitir a usuarios gestionar su propio perfil' THEN 3
    ELSE 4
  END;

-- Verificar conteo
SELECT 
  '=== CONTEO FINAL ===' as resultado,
  COUNT(*) as total_politicas,
  CASE 
    WHEN COUNT(*) = 3 THEN '✅ PERFECTO'
    WHEN COUNT(*) < 3 THEN '❌ FALTAN POLÍTICAS'
    ELSE '⚠️ TODAVÍA HAY POLÍTICAS DE MÁS'
  END as evaluacion
FROM pg_policies
WHERE tablename = 'usuarios';

-- =============================================
-- POLÍTICAS FINALES ESPERADAS (3):
-- =============================================

/*
1. "admin_all_usuarios"
   - Comando: ALL
   - Condición: check_user_role('admin')
   - Permite: Admin hace TODO

2. "Supervisores pueden ver usuarios"
   - Comando: SELECT
   - Condición: get_my_role() = 'supervisor'
   - Permite: Supervisor ve usuarios (para asignar a tareas)

3. "Permitir a usuarios gestionar su propio perfil"
   - Comando: ALL
   - Condición: id = auth.uid()
   - Permite: Usuario ve/edita/elimina su PROPIO perfil
*/

-- =============================================
-- RESULTADO ESPERADO
-- =============================================

/*
ANTES: 11 políticas
DESPUÉS: 3 políticas

POLÍTICAS ELIMINADAS (8):
✅ Permitir lectura de usuarios a anonimos (PELIGROSA - acceso público)
✅ Insert users (PELIGROSA - cualquiera crea usuarios)
✅ supervisor_select_usuarios (DUPLICADA)
✅ users_select_own_profile (REDUNDANTE con ALL)
✅ Select users (REDUNDANTE con ALL)
✅ users_update_own_profile (REDUNDANTE con ALL)
✅ Update users (REDUNDANTE con ALL)
✅ Delete users (REDUNDANTE con ALL)

BRECHAS DE SEGURIDAD CORREGIDAS:
✅ Acceso público eliminado
✅ Creación de usuarios restringida a admin
✅ Solo supervisor/admin ven lista de usuarios
✅ Usuarios solo ven su propio perfil

FUNCIONALIDAD:
✅ Admin sigue haciendo todo
✅ Supervisor sigue viendo usuarios
✅ Usuario sigue gestionando su perfil
✅ NADIE puede crear usuarios sin ser admin
✅ NADIE ve usuarios sin autenticar
*/

-- =============================================
-- ROLLBACK (Si algo sale mal)
-- =============================================

/*
-- Para restaurar TODAS las políticas originales:

CREATE POLICY "admin_all_usuarios" ON usuarios FOR ALL TO authenticated USING (check_user_role('admin'::text));
CREATE POLICY "Supervisores pueden ver usuarios" ON usuarios FOR SELECT TO authenticated USING ((get_my_role() = 'supervisor'::text));
CREATE POLICY "supervisor_select_usuarios" ON usuarios FOR SELECT TO authenticated USING (check_user_role('supervisor'::text));
CREATE POLICY "users_update_own_profile" ON usuarios FOR UPDATE TO authenticated USING ((id = auth.uid()));
CREATE POLICY "Update users" ON usuarios FOR UPDATE TO authenticated USING ((( SELECT auth.uid() AS uid) = id));
CREATE POLICY "Permitir lectura de usuarios a anonimos" ON usuarios FOR SELECT TO anon USING (true);
CREATE POLICY "users_select_own_profile" ON usuarios FOR SELECT TO authenticated USING ((id = auth.uid()));
CREATE POLICY "Select users" ON usuarios FOR SELECT TO authenticated USING ((( SELECT auth.uid() AS uid) = id));
CREATE POLICY "Insert users" ON usuarios FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Delete users" ON usuarios FOR DELETE TO authenticated USING ((( SELECT auth.uid() AS uid) = id));
CREATE POLICY "Permitir a usuarios gestionar su propio perfil" ON usuarios FOR ALL TO authenticated USING ((id = auth.uid()));
*/
