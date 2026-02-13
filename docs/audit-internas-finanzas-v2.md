# Audit Internas Finanzas v2.1

## Resumen Ejecutivo
Auditoría de rutas de edición y detalle en módulos de finanzas (`presupuestos`, `presupuestos-finales`, `facturas`) para verificar cumplimiento con Protocolo v2.1 (Minimal Bridge).

## Estado General
- ✅ **Facturas (Editar/Detalle)**: Implementan Server Components y Server Actions (parcialmente).
- ❌ **Facturas (Nueva)**: Client Component con lógica de negocio y queries expuestas en cliente.
- ❌ **Presupuestos (Detalle)**: Client Components con `useEffect`.
- ❌ **Presupuestos Base (Editar)**: Client Component con `useEffect`.

---

## 1. Análisis por Ruta

### 1.1 `app/dashboard/presupuestos/editar/[id]/page.tsx` (Presupuestos Base)
*Nota: Ruta analizada `app/dashboard/presupuestos-base/[id]/editar/page.tsx`*

- **Tipo**: Client Component (`"use client"`)
- **Carga Inicial**: 
  - 🔴 **FETCH CLIENTE**: Usa `useEffect` para llamar `supabase.from('presupuestos_base')`.
  - **Riesgo**: Lógica de permisos (supervisor vs admin) en cliente manipulable. Dependencia de conexión cliente.
- **Acciones Guardado**: Componente `PresupuestoBaseForm` (Pendiente de refactor a Server Action).
- **Compliance v2.1**: **BAJO**. Requiere migración a Server Component + Loader.

### 1.2 `app/dashboard/presupuestos-finales/editar/[id]/page.tsx`
- **Tipo**: Server Component 
- **Carga Inicial**: 
  - 🟢 **SERVER LOADER**: Usa `getPresupuestoFinalConItems(id)` desde `loader.ts`.
  - **Riesgo**: Si `getPresupuestoFinalConItems` falla, renderiza error genérico o 404. Manejo de errores básico.
- **Acciones Guardado**: Pasa data a `PresupuestoFinalForm`.
- **Compliance v2.1**: **ALTO**. Sigue patrón de arquitectura permanente.

### 1.3 `app/dashboard/facturas/editar/[id]/page.tsx`
- **Tipo**: Server Component
- **Carga Inicial**: 
  - 🟢 **INLINE SERVER FETCH**: Usa `createRobustServerClient` y queries directas en el componente.
  - **Nota**: Debería mover queries a `loader.ts` para reusabilidad (Protocolo v2.1), pero es seguro.
- **Acciones Guardado**: 
  - 🟢 **SERVER ACTION**: `onSave={saveInvoice}` importado de `./actions`.
- **Compliance v2.1**: **ALTO**.

### 1.4 `app/dashboard/presupuestos/[id]/page.tsx` (Detalle Unificado)
- **Tipo**: Client Component (`"use client"`)
- **Carga Inicial**: 
  - 🔴 **FETCH CLIENTE**: `useEffect` con lógica compleja para decidir si buscar en `presupuestos_finales` o `presupuestos_base`.
  - **Riesgo**: Renderizado condicional en cliente (Flash of loading). Expone lógica de negocio.
- **Compliance v2.1**: **BAJO**. Candidato a refactor a Server Component.

### 1.5 `app/dashboard/presupuestos-finales/[id]/page.tsx` (Detalle)
- **Tipo**: Client Component (`"use client"`)
- **Carga Inicial**: 
  - 🔴 **FETCH CLIENTE**: `useEffect` llamando a `vista_presupuestos_finales_completa`.
- **Compliance v2.1**: **BAJO**. Debería ser Server Component.

### 1.6 `app/dashboard/facturas/[id]/page.tsx` (Detalle)
- **Tipo**: Server Component
- **Carga Inicial**: 
  - 🟢 **INLINE SERVER FETCH**: Carga factura, items, extras en servidor.
- **Compliance v2.1**: **ALTO**.

### 1.7 `app/dashboard/facturas/nueva/page.tsx`
- **Tipo**: Client Component (`"use client"`)
- **Carga Inicial**: 
  - 🔴 **FETCH CLIENTE**: `useEffect` carga presupuesto, cliente, items, estados.
- **Acciones Guardado**: 
  - 🔴 **CLIENT INSERT**: `handleSubmit` hace `supabase.from('facturas').insert(...)`. Violación crítica de seguridad/arquitectura en v2.1 (lógica de negocio en cliente).
- **Compliance v2.1**: **CRÍTICO**. Requiere refactor urgente a Server Action.

---

## 2. Mapa de Riesgos

| Ruta | Riesgo Principal | Prioridad Refactor |
|------|------------------|--------------------|
| `facturas/nueva` | **ALTO**. Inserción directa desde cliente. Sin validación de servidor robusta. | 🔴 1 (Inmediata) |
| `presupuestos/[id]` | MEDIO. Lógica de selección base/final en cliente. Performance. | 🟡 2 |
| `presupuestos-finales/[id]` | MEDIO. Fetch cliente innecesario. | 🟡 2 |
| `presupuestos-base/editar` | MEDIO. Permisos en cliente. | 🟡 2 |
| `facturas/editar` | BAJO. Cumple arquitectura. | 🟢 3 |
| `presupuestos-finales/editar` | BAJO. Cumple arquitectura. | 🟢 3 |

## 3. Recomendaciones (Minimal Bridge)

1.  **Facturas Nueva**: Migrar `handleSubmit` a Server Action (`createFacturaAction`). Mover carga de datos iniciales a `loader.ts` o Server Component wrapper.
2.  **Detalles Presupuestos**: Convertir `page.tsx` a Server Components. Usar `loader` existente o crear nuevos.
3.  **Presupuestos Base Editar**: Migrar a Server Component + Loader. Refactorizar validación de permisos de supervisor al servidor.
