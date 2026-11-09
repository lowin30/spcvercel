# Documentación de Liquidaciones y Ajustes

Fecha: 2025-11-05

## Alcance
Resumen actualizado y operativo de:
- Cálculo y estados de Ajustes en Facturas
- Flujo y cálculo de Liquidaciones
- Integraciones en UI/PDF y automatizaciones en DB

## Ajustes en Facturas
- configuracion por administrador: el ajuste es el porcentaje descontado de la factura que corresponde a mano de obra. el porcentaje depende de la configuracion de la tabla `administradores`, en su columna `porcentaje_default`. es configurable de manera particular para cada administrador (por ejemplo 10%, 15%, etc.).
- aplicacion sobre mano de obra: cuando una tarea tiene dos facturas (mano de obra y materiales), el ajuste se aplica y retiene habitualmente sobre la factura de mano de obra.
- Trigger `trigger_auto_aprobar_ajustes` (BEFORE INSERT) aprueba automáticamente ajustes NUEVOS cuando la factura está pagada (id_estado_nuevo = 5).
- Resultado: Ajustes aparecen inmediatamente en "Para Liquidar" sin paso manual.
- Retroactividad: No modifica ajustes existentes (migración manual cuando aplica).
- UI: En `components/invoice-list.tsx` y detalle de factura, se usa `total_ajustes_todos` para mostrar siempre todos los ajustes (Calculados, Pendientes, Liquidados).
- PDF: `lib/pdf-facturas-generator.ts` usa `total_ajustes_todos` (alineado con la UI).

### Estados de Ajustes (resumen)
- Calculados: generados pero aún no aprobados para liquidar.
- Pendientes: aprobados para liquidar (pagados en factura), aún sin liquidación.
- Liquidados: ya contabilizados en una liquidación.

## Liquidaciones y Reparto de Ganancias

### Ceguera Comercial del Supervisor
- el supervisor **no tiene visibilidad ("no huele")** sobre los presupuestos finales (pf), facturas al cliente ni ajustes comerciales.
- su calculo economico se basa estricta y unicamente en su presupuesto base (`presupuestos_base.total` / `liquidaciones_nuevas.total_base`) y los gastos reales incurridos en la obra.

### Formula de Ganancia del Supervisor
- el supervisor solo gana sobre la diferencia entre su presupuesto base y los gastos totales reales de la tarea:
  $$\text{ganancia disponible} = \text{presupuesto base} - \text{gastos reales}$$
- lo que queda se divide en 2: 50% para el supervisor y 50% para la administracion de obra de spc:
  $$\text{ganancia supervisor} = \frac{\text{presupuesto base} - \text{gastos reales}}{2}$$
  $$\text{ganancia admin obra} = \frac{\text{presupuesto base} - \text{gastos reales}}{2}$$
- estos valores ya existen persistidos en la tabla `liquidaciones_nuevas` en las columnas `total_base`, `gastos_reales`, `ganancia_supervisor` y `ganancia_admin`.

### Formula de Ganancia Neta Total de SPC
- es la ganancia real y neta consolidada que le queda a spc por la totalidad de la obra:
  $$\text{ganancia neta spc} = \text{facturado total} - \text{ajustes retenidos} - \text{gastos reales} - \text{ganancia supervisor}$$
- donde:
  - `facturado total`: suma de todas las facturas asociadas a la tarea (mano de obra + materiales).
  - `ajustes retenidos`: suma de los ajustes aprobados (`ajustes_facturas.monto_ajuste`) calculados segun `administradores.porcentaje_default`.
  - `gastos reales`: costos directos de la tarea (`liquidaciones_nuevas.gastos_reales`).
  - `ganancia supervisor`: honorarios liquidados al supervisor (`liquidaciones_nuevas.ganancia_supervisor`).
- estos calculos se encuentran consolidados a nivel de base de datos en la vista `vista_auditoria_admin_balances`.

### Regla de Auditoria: Ciclo Cerrado Estricto
- en los balances contables, reportes de rentabilidad y modulos de auditoria solo se consideran tareas con **ciclo cerrado completo** (`id_liquidacion IS NOT NULL`).
- las tareas abiertas (en ejecucion, sin liquidacion o con pagos provisionales) no entran a los balances contables para evitar distorsiones en eficiencia de presupuesto base y margenes proyectados irreales antes de cerrar costos.
- los comprobantes cargados en tareas abiertas se registran como `gastos_pendientes` unicamente a modo de alerta operativa para supervisores.

## Liquidaciones
- Requisitos: Todas las facturas de la tarea deben estar pagadas (validación en `validarGenerarLiquidacion(idTarea)`).
- Automatización de estado: Inserción en `liquidaciones_nuevas` mueve tarea a "Liquidada".
- Redondeos: Montos convertidos a enteros en `app/dashboard/liquidaciones/nueva/page.tsx` para evitar `22P02`.

### Desglose de Gastos (Base del cálculo)
Función: `obtener_desglose_gastos_para_liquidacion(p_id_tarea INTEGER)`
- Categorías:
  - materiales: `gastos_tarea` con `estado='aprobado'`
  - jornales: `partes_de_trabajo` × `configuracion_trabajadores.salario_diario` con jornada (1.0 / 0.5)
- Retorna: `categoria, cantidad_registros, monto_total, detalle JSONB`
- Validado contra `calcular_gastos_reales_de_tarea()` → valores consistentes.

### Fórmula General (referencial)
- Ingresos brutos: suma de facturas pagadas de la tarea.
- Costos reales: `materiales + jornales` (desde función de desglose).
- Ganancia base: `ingresos_brutos - costos_reales`.
- Distribución: según reglas de administración/supervisión vigentes del proyecto.
- Consideraciones:
  - Si supervisor propietario (super1) activado por feature flag: sin sobrecostos, ganancia consolidada en administración, sin pago a supervisor (plan futuro gradual).

## Integración en UI/PDF
- Facturas: `total_ajustes_todos` en lista y detalle de factura. Badges por estado.
- PDF Facturas: usa el mismo total que la UI para consistencia.
- Liquidaciones: formulario y cálculo en `/dashboard/liquidaciones/nueva` con redondeos enteros.

## Automatizaciones en Base de Datos (resumen)
- `trigger_auto_aprobar_ajustes`: auto-aprueba ajustes si factura está pagada.
- `sync_factura_pagada`: cuando todas las facturas están pagadas → Tarea a "Facturado".
- `sync_liquidacion_creada`: al crear liquidación → Tarea a "Liquidada".

## Buenas Prácticas Operativas
- Generar ajustes después de pagar factura → quedan auto-aprobados para liquidar.
- Si se generaron antes del pago → aprobar manualmente tras el pago (no retroactivo).
- Verificar en UI/PDF que los ajustes coincidan (`total_ajustes_todos`).
- Al crear liquidación, revisar desglose (materiales/jornales) y confirmar redondeos.

## Archivos/Funciones Clave
- Trigger: `trigger_auto_aprobar_ajustes` (SQL)
- Función: `obtener_desglose_gastos_para_liquidacion(p_id_tarea)` (SQL)
- Validación TS: `validarGenerarLiquidacion(idTarea)`
- UI: `components/invoice-list.tsx`, `components/ajustes-factura-section.tsx`
- PDF: `lib/pdf-facturas-generator.ts`
- Página: `app/dashboard/liquidaciones/nueva/page.tsx`
