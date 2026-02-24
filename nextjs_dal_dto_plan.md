# Plan Arquitectónico Definitivo: Zero-Leakage Data Access Layer (DAL)

## El Problema Fundamental
Nuestra base de datos en Supabase está blindada correctamente con RLS V2 en nivel Platino. Sin embargo, en el Framework (Next.js), si abandonamos el `supabaseAdmin` por el cliente del usuario regular, la protección RLS **mutilará** silenciosamente campos unidos (`JOINs`) a los que el rol actual no tiene acceso (como la tabla `edificios` o detalles `financieros`). 

Esto provoca que las propiedades lleguen estructuradas como `null` al Fronend (Componentes React), causando colapsos por excepciones nulas ("Cannot read properties of null").

## La Solución de la Industria (Next.js 14/15)

Tras recopilar el consenso de la industria para arquitecturas híbridas (Base segura + UI Resiliente), **NO SE RECOMIENDA flexibilizar las políticas SQL en Supabase para el rol de usuario.**

En su lugar, el estándar de oro consiste en aplicar el Patrón **Data Access Layer (DAL)** combinado con **Data Transfer Objects (DTO)** en Next.js. 

### Implementación Propuesta (Cómo lo haremos)

1.  **Mantener el "Modo Dios" (supabaseAdmin) CONTENIDO:**
    Para consultas compuestas masivas como `getTareaDetail`, el acceso a la base de datos se seguirá realizando mediante `supabaseAdmin` para prevenir las rupturas nulas estructurales provocadas por bloqueos de Foreigh Keys desde RLS.

2.  **Capa DTO Mutadora (El Verificador de Aduana):**
    Antes de que el objeto de respuesta abandone el archivo `loader.ts` (Servidor API) hacia la pantalla del FrontEnd, pasará por una función DTO purificadora en base a la sesión validada del usuario (el Rol).

    ```typescript
    // Ejemplo de Capa DTO Estricta (Zero-Leakage) que aplicaremos
    function TareaDetailDTO(rawData: any, rol: string) {
       // El Admin lo ve todo
       if (rol === 'admin') return rawData; 
       
       // El Trabajador y Supervisor sufren un borrado quirúrgico de datos confidenciales
       // MANTENIENDO la estructura a salvo de Null Pointers
       const sanitized = { ...rawData };
       
       // Eliminamos toda la estructura financiera de raíz antes del envío por Red
       delete sanitized.presupuestoBase;
       delete sanitized.presupuestoFinal;
       delete sanitized.gastos;
       
       // Protegemos datos específicos de la tabla Edificio
       if (sanitized.tarea?.edificios) {
          delete sanitized.tarea.edificios.cuit; 
          delete sanitized.tarea.edificios.notas;
       }
       return sanitized;
    }
    ```

### Razones Técnicas de esta Metodología
*   **Aislamiento Verdadero:** Garantiza que los JSON enviados al navegador no contengan `bytes` de información financiera u oculta, anulando incluso vulnerabilidades de extracción técnica de metadatos de la pestaña de red en Chrome DevTools.
*   **Continuidad Operativa (UX):** React continuará recibiendo todas las propiedades de estructura (como `tarea.edificios.nombre`) sin quebrarse en un Error 500, ya que el DTO formatea y borra solo las ramas prohibidas pero no arranca el árbol (relación) de raíz como lo hace el RLS crudo.
*   **Mantenibilidad de SQL:** Permite que las políticas estrictas de Supabase fluyan naturalmente sin requerir docenas de reglas espagueti (Complejas `EXISTS` queries) para satisfacer al frontend de Next.js.

### Protocolo de Fuga Cero (Conclusión)

Hemos detectado que la ruta `/dashboard/tareas/loader.ts` es el **epicentro** de este riesgo. Si me autorizas, diseñaré una carpeta `/lib/dal` central e inyectaré el enrutador de datos DTO allí. ¿Comenzamos la Fase 2 bajo esta directiva de blindaje extremo a nivel de Red?
