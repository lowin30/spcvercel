# ✅ Cómo Permitir que Supervisores Creen Tareas

## 🎯 Problema Identificado

El código del frontend **YA permite** que supervisores accedan a la página `/dashboard/tareas/nueva`, pero al intentar crear una tarea, la base de datos **rechaza** la operación porque las políticas RLS solo permiten a los `admin` hacer INSERT en las tablas necesarias.

## 🔧 Solución Rápida (3 pasos)

### Paso 1: Ir a Supabase SQL Editor

1. Abre tu proyecto en [Supabase](https://supabase.com)
2. Ve a **SQL Editor** en el menú lateral
3. Click en **New Query**

### Paso 2: Ejecutar el Script de Verificación y Fix

Copia y pega el contenido del archivo:
```
VERIFICAR-POLITICAS-TAREAS-COMPLETO.sql
```

Este script:
- ✅ Verifica las políticas actuales
- ✅ Crea automáticamente las políticas faltantes
- ✅ No afecta políticas existentes (usa `DO $$ IF NOT EXISTS`)

### Paso 3: Verificar el Resultado

Después de ejecutar el script, deberías ver algo como:

```
tablename              | politicas_insert
-----------------------|------------------
departamentos_tareas   | 1
supervisores_tareas    | 1
tareas                 | 2
trabajadores_tareas    | 1
```

## 🧪 Probar la Funcionalidad

1. Inicia sesión como un usuario supervisor
2. Ve a `/dashboard/tareas/nueva`
3. Completa el formulario y crea una tarea
4. ✅ Debería crearse correctamente sin errores

## 📝 Qué Hace el Script

El script crea **4 políticas RLS**:

### 1. **Tabla `tareas`**
```sql
CREATE POLICY "Supervisores pueden crear tareas"
ON tareas FOR INSERT
WITH CHECK (get_my_role() = 'supervisor');
```

### 2. **Tabla `supervisores_tareas`**
```sql
CREATE POLICY "Supervisores pueden gestionar sus asignaciones"
ON supervisores_tareas FOR INSERT
WITH CHECK (get_my_role() IN ('admin', 'supervisor'));
```

### 3. **Tabla `trabajadores_tareas`**
```sql
CREATE POLICY "Supervisores pueden asignar trabajadores"
ON trabajadores_tareas FOR INSERT
WITH CHECK (get_my_role() IN ('admin', 'supervisor'));
```

### 4. **Tabla `departamentos_tareas`**
```sql
CREATE POLICY "Supervisores pueden vincular departamentos"
ON departamentos_tareas FOR INSERT
WITH CHECK (get_my_role() IN ('admin', 'supervisor'));
```

## ⚠️ Importante

- **No afecta a admins**: Los admins mantienen todos sus permisos
- **Cambio mínimo**: Solo se agregan políticas de INSERT para supervisores
- **Sin breaking changes**: Las políticas existentes no se modifican
- **Seguro**: Usa la función `get_my_role()` que ya existe en tu base de datos

## 🔄 Rollback (si algo sale mal)

Si necesitas revertir los cambios:

```sql
DROP POLICY IF EXISTS "Supervisores pueden crear tareas" ON tareas;
DROP POLICY IF EXISTS "Supervisores pueden gestionar sus asignaciones" ON supervisores_tareas;
DROP POLICY IF EXISTS "Supervisores pueden asignar trabajadores" ON trabajadores_tareas;
DROP POLICY IF EXISTS "Supervisores pueden vincular departamentos" ON departamentos_tareas;
```

## ✅ Checklist Final

- [ ] Script ejecutado en Supabase SQL Editor
- [ ] Sin errores en la ejecución
- [ ] Verificación muestra 4 tablas con políticas
- [ ] Supervisor puede crear tareas desde la UI
- [ ] No hay errores en la consola del navegador
