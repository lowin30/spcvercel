---
name: SPC AI Integration Standards
description: Normas para la integración entre la IA (Chatbot) y la UI (React/Next.js).
---

# SPC AI Integration Skill

## 1. Principio de Unidad (AI = UI)
El Chatbot no es un ente separado; es una extensión de la interfaz.
- **Autonomía Proactiva:** Cada vez que se cree o refactorice un Wizard (Tareas, Gastos, Edificios), el agente DEBE actualizar automáticamente `lib/ai/tools.ts` y el `AiChatWidget` sin intervención del usuario. El código de la UI y las Tools de la IA deben ser un solo ente.

## 2. Interceptación de Tools (Wizard Mode)
Las "acciones mayores" (Crear, Editar, Clonar) NUNCA deben ejecutarse ciegamente por la IA.
- **Patrón**: La IA emite un tool call -> El Frontend lo intercepta -> Se abre el Wizard correspondiente UI pre-rellenado.
- **Tools**: `crear_tarea`, `editar_tarea`, `clonar_tarea` deben retornar estructuras de datos para la UI, no ejecutar mutations directas.

## 3. Contexto "Curado"
La IA no debe ver toda la base de datos.
- Usar `obtenerContextoUsuario` que filtra por Rol y Relevancia (vistas `v_ai_context_*`).

## 4. Integración Obligatoria (Hard-Fail)
Es una violación crítica del protocolo terminar un Wizard o Formulario sin haber actualizado `lib/ai/tools.ts` y el `AiChatWidget`. La capacidad de la IA para invocar la UI es la prioridad número uno.

## 5. Comunicación Human-Centric
- **Title-First Interface:** La IA nunca debe referirse a una tarea únicamente por su ID numérico en el chat. Siempre debe usar el Título (o Título + ID entre paréntesis) para proporcionar contexto al usuario.
- **Inferencia de Búsqueda:** Si el usuario menciona un título o parte de él, la IA debe buscar el ID correspondiente internamente pero responder usando el nombre humano de la tarea.
