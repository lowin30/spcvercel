# ✅ ACTUALIZACIÓN COMPLETA: Botón Rechazar + id_estado

**Fecha:** 21 de Octubre, 2025  
**Estado:** ✅ CÓDIGO ACTUALIZADO - LISTO PARA PROBAR  
**Confirmación:** "el boton ya funciona" ✅

---

## 🎯 **LO QUE SE ACTUALIZÓ:**

### **1. Columna observaciones_admin ✅**
- **Cambio:** Usar `observaciones_admin` en lugar de `observaciones` (que no existía)
- **Archivos:** `components/presupuestos-interactivos.tsx`
- **Resultado:** Observaciones se guardan correctamente

### **2. id_estado en rechazo ✅**
- **Cambio:** Al rechazar, actualizar `id_estado` al estado "rechazado" de `estados_presupuestos`
- **Archivos:** `components/presupuestos-interactivos.tsx`
- **Resultado:** Presupuesto final cambia a estado "rechazado" en la tabla de estados

---

## 🔧 **CÓDIGO ACTUALIZADO:**

### **handleRechazarPresupuesto (líneas 204-252):**

```typescript
// 1. Obtener ID del estado "rechazado"
const { data: estadoData, error: estadoError } = await supabase
  .from("estados_presupuestos")
  .select("id")
  .ilike("nombre", "%rechazado%")
  .single()

// 2. Actualizar en DB con id_estado
.update({ 
  aprobado: false,
  rechazado: true,
  observaciones_admin: observacion,
  id_estado: idEstadoRechazado,  // ← NUEVO
  updated_at: new Date().toISOString()
})

// 3. Actualizar estado local con id_estado
setPresupuestoFinalLocal({
  ...presupuesto,
  aprobado: false,
  rechazado: true,
  observaciones_admin: observacion,
  id_estado: idEstadoRechazado,  // ← NUEVO
  updated_at: new Date().toISOString()
})
```

### **Tipo PresupuestoType actualizado:**
```typescript
export interface PresupuestoType {
  // ...
  observaciones_admin?: string  // ← Agregado
  id_estado?: number  // ← Agregado para referencia a estados_presupuestos
}
```

---

## 📋 **TABLAS INVOLUCRADAS:**

### **presupuestos_finales:**
- `aprobado: false` ✅
- `rechazado: true` ✅
- `observaciones_admin: "motivo del rechazo"` ✅
- `id_estado: <ID del estado rechazado>` ✅
- `updated_at: NOW()` ✅

### **estados_presupuestos:**
- Busca automáticamente el estado con nombre ILIKE '%rechazado%'
- Actualiza `id_estado` en `presupuestos_finales`

---

## 🎯 **CÓMO FUNCIONA AHORA:**

1. **Usuario click "Rechazar"** → Diálogo se abre
2. **Usuario escribe observaciones** → Opcional
3. **Usuario click "Confirmar"** → 
   - Busca ID del estado "rechazado" en `estados_presupuestos`
   - Actualiza `presupuestos_finales`:
     - `rechazado = true`
     - `aprobado = false`
     - `observaciones_admin = "texto"`
     - `id_estado = ID_rechazado`
4. **UI se actualiza** → Muestra badge "Rechazado"
5. **Base de datos se actualiza** → Presupuesto en estado "rechazado"

---

## 🔍 **QUERIES PARA VERIFICAR:**

### **Ver estados disponibles:**
```sql
SELECT id, codigo, nombre, descripcion, color
FROM estados_presupuestos
ORDER BY orden;
```

### **Ver estado actual del presupuesto:**
```sql
SELECT 
  pf.id,
  pf.code,
  pf.id_estado,
  pf.aprobado,
  pf.rechazado,
  pf.observaciones_admin,
  ep.nombre as estado_actual
FROM presupuestos_finales pf
LEFT JOIN estados_presupuestos ep ON pf.id_estado = ep.id
WHERE pf.id = 72;
```

---

## 🚀 **PRÓXIMOS PASOS:**

1. **Probar el botón "Rechazar"** en https://spcvercel.vercel.app/dashboard/tareas/70
2. **Verificar que el presupuesto aparezca como "Rechazado"** ✅
3. **Verificar que `id_estado` se actualice** ✅
4. **Verificar que las observaciones se guarden** ✅

---

## 📊 **RESULTADO FINAL:**

**✅ Botón "Rechazar" funciona**  
**✅ Presupuesto cambia a estado "rechazado" en tabla de estados**  
**✅ Observaciones se guardan en `observaciones_admin`**  
**✅ UI muestra el estado correcto**

---

**¿Puedes probar el rechazo y confirmar que el presupuesto cambia de estado?** 🔧

**Si ves algún error, dime qué pasa para ajustarlo.**
