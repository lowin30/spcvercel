# 📋 DOCUMENTO DE CONSULTAS PRE-IMPLEMENTACIÓN
## Sistema "Mis Liquidaciones" - Centro Unificado de Pagos

**Fecha:** 23 de Octubre, 2025  
**Estado:** 🟢 INFORMACIÓN CRÍTICA CONFIRMADA  
**Objetivo:** Verificar TODO antes de implementar, sin hacer suposiciones

---

## ✅ **INFORMACIÓN CONFIRMADA POR USUARIO**

### **1. Vista `vista_partes_trabajo_completa` - ✅ EXISTE**

**Campos disponibles:**
- `id`, `created_at`, `id_trabajador`, `id_tarea`, `fecha`, `tipo_jornada`
- `id_registrador`, `comentarios`, `liquidado`, `id_liquidacion`
- `titulo_tarea`, `code_tarea`, `email_trabajador`, `nombre_edificio`

**Campo crítico:** `liquidado` (boolean) - para filtrar pendientes

---

### **2. Diferencia entre las DOS tablas de liquidaciones - ✅ CONFIRMADO**

**`liquidaciones_trabajadores`:**
- 💰 Para pagar a trabajadores
- ⏰ Se hace semanalmente (al finalizar cada semana)
- 👷 Incluye jornales + gastos de trabajadores

**`liquidaciones_nuevas`:**
- 💼 Para liquidar a supervisores
- 🏗️ Se paga cuando terminan la tarea que supervisan
- 📊 Basada en presupuestos finales

---

### **3. Supervisores pueden registrar partes de trabajo - ✅ CONFIRMADO**

Los supervisores SÍ pueden:
- Registrar sus propios partes de trabajo
- En las tareas que supervisan
- Por lo tanto, también tienen jornales pendientes como trabajadores

---

### **4. Campo `id_liquidacion` en partes_de_trabajo - ✅ CONFIRMADO**

- Apunta a `liquidaciones_trabajadores`
- Se usa para marcar partes como liquidados
- Filtrar pendientes: `WHERE id_liquidacion IS NULL` o `WHERE liquidado = false`

---

## 🎯 OBJETIVO DEL SISTEMA

Crear página única `/dashboard/trabajadores/gastos` renombrada a **"Mis Liquidaciones"** que muestre:

### **TRABAJADOR:**
- Tab 1: Resumen General (gastos + jornales pendientes)
- Tab 2: Gastos (mantener actual)
- Tab 3: Jornales (NUEVO - mostrar partes de trabajo no liquidados)
- Tab 4: Historial de Pagos (liquidaciones recibidas)

### **SUPERVISOR:**
- Todo lo anterior PERO de sus tareas supervisadas
- Filtros por trabajador y por tarea
- Sus propias liquidaciones como supervisor (desde `liquidaciones_nuevas`)

### **ADMIN:**
- Vista global de TODO el sistema
- Sin filtros de rol
- Acceso completo

---

## 🔍 CONSULTAS NECESARIAS A SUPABASE

### ✅ **1. EJECUTAR ARCHIVO SQL COMPLETO**

**Archivo:** `ANALISIS-EXHAUSTIVO-PRE-IMPLEMENTACION.sql`

**Razón:** Necesito verificar:
- Estructura exacta de `partes_de_trabajo`
- Si existe vista `vista_partes_trabajo_completa` (mencionada en dashboard.tsx línea 268)
- Diferencias entre `liquidaciones_trabajadores` y `liquidaciones_nuevas`
- Campos disponibles en cada tabla
- Foreign keys y relaciones
- Políticas RLS
- Datos de ejemplo reales

**Acción:** Ejecutar en Supabase SQL Editor y copiar TODOS los resultados aquí.

---

### ✅ **2. VERIFICAR VISTAS EXISTENTES**

Ejecutar en Supabase:
```sql
SELECT 
  table_name,
  view_definition
FROM information_schema.views
WHERE table_schema = 'public'
ORDER BY table_name;
```

**Razón:** Verificar si existen vistas como:
- `vista_partes_trabajo_completa` (usada en dashboard.tsx)
- `vista_gastos_tarea_completa` (usada actualmente)
- Cualquier otra vista que pueda ser útil

---

### ✅ **3. CONFIRMAR USO DE id_liquidacion EN partes_de_trabajo**

Ejecutar en Supabase:
```sql
-- Ver si el campo existe
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'partes_de_trabajo' 
  AND column_name = 'id_liquidacion';

-- Ver cuántos partes están ya liquidados vs pendientes
SELECT 
  COUNT(*) as total_partes,
  COUNT(id_liquidacion) as ya_liquidados,
  COUNT(*) - COUNT(id_liquidacion) as pendientes_liquidar
FROM partes_de_trabajo;
```

**Razón:** Confirmar que puedo filtrar jornales no liquidados con `.is('id_liquidacion', null)`

---

### ✅ **4. VERIFICAR RELACIÓN liquidaciones_trabajadores ↔ partes_de_trabajo**

Ejecutar en Supabase:
```sql
-- Ver si existe foreign key
SELECT
  tc.table_name as tabla_origen,
  kcu.column_name as columna_fk,
  ccu.table_name as tabla_destino,
  ccu.column_name as columna_destino,
  tc.constraint_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name = 'partes_de_trabajo'
  AND kcu.column_name = 'id_liquidacion';
```

**Razón:** Confirmar que `id_liquidacion` apunta a `liquidaciones_trabajadores`

---

### ✅ **5. PROBAR QUERY DE JORNALES PENDIENTES (TRABAJADOR)**

Ejecutar en Supabase (reemplazar USER_ID):
```sql
SELECT 
  p.*,
  t.code as tarea_code,
  t.titulo as tarea_titulo,
  u.email as trabajador_email,
  ct.salario_diario
FROM partes_de_trabajo p
LEFT JOIN tareas t ON p.id_tarea = t.id
LEFT JOIN usuarios u ON p.id_trabajador = u.id
LEFT JOIN configuracion_trabajadores ct ON p.id_trabajador = ct.id_trabajador
WHERE p.id_trabajador = 'USER_ID'  -- Reemplazar con ID real
  AND p.id_liquidacion IS NULL
ORDER BY p.fecha DESC;
```

**Razón:** Verificar que la query funciona y devuelve los datos necesarios

---

### ✅ **6. PROBAR QUERY DE JORNALES PENDIENTES (SUPERVISOR)**

Ejecutar en Supabase (reemplazar SUPERVISOR_ID):
```sql
-- Primero obtener tareas del supervisor
WITH tareas_supervisor AS (
  SELECT id_tarea 
  FROM supervisores_tareas 
  WHERE id_supervisor = 'SUPERVISOR_ID'  -- Reemplazar con ID real
)
SELECT 
  p.*,
  t.code as tarea_code,
  t.titulo as tarea_titulo,
  u.email as trabajador_email,
  ct.salario_diario
FROM partes_de_trabajo p
LEFT JOIN tareas t ON p.id_tarea = t.id
LEFT JOIN usuarios u ON p.id_trabajador = u.id
LEFT JOIN configuracion_trabajadores ct ON p.id_trabajador = ct.id_trabajador
WHERE p.id_tarea IN (SELECT id_tarea FROM tareas_supervisor)
  AND p.id_liquidacion IS NULL
ORDER BY p.fecha DESC;
```

**Razón:** Verificar que supervisor puede ver jornales de sus tareas

---

### ✅ **7. VERIFICAR ESTRUCTURA liquidaciones_trabajadores**

Ejecutar en Supabase:
```sql
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'liquidaciones_trabajadores'
ORDER BY ordinal_position;

-- Ver ejemplo de datos
SELECT * FROM liquidaciones_trabajadores
ORDER BY created_at DESC
LIMIT 3;
```

**Razón:** Confirmar campos disponibles para Tab "Historial de Pagos"

---

### ✅ **8. VERIFICAR CAMPO gastos_reembolsados EN liquidaciones**

Ejecutar en Supabase:
```sql
SELECT 
  id,
  id_trabajador,
  semana_inicio,
  semana_fin,
  total_dias,
  salario_base,
  gastos_reembolsados,
  total_pagar,
  created_at
FROM liquidaciones_trabajadores
WHERE gastos_reembolsados > 0
ORDER BY created_at DESC
LIMIT 5;
```

**Razón:** Confirmar que `gastos_reembolsados` existe y tiene datos

---

### ✅ **9. VERIFICAR SI EXISTE CAMPO total_jornales**

Ejecutar en Supabase:
```sql
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'liquidaciones_trabajadores'
  AND column_name LIKE '%jornal%';
```

**Razón:** Ver qué campos hay relacionados con jornales

---

### ✅ **10. BUSCAR COMPONENTES QUE USAN partes_de_trabajo**

**Archivos identificados en código:**
1. `components/calendario-partes-trabajo.tsx` (6 usos)
2. `components/historial-jornales-tarea.tsx` (5 usos) ← YA EXISTE
3. `app/dashboard/page.tsx` (3 usos)
4. `app/dashboard/trabajadores/liquidaciones/[id]/page.tsx` (2 usos)
5. `app/dashboard/trabajadores/registro-dias/page.tsx` (1 uso)
6. `components/generar-liquidacion-dialog.tsx` (1 uso)

**Pregunta:** ¿Alguno de estos componentes se rompería si agrego el nuevo tab de jornales?

---

## 📊 ANÁLISIS DE CÓDIGO EXISTENTE

### **COMPONENTE: historial-jornales-tarea.tsx** ✅ PERFECTO

**Estado:** Ya existe y está completo  
**Ubicación:** `components/historial-jornales-tarea.tsx`  
**Líneas:** 318

**Características:**
- ✅ Query a `partes_de_trabajo` con JOIN a usuarios y configuracion
- ✅ Filtra por `id_tarea`
- ✅ Filtra por `id_trabajador` si rol = trabajador
- ✅ Calcula salarios (completo vs medio día)
- ✅ Resumen por trabajador (para admin/supervisor)
- ✅ Realtime updates con Supabase channels
- ✅ Loading y empty states

**Query actual:**
```typescript
supabase
  .from("partes_de_trabajo")
  .select(`
    *,
    usuarios!partes_de_trabajo_id_trabajador_fkey (
      email, 
      color_perfil,
      configuracion_trabajadores (salario_diario)
    )
  `)
  .eq("id_tarea", tareaId)
  .order("fecha", { ascending: false })
```

**¿Puedo reutilizarlo?** ✅ SÍ, pero necesito adaptarlo para:
1. No filtrar por tarea (mostrar TODOS los jornales del trabajador)
2. Agregar filtro `.is('id_liquidacion', null)` para solo pendientes
3. Agrupar por tarea en lugar de por trabajador

---

### **PÁGINA ACTUAL: trabajadores/gastos/page.tsx** ✅ BASE SÓLIDA

**Query actual de gastos:**
```typescript
supabase
  .from('vista_gastos_tarea_completa')
  .select('*')
  .eq('liquidado', false)
  .eq('id_usuario', session.user.id)  // Si es trabajador
```

**Query de última liquidación:**
```typescript
supabase
  .from('liquidaciones_trabajadores')
  .select('gastos_reembolsados, created_at')
  .eq('id_trabajador', session.user.id)
  .order('created_at', { ascending: false })
  .limit(1)
```

**¿Qué falta?**
1. Query similar para jornales pendientes
2. Calcular total combinado (gastos + jornales)
3. Tab para jornales
4. Tab para historial

---

### **COMPONENTE: liquidaciones-list.tsx** 📋 PARA HISTORIAL

**Ubicación:** `components/liquidaciones-list.tsx`  
**Uso actual:** En `/dashboard/trabajadores/liquidaciones/page.tsx`

**Query:**
```typescript
supabase
  .from("liquidaciones_trabajadores")
  .select("*")
  .eq("id_trabajador", userId)
  .order("semana_inicio", { ascending: false })
```

**¿Puedo reutilizarlo?** ✅ SÍ, para el Tab 4 "Historial de Pagos"

---

## 🚨 PREGUNTAS CRÍTICAS ANTES DE IMPLEMENTAR

### **1. ¿Existe `vista_partes_trabajo_completa`?**
- Mencionada en `app/dashboard/page.tsx` línea 268
- Necesito confirmar si existe o si es un error

### **2. ¿Qué diferencia hay entre liquidaciones_trabajadores y liquidaciones_nuevas?**
- `liquidaciones_trabajadores`: Pagos semanales a trabajadores
- `liquidaciones_nuevas`: Liquidaciones de supervisores por presupuestos
- ¿Son dos sistemas separados o se relacionan?

### **3. ¿El campo id_liquidacion en partes_de_trabajo apunta a qué tabla?**
- ¿A `liquidaciones_trabajadores`?
- ¿A `liquidaciones_nuevas`?
- ¿O puede apuntar a ambas?

### **4. ¿Cómo se calcula total_jornales en liquidaciones_trabajadores?**
- ¿Es SUM(salario_diario × tipo_jornada) de partes_de_trabajo?
- ¿Se almacena o se calcula?

### **5. ¿Los supervisores tienen sus propios jornales?**
- ¿O solo liquidaciones desde `liquidaciones_nuevas`?
- ¿Pueden registrar partes de trabajo?

### **6. ¿Qué pasa si elimino algo del actual sistema de gastos?**
- ¿Componentes que dependen de `HistorialGastos`?
- ¿Páginas que usan `vista_gastos_tarea_completa`?

---

## 📝 COMPONENTES A CREAR (PENDIENTE DE CONFIRMACIÓN)

### **1. ResumenLiquidaciones.tsx** (NUEVO)
**Props:**
```typescript
{
  gastosPendientes: number
  gastosCount: number
  jornalesPendientes: number
  diasCount: number
  userRole: string
  ultimaLiquidacion?: { monto: number, fecha: string }
}
```

**Funcionalidad:**
- 3 cards: Gastos, Jornales, Total
- Desglose por tarea (colapsable)
- Alertas si hay mucho pendiente

---

### **2. HistorialJornalesGlobal.tsx** (NUEVO)
**Diferencia con `historial-jornales-tarea.tsx`:**
- NO filtra por tarea (muestra TODOS)
- Agrupa por tarea o por fecha (toggle)
- Solo jornales NO liquidados
- Agrega totales por tarea

**Props:**
```typescript
{
  userId: string
  userRole: string
  filterByTask?: number  // Opcional
  onlyPending?: boolean  // Default true
}
```

---

### **3. TabsLiquidaciones.tsx** (NUEVO)
**Funcionalidad:**
- Orquesta los 4 tabs
- Maneja estado global
- Pasa datos a sub-componentes

---

### **4. HistorialLiquidacionesRecibidas.tsx** (NUEVO)
**Reutiliza:** `liquidaciones-list.tsx`

**Adaptaciones:**
- Vista simplificada (no editable)
- Desglose detallado clickeable
- Descarga PDF (futuro)

---

## 🎯 PLAN DE IMPLEMENTACIÓN (DESPUÉS DE CONSULTAS)

### **FASE 1: Verificación** (ACTUAL)
1. ✅ Ejecutar `ANALISIS-EXHAUSTIVO-PRE-IMPLEMENTACION.sql`
2. ✅ Copiar TODOS los resultados
3. ✅ Confirmar estructura de tablas
4. ✅ Confirmar queries funcionan
5. ✅ Verificar permisos RLS

### **FASE 2: Componentes Base**
1. Crear `HistorialJornalesGlobal.tsx`
2. Crear `ResumenLiquidaciones.tsx`
3. Crear `TabsLiquidaciones.tsx`

### **FASE 3: Integración**
1. Modificar `trabajadores/gastos/page.tsx`
2. Agregar queries de jornales
3. Calcular totales combinados
4. Implementar tabs

### **FASE 4: Historial**
1. Crear/adaptar `HistorialLiquidacionesRecibidas.tsx`
2. Integrar en Tab 4

### **FASE 5: Permisos por Rol**
1. Implementar filtros para supervisor
2. Implementar vista global para admin
3. Testing con los 3 roles

---

## ⚠️ RIESGOS IDENTIFICADOS

### **RIESGO 1: Vista inexistente**
**Problema:** `vista_partes_trabajo_completa` mencionada pero no confirmada  
**Mitigación:** Usar tabla directa `partes_de_trabajo` con JOINs

### **RIESGO 2: Confusión de liquidaciones**
**Problema:** Dos tablas de liquidaciones con propósitos diferentes  
**Mitigación:** Documentar claramente cuál es para qué

### **RIESGO 3: Romper componentes existentes**
**Problema:** `historial-jornales-tarea.tsx` ya existe y funciona  
**Mitigación:** Crear componente NUEVO en lugar de modificar

### **RIESGO 4: Permisos RLS**
**Problema:** Queries podrían fallar por políticas RLS  
**Mitigación:** Verificar políticas ANTES de implementar

---

## ✅ CHECKLIST ANTES DE IMPLEMENTAR

- [ ] Ejecutar SQL de análisis completo
- [ ] Confirmar estructura de `partes_de_trabajo`
- [ ] Confirmar existencia de `vista_partes_trabajo_completa`
- [ ] Confirmar relación `id_liquidacion`
- [ ] Probar query de jornales pendientes (trabajador)
- [ ] Probar query de jornales pendientes (supervisor)
- [ ] Probar query de jornales pendientes (admin)
- [ ] Verificar campos de `liquidaciones_trabajadores`
- [ ] Verificar políticas RLS
- [ ] Confirmar que NO rompo componentes existentes
- [ ] Documentar diferencias entre las dos tablas de liquidaciones

---

## 📞 ESPERANDO RESPUESTAS DEL USUARIO

1. ¿Ejecutaste el SQL? ¿Qué resultados obtuviste?
2. ¿Existe `vista_partes_trabajo_completa`?
3. ¿Confirmas que `id_liquidacion` en `partes_de_trabajo` apunta a `liquidaciones_trabajadores`?
4. ¿Los supervisores registran sus propios jornales o solo tienen liquidaciones de presupuestos?
5. ¿Hay algo más que deba verificar antes de empezar?

---

**Estado:** 🟡 DOCUMENTO COMPLETO - ESPERANDO EJECUCIÓN DE QUERIES
