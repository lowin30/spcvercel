# 📊 LÓGICA DE ESTADOS DE PRESUPUESTOS

## 🎯 Jerarquía de Estados

```
Borrador → Pendiente → Aprobado → Enviado → Facturado → Pagado → Liquidado
                                      ↑           ↑
                                      |           |
                                 Sin factura  Con factura
```

## 🔄 Botón "Marcar como Enviado"

### **Lógica Implementada:**

Cuando el usuario hace click en el botón 📤 "Marcar como Enviado", el sistema:

1. **Verifica si existe una factura** vinculada al presupuesto:
   ```sql
   SELECT id FROM facturas WHERE id_presupuesto = {presupuesto_id}
   ```

2. **Asigna el estado correspondiente:**
   - ✅ **Si TIENE factura vinculada** → Estado "Facturado" (id: 4)
   - ✅ **Si NO tiene factura** → Estado "Enviado" (id: 2)

3. **Muestra mensaje apropiado:**
   - Con factura: _"Presupuesto marcado como facturado (tiene factura vinculada)"_
   - Sin factura: _"Presupuesto marcado como enviado exitosamente"_

---

## 📌 Casos de Uso

### **Caso 1: Presupuesto SIN factura**
```
Usuario: Click en "Marcar como Enviado"
Sistema: Verifica facturas → No encuentra ninguna
Resultado: Estado cambia a "Enviado" (id: 2)
Badge: 🔵 Enviado (azul)
```

### **Caso 2: Presupuesto CON factura**
```
Usuario: Click en "Marcar como Enviado"
Sistema: Verifica facturas → Encuentra al menos 1
Resultado: Estado cambia a "Facturado" (id: 4)
Badge: 🟠 Facturado (naranja)
```

---

## 🛡️ Validaciones

- ✅ Solo usuarios con rol **admin** o **supervisor** pueden ejecutar esta acción
- ✅ El botón NO aparece si el estado actual es:
  - `enviado`
  - `facturado`
  - `rechazado`

---

## 📁 Archivos Relacionados

- **Server Action:** `app/dashboard/presupuestos/actions-envio.ts`
- **Componente Lista:** `components/budget-list.tsx`
- **Página Detalle:** `app/dashboard/presupuestos/[id]/page.tsx`

---

## 🔧 Mantenimiento

Si necesitas cambiar los IDs de los estados, busca estas líneas en el archivo:

```typescript
// app/dashboard/presupuestos/actions-envio.ts
const nuevoEstadoId = tieneFactura ? 4 : 2  // 4=facturado, 2=enviado
```

**IDs actuales en estados_presupuestos:**
- 1 = Borrador
- 2 = Enviado ← Usado cuando NO hay factura
- 3 = Aceptado
- 4 = Facturado ← Usado cuando SÍ hay factura
- 5 = Rechazado

**Importante:** Asegúrate de que los IDs coincidan con tu tabla `estados_presupuestos`.
