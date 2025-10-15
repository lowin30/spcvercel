# ✅ AUTOMATIZACIÓN INTELIGENTE DE ESTADOS DE TAREAS

**Fecha:** 15 de Octubre, 2025
**Estado:** Implementado y Activo en Supabase

## 🎯 FLUJO AUTOMATIZADO COMPLETO

```
1. Crear Presupuesto Final (INSERT)
   └─→ Tarea: "Organizar" → "Presupuestado" ✅

2. Aprobar Presupuesto Final (UPDATE aprobado=true)
   └─→ Tarea: "Presupuestado" → "Aprobado" ✅

3. Enviar Presupuesto Final (UPDATE enviado=true)
   └─→ Tarea: "Aprobado" → "Enviado" 🆕

4. Crear Factura (INSERT)
   └─→ Tarea: "Enviado" → "Facturado" 🆕

5. Pagar TODAS las Facturas (UPDATE pagada=true)
   └─→ Tarea: "Facturado" → "Liquidada" 🔄
```

## 📊 ESTADOS DE TAREAS

| ID | Código | Nombre | Color | Orden |
|----|--------|--------|-------|-------|
| 1 | organizar | Organizar | gray | 1 |
| 2 | preguntar | Preguntar | blue | 2 |
| 3 | presupuestado | Presupuestado | purple | 3 |
| 4 | enviado | Enviado | indigo | 4 |
| 5 | aprobado | Aprobado | green | 5 |
| 6 | facturado | Facturado | orange | 6 |
| 7 | terminado | Terminado | green | 7 |
| 8 | reclamado | Reclamado | red | 8 |
| 9 | liquidada | Liquidada | purple | 9 |
| 10 | posible | Posible | yellow | 10 |

## 🔧 FUNCIONES Y TRIGGERS CREADOS

### Presupuestos Finales:
1. **`sync_presupuesto_final_creado()`**
   - Trigger: `trigger_presupuesto_final_creado` (INSERT)
   - Acción: Cambia tarea a "Presupuestado"

2. **`sync_presupuesto_final_aprobado()`**
   - Trigger: `trigger_presupuesto_final_aprobado` (UPDATE aprobado)
   - Acción: Cambia tarea a "Aprobado"

3. **`sync_presupuesto_final_enviado()`** 🆕
   - Trigger: `trigger_presupuesto_final_enviado` (UPDATE enviado)
   - Acción: Cambia tarea a "Enviado"

### Facturas:
1. **`sync_factura_creada()`** 🆕
   - Trigger: `trigger_factura_creada` (INSERT)
   - Acción: Cambia tarea a "Facturado"

2. **`sync_factura_pagada()`** 🔄 MODIFICADA
   - Trigger: `trigger_factura_pagada` (UPDATE pagada)
   - Acción: Cambia tarea a "Liquidada" (antes era "Facturado")
   - Validación: Verifica que TODAS las facturas del presupuesto estén pagadas

## 📝 CAMBIOS EN BASE DE DATOS

### Tabla `presupuestos_finales`:
- ✅ Campo `enviado` (BOOLEAN, default false)
- ✅ Campo `fecha_envio` (TIMESTAMPTZ, nullable)

## 🧪 CÓMO PROBAR

### PRUEBA 1: Estado "Enviado"
1. Ir a `/dashboard/tareas` y seleccionar una tarea en estado "Aprobado"
2. Ir a su presupuesto final (pestaña Presupuestos)
3. Hacer clic en el botón "Marcar como Enviado"
4. **Verificar:** La tarea debe cambiar automáticamente a estado "Enviado" (color indigo)

### PRUEBA 2: Estado "Facturado"
1. Ir a `/dashboard/presupuestos` y seleccionar un presupuesto en estado "Enviado"
2. Hacer clic en "Crear Factura"
3. Crear la factura
4. **Verificar:** La tarea debe cambiar automáticamente a estado "Facturado" (color naranja)

### PRUEBA 3: Estado "Liquidada"
1. Ir a `/dashboard/facturas` y seleccionar una factura NO pagada
2. Registrar un pago completo (o marcar como pagada)
3. **Verificar:** 
   - Si es la única factura del presupuesto → tarea cambia a "Liquidada"
   - Si hay más facturas sin pagar → tarea se mantiene en "Facturado"
   - Solo cuando TODAS las facturas están pagadas → "Liquidada"

## 📊 LOGS EN SUPABASE

Al ejecutar las acciones, verás logs en Supabase (Logs > Postgres Logs):

```
NOTICE: Tarea 123 actualizada a Enviado (id_estado: 4) por envío de Presupuesto Final 456
NOTICE: Tarea 123 actualizada a Facturado (id_estado: 6) por creación de Factura 789
NOTICE: Factura 789 pagada. Presupuesto Final 456: 1 de 1 facturas pagadas
NOTICE: Tarea 123 actualizada a Liquidada (id_estado: 9) - todas las facturas pagadas
```

## ⚠️ IMPORTANTE

- Los botones "Marcar como Enviado" YA existen en la UI
- No se requieren cambios en el frontend
- Los triggers funcionan automáticamente
- El sistema valida que TODAS las facturas estén pagadas antes de marcar como "Liquidada"

## 🔄 COMPATIBILIDAD

- ✅ No afecta funcionalidad existente
- ✅ Triggers se ejecutan solo cuando cambian los campos relevantes
- ✅ Sistema es compatible con cambios manuales en DB
- ✅ Logs detallados para debugging

## 📁 SCRIPT SQL

El script SQL completo está documentado en este archivo para referencia futura.
