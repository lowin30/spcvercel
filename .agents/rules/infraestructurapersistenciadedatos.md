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

3. visualizacion financiera (frontend):
- ceros decimales: prohibido mostrar decimales en el frontend. usar siempre Math.round() o .toLocaleString("es-AR", {maximumFractionDigits: 0}).
- moneda: el formato debe ser siempre pesos argentinos ($) con separador de miles.

4. protocolo pdf (spc-v2700):
- orientacion: siempre portrait (vertical) para lectura en whatsapp.
- transparencia: incluir detalle_gastos_json si existe.
- jerarquia: neto transferido debe ser el elemento visual mas potente (14pt+).