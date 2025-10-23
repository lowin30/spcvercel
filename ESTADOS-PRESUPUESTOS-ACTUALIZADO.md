# 📊 DATOS DE ESTADOS PRESUPUESTOS - Actualización

**Fecha:** 21 de Octubre, 2025  
**Fuente:** Usuario proporcionó datos de `estados_presupuestos`

---

## 🔍 **ESTADOS DISPONIBLES:**

| ID | Código | Nombre | Descripción | Color |
|----|--------|--------|-------------|-------|
| 1 | borrador | Borrador | Presupuesto en fase de creación | gray |
| 2 | enviado | Enviado | Presupuesto enviado al cliente | blue |
| 3 | aceptado | Aceptado | Presupuesto aceptado por el cliente | green |
| 4 | facturado | Facturado | Presupuesto facturado | orange |
| 5 | rechazado | Rechazado | Presupuesto rechazado por el cliente | red |

---

## 🎯 **IMPLICACIONES PARA EL FILTRO:**

### **Estado "Aceptado" (ID 3):**
- **Equivale a `aprobado = true`** en el código
- **Filtro correcto:** `id_estado = 3` o `aprobado = true`
- **Para liquidaciones:** Solo mostrar tareas con `id_estado = 3`

### **Estado "Rechazado" (ID 5):**
- **Equivale a `rechazado = true`** en el código
- **Actualización en rechazo:** Cambiar `id_estado` a 5
- **No mostrar en liquidaciones:** Excluir `id_estado = 5`

---

## 🔧 **ACTUALIZACIÓN DE SUGERENCIAS:**

### **Query Corregida:**
```sql
-- Filtro para liquidaciones: solo aceptados
SELECT 
  pf.id,
  pf.code,
  pf.total,
  pf.total_base,
  pf.aprobado,
  pf.id_estado,
  t.titulo,
  pb.total as total_base,
  ep.nombre as estado_presupuesto
FROM presupuestos_finales pf
LEFT JOIN tareas t ON pf.id_tarea = t.id
LEFT JOIN presupuestos_base pb ON pf.id_presupuesto_base = pb.id
LEFT JOIN estados_presupuestos ep ON pf.id_estado = ep.id
WHERE pf.id_liquidacion_supervisor IS NULL
  AND pf.id_estado = 3;  -- ← Estado "Aceptado"
```

**Equivalente:**
```sql
-- Usando el boolean (si está sincronizado)
WHERE pf.id_liquidacion_supervisor IS NULL
  AND pf.aprobado = true;
```

### **Actualización en Código React:**

**En `handleRechazarPresupuesto`:**
```typescript
// Obtener ID del estado "rechazado" (ID 5)
const { data: estadoData } = await supabase
  .from("estados_presupuestos")
  .select("id")
  .eq("codigo", "rechazado")  // ← Usar código exacto
  .single()

// Actualizar
.update({ 
  aprobado: false,
  rechazado: true,
  id_estado: 5,  // ← ID exacto de "Rechazado"
  // ...
})
```

---

## 📋 **RECOMENDACIONES ACTUALIZADAS:**

### **1. Filtro Principal ⭐⭐⭐⭐⭐**
- Usar `id_estado = 3` para mostrar solo "Aceptado"
- Excluir "Rechazado" (ID 5) y otros estados
- Sincronizar `aprobado` boolean con `id_estado`

### **2. UI con Estados Correctos ⭐⭐⭐⭐**
- Badge verde para "Aceptado" (ID 3)
- Badge rojo para "Rechazado" (ID 5)
- Badge azul para "Enviado" (ID 2), etc.

### **3. Validación de Consistencia ⭐⭐⭐**
- Verificar que `aprobado = true` ↔ `id_estado = 3`
- Verificar que `rechazado = true` ↔ `id_estado = 5`
- Agregar migración si hay inconsistencias

---

## 🎯 **PRÓXIMOS PASOS:**

1. **Actualizar query** para usar `id_estado = 3`
2. **Modificar código de rechazo** para usar ID 5
3. **Agregar badges** basados en `ep.nombre`
4. **Probar filtro** con datos reales

---

**¿Quieres que actualice el código con estos IDs?** 🔧

**Ejecuta el SQL de análisis para confirmar los estados.**
