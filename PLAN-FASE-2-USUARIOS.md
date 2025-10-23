# 🔒 FASE 2: LIMPIEZA TABLA `usuarios`

**Estado:** 🟡 PREPARADO - NO EJECUTAR HASTA VALIDAR FASE 1  
**Fecha preparación:** 23 de Octubre, 2025 - 3:45 AM  
**Script:** `LIMPIEZA-USUARIOS-SEGURA.sql`

---

## ⚠️ REQUISITOS PREVIOS

**NO EJECUTAR hasta validar:**
1. ✅ Fase 1 (`trabajadores_tareas`) funcionando 3-5 días
2. ✅ Testing completo de admin/supervisor/trabajador
3. ✅ Páginas críticas verificadas
4. ✅ Sin errores en logs de Supabase

---

## 📊 ANÁLISIS DETALLADO

### Estado Actual: 11 políticas

#### 👔 ADMIN (1 - correcto):
```sql
1. "admin_all_usuarios" → ALL
   Condición: check_user_role('admin')
   Estado: ✅ MANTENER
```

#### 👨‍💼 SUPERVISOR (2 - 1 duplicada):
```sql
2. "Supervisores pueden ver usuarios" → SELECT
   Condición: get_my_role() = 'supervisor'
   Estado: ✅ MANTENER

3. "supervisor_select_usuarios" → SELECT
   Condición: check_user_role('supervisor')
   Estado: ❌ ELIMINAR (duplicada con #2)
```

#### 👤 USUARIO PROPIO (8 - 6 redundantes + 2 peligrosas):

**ALL propio (cubre SELECT, UPDATE, DELETE):**
```sql
4. "Permitir a usuarios gestionar su propio perfil" → ALL
   Condición: id = auth.uid()
   Estado: ✅ MANTENER (cubre #6, #7, #8, #9, #10)
```

**SELECT propio (3 redundantes + 1 pública PELIGROSA):**
```sql
5. "Permitir lectura de usuarios a anonimos" → SELECT
   Condición: true
   Estado: 🔴 ELIMINAR - BRECHA DE SEGURIDAD
   Impacto: Cualquiera (sin login) ve TODOS los usuarios

6. "users_select_own_profile" → SELECT
   Condición: id = auth.uid()
   Estado: ❌ ELIMINAR (redundante con #4 ALL)

7. "Select users" → SELECT
   Condición: auth.uid() = id
   Estado: ❌ ELIMINAR (redundante con #4 ALL)
```

**UPDATE propio (2 redundantes):**
```sql
8. "users_update_own_profile" → UPDATE
   Condición: id = auth.uid()
   Estado: ❌ ELIMINAR (redundante con #4 ALL)

9. "Update users" → UPDATE
   Condición: auth.uid() = id
   Estado: ❌ ELIMINAR (redundante con #4 ALL)
```

**DELETE propio (1 redundante):**
```sql
10. "Delete users" → DELETE
    Condición: auth.uid() = id
    Estado: ❌ ELIMINAR (redundante con #4 ALL)
```

**INSERT público (PELIGROSA):**
```sql
11. "Insert users" → INSERT
    Condición: null
    Estado: 🔴 ELIMINAR - BRECHA DE SEGURIDAD
    Impacto: Cualquier usuario puede crear otros usuarios
```

---

## 🎯 POLÍTICAS FINALES (3)

### Estado Después: 3 políticas

```sql
1. "admin_all_usuarios"
   Comando: ALL
   Para: Admin
   Permite: Admin hace TODO en usuarios

2. "Supervisores pueden ver usuarios"
   Comando: SELECT
   Para: Supervisor
   Permite: Ver lista de usuarios para asignar a tareas
   Nota: Necesaria para /dashboard/tareas/[id] al agregar trabajadores

3. "Permitir a usuarios gestionar su propio perfil"
   Comando: ALL
   Para: Usuario autenticado (cualquier rol)
   Permite: Ver y editar su PROPIO perfil
   Nota: Cubre SELECT, UPDATE, DELETE del propio perfil
```

---

## 🔴 BRECHAS DE SEGURIDAD QUE CORRIGE

### Brecha 1: Acceso público a TODOS los usuarios

**Antes:**
```sql
"Permitir lectura de usuarios a anonimos"
FOR SELECT TO anon
USING (true)
```

**Impacto:**
- ✅ Cualquiera (sin login) puede ejecutar: `SELECT * FROM usuarios`
- ✅ Expone: emails, roles, IDs, nombres, color_perfil
- ✅ No requiere autenticación

**Ejemplo vulnerable:**
```javascript
// Desde navegador, sin login:
const { data } = await supabase.from('usuarios').select('*')
// Devuelve TODOS los usuarios ❌
```

**Después:**
```
Solo usuarios autenticados ven:
- Admin: Todos los usuarios
- Supervisor: Todos los usuarios (para asignar)
- Usuario: Solo su propio perfil
```

### Brecha 2: Cualquiera puede crear usuarios

**Antes:**
```sql
"Insert users"
FOR INSERT TO authenticated
WITH CHECK (null)
```

**Impacto:**
- ✅ Cualquier usuario autenticado puede: `INSERT INTO usuarios`
- ✅ Puede crear usuarios con cualquier rol (admin, supervisor, trabajador)
- ✅ No verifica permisos

**Ejemplo vulnerable:**
```javascript
// Desde app, con usuario normal:
await supabase.from('usuarios').insert({
  email: 'nuevo-admin@fake.com',
  rol: 'admin' // ❌ Puede crear admin
})
```

**Después:**
```
Solo Admin puede crear usuarios (via código backend o Supabase Dashboard)
```

---

## 📋 POLÍTICAS A ELIMINAR (8)

### Eliminaciones por categoría:

**PELIGROSAS (2):**
1. ❌ "Permitir lectura de usuarios a anonimos"
2. ❌ "Insert users"

**DUPLICADAS (1):**
3. ❌ "supervisor_select_usuarios"

**REDUNDANTES (5) - cubiertas por ALL propio:**
4. ❌ "users_select_own_profile"
5. ❌ "Select users"
6. ❌ "users_update_own_profile"
7. ❌ "Update users"
8. ❌ "Delete users"

---

## ✅ FUNCIONALIDAD PRESERVADA

### Admin:
- ✅ Sigue viendo todos los usuarios
- ✅ Sigue creando/editando/eliminando usuarios
- ✅ Acceso total sin cambios

### Supervisor:
- ✅ Sigue viendo lista de usuarios
- ✅ Puede asignar trabajadores a tareas
- ✅ Funcionalidad en `/dashboard/tareas/[id]` sin cambios

### Usuario (cualquier rol):
- ✅ Sigue viendo su propio perfil
- ✅ Sigue editando su propio perfil
- ✅ Puede actualizar nombre, color_perfil, etc

### Público (no autenticado):
- ❌ YA NO puede ver usuarios (correcto)

---

## 🧪 TESTING REQUERIDO

### Antes de ejecutar Fase 2:

#### Test 1: Fase 1 estable (trabajadores_tareas)
- [ ] 3-5 días sin errores
- [ ] Logs de Supabase limpios
- [ ] No hay reportes de usuarios

#### Test 2: Funcionalidad crítica
- [ ] Login admin → Ver todos usuarios ✅
- [ ] Login supervisor → Asignar trabajador a tarea ✅
- [ ] Login trabajador → Ver su perfil ✅
- [ ] Editar perfil propio funciona ✅

#### Test 3: Páginas verificadas
- [ ] `/dashboard/tareas/[id]` - Agregar trabajador
- [ ] `/dashboard/trabajadores/registro-dias` - Seleccionar trabajador
- [ ] `/dashboard/perfil` o similar - Ver/editar perfil
- [ ] `/dashboard/usuarios` (si existe) - Admin ve lista

---

## 🚀 PROCESO DE EJECUCIÓN

### Paso 1: Backup manual (recomendado)
```sql
-- Guardar políticas actuales en un archivo .sql
SELECT 
  'CREATE POLICY "' || policyname || '" ON ' || tablename ||
  ' FOR ' || cmd || ' TO ' || roles::text ||
  ' USING (' || qual || ')' ||
  CASE WHEN with_check IS NOT NULL 
    THEN ' WITH CHECK (' || with_check || ')' 
    ELSE '' 
  END || ';'
FROM pg_policies
WHERE tablename = 'usuarios';
```

### Paso 2: Ejecutar script
1. Abrir Supabase SQL Editor
2. Copiar contenido de `LIMPIEZA-USUARIOS-SEGURA.sql`
3. Revisar una última vez
4. Ejecutar
5. Verificar resultados en las queries finales del script

### Paso 3: Verificación inmediata
```sql
-- Debe mostrar 3 políticas:
SELECT policyname, cmd
FROM pg_policies
WHERE tablename = 'usuarios'
ORDER BY policyname;
```

### Paso 4: Testing post-ejecución
- [ ] Login como admin → Funciona
- [ ] Login como supervisor → Funciona
- [ ] Login como trabajador → Funciona
- [ ] Asignar trabajador a tarea → Funciona
- [ ] Editar perfil propio → Funciona

---

## ⚠️ ROLLBACK

Si algo sale mal, ejecutar desde el script `LIMPIEZA-USUARIOS-SEGURA.sql`:

```sql
-- ROLLBACK COMPLETO (final del script)
CREATE POLICY "admin_all_usuarios" ON usuarios FOR ALL TO authenticated USING (check_user_role('admin'::text));
CREATE POLICY "Supervisores pueden ver usuarios" ON usuarios FOR SELECT TO authenticated USING ((get_my_role() = 'supervisor'::text));
-- ... [resto de políticas]
```

**Tiempo estimado rollback:** 30 segundos  
**Impacto rollback:** Restaura estado anterior incluyendo brechas

---

## 📊 MÉTRICAS ESPERADAS

### Antes:
- 11 políticas
- 2 brechas de seguridad críticas
- Acceso público expuesto

### Después:
- 3 políticas (73% reducción)
- 0 brechas de seguridad
- Acceso controlado por rol

### Impacto sistema:
```
Total políticas: 74 → 66 (-8)
Promedio: 2.47 → 2.20 por tabla
```

---

## 🗓️ CRONOGRAMA SUGERIDO

**Día 1 (23/10/2025):**
- ✅ Fase 1 ejecutada (trabajadores_tareas)
- ✅ Scripts preparados
- ✅ Documentación creada

**Días 2-5:**
- Testing exhaustivo Fase 1
- Monitoreo de logs
- Uso normal de la aplicación
- Identificar cualquier problema

**Día 6-7:**
- Revisar resultados testing
- Decidir si ejecutar Fase 2
- Backup previo
- Ejecutar LIMPIEZA-USUARIOS-SEGURA.sql

**Días 8-12:**
- Testing Fase 2
- Monitoreo
- Decidir si continuar con Fase 3

---

## 🎯 CRITERIOS DE ÉXITO

### Fase 2 se considera exitosa si:
1. ✅ 3 políticas en `usuarios` (verificar con query)
2. ✅ Admin ve/gestiona todos los usuarios
3. ✅ Supervisor ve lista de usuarios
4. ✅ Usuarios editan su perfil
5. ✅ No hay errores 401/403 en logs
6. ✅ Páginas críticas funcionan
7. ✅ Público NO ve usuarios (probar sin login)
8. ✅ Usuario normal NO puede crear usuarios

---

## 📝 NOTAS IMPORTANTES

### ¿Por qué supervisor necesita ver usuarios?

**Frontend requiere:**
```typescript
// En /dashboard/tareas/[id]/page.tsx línea 408
const { data: trabajadores } = await supabase
  .from("usuarios")
  .select("id, email, color_perfil, configuracion_trabajadores!inner(activo)")
  .eq("rol", "trabajador")
  .eq("configuracion_trabajadores.activo", true)
```

Sin política SELECT para supervisor → Lista vacía → No puede asignar trabajadores

### ¿Por qué ALL para usuario propio?

Una sola política ALL (id = auth.uid()) cubre:
- Ver su perfil (SELECT)
- Editar su perfil (UPDATE)
- Eliminar su cuenta (DELETE)

Es más limpio que 3 políticas separadas.

### ¿Se puede crear usuarios después?

Sí, admin puede crear usuarios:
1. Via Supabase Dashboard (Authentication)
2. Via código backend con service_role
3. Via RPC functions con verificación admin

La política INSERT pública era un error de seguridad.

---

## 🔗 REFERENCIAS

**Scripts relacionados:**
- `LIMPIEZA-USUARIOS-SEGURA.sql` - Script de ejecución
- `ANALISIS-TABLA-USUARIOS.sql` - Análisis previo
- `RESUMEN-AUDITORIA-RLS-2025.md` - Resumen general

**Commits relacionados:**
- 38aafdc - Fix supervisores ver trabajadores (23/10/2025)
- dcdb6c9 - Eliminar temporary_all_access (16/10/2025)

**Páginas validadas previamente:**
- `/dashboard/tareas/[id]` - Asignar trabajadores ✅
- `/dashboard/trabajadores/registro-dias` - Lista trabajadores ✅

---

**Última actualización:** 23/10/2025 3:50 AM  
**Próxima revisión:** Después de 3-5 días de testing Fase 1  
**Responsable:** Admin
