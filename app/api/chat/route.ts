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

        const { messages } = await req.json()

        if (!messages || messages.length === 0) {
            return new Response(JSON.stringify({ error: 'No se enviaron mensajes' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            })
        }

        // ===== 🎯 CLASIFICACIÓN DE INTENCIÓN CON GROQ (RÁPIDO) =====
        const lastUserMessage = messages[messages.length - 1]?.content || ''

        console.log('[AI] 🔍 Clasificando intención del mensaje:', lastUserMessage.substring(0, 100))

        const intent = await classifyIntent(lastUserMessage)

        console.log('[AI] 🎯 Intención detectada:', intent)

        // ===== 🔀 ROUTER: DECIDIR QUÉ MODELO USAR =====
        const financialIntents = ['financial_calculation', 'budget_validation', 'project_summary', 'project_listing']

        if (financialIntents.includes(intent) && userData.rol !== 'trabajador') {
            // Usar OpenAI para análisis financiero
            console.log('[AI] 💰 Redirigiendo a OpenAI (análisis financiero)')
            return await handleFinancialRequest(messages, userData, supabase)
        } else {
            // Usar Groq para respuestas rápidas
            console.log('[AI] ⚡ Usando Groq (respuesta rápida)')
            return await handleGeneralRequest(messages, userData, supabase)
        }

    } catch (error: any) {
        console.error('[AI] ❌ Error:', error.message)

        return new Response(JSON.stringify({
            error: 'Error en el servicio de IA',
            hint: error.message?.includes('API key') ? 'Verifica tu API key' : 'Intenta de nuevo'
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        })
    }
}

// Función para cargar prompts (prioriza DB, fallback a defaults)
async function getSystemPromptByRole(rol: string, supabase: any): Promise<string> {
    try {
        const { data, error } = await supabase
            .from('ai_prompts')
            .select('contenido')
            .eq('rol', rol)
            .eq('activo', true)
            .order('created_at', { ascending: false })
            .limit(1)
            .single()

        if (!error && data?.contenido) {
            console.log(`[AI] Usando prompt personalizado para ${rol}`)
            return data.contenido
        }
    } catch (err) {
        console.log(`[AI] Prompt personalizado no encontrado, usando default`)
    }

    return getDefaultPromptByRole(rol)
}

// Prompts por defecto con STRUCTURED OUTPUTS para análisis financiero
function getDefaultPromptByRole(rol: string): string {
    switch (rol) {
        case 'admin':
            return `Eres el analista financiero IA de SPC (Servicios para Consorcios).

CONTEXTO: SPC gestiona trabajos de mantenimiento en edificios. Tienes acceso COMPLETO a todas las tareas, presupuestos, facturas y liquidaciones.

TUS HERRAMIENTAS REALES (Usa estas para responder):
0. obtenerContextoUsuario: ¡ÚSALA PRIMERO! Te da todo el contexto relevante del usuario.
1. listarTareas: Busca proyectos activos, pendientes o por estado.
2. calcularROI: Realiza cálculos de rentabilidad precisos.
3. obtenerResumenProyecto: Trae datos financieros detalle de una tarea.
4. calcularLiquidacionSemanal: Calcula pagos a trabajadores.
5. estimarPresupuestoConHistorico: Estima costos basándose en categorías.

CAPACIDADES:
- Al inicio, llama a `obtenerContextoUsuario` para saber qué está pasando.
- Puedes listar tareas activas y su estado.
- Puedes calcular si un proyecto fue rentable.
- Puedes estimar cuánto saldrá un trabajo nuevo.
- NO tienes acceso a Excel, Tableau, Jira ni software externo. Todo lo haces aquí.

⚠️ REGLA DE FORMATO JSON (SOLO para Cálculos Financieros):
SI y SOLO SI el usuario pide un cálculo financiero explícito (ROI, margen, liquidación), termina tu respuesta con este JSON:

\`\`\`json
{
  "metrica": "rentabilidad_proyecto",
  "tarea_id": 123,
  "analisis": "rentable",
  "recomendacion": "Proyecto muy rentable"
}
\`\`\`

Para consultas generales (como "¿Qué puedes hacer?" o "Hola"), responde en TEXTO NATURAL sin JSON.`

        case 'supervisor':
            return `Eres el asistente operativo IA para supervisores de SPC.

CONTEXTO: SPC gestiona trabajos de mantenimiento en edificios.

TU ROL:
- Crear presupuestos base (materiales + mano de obra)
- Asignar técnicos a tareas
- Aprobar gastos en obra
- Supervisar calidad de trabajos

DATOS QUE VES (filtrado por RLS):
- Solo tus tareas asignadas como supervisor
- Presupuestos base de tus tareas
- Gastos de tus tareas
- Edificios y departamentos (todos para consulta)

NO VES: Presupuestos finales, facturas, productos, márgenes de admins.

FORMATO DE PRESUPUESTO:
Cuando estimes costos, usa este formato:

\`\`\`json
{
  "metrica": "presupuesto_estimado",
  "materiales": 10000,
  "mano_de_obra": 5000,
  "total_presupuesto_base": 15000,
  "confianza": "alta"
}
\`\`\`

Responde de forma práctica. Usa listas y bullets para fácil lectura en móvil.`

        case 'trabajador':
            return `Eres el asistente personal IA para trabajadores de SPC.

CONTEXTO: SPC gestiona trabajos de mantenimiento.

TU ROL:
- Consultar tus tareas pendientes
- Registrar partes de trabajo (medio_dia o dia_completo)
- Consultar tu liquidación semanal
- Hacer comentarios en tus tareas

DATOS QUE VES (muy limitado):
- Solo tus tareas asignadas
- Solo tus gastos (lectura)
- Tu liquidación semanal
- Edificios y departamentos (consulta)

RESTRICCIÓN: Solo lectura. Puedes insertar comentarios y partes de trabajo.

Responde de forma simple y clara. Usa emojis (✅ ❌ ⏳) para indicar estado.`

        default:
            return `Eres un asistente IA para el sistema SPC de gestión de consorcios. Tu rol (${rol}) no está configurado. Responde de forma útil y general.`
    }
}

// ===== 🎯 CLASIFICACIÓN DE INTENCIÓN CON GROQ =====
async function classifyIntent(userMessage: string): Promise<string> {
    try {
        const classificationPrompt = `Analiza la siguiente pregunta y determina la intención del usuario.

Pregunta: "${userMessage}"

Responde SOLO con UNA palabra (sin JSON, sin explicaciones):
- financial_calculation (si pide calcular ROI, ganancias, márgenes, análisis numérico)
- budget_validation (si pregunta si un presupuesto está bien, o quiere validar costos)
- project_summary (si pide resumen financiero de un proyecto)
- project_listing (si pide listar tareas, proyectos, ver qué está activo/aprobado)
- general_question (preguntas de procedimientos, cómo hacer algo)
- data_extraction (leer facturas, OCR, extraer datos)

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
        for await (const chunk of result.textStream) {
            intentText += chunk
        }

        const detectedIntent = intentText.trim().toLowerCase()

        // Validar que sea una intención válida
        const validIntents = ['financial_calculation', 'budget_validation', 'project_summary', 'project_listing', 'general_question', 'data_extraction']

        if (validIntents.includes(detectedIntent)) {
            return detectedIntent
        }

        console.log('[AI] ⚠️ Intención no reconocida, usando default:', detectedIntent)
        return 'general_question'

    } catch (error) {
        console.error('[AI] Error en clasificación, usando default:', error)
        return 'general_question'
    }
}

// ===== 💰 HANDLER FINANCIERO (OpenAI) =====
async function handleFinancialRequest(messages: any[], userData: any, supabase: any) {
    const systemPrompt = await getSystemPromptByRole(userData.rol, supabase)

    const { openai } = await import('@ai-sdk/openai')
    const { financialTools } = await import('@/lib/ai/tools')

    console.log('[AI] 🤖 OpenAI GPT-4o-mini con herramientas financieras')

    const result = await streamText({
        model: openai('gpt-4o-mini'),
        messages: [
            { role: 'system', content: systemPrompt },
            ...messages
        ],
        tools: financialTools,
        temperature: 0.2,
        maxSteps: 5, // Permitir que la IA ejecute la herramienta y luego responda
    })

    return result.toTextStreamResponse()
}

// ===== ⚡ HANDLER GENERAL (Groq) =====
async function handleGeneralRequest(messages: any[], userData: any, supabase: any) {
    const systemPrompt = await getSystemPromptByRole(userData.rol, supabase)

    console.log('[AI] 🚀 Groq llama-3.3 (respuesta rápida)')

    const result = await streamText({
        model: groq('llama-3.3-70b-versatile'),
        messages: [
            { role: 'system', content: systemPrompt },
            ...messages
        ],
        temperature: 0.7,
    })

    return result.toTextStreamResponse()
}

