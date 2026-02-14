# Auditoría Forense: Factura Nueva (Phase 0)

**Fecha**: 2026-02-14
**Objetivo**: Diagnóstico de bloqueo en `/dashboard/facturas/nueva` y advertencias de sistema.
**Estado**: 🔴 BLOQUEO CRÍTICO / 🟠 ADVERTENCIAS ACTIVAS

## 1. Diagnóstico de Error de Lógica
**Síntoma**: "No se ha especificado un presupuesto final".
**Causa Raíz**:
En `app/dashboard/facturas/nueva/page.tsx` (líneas 23-36), existe un bloqueo explícito:
```typescript
const presupuestoFinalId = searchParams.presupuesto_final_id
if (!presupuestoFinalId) {
  return <CardError ... /> // Retorna error y detiene la ejecución
}
```
Esto impide abrir la página "Nueva Factura" desde el menú lateral (que no envía parámetros), haciéndola inaccesible salvo desde un botón específico de "Facturar Presupuesto".

**Solución (Cirugía Mínima)**:
- Eliminar el bloqueo en `page.tsx`.
- Si no hay ID, cargar `presupuesto: null` en el loader.
- Permitir que el formulario inicie en "modo selección" (vacío).

## 2. Descope Sync (Ghost Problem)
**Síntoma**: `descopeUser` undefined o latencia en autenticación.
**Análisis**:
- El problema original provenía de componentes de cliente (`useUser` hook) que renderizaban antes de que el SDK de Descope inicializara la sesión local.
- **Estado Actual**: Con la refactorización a **Server Component** (Protocolo V82.3), este problema está **RESUELTO** estructuralmente.
- `validateSessionAndGetUser()` en `page.tsx` fuerza la validación en el servidor antes de devolver HTML. El usuario nunca verá la página si la sesión no está lista y validada por Supabase (Bridge).

## 3. Advertencia `url.parse`
**Síntoma**: Logs de Vercel sucios con deprecation warnings.
**Origen Identificado**:
Aunque `analizar-gasto` fue corregido para usar `fetch`, el SDK de Cloudinary (`cloudinary`) sigue presente en:
- `app/api/upload-cloudinary/route.ts` (posible uso de `v2.uploader.upload_stream` o similar).
- `app/api/cloudinary/*` (endpoints de estadísticas y gestión).
El SDK de Cloudinary para Node.js utiliza internamente `url.parse`, disparando la advertencia en Node 20+.

**Recomendación**:
- Ignorar por ahora si no afecta funcionalidad funcional.
- Para eliminación total: Reemplazar todas las llamadas del SDK por llamadas HTTP directas a la API REST de Cloudinary (como se hizo en `analizar-gasto`), pero esto es una tarea de refactorización mayor.

## 4. Estrategia de Selector (Presupuestos Pendientes)
Para permitir crear facturas sin ID previo:

1.  **Loader Modificado (`loader.ts`)**:
    - Agregar fetch de `presupuestos_finales` con `id_estado = 4` (Aprobado) y que NO tengan factura asociada (o permitir duplicados según regla de negocio).
    - Retornar lista `presupuestosPendientes`.

2.  **UI Modificada (`FacturaNuevaForm.tsx`)**:
    - Agregar propiedad `presupuestosDisponibles`.
    - Si `presupuesto` es null (modo libre), mostrar un `<Select>` o `<Combobox>` que permita elegir uno de la lista.
    - Al seleccionar, rellenar los items automáticamente (puede requerir un `useEffect` o una Server Action pequeña para hidratar los items si son muchos).

## Plan de Acción (Protocolo V82.4)
1.  **Desbloquear `page.tsx`**: Permitir carga sin params.
2.  **Enriquecer `loader.ts`**: Traer presupuestos aprobados.
3.  **Actualizar Formulario**: Habilitar selección manual de presupuesto origen.

**Aprobado para ejecución.**
