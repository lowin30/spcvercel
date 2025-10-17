# 🔬 ANÁLISIS EXHAUSTIVO: Flujo Completo de Ajustes

**Fecha:** 16 de Octubre, 2025  
**Objetivo:** Entender el flujo completo de ajustes según documentación existente

---

## 📋 REQUERIMIENTO DEL USUARIO:

> "Dentro de /dashboard/facturas deberían aparecer los ajustes más allá de que estén pagadas o no estén pagadas. Una vez que la factura está totalmente pagada deberían aparecer en /dashboard/ajustes para liquidar."

---

## 🔍 ESTADO ACTUAL DEL SISTEMA:

### **1. VISTA EN BASE DE DATOS: `vista_facturas_completa`**

✅ **BIEN DISEÑADA** - Tiene **4 columnas de ajustes**:

```sql
-- 1️⃣ CALCULADOS (aprobado=false, pagado=false)
total_ajustes_calculados

-- 2️⃣ PENDIENTES LIQUIDACIÓN (aprobado=true, pagado=false) ⭐
total_ajustes_pendientes

-- 3️⃣ LIQUIDADOS (pagado=true)
total_ajustes_liquidados

-- 4️⃣ TODOS (cualquier estado)
total_ajustes_todos
```

---

### **2. TRIGGER: `trigger_auto_aprobar_ajustes`**

✅ **ACTIVO Y FUNCIONANDO**

- Si factura pagada (id_estado_nuevo = 5)
- Al insertar ajustes → `aprobado = true` automáticamente
- Aparecen en `total_ajustes_pendientes`
- Listos para liquidar

---

### **3. PÁGINA: `/dashboard/facturas` (Listado)**

#### **Columnas actuales:**

| Columna | Campo | Estado |
|---------|-------|--------|
| Factura | code | ✅ OK |
| AFIP | datos_afip | ✅ OK |
| Estado | estado_nombre | ✅ OK |
| Total | total | ✅ OK |
| Saldo | saldo_pendiente | ✅ OK |
| **Ajuste** | **total_ajustes** | ⚠️ **PROBLEMA** |

#### **🚨 PROBLEMA:**

**Archivo:** `components/invoice-list.tsx` (línea 249)

```typescript
// MUESTRA solo total_ajustes (pendientes liquidación)
const totalAjustes = invoice.total_ajustes || 0;
```

**❌ NO MUESTRA:**
- `total_ajustes_calculados` (aprobado=false)
- `total_ajustes_todos` (TODOS los ajustes)

**RESULTADO:**
- Factura NO pagada → genera ajustes → aprobado=false
- Columna muestra: $0
- Usuario NO sabe que existen ajustes

---

### **4. PÁGINA: `/dashboard/facturas/[id]` (Detalles)**

#### **Secciones actuales:**

1. ✅ Header con información
2. ✅ Card de resumen
3. ✅ Card de datos AFIP
4. ✅ Card de items
5. ✅ Card de gastos relacionados

#### **🚨 PROBLEMA:**

**❌ NO EXISTE sección de ajustes**

No se muestra:
- Si tiene ajustes generados
- Monto de ajustes
- Botón para generar ajustes
- Estado de aprobación
- Opción para gestionar

**RESULTADO:**
- No hay punto de entrada para generar ajustes
- No hay visibilidad de ajustes existentes

---

### **5. PÁGINA: `/dashboard/ajustes`**

✅ **FUNCIONA CORRECTAMENTE**

**Tabs disponibles:**

| Tab | Muestra |
|-----|---------|
| 🟠 Pendientes | aprobado=true, pagado=false |
| ✅ Liquidadas | pagado=true |
| 🟡 Calculados | aprobado=false |
| 📋 Todas | Cualquier ajuste |

---

## 🔄 FLUJOS ACTUALES:

### **ESCENARIO 1: Factura NO pagada**

```
1. Crear factura → $100,000
2. NO pagar aún
3. Generar ajustes → $10,000
4. Sistema: aprobado=false
5. /dashboard/facturas → Ajuste: $0 ❌
6. Usuario NO ve los ajustes
7. Debe ir a /dashboard/ajustes → "Calculados"
8. Aprobar manualmente
```

**Problemas:** Falta visibilidad, pasos confusos

---

### **ESCENARIO 2: Factura YA pagada**

```
1. Crear factura → $100,000
2. Pagar → $100,000
3. Generar ajustes → $10,000
4. Trigger: aprobado=true ✅
5. /dashboard/facturas → Ajuste: $10,000 ✅
6. /dashboard/ajustes → "Pendientes" ✅
7. Liquidar
```

**✅ Funciona bien** - Trigger hace su trabajo

---

## 🎯 PROBLEMAS IDENTIFICADOS:

### **1. Falta visibilidad en listado**

La columna "Ajuste" solo muestra pendientes (`total_ajustes`).

**Debería mostrar:** `total_ajustes_todos`

---

### **2. No hay punto de entrada**

No hay forma clara de generar ajustes desde:
- Lista de facturas
- Detalles de factura

---

### **3. Flujo confuso**

Usuario no sabe:
- Si la factura tiene ajustes
- En qué estado están
- Dónde generarlos

---

## 💡 SOLUCIÓN:

### **FASE 1: Mejorar columna "Ajuste" (20 min)**

**Cambiar en `invoice-list.tsx`:**

```typescript
// ANTES:
const totalAjustes = invoice.total_ajustes || 0;

// DESPUÉS:
const totalAjustes = invoice.total_ajustes_todos || 0;

// AGREGAR badge de estado:
{totalAjustes > 0 && (
  <Badge>
    {calculados > 0 ? "🟡 Calculados" : 
     pendientes > 0 ? "🟠 Pendientes" : 
     "✅ Liquidados"}
  </Badge>
)}
```

---

### **FASE 2: Agregar sección en detalles (45 min)**

**Crear:** `components/ajustes-factura-section.tsx`

**Mostrar:**
- Resumen: Calculados, Pendientes, Liquidados, Total
- Lista detallada de ajustes con estado
- Botón "Generar Ajustes" si no existen
- Link a Dashboard de Ajustes

**Integrar en:** `app/dashboard/facturas/[id]/page.tsx`

---

## 📊 RESULTADO FINAL:

### **EN `/dashboard/facturas`:**

✅ Columna muestra TODOS los ajustes  
✅ Badge indica estado  
✅ Visible siempre (pagada o no)

### **EN `/dashboard/facturas/[id]`:**

✅ Sección completa de ajustes  
✅ Resumen visual  
✅ Botón para generar  
✅ Link a liquidar

### **EN `/dashboard/ajustes`:**

✅ Ya funciona correctamente  
✅ Trigger ya instalado

---

## 🎯 CUMPLIMIENTO:

### **Req 1:** "Deberían aparecer los ajustes más allá de que estén pagadas o no"

✅ **SOLUCIÓN:** Mostrar `total_ajustes_todos` en columna

### **Req 2:** "Una vez pagada deberían aparecer en /dashboard/ajustes"

✅ **YA IMPLEMENTADO:** Trigger auto-aprueba cuando pagada

---

## ⏱️ IMPLEMENTACIÓN:

- **FASE 1:** 20 min (columna + badge)
- **FASE 2:** 45 min (sección completa)
- **TOTAL:** ~1 hora

---

## 🚀 RECOMENDACIÓN:

**IMPLEMENTAR AMBAS FASES**

**Prioridad:**
1. ⭐⭐⭐⭐⭐ FASE 1 (crítico)
2. ⭐⭐⭐⭐ FASE 2 (importante)

---

## ✅ CHECKLIST:

- [ ] Cambiar columna "Ajuste" a `total_ajustes_todos`
- [ ] Agregar badge de estado
- [ ] Crear `ajustes-factura-section.tsx`
- [ ] Integrar en página de detalles
- [ ] Probar con facturas pagadas y no pagadas
- [ ] Verificar trigger sigue funcionando
