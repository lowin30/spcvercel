# Changelog

## [2025-07-16]

### Integración de Creación Automática de Facturas al Aprobar Presupuestos Finales

**Descripción Detallada:**

Se ha implementado una funcionalidad clave que permite la creación automática de facturas cuando un presupuesto final es aprobado, unificando el comportamiento en todas las páginas de la aplicación donde se pueden aprobar presupuestos finales.

**Cambios Clave Implementados:**

1. **Nuevo Componente `AprobadoCheckbox`:** 
   * Se creó un componente reutilizable en `app/dashboard/presupuestos-finales/[id]/aprobado-checkbox.tsx` para manejar la aprobación de presupuestos finales.
   * Incluye confirmación de usuario, indicador de carga y notificaciones toast.

2. **Función Servidora `convertirPresupuestoADosFacturas`:**
   * Implementada en `app/dashboard/presupuestos-finales/actions-factura.ts`.
   * Crea automáticamente dos facturas separadas cuando se aprueba un presupuesto final:
     - Una factura para ítems regulares (`es_material = false` o `null`).
     - Una factura para ítems de materiales (`es_material = true`).
   * Genera nombres descriptivos basados en el título de la tarea asociada.

3. **Integración en Múltiples Puntos de la Aplicación:**
   * Página de detalle del presupuesto final (`/presupuestos-finales/[id]`).
   * Página de edición del presupuesto final (`/presupuestos-finales/editar/[id]`).
   * Componente `PresupuestosInteractivos` utilizado en la página de tareas (`/tareas/[id]`).

4. **Comportamiento Unificado:**
   * Ahora, independientemente de dónde se apruebe un presupuesto final, siempre se crearán automáticamente dos facturas separadas.
   * Se muestra feedback adecuado al usuario mediante toast notifications.

**Beneficios:**

- Automatización del proceso de facturación tras la aprobación de presupuestos.
- Consistencia en la experiencia de usuario en toda la aplicación.
- Reducción de pasos manuales para los administradores.

## [2025-06-11]

### Refactorización Completa: Página de Detalle de Presupuestos Finales

**Descripción Detallada:**

Se ha llevado a cabo una refactorización integral del componente React ubicado en `app/dashboard/presupuestos-finales/[id]/page.tsx`. El objetivo principal era solucionar errores de sintaxis, lógica y estructura que impedían su correcto funcionamiento, así como mejorar la carga de datos, la presentación de la información y la integración de la funcionalidad de exportación a PDF.

**Cambios Clave Implementados:**

1.  **Reemplazo Total del Archivo:** Se sustituyó el contenido completo del archivo por una versión depurada y funcional, eliminando código obsoleto, comentarios innecesarios y estructuras parciales o incorrectas que resultaron de ediciones previas.
2.  **Carga de Datos Optimizada (`useEffect`):**
    *   Se consolidó la carga de datos del presupuesto final y sus ítems asociados en un único hook `useEffect`.
    *   Se incluyó explícitamente el campo `total` de la tabla `presupuestos_base` en la consulta principal para tener disponible el monto original del presupuesto base para comparaciones y cálculos.
    *   Se implementó una gestión robusta de la sesión del usuario y la verificación del rol ("admin") antes de proceder con la carga de datos sensibles, redirigiendo a `/login` o `/dashboard` según corresponda.
3.  **Formato de Moneda Consistente:**
    *   Se aplicó la función `formatCurrency` (de `lib/utils`) a todos los valores monetarios mostrados en la interfaz (materiales, mano de obra, total del presupuesto final, total del presupuesto base, ajuste, precios de ítems, subtotales de ítems y total general de ítems). Esto asegura una presentación uniforme y legible de las cifras.
4.  **Interfaz de Usuario (UI) Mejorada y Detallada:**
    *   **Sección de Detalles del Presupuesto:** Muestra el código del presupuesto, un enlace al presupuesto base asociado (con ícono `ExternalLink`), la tarea relacionada, el estado (Pendiente, Aprobado, Rechazado) con un badge coloreado, la fecha de creación y la fecha de aprobación (si existe).
    *   **Sección de Montos:** Presenta de forma clara los montos de materiales, mano de obra, el total del presupuesto final, el total del presupuesto base y el ajuste calculado entre ambos (con color distintivo si es positivo o negativo).
    *   **Tabla de Ítems del Presupuesto:** Si existen ítems, se muestran en una tabla con columnas para #, Descripción, Cantidad, Precio Unitario y Subtotal. Se incluye un pie de tabla con el total general.
    *   **Sección de Observaciones:** Muestra las `observaciones_admin` si están presentes.
5.  **Manejo de Estados de Carga y Error:**
    *   Se muestra un indicador de carga (`Loader2`) mientras se obtienen los datos.
    *   En caso de error durante la carga o si el presupuesto no se encuentra, se presenta un mensaje claro al usuario, junto con un botón para volver al listado de presupuestos.
6.  **Integración del Botón de Exportación a PDF (`ExportPresupuestoButton`):**
    *   El componente `ExportPresupuestoButton` se integra correctamente en la cabecera de la página.
    *   Se preparan y pasan los `datosParaPDF` necesarios (ID, código, fecha, referencia, cliente, ítems, total) al botón para que pueda generar el documento PDF.
7.  **Navegación y Acciones Adicionales:**
    *   Se mantiene un botón "Volver" para navegar al listado principal de presupuestos finales.
    *   Se incluye un botón "Crear Factura" que redirige a la página de creación de facturas, pre-poblando el ID del presupuesto final actual.

**Archivos Modificados:**

*   `app/dashboard/presupuestos-finales/[id]/page.tsx` (Reemplazo completo del contenido)

**Impacto:**

Esta refactorización mejora significativamente la funcionalidad, estabilidad y usabilidad de la página de detalle de presupuestos finales, permitiendo a los administradores visualizar la información completa y exportarla a PDF de manera eficiente.
