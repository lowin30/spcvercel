# 🐛 DEBUGGING: Botón Rechazar Presupuesto

**Archivo:** `components/presupuestos-interactivos.tsx`  
**Problema:** Botón "Rechazar" no funciona  
**Columna `rechazado`:** ✅ Existe (confirmado)

---

## 🔍 CÓDIGO CON LOGGING PARA DEPURAR

### **OPCIÓN 1: Agregar console.logs estratégicos**

Agregar estos logs en `components/presupuestos-interactivos.tsx`:

#### **1. En el onClick del botón "Rechazar" (línea ~521)**

**ANTES:**
```typescript
onClick={() => {
  setPresupuestoARechazar(presupuesto);
  setObservacionRechazo("");
  setShowRechazarDialog(true);
}}
```

**DESPUÉS (con logging):**
```typescript
onClick={() => {
  console.log('🔴 [DEBUG] Botón Rechazar clickeado');
  console.log('🔴 [DEBUG] Presupuesto:', presupuesto);
  console.log('🔴 [DEBUG] userRol:', userRol);
  
  setPresupuestoARechazar(presupuesto);
  setObservacionRechazo("");
  setShowRechazarDialog(true);
  
  console.log('🔴 [DEBUG] Estado actualizado, diálogo debería abrirse');
  console.log('🔴 [DEBUG] showRechazarDialog:', true);
}}
```

---

#### **2. En el onClick de "Confirmar rechazo" (línea ~573)**

**ANTES:**
```typescript
onClick={() => {
  if (presupuestoARechazar) {
    handleRechazarPresupuesto(presupuestoARechazar, observacionRechazo);
    setShowRechazarDialog(false);
  }
}}
```

**DESPUÉS (con logging):**
```typescript
onClick={() => {
  console.log('🟠 [DEBUG] Botón Confirmar Rechazo clickeado');
  console.log('🟠 [DEBUG] presupuestoARechazar:', presupuestoARechazar);
  console.log('🟠 [DEBUG] observacionRechazo:', observacionRechazo);
  
  if (presupuestoARechazar) {
    console.log('🟠 [DEBUG] Presupuesto existe, ejecutando handleRechazarPresupuesto...');
    handleRechazarPresupuesto(presupuestoARechazar, observacionRechazo);
    setShowRechazarDialog(false);
  } else {
    console.log('🔴 [ERROR] presupuestoARechazar es NULL');
  }
}}
```

---

#### **3. En handleRechazarPresupuesto (línea ~185)**

**ANTES:**
```typescript
const handleRechazarPresupuesto = async (presupuesto: PresupuestoType, observacion: string = "") => {
  if (userRol !== "admin") {
    toast({
      title: "Acción no permitida",
      description: "Solo los administradores pueden rechazar presupuestos",
      variant: "destructive",
    })
    return
  }

  setIsRechazando(true)
  
  try {
    const supabase = createClient()
    if (!supabase) {
      throw new Error("No se pudo inicializar el cliente de Supabase")
    }
    
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
    
    // ... resto del código
```

**DESPUÉS (con logging exhaustivo):**
```typescript
const handleRechazarPresupuesto = async (presupuesto: PresupuestoType, observacion: string = "") => {
  console.log('🟢 [DEBUG] ===== handleRechazarPresupuesto INICIADO =====');
  console.log('🟢 [DEBUG] Presupuesto recibido:', presupuesto);
  console.log('🟢 [DEBUG] Observación:', observacion);
  console.log('🟢 [DEBUG] userRol:', userRol);
  
  // VALIDACIÓN DE PERMISOS
  if (userRol !== "admin") {
    console.log('🔴 [ERROR] Usuario NO es admin');
    console.log('🔴 [ERROR] Rol actual:', userRol);
    toast({
      title: "Acción no permitida",
      description: "Solo los administradores pueden rechazar presupuestos",
      variant: "destructive",
    })
    return
  }
  
  console.log('✅ [DEBUG] Usuario es admin, continuando...');
  setIsRechazando(true)
  
  try {
    const supabase = createClient()
    if (!supabase) {
      console.log('🔴 [ERROR] No se pudo crear cliente Supabase');
      throw new Error("No se pudo inicializar el cliente de Supabase")
    }
    
    console.log('✅ [DEBUG] Cliente Supabase creado');
    
    const tabla = presupuesto.tipo === "base" ? "presupuestos_base" : "presupuestos_finales"
    console.log('🟢 [DEBUG] Tabla a actualizar:', tabla);
    console.log('🟢 [DEBUG] ID del presupuesto:', presupuesto.id);
    
    const updateData = { 
      aprobado: false,
      rechazado: true,
      observaciones: observacion || undefined,
      updated_at: new Date().toISOString()
    };
    
    console.log('🟢 [DEBUG] Datos para UPDATE:', updateData);
    console.log('🟢 [DEBUG] Ejecutando UPDATE...');
    
    // ⭐ IMPORTANTE: Agregar .select() para ver qué se actualizó
    const { error, data } = await supabase
      .from(tabla)
      .update(updateData)
      .eq("id", presupuesto.id)
      .select();  // ← Devuelve las filas actualizadas
    
    console.log('🟢 [DEBUG] Resultado UPDATE:');
    console.log('  - Data:', data);
    console.log('  - Error:', error);
    console.log('  - Filas afectadas:', data?.length || 0);
    
    if (error) {
      console.log('🔴 [ERROR] Error en UPDATE:', error);
      console.log('🔴 [ERROR] Código:', error.code);
      console.log('🔴 [ERROR] Mensaje:', error.message);
      console.log('🔴 [ERROR] Detalles:', error.details);
      throw error
    }
    
    // ⚠️ VERIFICACIÓN CRÍTICA: ¿Se actualizó alguna fila?
    if (!data || data.length === 0) {
      console.log('⚠️ [WARNING] UPDATE exitoso pero NO actualizó ninguna fila');
      console.log('⚠️ [WARNING] Posible causa: RLS (Row Level Security) bloqueando');
      console.log('⚠️ [WARNING] O el ID no existe en la tabla');
    } else {
      console.log('✅ [SUCCESS] UPDATE exitoso, filas actualizadas:', data.length);
      console.log('✅ [SUCCESS] Datos actualizados:', data[0]);
    }
    
    // ... resto del código (actualización estado local, toast, etc)
    
  } catch (err) {
    console.log('🔴 [ERROR] Excepción capturada en catch:');
    console.log('🔴 [ERROR] Error:', err);
    console.log('🔴 [ERROR] Tipo:', typeof err);
    console.log('🔴 [ERROR] Message:', err instanceof Error ? err.message : 'No message');
    
    // ... resto del manejo de error
  } finally {
    console.log('🟢 [DEBUG] ===== handleRechazarPresupuesto FINALIZADO =====');
    setIsRechazando(false)
  }
}
```

---

## 📊 INTERPRETACIÓN DE LOGS:

### **ESCENARIO 1: No aparecen logs del botón "Rechazar"**
```
❌ No hay logs de: 🔴 [DEBUG] Botón Rechazar clickeado
```
**Causa:** El onClick del botón NO se está ejecutando  
**Solución:** Verificar que el botón no esté disabled o cubierto por otro elemento

---

### **ESCENARIO 2: Botón clickea pero diálogo no se muestra**
```
✅ 🔴 [DEBUG] Botón Rechazar clickeado
✅ 🔴 [DEBUG] Estado actualizado, diálogo debería abrirse
❌ Pero el diálogo NO aparece visualmente
```
**Causa:** Problema de z-index o CSS  
**Solución:** Inspeccionar con DevTools, buscar elemento con `data-state="open"`

---

### **ESCENARIO 3: Diálogo se muestra pero "Confirmar" no ejecuta**
```
✅ Diálogo visible
❌ No hay logs de: 🟠 [DEBUG] Botón Confirmar Rechazo clickeado
```
**Causa:** onClick del botón "Confirmar" no funciona  
**Solución:** Verificar que isRechazando no esté bloqueando (disabled)

---

### **ESCENARIO 4: Usuario no es admin**
```
✅ 🟠 [DEBUG] Botón Confirmar Rechazo clickeado
✅ 🟢 [DEBUG] handleRechazarPresupuesto INICIADO
🔴 [ERROR] Usuario NO es admin
🔴 [ERROR] Rol actual: supervisor (o trabajador)
```
**Causa:** El usuario no tiene permisos de admin  
**Solución:** Verificar que el usuario esté logueado como admin

---

### **ESCENARIO 5: UPDATE falla por RLS** ⭐ MÁS PROBABLE
```
✅ 🟢 [DEBUG] handleRechazarPresupuesto INICIADO
✅ 🟢 [DEBUG] Usuario es admin
✅ 🟢 [DEBUG] Ejecutando UPDATE...
✅ 🟢 [DEBUG] Resultado UPDATE:
  - Data: []          ← ⚠️ Array vacío!
  - Error: null
  - Filas afectadas: 0
⚠️ [WARNING] UPDATE exitoso pero NO actualizó ninguna fila
⚠️ [WARNING] Posible causa: RLS bloqueando
```
**Causa:** RLS (Row Level Security) está bloqueando el UPDATE  
**Solución:** Ejecutar `DIAGNOSTICO-RECHAZAR-PRESUPUESTO.sql` para verificar políticas RLS

---

### **ESCENARIO 6: Error de Supabase**
```
✅ 🟢 [DEBUG] Ejecutando UPDATE...
🔴 [ERROR] Error en UPDATE: { ... }
🔴 [ERROR] Código: 42501 (o similar)
🔴 [ERROR] Mensaje: permission denied / column does not exist / etc
```
**Causa:** Error específico de base de datos  
**Solución:** Según el código y mensaje del error

---

## 🔧 CÓMO USAR ESTE DEBUG:

### **Paso 1: Agregar los console.logs**
Editar `components/presupuestos-interactivos.tsx` con los logs mostrados arriba

### **Paso 2: Hacer build y probar**
```bash
npm run dev
```

### **Paso 3: Abrir DevTools Console**
- F12 o Click derecho → Inspeccionar
- Tab "Console"

### **Paso 4: Reproducir el problema**
1. Ir a https://spcvercel.vercel.app/dashboard/tareas/70
2. Scroll a sección "Presupuestos"
3. Click botón "Rechazar" del presupuesto final
4. Llenar observaciones (opcional)
5. Click "Confirmar rechazo"

### **Paso 5: Analizar logs**
Ver qué logs aparecen y cuáles NO aparecen  
Comparar con los escenarios de arriba

---

## 🎯 SIGUIENTE ACCIÓN RECOMENDADA:

Ejecutar **`DIAGNOSTICO-RECHAZAR-PRESUPUESTO.sql`** en Supabase para verificar:
1. Políticas RLS de la tabla
2. Si UPDATE manual funciona
3. Constraints o triggers problemáticos

**Si RLS está bloqueando:**
→ Crear/modificar política para permitir UPDATE a admins
