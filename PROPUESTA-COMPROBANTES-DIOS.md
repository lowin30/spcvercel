# Propuesta Definitiva: Módulo de Comprobantes Platinum "Nivel Dios" v4.0

Esta es la resolución final que unifica el control total del Administrador con una experiencia móvil minimalista, didáctica y responsiva.

---

## 🔍 Auditoría Forense y Lógica de Negocio
- **Ventana de 3 Meses:** El sistema solo mostrará gastos creados en los últimos 90 días por defecto. Esto mantiene la aplicación veloz y libre de ruido.
- **Detección de Origen:** Diferenciamos visualmente los gastos reportados por **Trabajadores** vs **Supervisores**.

---

## 🛡️ El Súper Filtro Inteligente (El Corazón del Módulo)
Diseñado para ser operado con una sola mano en el móvil.

*   **Barra de Búsqueda Predictiva:** Encuentra por Edificio, Tarea o Nombre del emisor (Supervisor/Trabajador).
*   **Filtros Rápidos (Pills):**
    *   **Imágenes:** [Con Comprobante | Sin Comprobante].
    *   **Rol Emisor:** [Solo Supervisores | Solo Trabajadores].
    *   **Importancia:** [Gastos Mayores a $X].
*   **Filtro Didáctico:** Etiquetas claras que explican el estado del gasto (ej: "Pendiente de Foto", "Validado por IA").

---

## 🎨 Diseño Minimalista y Responsivo (Nivel Dios)
*   **Vista de Tarjetas "Wallet":** En lugar de tablas, usamos tarjetas con diseño `Glassmorphism`.
    *   **Cabecera:** Monto en grande y nombre del Edificio.
    *   **Cuerpo:** Quién reportó el gasto y qué tarea es.
    *   **Pie:** Indicador visual (Verde si tiene foto, Rojo parpadeante si falta).
*   **Modo Enfoque (Focus Mode):** Al tocar una tarjeta, se expande para mostrar el comprobante a pantalla completa con gestos de zoom (pinch-to-zoom) nativos del móvil.
*   **KPIs de Cabecera Dinámicos:**
    *   **"Monto en Riesgo":** Total acumulado de lo que falta documentar en el periodo filtrado.
    *   **"Eficiencia de Reporte":** % de gastos que sí tienen foto.

---

## ⚡ Interacción y Descarte (Didáctico)
1.  **Navegación Fluida:** Cada gasto tiene un link directo a su tarea para cuando necesites "entender el porqué" de ese gasto.
2.  **Identificación de Supervisores:** Iconografía especial para gastos de supervisores, permitiendo auditar sus rendiciones de cuentas de forma aislada.
3.  **Feedback Visual:** Si un filtro no devuelve resultados, el sistema te sugiere amistosamente: *"No hay gastos pendientes de foto en este edificio. ¡Todo en orden!"*.

---

### Especificación Técnica de Implementación:
- **Ruta:** `/app/dashboard/comprobantes/page.tsx`
- **Data Source:** `vista_gastos_tarea_completa` (ya cuenta con todos los campos necesarios).
- **Seguridad:** Bloqueo estricto por Middleware y Server Component para que solo el rol `admin` pueda entrar. No se "huele" nada desde otros roles.

**Auditado y Diseñado por:** Antigravity AI Forensic.
