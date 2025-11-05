# Documentación de Liquidaciones y Ajustes

Fecha: 2025-11-05

## Alcance
Resumen actualizado y operativo de:
- Cálculo y estados de Ajustes en Facturas
- Flujo y cálculo de Liquidaciones
- Integraciones en UI/PDF y automatizaciones en DB

## Ajustes en Facturas
- Trigger `trigger_auto_aprobar_ajustes` (BEFORE INSERT) aprueba automáticamente ajustes NUEVOS cuando la factura está pagada (id_estado_nuevo = 5).
- Resultado: Ajustes aparecen inmediatamente en "Para Liquidar" sin paso manual.
- Retroactividad: No modifica ajustes existentes (migración manual cuando aplica).
- UI: En `components/invoice-list.tsx` y detalle de factura, se usa `total_ajustes_todos` para mostrar siempre todos los ajustes (Calculados, Pendientes, Liquidados).
- PDF: `lib/pdf-facturas-generator.ts` usa `total_ajustes_todos` (alineado con la UI).

### Estados de Ajustes (resumen)
- Calculados: generados pero aún no aprobados para liquidar.
- Pendientes: aprobados para liquidar (pagados en factura), aún sin liquidación.
- Liquidados: ya contabilizados en una liquidación.

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
