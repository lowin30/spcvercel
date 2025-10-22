# 🔍 ANÁLISIS PROFUNDO: Botón "Rechazar" Presupuesto Final NO Funciona

**Fecha:** 21 de Octubre, 2025  
**Página:** https://spcvercel.vercel.app/dashboard/tareas/70  
**Problema:** El botón de "Rechazar" presupuesto final no está funcionando

---

## 📋 CONTEXTO:

**Ubicación:** `/dashboard/tareas/[id]` → Sección de presupuestos  
**Usuario reporta:** "El botón de RECHAZAR NO ESTA FUNCIONANDO"  
**Componente involucrado:** `components/presupuestos-interactivos.tsx`

---

## 🔍 ANÁLISIS DEL CÓDIGO:

### **1. FLUJO ACTUAL DEL BOTÓN "RECHAZAR"**

**Ubicación:** `components/presupuestos-interactivos.tsx` (líneas 517-530)

```typescript
<Button 
  variant="outline" 
  size="sm"
  className="border-red-200 bg-red-50 text-red-700 hover:bg-red-100 hover:text-red-800"
  onClick={() => {
    setPresupuestoARechazar(presupuesto);
    setObservacionRechazo("");
    setShowRechazarDialog(true);  // ← Abre el diálogo
  }}
  disabled={isAprobando || isRechazando}
>
  {isRechazando ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Ban className="mr-1 h-3.5 w-3.5" />}
  Rechazar
</Button>
```

**¿Qué hace este botón?**
1. Guarda el presupuesto en `presupuestoARechazar`
2. Limpia las observaciones anteriores
3. **Abre el diálogo** `showRechazarDialog`
4. **NO ejecuta** la acción de rechazar directamente

---

### **2. DIÁLOGO DE RECHAZO**

**Ubicación:** `components/presupuestos-interactivos.tsx` (líneas 547-586)

```typescript
<Dialog open={showRechazarDialog} onOpenChange={setShowRechazarDialog}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Rechazar presupuesto</DialogTitle>
      <DialogDescription>
        Indique el motivo por el cual rechaza este presupuesto.
      </DialogDescription>
    </DialogHeader>
    
    {/* Campo de observaciones */}
    <div className="py-4">
      <Textarea
        placeholder="Observaciones (opcional)"
        value={observacionRechazo}
        onChange={(e) => setObservacionRechazo(e.target.value)}
        rows={4}
      />
    </div>
    
    <DialogFooter>
      {/* Botón Cancelar */}
      <Button 
        variant="outline" 
        onClick={() => setShowRechazarDialog(false)}
        disabled={isRechazando}
      >
        Cancelar
      </Button>
      
      {/* Botón Confirmar rechazo */}
      <Button 
        variant="destructive"
        onClick={() => {
          if (presupuestoARechazar) {
            handleRechazarPresupuesto(presupuestoARechazar, observacionRechazo);
            setShowRechazarDialog(false);  // ← Cierra el diálogo
          }
        }}
        disabled={isRechazando}
      >
        {isRechazando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        Confirmar rechazo
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

**Flujo esperado:**
1. Usuario click "Rechazar" → Abre diálogo
2. Usuario escribe observaciones (opcional)
3. Usuario click "Confirmar rechazo" → Ejecuta `handleRechazarPresupuesto`

---

### **3. FUNCIÓN `handleRechazarPresupuesto`**

**Ubicación:** `components/presupuestos-interactivos.tsx` (líneas 185-255)

```typescript
const handleRechazarPresupuesto = async (presupuesto: PresupuestoType, observacion: string = "") => {
  // ✅ VALIDACIÓN DE PERMISOS
  if (userRol !== "admin") {
    toast({
      title: "Acción no permitida",
      description: "Solo los administradores pueden rechazar presupuestos",
      variant: "destructive",
    })
    return  // ← Sale si no es admin
  }

  setIsRechazando(true)  // ← Loading state
  
  try {
    const supabase = createClient()
    if (!supabase) {
      throw new Error("No se pudo inicializar el cliente de Supabase")
    }
    
    // ✅ ACTUALIZACIÓN EN BASE DE DATOS
    const tabla = presupuesto.tipo === "base" ? "presupuestos_base" : "presupuestos_finales"
    const { error } = await supabase
      .from(tabla)
      .update({ 
        aprobado: false,
        rechazado: true,
        observaciones: observacion || undefined,
        updated_at: new Date().toISOString()
      })
      .eq("id", presupuesto.id)
    
    if (error) throw error
    
    // ✅ ACTUALIZACIÓN ESTADO LOCAL (UI)
    if (presupuesto.tipo === "base") {
      setPresupuestoBaseLocal({
        ...presupuesto,
        aprobado: false,
        rechazado: true,
        observaciones: observacion || undefined,
        updated_at: new Date().toISOString()
      })
    } else {
      setPresupuestoFinalLocal({
        ...presupuesto,
        aprobado: false,
        rechazado: true,
        observaciones: observacion || undefined,
        updated_at: new Date().toISOString()
      })
    }
    
    // ✅ NOTIFICACIÓN ÉXITO
    toast({
      title: "Presupuesto rechazado",
      description: `El presupuesto ${presupuesto.code} ha sido rechazado`,
    })
    
    // ✅ RECARGA DE DATOS
    if (onPresupuestoChange) onPresupuestoChange()
    
  } catch (err) {
    // ❌ MANEJO DE ERRORES
    console.error("Error al rechazar presupuesto:", err)
    toast({
      title: "Error",
      description: `No se pudo rechazar el presupuesto. ${err instanceof Error ? err.message : ""}`,
      variant: "destructive",
    })
  } finally {
    setIsRechazando(false)  // ← Fin loading
  }
}
```

---

## 🎯 POSIBLES CAUSAS DEL PROBLEMA:

### **CAUSA 1: El diálogo NO se está mostrando**

**¿Por qué podría pasar?**
- El estado `showRechazarDialog` no se está actualizando
- Problema con el componente `Dialog` de shadcn/ui
- Conflicto de z-index (el diálogo está detrás de otro elemento)

**Cómo verificar:**
```typescript
// Agregar console.log en el onClick del botón Rechazar
onClick={() => {
  console.log('🔴 Botón Rechazar clickeado', { presupuesto });
  setPresupuestoARechazar(presupuesto);
  setObservacionRechazo("");
  setShowRechazarDialog(true);
  console.log('🔴 Estado showRechazarDialog:', true);
}}
```

---

### **CAUSA 2: El diálogo se muestra pero el botón "Confirmar" NO ejecuta**

**¿Por qué podría pasar?**
- `presupuestoARechazar` es null
- Condición `if (presupuestoARechazar)` no se cumple
- Problema con el onClick del botón "Confirmar rechazo"

**Cómo verificar:**
```typescript
// Agregar console.log en el onClick de "Confirmar rechazo"
onClick={() => {
  console.log('🟠 Confirmar rechazo clickeado');
  console.log('🟠 presupuestoARechazar:', presupuestoARechazar);
  console.log('🟠 observacionRechazo:', observacionRechazo);
  
  if (presupuestoARechazar) {
    console.log('🟠 Ejecutando handleRechazarPresupuesto...');
    handleRechazarPresupuesto(presupuestoARechazar, observacionRechazo);
    setShowRechazarDialog(false);
  } else {
    console.log('🟠 ERROR: presupuestoARechazar es null');
  }
}}
```

---

### **CAUSA 3: `handleRechazarPresupuesto` se ejecuta pero falla**

**¿Por qué podría pasar?**
- **Validación de permisos:** `userRol !== "admin"`
- **Error en Supabase:** No tiene permisos para actualizar
- **RLS (Row Level Security):** Política de seguridad bloquea el UPDATE
- **Columnas inexistentes:** `rechazado` o `observaciones` no existen en la tabla

**Cómo verificar:**
```typescript
const handleRechazarPresupuesto = async (presupuesto: PresupuestoType, observacion: string = "") => {
  console.log('🟢 handleRechazarPresupuesto iniciado', {
    presupuesto,
    observacion,
    userRol
  });
  
  if (userRol !== "admin") {
    console.log('🔴 ERROR: Usuario NO es admin', { userRol });
    toast({
      title: "Acción no permitida",
      description: "Solo los administradores pueden rechazar presupuestos",
      variant: "destructive",
    })
    return
  }
  
  console.log('✅ Usuario es admin, continuando...');
  setIsRechazando(true)
  
  try {
    const supabase = createClient()
    if (!supabase) {
      throw new Error("No se pudo inicializar el cliente de Supabase")
    }
    
    const tabla = presupuesto.tipo === "base" ? "presupuestos_base" : "presupuestos_finales"
    console.log('🟢 Actualizando tabla:', tabla, 'ID:', presupuesto.id);
    
    const updateData = { 
      aprobado: false,
      rechazado: true,
      observaciones: observacion || undefined,
      updated_at: new Date().toISOString()
    };
    
    console.log('🟢 Datos a actualizar:', updateData);
    
    const { error, data } = await supabase
      .from(tabla)
      .update(updateData)
      .eq("id", presupuesto.id)
      .select();  // ← Agregar .select() para ver qué se actualizó
    
    console.log('🟢 Resultado de actualización:', { data, error });
    
    if (error) {
      console.log('🔴 ERROR en actualización:', error);
      throw error
    }
    
    console.log('✅ Actualización exitosa');
    
    // ... resto del código
}
```

---

### **CAUSA 4: Problema con RLS (Row Level Security)**

**¿Qué es RLS?**
Row Level Security en Supabase permite controlar qué filas pueden ver/editar los usuarios.

**¿Por qué podría estar bloqueando?**
```sql
-- Posible política RLS en presupuestos_finales:
CREATE POLICY "Solo admins pueden actualizar presupuestos finales"
ON presupuestos_finales
FOR UPDATE
USING (
  -- Condición que debe cumplirse
  auth.uid() IN (SELECT id FROM usuarios WHERE rol = 'admin')
);
```

**Si la política no existe o está mal configurada:**
- El UPDATE se ejecuta sin errores
- Pero NO actualiza ninguna fila
- Supabase devuelve `{ data: [], error: null }`

**Cómo verificar:**
```sql
-- En Supabase SQL Editor:
-- Ver políticas RLS de la tabla
SELECT * FROM pg_policies 
WHERE tablename = 'presupuestos_finales';

-- Intentar actualizar manualmente
UPDATE presupuestos_finales
SET rechazado = true, aprobado = false, observaciones = 'Test desde SQL'
WHERE id = 123;  -- Reemplazar con ID real
```

---

### **CAUSA 5: Columnas inexistentes en la tabla**

**¿Qué columnas espera el código?**
- `aprobado` (boolean)
- `rechazado` (boolean)
- `observaciones` (text)
- `updated_at` (timestamp)

**Si alguna columna NO existe:**
- Supabase devuelve error
- El catch captura el error
- Se muestra toast de error

**Cómo verificar:**
```sql
-- En Supabase SQL Editor:
-- Ver estructura de la tabla
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'presupuestos_finales'
ORDER BY ordinal_position;
```

---

## 🔧 SOLUCIÓN PROPUESTA:

### **OPCIÓN 1: Agregar logging exhaustivo (INVESTIGACIÓN)**

**Objetivo:** Entender exactamente dónde falla

**Cambios en `presupuestos-interactivos.tsx`:**

1. **Agregar logs en botón "Rechazar"** (línea 521)
2. **Agregar logs en botón "Confirmar rechazo"** (línea 573)
3. **Agregar logs en `handleRechazarPresupuesto`** (línea 185)

**Resultado esperado:**
- Console logs mostrarán el flujo exacto
- Identificarán el punto de falla

---

### **OPCIÓN 2: Verificar tabla y RLS (BASE DE DATOS)**

**Pasos:**

1. **Verificar estructura de tabla:**
```sql
SELECT column_name, data_type 
FROM information_schema.columns
WHERE table_name = 'presupuestos_finales';
```

2. **Verificar políticas RLS:**
```sql
SELECT * FROM pg_policies 
WHERE tablename = 'presupuestos_finales';
```

3. **Probar actualización manual:**
```sql
UPDATE presupuestos_finales
SET rechazado = true, aprobado = false
WHERE id = 70;  -- ID de la tarea del usuario
```

---

### **OPCIÓN 3: Fix directo si falta columna (MÁS PROBABLE)**

**Si la columna `rechazado` NO existe:**

```sql
-- Agregar columna rechazado
ALTER TABLE presupuestos_finales
ADD COLUMN IF NOT EXISTS rechazado BOOLEAN DEFAULT false;

-- Agregar columna observaciones si no existe
ALTER TABLE presupuestos_finales
ADD COLUMN IF NOT EXISTS observaciones TEXT;
```

---

### **OPCIÓN 4: Fix RLS si está bloqueando**

**Si RLS está bloqueando la actualización:**

```sql
-- Crear o actualizar política para permitir UPDATE a admins
CREATE POLICY "Admins pueden actualizar presupuestos finales"
ON presupuestos_finales
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM usuarios
    WHERE id = auth.uid() AND rol = 'admin'
  )
);

-- O desactivar temporalmente RLS para probar
ALTER TABLE presupuestos_finales DISABLE ROW LEVEL SECURITY;
```

---

## 📊 COMPARACIÓN: Botón APROBAR vs RECHAZAR

### **Botón APROBAR (FUNCIONA):**

**Línea 506-515:**
```typescript
<Button 
  onClick={() => handleAprobarPresupuesto(presupuesto)}
  disabled={isAprobando || isRechazando}
>
  Aprobar
</Button>
```

**Flujo:**
1. Click → Ejecuta `handleAprobarPresupuesto` DIRECTAMENTE
2. NO hay diálogo intermedio
3. Actualiza DB inmediatamente

---

### **Botón RECHAZAR (NO FUNCIONA):**

**Línea 517-530:**
```typescript
<Button 
  onClick={() => {
    setPresupuestoARechazar(presupuesto);
    setShowRechazarDialog(true);  // ← Abre diálogo
  }}
  disabled={isAprobando || isRechazando}
>
  Rechazar
</Button>
```

**Flujo:**
1. Click → Abre diálogo
2. Usuario llena observaciones
3. Click "Confirmar" → Ejecuta `handleRechazarPresupuesto`

**DIFERENCIA CLAVE:**
- APROBAR: 1 paso (directo)
- RECHAZAR: 2 pasos (diálogo → confirmar)

**Punto de falla más probable:**
- El diálogo no se muestra
- O el botón "Confirmar" no ejecuta

---

## 🎯 DIAGNÓSTICO MÁS PROBABLE:

### **TEORÍA 1: Columna `rechazado` NO existe** ⭐⭐⭐⭐⭐

**Por qué es más probable:**
- El código de APROBAR funciona → Supabase conecta bien
- El código de RECHAZAR falla → Algo específico de rechazar
- La diferencia: Columna `rechazado` en UPDATE

**Evidencia:**
```typescript
// APROBAR actualiza:
{ aprobado: true, rechazado: false }

// RECHAZAR actualiza:
{ aprobado: false, rechazado: true, observaciones: ... }
```

**Si `rechazado` no existe:**
- Supabase devuelve error: `column "rechazado" does not exist`
- Catch captura el error
- Toast muestra: "No se pudo rechazar el presupuesto"

---

### **TEORÍA 2: Diálogo no se muestra por conflicto CSS/z-index** ⭐⭐⭐

**Por qué podría pasar:**
- Otro elemento tiene z-index mayor
- El diálogo se renderiza pero queda detrás
- Usuario no lo ve, piensa que no funciona

**Cómo verificar:**
- Inspeccionar con DevTools
- Buscar elemento con `data-state="open"`
- Verificar z-index y opacity

---

### **TEORÍA 3: RLS bloquea el UPDATE** ⭐⭐⭐

**Por qué podría pasar:**
- Política RLS mal configurada
- Usuario no tiene permisos UPDATE
- UPDATE se ejecuta pero no afecta filas

**Cómo verificar:**
```typescript
// Agregar .select() después del .update()
const { error, data } = await supabase
  .from(tabla)
  .update(updateData)
  .eq("id", presupuesto.id)
  .select();  // ← Devuelve las filas actualizadas

console.log('Filas actualizadas:', data);
// Si data = [] → RLS está bloqueando
```

---

## ✅ RECOMENDACIÓN FINAL:

### **PLAN DE ACCIÓN:**

**PASO 1: Verificar estructura de tabla (1 min)**
```sql
SELECT column_name, data_type 
FROM information_schema.columns
WHERE table_name = 'presupuestos_finales'
AND column_name IN ('aprobado', 'rechazado', 'observaciones');
```

**Resultado esperado:**
```
column_name  | data_type
-------------|----------
aprobado     | boolean
rechazado    | boolean
observaciones| text
```

**Si falta `rechazado`:**
```sql
ALTER TABLE presupuestos_finales
ADD COLUMN rechazado BOOLEAN DEFAULT false;
```

---

**PASO 2: Agregar logging (si PASO 1 no resuelve) (5 min)**

Agregar console.logs en:
1. onClick del botón "Rechazar"
2. onClick del botón "Confirmar rechazo"
3. handleRechazarPresupuesto

---

**PASO 3: Verificar RLS (si PASO 1 y 2 no resuelven) (3 min)**
```sql
SELECT * FROM pg_policies 
WHERE tablename = 'presupuestos_finales';
```

---

## 📝 RESUMEN:

**Problema:** Botón "Rechazar" presupuesto final no funciona

**Causa más probable:** Columna `rechazado` no existe en tabla `presupuestos_finales`

**Solución:** Agregar columna con ALTER TABLE

**Alternativas:** Verificar RLS, agregar logging para depurar

**Prioridad:** Alta ⭐⭐⭐⭐⭐

**Tiempo estimado:** 5-10 minutos

---

**ANÁLISIS COMPLETADO - ESPERANDO INSTRUCCIONES** ✅
