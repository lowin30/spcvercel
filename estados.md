# logica de maquina de estados spc

este documento describe el catalogo de estados de tareas, presupuestos y facturas, detallando las interacciones automaticas y los cambios de coherencia aplicados en la base de datos y actions.

---

## 1. catalogo de estados

### 1.1 estados de tareas (`estados_tareas`)
*   **id 1 (organizar):** tarea recien creada o en planificacion.
*   **id 2 (preguntar):** consulta operativa o con el cliente.
*   **id 12 (base):** presupuesto base creado por el supervisor.
*   **id 3 (presupuestado):** tarea que ya cuenta con un presupuesto final creado.
*   **id 4 (enviado):** presupuesto final enviado al cliente/administracion.
*   **id 5 (aprobado):** presupuesto final aprobado por el cliente.
*   **id 6 (facturado):** factura(s) generadas para el presupuesto.
*   **id 7 (terminado):** trabajo de campo finalizado por el operario/supervisor.
*   **id 8 (reclamado):** reclamos o disputas pendientes.
*   **id 9 (liquidada):** tarea finalizada con la totalidad de sus facturas pagadas y liquidaciones internas de supervisor saldadas.
*   **id 10 (posible):** tarea potencial o pre-presupuesto.
*   **id 11 (vencido):** cerrada de forma automatica o sin respuesta del cliente.

### 1.2 estados de presupuestos finales (`estados_presupuestos`)
*   **id 1 (borrador):** pf en edicion.
*   **id 2 (enviado):** pf enviado formalmente.
*   **id 3 (aceptado):** pf aceptado y listo para facturacion.
*   **id 4 (facturado):** pf que ya genero facturas.
*   **id 5 (rechazado):** pf descartado o rechazado.

### 1.3 estados de facturas (`estados_facturas`)
*   **id 1 (borrador):** factura en preparacion.
*   **id 2 (no_pagado):** factura activa con saldo pendiente completo.
*   **id 3 (parcialmente):** factura con cobros parciales registrados.
*   **id 4 (vencido):** factura que supero su fecha de vencimiento sin pago.
*   **id 5 (pagado):** factura con saldo pendiente igual a cero.
*   **id 6 (anulado):** factura anulada contablemente.
*   **id 7 (enviado):** factura enviada al cliente.

---

## 2. comportamiento reactivo (triggers y pg_cron)

### 2.1 sincronizacion automatica de cobros y facturas (nuevo)
*   **trigger:** `trg_facturas_sincronizar_pagada` (before insert or update en `facturas`).
*   **funcion:** `fn_facturas_sincronizar_pagada()`.
*   **comportamiento:** si el `saldo_pendiente` de la factura es menor o igual a 0.01 y no es un borrador (id 1) ni anulada (id 6), establece `pagada = true` y completa `fecha_pago` y `fecha_ultimo_pago` con la fecha actual de forma automatica. si vuelve a tener saldo, limpia ambas fechas y pone `pagada = false`.
*   **resultado:** al actualizarse `pagada = true`, se activa el trigger `trigger_factura_pagada` que valida si todas las facturas del pf estan saldadas, liquidando la tarea (`id_estado_nuevo = 9` y `finalizada = true`) de manera atómica.

### 2.2 sincronizacion automatica de columna finalizada en tareas
*   **trigger:** `trg_tareas_sincronizar_finalizada` (before insert or update en `tareas`).
*   **funcion:** `fn_tareas_sincronizar_finalizada()`.
*   **comportamiento:** cuando la tarea cambia a estados de cierre (`7 terminada`, `9 liquidada`, `11 vencido`), establece `finalizada = true` de manera automatica si no posee un presupuesto base pendiente de liquidar. si tiene un pb sin liquidar (`base_liquidada = false`), la columna `finalizada` se mantiene en `false` para que la tarea continue activa. si vuelve a un estado activo, se restablece `finalizada = false`.

### 2.3 auto-finalizacion diaria de tareas inactivas (pg_cron)
*   **proceso:** job name `auto-pf-finalizar-sin-actividad` (corre a las 03:15 de cada dia).
*   **funcion:** `public.auto_finalizar_tareas_por_pf_enviado_sin_actividad()`.
*   **comportamiento:** busca tareas en estado `3 presupuestado` o `4 enviado` con presupuestos finales inactivos por mas de 30 dias (sin partes de trabajo, comentarios o gastos). las finaliza automaticamente (`finalizada = true` e `id_estado_nuevo = 11 vencido`), auto-rechaza sus pf no facturados y registra un comentario de sistema.

### 2.4 trigger al crear presupuesto base (nuevo)
*   **trigger:** `trg_pb_creado_actualizar_estado_tarea` (after insert en `presupuestos_base`).
*   **funcion:** `pb_creado_actualizar_estado_tarea()`.
*   **comportamiento:** al crearse un presupuesto base por el supervisor, si la tarea se encuentra en estado inicial (`1 organizar` o `2 preguntar`), cambia el estado de la tarea automaticamente a `12 presupuesto base` para notificar al administrador.

### 2.5 trigger al pagar liquidacion de supervisor (nuevo)
*   **trigger:** `trg_liquidacion_pagada_actualiza_pb_y_tarea` (after insert or update en `liquidaciones_nuevas`).
*   **funcion:** `fn_liquidacion_pagada_actualiza_pb_y_tarea()`.
*   **comportamiento:** cuando el pago al supervisor pasa a `pagada = true` (pago neto completado), actualiza la columna fisica `base_liquidada = true` en el presupuesto base y, si las facturas del cliente ya estan saldadas, finaliza la tarea pasandola a `9 liquidada` (`finalizada = true`).


---

## 3. registro de cambios aplicados (junio 2026)

1.  **correcion en `desaprobarPresupuesto`:**
    *   modificacion en `actions-factura.ts` para cambiar el estado del presupuesto final a `5` (rechazado) y `aprobado = false` en lugar de borrarlo o usar columnas inexistentes.
    *   se programo para que propague la desaprobacion a la tarea asociada, revirtiendola a `id_estado_nuevo = 3` (presupuestado) y `finalizada = false`.
2.  **arreglo de la funcion pg_cron de 30 dias:**
    *   se removieron de `auto_finalizar_tareas_por_pf_enviado_sin_actividad()` las referencias a la funcion inexistente `check_user_role` (reemplazada por `get_my_role()`), la columna inexistente `updated_at` en `partes_de_trabajo`, y la tabla inexistente `historial_estados`.
    *   se adecuo el trigger de control de roles `check_state_update_role` para no bloquear las ediciones automaticas del superusuario de base de datos `postgres`.
3.  **sincronizacion de cobros via trigger:**
    *   se creo el trigger `trg_facturas_sincronizar_pagada` para automatizar la columna `pagada` y los campos de fecha en `facturas` segun su saldo.
4.  **backfill de coherencia historica:**
    *   se realizo un script de regularizacion de datos en supabase para marcar todas las facturas cobradas como `pagada = true` con sus correspondientes fechas, y liquidar retrospectivamente las tareas que ya tenian todas sus facturas saldadas.
5.  **flujo dual de liquidacion (caso 1):**
    *   se inserto el nuevo estado `12` ("Presupuesto Base") en la tabla `estados_tareas`.
    *   se agrego la columna fisica `base_liquidada` a `presupuestos_base` y se incorporo en las vistas `vista_presupuestos_base_completa`, `vista_pb_supervisor` y `vista_pb_admin`.
    *   se modifico `sync_factura_pagada()` para no finalizar tareas si el supervisor tiene un presupuesto base pendiente de liquidar.
6.  **elegibilidad en alta de liquidaciones:**
    *   se modifico el loader de `/dashboard/liquidaciones/nueva` para que permita traer presupuestos base de tareas terminadas o finalizadas (cambiando el filtro restrictivo de `finalizada = true` por un OR de `finalizada = true` o `se_trabajo = true`).
    *   esto destraba las liquidaciones internas a supervisores cuando el trabajo ya fue completado de manera fisica (`se_trabajo = true`), incluso si la tarea aun no esta administrativamente finalizada.
7.  **reordenamiento de estados de tareas:**
    *   se modifico la columna `orden` en la tabla `estados_tareas` mediante una transaccion sql para reubicar "Presupuesto Base" (id 12) en el puesto 3 (antes de "Presupuestado"), desplazando los siguientes estados una posicion hacia adelante de forma automatica.
    *   se actualizo el array `ESTADOS_FALLBACK` en `lib/estados-service.ts` para reflejar con exactitud este cambio en el orden de presentacion visual.

