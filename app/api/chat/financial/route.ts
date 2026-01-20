import { createServerClient } from '@supabase/ssr'
import { streamText } from 'ai'
import { openai } from '@ai-sdk/openai'
import { cookies } from 'next/headers'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'
export const maxDuration = 30

/**
 * Endpoint financiero con OpenAI GPT-4o-mini + Tool Calling
 * Este endpoint SOLO se usa cuando la intención del usuario requiere cálculos financieros
 */
export async function POST(req: Request) {
    try {
        // ===== ✅ AUTENTICACIÓN =====
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

        console.log('[FINANCIAL] Usuario autenticado:', user.email)

        // ===== 📊 OBTENER DATOS DEL USUARIO =====
        const { data: userData, error: userError } = await supabase
            .from('usuarios')
            .select('id, nombre, apellido, rol, consorcio_id')
            .eq('auth_id', user.id)
            .single()

        if (userError || !userData) {
            console.error('[FINANCIAL] Error al obtener datos del usuario:', userError)
            return new Response(JSON.stringify({ error: 'Usuario no encontrado' }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' }
            })
        }

        console.log('[FINANCIAL] Rol del usuario:', userData.rol)

        // ===== 💬 OBTENER MENSAJES =====
        const { messages } = await req.json()
        if (!Array.isArray(messages) || messages.length === 0) {
            return new Response(JSON.stringify({ error: 'Mensajes inválidos' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            })
        }

        // ===== 🎯 PROMPT DEL SISTEMA =====
        const systemPrompt = `Eres un asistente financiero experto de SPC (Servicios para Consorcios).

Usuario: ${userData.nombre} ${userData.apellido}
Rol: ${userData.rol}
Consorcio ID: ${userData.consorcio_id || 'N/A'}

IMPORTANTE:
- Tienes acceso a herramientas financieras precisas (calcularROI, obtenerResumenProyecto, etc.)
- SIEMPRE usa las herramientas en lugar de calcular manualmente
- Cuando obtengas resultados financieros, preséntalos en formato JSON para que se rendericen como tarjetas visuales
- Sé preciso con los números y valida los datos antes de responder

Formato de respuesta para análisis financiero:
\`\`\`json
{
  "tipo": "analisis_financiero",
  "proyecto": "Nombre del proyecto",
  "metricas": {
    "roi": 25.5,
    "ganancia_neta": 150000,
    "presupuesto": 850000,
    "gastos_reales": 700000
  },
  "analisis": "Explicación del ROI y rentabilidad",
  "recomendaciones": ["Punto 1", "Punto 2"]
}
\`\`\`
`

        // ===== 🛠️ CARGAR HERRAMIENTAS =====
        const { financialTools } = await import('@/lib/ai/tools')

        // ===== 🤖 STREAM CON OPENAI + TOOL CALLING =====
        console.log('[FINANCIAL] Usando OpenAI GPT-4o-mini con herramientas')

        const result = await streamText({
            model: openai('gpt-4o-mini'),
            messages: [
                { role: 'system', content: systemPrompt },
                ...messages
            ],
            tools: financialTools,
            temperature: 0.2, // Más preciso para cálculos
        })

        console.log('[FINANCIAL] ✅ Stream iniciado correctamente')

        return result.toTextStreamResponse()

    } catch (error: any) {
        console.error('[FINANCIAL] ❌ ERROR:', {
            message: error.message,
            stack: error.stack,
        })

        return new Response(JSON.stringify({
            error: 'Error en análisis financiero',
            details: error.message
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        })
    }
}
