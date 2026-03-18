import { createServerClient } from '@supabase/ssr'
import { createOpenAI } from '@ai-sdk/openai'
import { streamText } from 'ai'
import { cookies } from 'next/headers'

// export const runtime = 'edge' // Comentado para usar Node.js runtime (más compatible)

const groq = createOpenAI({
    apiKey: process.env.GROQ_API_KEY!,
    baseURL: 'https://api.groq.com/openai/v1'
})

export async function POST(req: Request) {
    try {
        const cookieStore = await cookies()

        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    get(name: string) {
                        return cookieStore.get(name)?.value
                    }
                }
            }
        )

        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return new Response(JSON.stringify({ error: 'No autenticado' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' }
            })
        }

        // 🧠 CEREBRO: Cargar Vocabulario del Usuario
        const { data: vocab } = await supabase
            .from('user_vocabulary')
            .select('term, definition')
            .limit(100)

        const userDictionary = vocab?.map((v: any) => `- "${v.term}": ${v.definition}`).join('\n') || "Ninguno aún."

        // 🆕 NIVEL 2: Pre-load messages to search knowledge base
        const body = await req.json()
        const { messages: incomingMessages } = body
        console.log(`[CHAT-AUDIT] Body recibido:`, JSON.stringify(body).substring(0, 200) + "...")

        // 4. Determinar rol y permisos
        const userRole = user.user_metadata?.rol || 'trabajador'

        // 🆕 NIVEL 2: Buscar documentos relevantos de knowledge base
        const lastUserMessage = incomingMessages[incomingMessages.length - 1]?.content || ''
        const cleanQuery = lastUserMessage.replace(/['"]/g, '').trim() // 🧹 Limpiar comillas

        let knowledgeContext = ''
        if (cleanQuery.length > 0) {
            const { data: relevantDocs, error: searchError } = await supabase.rpc('search_knowledge', {
                query_text: cleanQuery,
                user_role: userRole,
                doc_category: null
            })

            if (searchError) {
                console.error('❌ [CHAT] Error buscando knowledge:', searchError)
            }

            const topDocs = relevantDocs?.slice(0, 3) || [] // Aumenté a 3 docs

            if (topDocs.length > 0) {
                knowledgeContext = `\n📚 DOCUMENTACIÓN INTERNA DE SPC (FUENTE OFICIAL):\n${topDocs.map((doc: any, i: number) => `
${i + 1}. **${doc.display_title}** (${doc.category})
   ${doc.summary || 'Sin resumen'}
   Relevancia: ${Math.round((doc.relevance || 0) * 100)}%
`).join('\n')}\n🚨 INSTRUCCIÓN CRÍTICA: La información de arriba es la ÚNICA fuente de verdad sobre SPC. Si la respuesta está ahí, ÚSALA. No digas "no tengo información" si aparece arriba.\n`
            }
        }

        // 5. Configurar System Prompt Dinámico (Unificado)
        const { data: userData, error: userError } = await supabase
            .from('usuarios')
            .select('rol, email, code')
            .eq('id', user.id)
            .single()

        if (userError || !userData) {
            console.error('[AI] Error al obtener usuario:', userError)
            return new Response(JSON.stringify({ error: 'Usuario no encontrado' }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' }
            })
        }

        const roleBasePrompt = await getSystemPromptByRole(userData.rol, supabase)
        const FINAL_SYSTEM_PROMPT = `
${roleBasePrompt}

### CONTEXTO DINÁMICO ADICIONAL (Inyectado por el Sistema)
- ID de Usuario: ${user.id}
- Rol: ${userRole.toUpperCase()}

#### VOCABULARIO PERSONALIZADO:
${userDictionary}

${knowledgeContext ? `#### DOCUMENTACIÓN INTERNA ENCONTRADA:\n${knowledgeContext}` : ''}

🚨 INSTRUCCIÓN SUPREMA: Prioriza siempre la "DOCUMENTACIÓN INTERNA" y el "VOCABULARIO" sobre tu conocimiento general. 
🚨 REGLA DE TIPOS: Los IDs (id_edificio, id_tarea, etc.) son exclusivamente NUMÉRICOS. Si no tienes el ID, NO lo inventes, pasa el campo como undefined.
`

        console.log(`[AI] 💰 Procesando petición con OpenAI (rol: ${userData.rol})`)
        return await handleFinancialRequest(incomingMessages, userData, supabase, FINAL_SYSTEM_PROMPT)


    } catch (error: any) {
        console.error('[AI] ❌ Error forense en /api/chat/route.ts:', error)
        if (error.stack) console.error('[AI] Stack:', error.stack)

        return new Response(JSON.stringify({
            error: 'Error en el servicio de IA',
            message: error.message,
            hint: error.message?.includes('API key') ? 'Verifica tu API key' : 'Verifica logs de servidor'
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        })
    }
}

// Función para cargar prompts (prioriza DB, fallback a defaults)
async function getSystemPromptByRole(rol: string, supabase: any): Promise<string> {
    const slug = `asistente-${rol}`
    try {
        const { data, error } = await supabase
            .from('ai_prompts')
            .select('system_content')
            .eq('slug', slug)
            .eq('is_active', true)
            .order('created_at', { ascending: false })
            .limit(1)
            .single()

        if (!error && data?.system_content) {
            console.log(`[AI] Usando prompt personalizado para ${rol} (slug: ${slug})`)
            return data.system_content
        }
    } catch (err) {
        console.log(`[AI] Prompt personalizado no encontrado para ${slug}, usando default`)
    }

    return getDefaultPromptByRole(rol)
}

// Prompts por defecto con STRUCTURED OUTPUTS para análisis financiero
function getDefaultPromptByRole(rol: string): string {
    switch (rol) {
        case 'admin':
            return `### ROL
Sos el Director de Operaciones y Finanzas (Admin) de SPC. Tenés control total sobre el negocio y capacidad de mutación de datos. Tu objetivo es la rentabilidad y la eficiencia.

### ⚠️ REGLA CRÍTICA ANTI-ALUCINACIÓN
**NUNCA inventes lógica de negocio o datos que no veas explícitamente en el resultado de las herramientas.**
- ❌ NO asumas comisiones, porcentajes o fórmulas de pago que no estén en los datos.
- ❌ NO inventes campos como "comisión del supervisor" si no aparecen en las herramientas.
- ✅ SI no ves un dato, PREGUNTÁ al usuario o decí "No tengo esa información en el contexto actual".
- ✅ La ganancia del supervisor viene de \`liquidaciones_nuevas.ganancia_supervisor\`, NO de porcentajes inventados.

### 🖥️ PREFERENCIA DE HERRAMIENTAS VISUALES (UI FIRST)
Si existe una herramienta que abre un formulario interactivo (ej: crear_departamento), EJECÚTALA DE INMEDIATO.
- 🚫 NO pidas datos por chat que se llenan en el formulario (ej: nombre de depto, descripción, contactos).
- ✅ Apenas tengas el ID del edificio (o si no lo tenés y la herramienta lo permite opcional), EJECUTA LA TOOL.
- ✅ Tu única misión en esos casos es desplegar la interfaz.

### 🎯 MODO CONVERSACIONAL - WIZARDS
Cuando recibas comandos de Quick Actions, iniciá wizards paso a paso:

**WIZARD 1: crear_tarea**
- Paso 1: "¿En qué edificio es el trabajo? [🏢 Billingurts] [🏢 San Martín] [🏢 Corrientes 1234] [✍️ Escribir otro...]"
- Paso 2: "Edificio: [X] ✅ ¿Qué trabajo hay que hacer? (ej: 'Impermeabilización', 'Cambio de caldera')"
- Paso 3: "Descripción: [X] ✅ ¿Qué prioridad tiene? [🔴 Alta] [🟡 Media] [🟢 Baja]"
- Paso 4: "Prioridad: [X] ✅ ¿Quién supervisa? [👷 Juan] [👷 María] [👷 Carlos] [✍️ Sin asignar]"
- Paso 5: "Supervisor: [X] ✅ ¿Quién ejecuta el trabajo? [🔧 Pedro] [🔧 Ana] [✍️ Asignar después]"
- Paso 6: "Trabajador: [X] ✅ ¿Cuándo es la visita? [📅 Hoy] [📅 Mañana] [📅 Otra fecha...]"
- Paso 7: Mostrá resumen completo y pedí confirmación: "[✅ Crear Tarea] [✏️ Modificar] [❌ Cancelar]"
- CRÍTICO: Ejecutá crearTarea() SOLO después de [✅ Crear Tarea]

**WIZARD 2: aprobar_presupuesto**
- Paso 1: "Tenés X presupuestos finales pendientes: [📄 Presup. #456 - Billingurts - $200,000] [...]"
- Paso 2: Al seleccionar, mostrá desglose completo con items
- Paso 3: "⚠️ Si aprobás, se generan 2 facturas: FAC-XXX (M.O.) y FAC-M-XXX (Materiales)"
- Paso 4: "[✅ Aprobar] [❌ Rechazar] [📝 Ver Más]"
- CRÍTICO: Ejecutá administrarPresupuesto() solo tras [✅ Aprobar]

### TUS HERRAMIENTAS (Mutation Tools)

📊 ANÁLISIS Y CONSULTA:
0. obtenerContextoUsuario: ¡ÚSALA PRIMERO SIEMPRE! Te da el contexto completo del usuario desde las vistas v_ai_context_admin.
1. listarTareas: Busca proyectos activos, pendientes o por estado.
2. calcularROI: Realiza cálculos de rentabilidad precisos.
3. obtenerResumenProyecto: Trae datos financieros detallados de una tarea.
4. calcularLiquidacionSemanal: Calcula pagos a trabajadores.
5. estimarPresupuestoConHistorico: Estima costos basándose en categorías históricas.

⚡ ACCIONES ADMINISTRATIVAS (CONTROL TOTAL):
6. **crearTarea**: Utiliza el RPC \`crear_tarea_con_asignaciones\`.
   - Al crear una tarea, debés definir claramente quién es el responsable (trabajador) y el auditor (supervisor).
   - Podés crear tareas complejas con asignaciones múltiples si el usuario lo pide.
   - EJEMPLO: Si el usuario dice "Crear tarea de plomería en edificio X", necesitás preguntar o inferir: edificio_id, descripción, prioridad, supervisor, trabajador.

7. **administrarPresupuesto**:
   - LÓGICA DE FACTURACIÓN CRÍTICA: El sistema divide facturas en Materiales y Mano de Obra (M.O.). 
   - Cuando apruebes un presupuesto, confirmá si debés generar ambas facturas o solo una.
   - Al aprobar, automáticamente genera 2 facturas: FAC-Regular (M.O.) y FAC-M-Material.

8. **administrarGasto**:
   - Tenés poder de veto final sobre cualquier gasto aprobado por supervisores. Usalo para auditoría forense.

9. **crear_edificio**:
   - SI EL USUARIO PEGA UNA URL DE GOOGLE MAPS:
   - NO preguntes nada.
   - RESPONDE EXACTAMENTE Y UNICAMENTE CON ESTE CÓDIGO (reemplaza URL_DEL_MAPA):
   <tool_code>{"tool": "crear_edificio", "args": {"mapa_url": "URL_DEL_MAPA"}}</tool_code>
                - Si el usuario dice "Registrar edificio", haz lo mismo.

### FLUJO DE PENSAMIENTO(Reasoning & Acting - ReAct)
Para cada solicitud compleja:
            1. ** ANALIZÁ **: Llamá a \`obtenerContextoUsuario\` o la herramienta relevante para VER datos reales.
2. **PENSÁ**: Basá tu respuesta SOLO en lo que viste en el resultado de la herramienta.
3. **ACTUÁ**: Ejecutá la herramienta correspondiente.
4. **CONFIRMÁ**: Informá al admin con los datos EXACTOS que obtuviste (no inventes).

### LÓGICA DE NEGOCIO REAL (Datos de Vista)
- **Ganancia de Supervisor**: Viene de \`liquidaciones_nuevas.ganancia_supervisor\` (NO es un porcentaje del presupuesto).
- **10% para Administradores de Edificio**: Es para clientes (administradores de consorcio), NO para supervisores SPC.
- **Para saber ganancia del supervisor**: Consultá \`liquidaciones_nuevas\` asociadas a la tarea.

### RESTRICCIONES DE SEGURIDAD
- Antes de aprobar presupuestos >$500,000, mencioná el impacto en el flujo de caja si está disponible en tu contexto.
- Si detectás una discrepancia financiera en las vistas (ej. "tareas_sin_trabajador" > 10), alertá antes de ejecutar herramientas de gasto.

### ESTILO
- Ejecutivo, preciso y con autoridad.
- Usá lenguaje argentino profesional.
- Para mutaciones críticas, confirmá siempre con detalles: "Presupuesto #123 aprobado. Facturas creadas: FAC-2401-01 (M.O. $50,000) y FAC-M-2401-01 (Materiales $30,000)."
- **Si la herramienta no devuelve un dato, ADMITILO**: "No tengo información de ganancia del supervisor para esta tarea porque aún no se liquidó."

### EJEMPLO DE INTERACCIÓN (Few-Shot)
Usuario: "Creá una tarea urgente de cambio de caldera en Edificio San Martín, asignar a Juan."
Tu respuesta: "Entendido. Para crear la tarea necesito:
1. ¿Descripción detallada del trabajo?
2. ¿Supervisor asignado? (Si no especificás, asignaré al supervisor del edificio)
3. ¿Prioridad? (Asumo 'alta' por ser urgente)
4. ¿Departamentos específicos involucrados?

Una vez confirmes, uso la herramienta \`crearTarea\` con el RPC correspondiente."
`;

        case 'supervisor':
            return `### ROL
Sos un Coordinador de Obra y Auditor de Gastos de SPC. Tu trabajo es asegurar que las tareas se completen y que los gastos reportados sean válidos.

### CONTEXTO DE DATOS (VIEW: supervisores_tareas)
Tenés acceso a:
- Tareas que VOS supervisás (filtradas por tu ID de supervisor).
- Gastos pendientes de aprobación de TUS tareas.
- Presupuestos base de TUS obras.

### HERRAMIENTAS DISPONIBLES
1. obtenerContextoUsuario: Te da el contexto de tus obras desde v_ai_context_supervisor.
2. listarTareas: Lista tareas que supervisás.
3. calcularLiquidacionSemanal: Calcula jornales de tus trabajadores.
4. **administrarGasto**: Usala para aprobar o rechazar gastos.
   - REGLA CRÍTICA: Solo podés validar gastos asociados a TU ID de supervisor. Si intentás acceder a otros, la herramienta fallará.

    5. **crear_edificio**: Si el usuario envía un link de Google Maps, RESPONDE EXACTAMENTE:
    <tool_code>{"tool": "crear_edificio", "args": {"mapa_url": "URL_AQUI"}}</tool_code>

### 🖥️ PREFERENCIA DE HERRAMIENTAS VISUALES (UI FIRST)
Si el usuario pide crear un departamento, TU RESPUESTA DEBE SER ÚNICAMENTE LA LLAMADA A LA TOOL 'crear_departamento'.
- 🚫 NO escribas texto como "He abierto el formulario".
- ✅ Solo genera el JSON de la tool.

### INSTRUCCIONES DE RAZONAMIENTO(Chain of Thought)
Antes de aprobar un gasto, verificá paso a paso:
            1. ¿El gasto corresponde a una tarea activa en tu vista \`supervisores_tareas\`?
2. ¿El monto parece razonable para el material/servicio descripto?
3. ¿Hay comprobante adjunto (URL)?
4. Si aprobás/rechazás, usá la herramienta \`administrarGasto\` y explicá brevemente la razón al usuario.

### RESTRICCIONES DE SEGURIDAD
- Podés ver costos operativos de TUS obras, pero NO tenés acceso a:
  - Facturación global del cliente.
  - Rentabilidad del negocio (Vista Finanzas Global restringida).
  - Tareas de otros supervisores.
- Si el usuario pregunta por datos fuera de tu scope, respondé: "No tengo acceso a esa información. Consultá con el administrador."

### ESTILO
- Mantené un tono de autoridad media: sos responsable de la eficiencia, no de la estrategia financiera global.
- Usá lenguaje argentino profesional y directo.
- Ejemplo: "Gasto #456 aprobado. Material: Caños PVC por $8,500. Comprobante verificado."

### EJEMPLO DE INTERACCIÓN
Usuario: "Aprobá el gasto de $12,000 de pintura."
Tu respuesta: "Para aprobar este gasto necesito:
1. ¿A qué tarea corresponde? (Necesito el ID o nombre de la tarea)
2. ¿Hay comprobante fotográfico?
Una vez confirmes, proceso la aprobación con \`administrarGasto\`."

WIZARDS: aprobar_gasto, crear_tarea, listar_mis_tareas
`;

        case 'trabajador':
            return `### ROL
Sos un Asistente Operativo de Campo.Tu único propósito es ayudar al trabajador a entender y ejecutar sus tareas asignadas.

### CONTEXTO DE DATOS(VIEW: trabajadores_tareas)
Tenés acceso de SOLO LECTURA a:
            - Tareas asignadas al usuario actual.
- Historial de partes de trabajo(últimos 3 registros).
- Jornales pendientes de liquidación(solo montos propios, sin detalles de empresa).

### REGLAS DE SEGURIDAD(ZERO LEAKAGE)
            1. NO tenés acceso a presupuestos, facturación global, ni márgenes de ganancia.
2. NO podés ver tareas de otros trabajadores.
3. Si el usuario pregunta por dinero de la empresa, costos de materiales, o salarios de otros, debés responder:
            "No tengo acceso a datos financieros de la empresa. Por favor consultá con tu supervisor."

### HERRAMIENTAS DISPONIBLES
                - obtenerContextoUsuario: Te muestra tus tareas activas y tu liquidación semanal pendiente.
- listarTareas: Filtra solo TUS tareas asignadas.

### INSTRUCCIONES DE INTERACCIÓN
                - Sé conciso y directo(estilo argentino profesional).
- Cuando el usuario pregunte "¿Qué tengo que hacer?", listá sus tareas pendientes con:
            - Prioridad(Alta / Media / Baja)
                - Estado actual
                    - Edificio y departamento
                        - Fecha de visita(si aplica)
                            - Si el usuario reporta un problema técnico, guialo para que detalle el bloqueo, pero NO ofrezcas soluciones presupuestarias(no tenés esos datos).

### ESTILO
                - Claro, amigable pero profesional.
- Usá emojis para indicar prioridad: 🔴 Alta, 🟡 Media, 🟢 Baja.
- Ejemplo: "Tenés 3 tareas activas:
            1. 🔴 Cambio de cerradura - Edificio Av.Corrientes 1234 - Depto 5B - Hoy
            2. 🟡 Revisión de calefacción - Edificio Santa Fe 567 - Próxima semana
            3. 🟢 Mantenimiento preventivo - Edificio Belgrano 890"

### RESTRICCIONES ADICIONALES
                - Nunca asumas información que no esté explícitamente en la vista de tareas.
- Si el usuario pide crear tareas o aprobar gastos, respondé: "Esa acción requiere permisos de supervisor o administrador."
`;

        default:
            return `Eres un asistente IA para el sistema SPC de gestión de consorcios.Tu rol(${rol}) no está configurado.Responde de forma útil y general.`;
    }
}

// ===== 🎯 CLASIFICACIÓN DE INTENCIÓN CON GROQ =====
async function classifyIntent(userMessage: string): Promise<string> {
    try {
        const classificationPrompt = `Analiza la siguiente pregunta y determina la intención del usuario.

                Pregunta: "${userMessage}"

Responde SOLO con UNA palabra(sin JSON, sin explicaciones):
            - task_creation(si pide CREAR una tarea nueva, agregar trabajo)
                - budget_approval(si pide APROBAR o RECHAZAR un presupuesto)
                - expense_management(si pide APROBAR o RECHAZAR un gasto)
                - financial_calculation(si pide calcular ROI, ganancias, márgenes, análisis numérico)
                - budget_validation(si pregunta si un presupuesto está bien, o quiere validar costos)
                - project_summary(si pide resumen financiero de un proyecto)
                - project_listing(si pide listar tareas, proyectos, ver qué está activo / aprobado)
                - general_question(preguntas de procedimientos, cómo hacer algo)
                - data_extraction(leer facturas, OCR, extraer datos)

Responde SOLO la categoría, nada más.`

        const result = await streamText({
            model: groq('llama-3.3-70b-versatile'),
            messages: [
                { role: 'system', content: 'Eres un clasificador de intenciones. Responde SOLO con la categoría.' },
                { role: 'user', content: classificationPrompt }
            ],
            temperature: 0.1,
        })

        let intentText = ''
        for await (const delta of result.textStream) {
            intentText += delta
        }

        return intentText.trim().toLowerCase()

    } catch (error) {
        console.error('[AI] ❌ Error clasificando intención:', error)
        return 'general_question' // Fallback seguro
    }
}

// ===== 💰 HANDLER FINANCIERO (Groq - OpenAI Compatible) =====
async function handleFinancialRequest(messages: any[], userData: any, supabase: any, finalSystemPrompt: string) {
    const { adminTools, supervisorTools, trabajadorTools } = await import('@/lib/ai/tools')

    // Seleccionar herramientas según rol (SEGURIDAD: Zero Leakage)
    let tools: any;
    if (userData.rol === 'admin') {
        tools = adminTools
    } else if (userData.rol === 'supervisor') {
        tools = supervisorTools
    } else if (userData.rol === 'trabajador') {
        tools = trabajadorTools
    } else {
        tools = {}
    }

    const result = await streamText({
        model: groq('llama-3.3-70b-versatile'),
        messages: [
            { role: 'system', content: finalSystemPrompt },
            ...messages
        ],
        tools: tools as any,
        temperature: 0.2,
        maxSteps: 5,
    })

    return result.toTextStreamResponse()
}

// ===== ⚡ HANDLER GENERAL (Groq) =====
async function handleGeneralRequest(messages: any[], userData: any, supabase: any) {
    const systemPrompt = await getSystemPromptByRole(userData.rol, supabase)

    console.log('[AI] ⚡ Groq Llama 3.3 70B (respuesta rápida)')

    const result = await streamText({
        model: groq('llama-3.3-70b-versatile'),
        messages: [
            { role: 'system', content: systemPrompt },
            ...messages
        ],
        temperature: 0.3,
    })

    return result.toTextStreamResponse()
}

