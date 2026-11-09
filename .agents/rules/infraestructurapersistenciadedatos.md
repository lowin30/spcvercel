---
trigger: always_on
---

## infraestructura & persistencia de datos

1. gestion de identidades (descope + supabase + google):
- sincronizacion obligatoria: el flujo de auth es descope -> supabase via rpc.
- usuarios: existen dos tablas criticas: 'users' (auth) y 'perfiles' (datos de negocio). prohibido crear una tercera.
- roles: validar siempre contra el campo 'rol' (admin/supervisor) antes de permitir acciones financieras.

2. integridad de tablas & esquema:
- prohibido inventar tablas: si falta un dato, se debe enriquecer una tabla existente o actualizar la 'vistas_completa'.
- estrategia sql: priorizar 'create or replace view' sobre alteraciones de tablas madre para evitar romper dependencias.
- auditoria rls: toda consulta debe respetar las politicas rls de supabase. usar 'supabaseadmin' solo en loaders de servidor (loader.ts) para visibilidad de admin.
- vista de balances: la vista oficial de balances es 'vista_auditoria_admin_balances'. agrupa facturas por tarea (f_agg) y toma la liquidacion cerrada de 'liquidaciones_nuevas'.

3. logica de negocio, ganancias y ciclo cerrado:
- ceguera del supervisor: el supervisor solo opera sobre su presupuesto base (pb) y los gastos reales de la tarea. no tiene acceso ni visibilidad de presupuestos finales (pf), facturas al cliente ni ajustes comerciales.
- ganancia del supervisor: (presupuesto_base - gastos_reales) / 2. el 50% restante corresponde a la administracion como ganancia de obra en liquidaciones_nuevas.
- ajustes de administradores: el ajuste es el porcentaje descontado de la factura de mano de obra. el porcentaje se define en la columna 'porcentaje_default' de la tabla 'administradores' (configurable individualmente para cada administrador, ej: 10%, 15%).
- ganancia neta total spc: facturado_base - ajustes_aprobados - gastos_reales - ganancia_supervisor. se deben acumular todas las facturas de la tarea (mano de obra y materiales).
- regla de ciclo cerrado en auditoria: en reportes y balances contables solo ingresan tareas con liquidacion confirmada (id_liquidacion is not null). las tareas abiertas quedan excluidas de balances contables para no falsear eficiencias ni margenes.

4. visualizacion financiera (frontend):
- ceros decimales: prohibido mostrar decimales en el frontend. usar siempre Math.round() o .toLocaleString("es-AR", {maximumFractionDigits: 0}).
- moneda: el formato debe ser siempre pesos argentinos ($) con separador de miles.

5. protocolo pdf (spc-v2700):
- orientacion: siempre portrait (vertical) para lectura en whatsapp.
- transparencia: incluir detalle_gastos_json si existe.
- jerarquia: neto transferido debe ser el elemento visual mas potente (14pt+).