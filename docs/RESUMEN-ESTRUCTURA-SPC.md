# 📚 Resumen Estructura y Lógica SPC (actualizado 2025-07-01)

## Tablas Clave y Relaciones

- **tareas**: Punto de inicio, asociada a edificios y usuarios.
- **presupuestos_base**: Creados por supervisores, referencia a tarea, estado, supervisor.
  - ⚠️ **CRÍTICO**: NO tienen items detallados, solo campos monetarios agregados
- **presupuestos_finales**: Creados por admins, referencia a presupuesto base, incluye ajuste admin, estado, relación 1:1 con base.
- **items**: ÚNICA tabla para items detallados de presupuestos finales (FK → presupuestos_finales.id)
- **facturas**: Asociadas a presupuestos finales, pueden tener estado y PDF generado.
- **liquidaciones_nuevas**: Liquidación final, referencia a tarea, presupuesto base, presupuesto final y factura. Calcula ganancia neta, distribución supervisor/admin.

## Relaciones Principales

- Una tarea puede tener muchos presupuestos base.
- Un presupuesto base puede tener un único presupuesto final.
- Un presupuesto final puede tener una única liquidación.
- Una liquidación puede estar asociada a una factura.

## Validaciones Automáticas (Triggers y Funciones SQL)

- **Presupuesto final ≥ presupuesto base** (trigger: `validar_presupuesto_final`)
- **Gastos reales ≤ presupuesto base** (trigger: `validar_gastos_reales`)
- **Un presupuesto base solo puede tener un presupuesto final** (trigger: `validar_unico_presupuesto_final`)
- **Una liquidación solo puede existir por presupuesto final** (trigger: `validar_unica_liquidacion`)
- **Cálculo automático de totales y ajustes** (trigger: `actualizar_presupuesto_final` y `actualizar_liquidacion`)
- **Generación automática de códigos PB-XXXX, PF-XXXX, LIQ-XXXX**

## Flujo Lógico (Resumido)

1. **Supervisor crea presupuesto base**
2. **Admin aprueba y crea presupuesto final**
3. **Admin agrega items detallados al presupuesto final** (tabla `items`)
4. **Admin genera factura desde presupuesto final**
5. **Admin registra liquidación final**
6. **Sistema calcula y distribuye ganancia neta**

## ⚠️ INFORMACIÓN CRÍTICA SOBRE ITEMS

### **Estructura de Items:**
- **Tabla ÚNICA**: `items` (NO existe `presupuestos_base_items` ni `presupuestos_finales_items`)
- **FK Protegida**: `items.id_presupuesto → presupuestos_finales.id` (CASCADE)
- **Campo Separador**: `es_material` (true/false) determina factura materiales vs regular

### **Presupuestos Base:**
- ❌ **NO tienen items detallados**
- ✅ Solo campos monetarios agregados: `materiales`, `mano_obra`, `total`
- ✅ Sirven como límite superior para validaciones

### **Presupuestos Finales:**
- ✅ **SÍ tienen items detallados** en tabla `items`
- ✅ Items se agregan manualmente al crear presupuesto final
- ✅ FK previene mezcla de items entre presupuestos diferentes
- ✅ Campo `es_material` separa items en dos facturas

### **Prevención de Bugs:**
```sql
-- Esta FK IMPIDE que items de diferentes presupuestos se mezclen:
CONSTRAINT items_id_presupuesto_final_fkey
  FOREIGN KEY (id_presupuesto) REFERENCES presupuestos_finales(id)
  ON DELETE CASCADE
```

## Notas para Desarrolladores Futuros

- Mantener actualizados los triggers y validaciones; revisar tras cada migración.
- Consultar `CONSULTAS-DEBUG-SPC.sql` para diagnósticos rápidos.
- Revisar y documentar cambios en las relaciones y flujos tras cada sprint.
- Verificar siempre la integridad de claves foráneas y estados antes de refactorizar lógica de negocio.

---

_Este archivo resume la lógica y estructura actual, minimizando la información a lo esencial para facilitar futuros arreglos y mantenimientos._
