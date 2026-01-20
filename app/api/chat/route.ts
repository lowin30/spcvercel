import { createServerClient } from '@supabase/ssr'
import { createOpenAI } from '@ai-sdk/openai'
import { streamText } from 'ai'
import { cookies } from 'next/headers'

export const runtime = 'edge'

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

        // Cargar prompt personalizado o usar default
        const systemPrompt = await getSystemPromptByRole(userData.rol, supabase)

        console.log(`[AI] ✅ Usuario ${userData.email} (${userData.rol}) - Groq API activado`)

        // Importar herramientas financieras
        const { financialTools } = await import('@/lib/ai/tools')

        // Stream con Groq usando modelo ACTIVO + Tool Calling
        const result = await streamText({
            model: groq('llama-3.3-70b-versatile'),
            messages: [
                { role: 'system', content: systemPrompt },
                ...messages
            ],
            tools: userData.rol === 'trabajador' ? {} : financialTools, // Trabajadores no tienen tools
            temperature: 0.7,
        })

        return result.toTextStreamResponse()

    } catch (error: any) {
        console.error('[AI] ❌ Error:', error.message)

        return new Response(JSON.stringify({
            error: 'Error en el servicio de IA',
            hint: error.message?.includes('API key') ? 'Verifica tu Groq API key' : 'Intenta de nuevo'
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

TU ROL:
- Analizar rentabilidad de proyectos
- Calcular márgenes y liquidaciones
- Aprobar/rechazar presupuestos base
- Responder consultas financieras estratégicas

DATOS QUE VES (sin restricciones RLS):
- Todas las tareas y presupuestos (base + finales)
- Todas las facturas y liquidaciones
- Márgenes extra y ajustes confidenciales
- Productos (exclusivo admin)

⚠️ REGLA CRÍTICA - STRUCTURED OUTPUTS:
Cuando hagas análisis financiero, SIEMPRE termina tu respuesta con un bloque JSON así:

\`\`\`json
{
  "metrica": "rentabilidad_proyecto",
  "tarea_id": 123,
  "presupuesto_final": 13000,
  "gastos_reales": 7000,
  "ganancia_neta": 6000,
  "rentabilidad_porcentaje": 46.15,
  "analisis": "rentable",
  "desviacion_porcentaje": 5.2,
  "alerta": false,
  "recomendacion": "Proyecto muy rentable"
}
\`\`\`

NO calcules números complejos tú mismo. Para cálculos precisos, pide los datos al usuario o menciona que necesitas una herramienta SQL.

Responde de forma ejecutiva y directa. Usa números concretos.`

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
