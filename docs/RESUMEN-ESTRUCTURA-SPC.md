# 📚 Resumen Estructura y Lógica SPC (actualizado 2025-07-01)

## Tablas Clave y Relaciones

- **tareas**: Punto de inicio, asociada a edificios y usuarios.
- **presupuestos_base**: Creados por supervisores, referencia a tarea, estado, supervisor.
- **presupuestos_finales**: Creados por admins, referencia a presupuesto base, incluye ajuste admin, estado, relación 1:1 con base.
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
3. **Admin genera factura desde presupuesto final**
4. **Admin registra liquidación final**
5. **Sistema calcula y distribuye ganancia neta**

## Consultas y Vistas Útiles

- Vistas: `vista_presupuestos_base_completa`, `vista_presupuestos_finales_completa`, `vista_liquidaciones_completa`, `reporte_financiero_por_edificio`, `reporte_financiero_por_mes`
- Funciones: `contar_tareas_por_estado`, `contar_presupuestos_por_estado`, `contar_facturas_por_estado`

## Notas para Desarrolladores Futuros

- Mantener actualizados los triggers y validaciones; revisar tras cada migración.
- Consultar `CONSULTAS-DEBUG-SPC.sql` para diagnósticos rápidos.
- Revisar y documentar cambios en las relaciones y flujos tras cada sprint.
- Verificar siempre la integridad de claves foráneas y estados antes de refactorizar lógica de negocio.

---

_Este archivo resume la lógica y estructura actual, minimizando la información a lo esencial para facilitar futuros arreglos y mantenimientos._
